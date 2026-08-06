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

func New(logger *logrus.Logger) *DB {
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		host := envOrDefault("CRYPTOBOM_DB_HOST", "localhost")
		port := envOrDefaultInt("CRYPTOBOM_DB_PORT", 5432)
		user := envOrDefault("CRYPTOBOM_DB_USER", "cryptobom")
		password := os.Getenv("CRYPTOBOM_DB_PASSWORD")
		dbname := envOrDefault("CRYPTOBOM_DB_NAME", "cryptobom_saas")

		if password == "" {
			logger.Warn("CRYPTOBOM_DB_PASSWORD not set — using default for local dev only")
			password = "cryptobom"
		}
		sslmode := envOrDefault("CRYPTOBOM_DB_SSLMODE", "disable")

		dsn = fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			host, port, user, password, dbname, sslmode,
		)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		logger.WithError(err).Warn("Database unavailable — running in demo mode")
		return nil
	}

	if err := db.Ping(); err != nil {
		logger.WithError(err).Warn("Database unreachable — running in demo mode")
		db.Close()
		return nil
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	logger.Info("Database connection established")

	return &DB{
		DB:      db,
		Queries: NewQueries(db),
		logger:  logger,
	}
}

func RunMigrations(db *DB) error {
	if db == nil {
		return nil
	}
	if err := createTables(db); err != nil {
		return fmt.Errorf("migrations failed: %w", err)
	}
	if err := createIndexes(db); err != nil {
		return fmt.Errorf("index creation failed: %w", err)
	}
	return nil
}

// createTables creates tables consistent with the tenant-based schema in
// deploy/migrations/001_initial_schema.sql (tenants.id is TEXT).
func createTables(db *DB) error {
	if db == nil {
		return nil
	}
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
		`CREATE TABLE IF NOT EXISTS tenants (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			domain TEXT UNIQUE,
			plan TEXT NOT NULL DEFAULT 'oss',
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			email TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'viewer',
			password TEXT NOT NULL DEFAULT '',
			mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
			mfa_secret TEXT,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS cbom_reports (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			version TEXT NOT NULL,
			cyclonedx_bom JSONB NOT NULL,
			metadata JSONB,
			status TEXT DEFAULT 'pending',
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS crypto_assets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			cbom_report_id UUID NOT NULL REFERENCES cbom_reports(id) ON DELETE CASCADE,
			algorithm TEXT NOT NULL,
			key_size INTEGER,
			usage TEXT NOT NULL,
			location TEXT,
			vulnerability_score INTEGER DEFAULT 0,
			quantum_safe BOOLEAN DEFAULT FALSE,
			metadata JSONB,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS security_events (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			event_type TEXT NOT NULL,
			severity TEXT NOT NULL,
			source TEXT NOT NULL,
			description TEXT,
			metadata JSONB,
			resolved BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS kubernetes_clusters (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			endpoint TEXT NOT NULL,
			version TEXT,
			platform TEXT,
			region TEXT,
			status TEXT DEFAULT 'active',
			metadata JSONB,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS quantum_attestations (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			cbom_report_id UUID NOT NULL REFERENCES cbom_reports(id) ON DELETE CASCADE,
			attestation_type TEXT NOT NULL,
			quantum_network TEXT,
			status TEXT NOT NULL DEFAULT 'pending',
			result TEXT,
			attested_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS audit_events (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
			event_type TEXT NOT NULL,
			request_id TEXT,
			method TEXT,
			path TEXT,
			status INT,
			latency_ms INT,
			ip TEXT,
			user_agent TEXT,
			actor_id TEXT,
			metadata JSONB,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query: %s, error: %w", query[:60], err)
		}
	}
	return nil
}

func createIndexes(db *DB) error {
	if db == nil {
		return nil
	}
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_cbom_reports_tenant_id ON cbom_reports(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_crypto_assets_cbom_report_id ON crypto_assets(cbom_report_id);`,
		`CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_kubernetes_clusters_tenant_id ON kubernetes_clusters(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_crypto_assets_quantum_safe ON crypto_assets(quantum_safe);`,
		`CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);`,
		`CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);`,
		`CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);`,
	}

	for _, index := range indexes {
		if _, err := db.Exec(index); err != nil {
			return fmt.Errorf("failed to create index: %s, error: %w", index, err)
		}
	}
	return nil
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
