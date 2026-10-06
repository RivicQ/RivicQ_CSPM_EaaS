package database

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// Migration is a versioned, forward-only schema step.
//
// Migrations are idempotent at the statement level (IF NOT EXISTS / guarded
// DO blocks) so an operator can retry after a partial failure. Every applied
// migration is recorded in schema_migrations with its checksum, and a changed
// checksum for an already-applied ID is reported as drift rather than silently
// ignored.
type Migration struct {
	ID         string
	Name       string
	Statements []string
}

func migrationTableDDL() string {
	return `CREATE TABLE IF NOT EXISTS schema_migrations (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		checksum TEXT NOT NULL,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		duration_ms INTEGER NOT NULL DEFAULT 0
	);`
}

// checksumMigration returns a stable checksum over the migration's SQL.
func checksumMigration(m Migration) string {
	h := sha256.New()
	for _, stmt := range m.Statements {
		_, _ = h.Write([]byte(normalizeSQL(stmt)))
		_, _ = h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

// normalizeSQL strips SQL line comments and collapses whitespace so
// reformatting or re-indenting a migration file does not register as checksum
// drift. Dollar-quoted bodies are preserved verbatim.
func normalizeSQL(s string) string {
	var out strings.Builder
	var lastSpace bool
	inLineComment := false
	inDollarQuote := false

	runes := []rune(s)
	for i := 0; i < len(runes); i++ {
		r := runes[i]

		if inLineComment {
			if r == '\n' {
				inLineComment = false
				lastSpace = true
				out.WriteRune(' ')
			}
			continue
		}
		if inDollarQuote {
			out.WriteRune(r)
			if r == '$' && i+1 < len(runes) && runes[i+1] == '$' {
				out.WriteRune('$')
				i++
				inDollarQuote = false
			}
			continue
		}

		switch r {
		case '\n', '\r', '\t', ' ':
			if !lastSpace {
				out.WriteRune(' ')
				lastSpace = true
			}
		case '-':
			if i+1 < len(runes) && runes[i+1] == '-' {
				inLineComment = true
				i++
				continue
			}
			lastSpace = false
			out.WriteRune(r)
		case '$':
			if i+1 < len(runes) && runes[i+1] == '$' {
				inDollarQuote = true
				out.WriteString("$$")
				i++
				continue
			}
			lastSpace = false
			out.WriteRune(r)
		default:
			lastSpace = false
			out.WriteRune(r)
		}
	}
	return strings.TrimSpace(out.String())
}

// ApplyMigrations runs the supplied migrations in order.
func ApplyMigrations(db *sql.DB, logger *logrus.Logger, migrations []Migration) error {
	if db == nil {
		return nil
	}
	if logger == nil {
		logger = logrus.New()
	}
	if _, err := db.Exec(migrationTableDDL()); err != nil {
		return fmt.Errorf("cannot create schema_migrations: %w", err)
	}

	applied := map[string]string{}
	rows, err := db.Query(`SELECT id, checksum FROM schema_migrations`)
	if err != nil {
		return fmt.Errorf("cannot read schema_migrations: %w", err)
	}
	for rows.Next() {
		var id, sum string
		if err := rows.Scan(&id, &sum); err != nil {
			_ = rows.Close()
			return fmt.Errorf("cannot scan schema_migrations: %w", err)
		}
		applied[id] = sum
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		return err
	}
	_ = rows.Close()

	for _, m := range migrations {
		sum := checksumMigration(m)
		if existing, ok := applied[m.ID]; ok {
			if existing != sum {
				return fmt.Errorf(
					"migration %s (%s) was already applied with a different checksum; "+
						"add a new migration instead of editing an applied one",
					m.ID, m.Name)
			}
			continue
		}

		start := time.Now()
		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("migration %s: begin failed: %w", m.ID, err)
		}
		for i, stmt := range m.Statements {
			if _, execErr := tx.Exec(stmt); execErr != nil {
				_ = tx.Rollback()
				return fmt.Errorf("migration %s (%s) statement %d failed: %w", m.ID, m.Name, i+1, execErr)
			}
		}
		if _, err := tx.Exec(
			`INSERT INTO schema_migrations (id, name, checksum, duration_ms) VALUES ($1, $2, $3, $4)`,
			m.ID, m.Name, sum, int(time.Since(start).Milliseconds()),
		); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("migration %s: recording failed: %w", m.ID, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("migration %s: commit failed: %w", m.ID, err)
		}
		logger.WithFields(logrus.Fields{
			"migration":   m.ID,
			"name":        m.Name,
			"duration_ms": int(time.Since(start).Milliseconds()),
		}).Info("migration applied")
	}
	return nil
}

// MigrationStatus returns applied migration IDs with their recorded metadata.
type AppliedMigration struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	AppliedAt time.Time `json:"applied_at"`
	Duration  int       `json:"duration_ms"`
}

// AppliedMigrations reads the migration ledger for operational reporting.
func AppliedMigrations(db *sql.DB) ([]AppliedMigration, error) {
	if db == nil {
		return nil, nil
	}
	rows, err := db.Query(`SELECT id, name, applied_at, duration_ms FROM schema_migrations ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var out []AppliedMigration
	for rows.Next() {
		var m AppliedMigration
		if err := rows.Scan(&m.ID, &m.Name, &m.AppliedAt, &m.Duration); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
