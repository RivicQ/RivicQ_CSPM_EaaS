package database

import (
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"github.com/sirupsen/logrus"
)

type DB struct {
	*sql.DB
	Queries *Queries
	logger  *logrus.Logger
}

// DemoMode reports whether the process was explicitly allowed to start
// without a database. Demo mode serves fabricated data, so it must never be a
// silent consequence of a connection failure.
func DemoMode() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("RIVICQ_ALLOW_DEMO_MODE")))
	return v == "1" || v == "true" || v == "yes"
}

// New connects to PostgreSQL and returns an error when the database is
// unreachable.
//
// It no longer degrades to an in-memory demo on failure. Callers that allow a
// demo fallback must opt in explicitly via DemoMode() and must not treat the
// demo instance as production-ready.
func New(logger *logrus.Logger) (*DB, error) {
	if logger == nil {
		logger = logrus.New()
	}

	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		host := envOrDefault("CRYPTOBOM_DB_HOST", "localhost")
		port := envOrDefaultInt("CRYPTOBOM_DB_PORT", 5432)
		user := envOrDefault("CRYPTOBOM_DB_USER", "cryptobom")
		password := os.Getenv("CRYPTOBOM_DB_PASSWORD")
		dbname := envOrDefault("CRYPTOBOM_DB_NAME", "cryptobom_saas")

		if password == "" {
			return nil, fmt.Errorf("CRYPTOBOM_DB_PASSWORD is not set (refusing to fall back to a default database password)")
		}
		sslmode := envOrDefault("CRYPTOBOM_DB_SSLMODE", "disable")

		dsn = fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			host, port, user, password, dbname, sslmode,
		)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("cannot open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("cannot reach database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	logger.Info("Database connection established")

	return &DB{
		DB:      db,
		Queries: NewQueries(db),
		logger:  logger,
	}, nil
}

// NewOptional connects to the database and reports whether the handle is usable.
//
// It deliberately does not kill the process when the database is unreachable.
// Readiness is already expressed by /readyz, which answers 503 without a
// database; a process that exits instead cannot answer a probe at all, so the
// outage degrades into an unobservable crash loop with no endpoint to inspect.
// Callers must keep demo responses gated on availability so that an outage is
// never presented as real data, and must keep /readyz honest.
func NewOptional(logger *logrus.Logger) (*DB, bool) {
	db, err := New(logger)
	if err == nil {
		return db, true
	}
	if logger != nil {
		if DemoMode() {
			logger.WithError(err).Error("Demo mode explicitly enabled (RIVICQ_ALLOW_DEMO_MODE) — data is fabricated and in-memory")
		} else {
			logger.WithError(err).Error("Database unavailable — starting degraded; /readyz reports not_ready until it reconnects")
		}
	}
	return nil, false
}

func RunMigrations(db *DB) error {
	if db == nil {
		return nil
	}
	return ApplyMigrations(db.DB, db.logger, coreMigrations())
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envOrDefaultInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		var n int
		if _, err := fmt.Sscanf(v, "%d", &n); err == nil {
			return n
		}
	}
	return def
}
