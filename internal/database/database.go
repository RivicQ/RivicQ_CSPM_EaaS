package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/sirupsen/logrus"
)

type DB struct {
	*sql.DB
	logger *logrus.Logger
}

func NewConnection(cfg config.DatabaseConfig) (*DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	logger := logrus.New()
	logger.Info("Database connection established successfully")

	return &DB{
		DB:     db,
		logger: logger,
	}, nil
}

func RunMigrations(db *DB, migrationsDir string) error {
	logger := logrus.New()
	logger.Info("Running database migrations...")

	// Create initial tables
	if err := createTables(db); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	logger.Info("Database migrations completed successfully")
	return nil
}

func createTables(db *DB) error {
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
		`CREATE TABLE IF NOT EXISTS tenants (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			name VARCHAR(255) NOT NULL,
			domain VARCHAR(255) UNIQUE NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			email VARCHAR(255) UNIQUE NOT NULL,
			name VARCHAR(255) NOT NULL,
			role VARCHAR(50) NOT NULL DEFAULT 'user',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS cbom_reports (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			name VARCHAR(255) NOT NULL,
			version VARCHAR(50) NOT NULL,
			cyclonedx_bom JSONB NOT NULL,
			metadata JSONB,
			status VARCHAR(50) DEFAULT 'pending',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS crypto_assets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			cbom_report_id UUID NOT NULL REFERENCES cbom_reports(id),
			algorithm VARCHAR(100) NOT NULL,
			key_size INTEGER,
			usage VARCHAR(100) NOT NULL,
			location TEXT,
			vulnerability_score INTEGER DEFAULT 0,
			quantum_safe BOOLEAN DEFAULT FALSE,
			metadata JSONB,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS quantum_attestations (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			cbom_report_id UUID NOT NULL REFERENCES cbom_reports(id),
			attestation_type VARCHAR(100) NOT NULL,
			quantum_network VARCHAR(255),
			status VARCHAR(50) DEFAULT 'pending',
			result JSONB,
			attested_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS security_events (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			event_type VARCHAR(100) NOT NULL,
			severity VARCHAR(20) NOT NULL,
			source VARCHAR(255) NOT NULL,
			description TEXT,
			metadata JSONB,
			resolved BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,
		`CREATE TABLE IF NOT EXISTS kubernetes_clusters (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			name VARCHAR(255) NOT NULL,
			endpoint VARCHAR(500) NOT NULL,
			version VARCHAR(50),
			platform VARCHAR(100),
			region VARCHAR(100),
			status VARCHAR(50) DEFAULT 'active',
			metadata JSONB,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query: %s, error: %w", query, err)
		}
	}

	return nil
}

// Create indexes for better performance
func createIndexes(db *DB) error {
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_cbom_reports_tenant_id ON cbom_reports(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_crypto_assets_cbom_report_id ON crypto_assets(cbom_report_id);`,
		`CREATE INDEX IF NOT EXISTS idx_quantum_attestations_cbom_report_id ON quantum_attestations(cbom_report_id);`,
		`CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_kubernetes_clusters_tenant_id ON kubernetes_clusters(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_crypto_assets_quantum_safe ON crypto_assets(quantum_safe);`,
		`CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);`,
	}

	for _, index := range indexes {
		if _, err := db.Exec(index); err != nil {
			return fmt.Errorf("failed to create index: %s, error: %w", index, err)
		}
	}

	return nil
}
