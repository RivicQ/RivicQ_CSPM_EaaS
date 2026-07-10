package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/sirupsen/logrus"
)

type EnterpriseDB struct {
	*sql.DB
	logger *logrus.Logger
}

func NewEnterpriseConnection(cfg config.DatabaseConfig) (*EnterpriseDB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(50)
	db.SetConnMaxLifetime(5 * time.Minute)

	logger := logrus.New()
	logger.Info("Enterprise database connection established")

	return &EnterpriseDB{
		DB:     db,
		logger: logger,
	}, nil
}

func RunEnterpriseMigrations(db *EnterpriseDB) error {
	logger := logrus.New()
	logger.Info("Running enterprise database migrations...")

	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
		`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`,

		`CREATE TYPE asset_category AS ENUM (
			'cryptographic', 'ai', 'hardware', 'software', 'infrastructure'
		);`,

		`CREATE TYPE cloud_provider AS ENUM (
			'aws', 'gcp', 'ibm_cloud', 'azure', 'on_premise'
		);`,

		`CREATE TYPE compliance_framework AS ENUM (
			'iso27001', 'dora', 'gdpr', 'eu_ai_act', 'soc2', 'nist', 'pqc', 'cis', 'hipaa', 'pci_dss'
		);`,

		`CREATE TYPE risk_level AS ENUM (
			'critical', 'high', 'medium', 'low', 'info'
		);`,

		`CREATE TYPE attestation_status AS ENUM (
			'pending', 'in_progress', 'attested', 'failed', 'expired'
		);`,

		`CREATE TABLE IF NOT EXISTS tenants (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			name VARCHAR(255) NOT NULL,
			domain VARCHAR(255) UNIQUE NOT NULL,
			plan VARCHAR(50) DEFAULT 'enterprise',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			email VARCHAR(255) UNIQUE NOT NULL,
			name VARCHAR(255) NOT NULL,
			role VARCHAR(50) NOT NULL DEFAULT 'user',
			mfa_enabled BOOLEAN DEFAULT FALSE,
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

		`CREATE TABLE IF NOT EXISTS inventory_assets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			asset_id VARCHAR(255) NOT NULL,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			category asset_category NOT NULL,
			sub_category VARCHAR(100),
			cloud_provider cloud_provider,
			region VARCHAR(100),
			account_id VARCHAR(100),
			metadata JSONB,
			tags JSONB,
			discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			last_scanned_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(tenant_id, asset_id, category)
		);`,

		`CREATE TABLE IF NOT EXISTS cryptographic_assets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			inventory_asset_id UUID NOT NULL REFERENCES inventory_assets(id),
			algorithm VARCHAR(100) NOT NULL,
			key_size INTEGER,
			mode VARCHAR(50),
			usage VARCHAR(100) NOT NULL,
			implementation VARCHAR(100),
			library VARCHAR(255),
			location TEXT,
			vulnerability_score INTEGER DEFAULT 0,
			quantum_safe BOOLEAN DEFAULT FALSE,
			nist_pqc_alg VARCHAR(50),
			last_analysis_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS ai_assets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			inventory_asset_id UUID NOT NULL REFERENCES inventory_assets(id),
			model_name VARCHAR(255) NOT NULL,
			model_type VARCHAR(100),
			framework VARCHAR(100),
			provider VARCHAR(255),
			version VARCHAR(50),
			input_data_types TEXT[],
			output_data_types TEXT[],
			training_data_source TEXT,
			uses_pii BOOLEAN DEFAULT FALSE,
			decision_making BOOLEAN DEFAULT FALSE,
			risk_category VARCHAR(50),
			eu_ai_act_classification VARCHAR(50),
			transparency_score INTEGER,
		_bias_assessment JSONB,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS hardware_assets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			inventory_asset_id UUID NOT NULL REFERENCES inventory_assets(id),
			hardware_type VARCHAR(100) NOT NULL,
			vendor VARCHAR(255),
			model VARCHAR(255),
			serial_number VARCHAR(255),
			firmware_version VARCHAR(100),
			processor_type VARCHAR(255),
			memory_capacity VARCHAR(50),
			storage_capacity VARCHAR(50),
			network_interfaces JSONB,
			secure_boot_enabled BOOLEAN DEFAULT FALSE,
			tpm_version VARCHAR(50),
			quantum_hardware BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS software_assets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			inventory_asset_id UUID NOT NULL REFERENCES inventory_assets(id),
			software_type VARCHAR(100) NOT NULL,
			vendor VARCHAR(255),
			name VARCHAR(255) NOT NULL,
			version VARCHAR(100),
			license_type VARCHAR(100),
			dependencies JSONB,
			container_image VARCHAR(500),
			package_manager VARCHAR(100),
			programming_language VARCHAR(50),
			open_source BOOLEAN DEFAULT FALSE,
			sbom JSONB,
			last_patch_date DATE,
			eol_date DATE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS infrastructure_assets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			inventory_asset_id UUID NOT NULL REFERENCES inventory_assets(id),
			infrastructure_type VARCHAR(100) NOT NULL,
			resource_type VARCHAR(100),
			 service_name VARCHAR(255),
			configuration JSONB,
			network_config JSONB,
			encryption_at_rest BOOLEAN DEFAULT FALSE,
			encryption_in_transit BOOLEAN DEFAULT FALSE,
			private_endpoint BOOLEAN DEFAULT FALSE,
			vpc_id VARCHAR(100),
			subnet_ids TEXT[],
			security_groups TEXT[],
			access_control JSONB,
			monitoring_enabled BOOLEAN DEFAULT TRUE,
			backup_enabled BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS cloud_accounts (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			provider cloud_provider NOT NULL,
			account_id VARCHAR(100) NOT NULL,
			account_name VARCHAR(255),
			organization_id VARCHAR(100),
			credentials_encrypted JSONB,
			regions TEXT[],
			services TEXT[],
			status VARCHAR(50) DEFAULT 'active',
			last_scan_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(provider, account_id)
		);`,

		`CREATE TABLE IF NOT EXISTS compliance_frameworks (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			framework compliance_framework NOT NULL,
			scope VARCHAR(255),
			controls JSONB,
			status VARCHAR(50) DEFAULT 'not_started',
			score INTEGER,
			last_audit_at TIMESTAMP WITH TIME ZONE,
			next_audit_at TIMESTAMP WITH TIME ZONE,
			delve_integration BOOLEAN DEFAULT FALSE,
			kertos_integration BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(tenant_id, framework)
		);`,

		`CREATE TABLE IF NOT EXISTS compliance_controls (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
			control_id VARCHAR(50) NOT NULL,
			title VARCHAR(255) NOT NULL,
			description TEXT,
			category VARCHAR(100),
			sub_category VARCHAR(100),
			severity VARCHAR(20),
			status VARCHAR(50) DEFAULT 'pending',
			evidence JSONB,
			remediation TEXT,
			automated BOOLEAN DEFAULT FALSE,
			last_checked_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS risk_assessments (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			asset_id UUID REFERENCES inventory_assets(id),
			framework_id UUID REFERENCES compliance_frameworks(id),
			risk_type VARCHAR(100) NOT NULL,
			threat_category VARCHAR(100),
			vulnerability_category VARCHAR(100),
			risk_level risk_level NOT NULL,
			likelihood INTEGER CHECK (likelihood >= 1 AND likelihood <= 5),
			impact INTEGER CHECK (impact >= 1 AND impact <= 5),
			risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
			description TEXT,
			affected_systems TEXT[],
			mitigation_measures TEXT,
			residual_risk risk_level,
			status VARCHAR(50) DEFAULT 'open',
			assessed_by VARCHAR(255),
			assessment_date DATE,
			next_review_date DATE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS quantum_attestations (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			asset_id UUID REFERENCES inventory_assets(id),
			attestation_type VARCHAR(100) NOT NULL,
			quantum_network VARCHAR(255),
			quantum_provider VARCHAR(100),
			qubit_count INTEGER,
			error_rate DECIMAL(5,4),
			status attestation_status DEFAULT 'pending',
			attestation_data JSONB,
			attested_at TIMESTAMP WITH TIME ZONE,
			expires_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS terraform_assets (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			terraform_state_id VARCHAR(255),
			workspace VARCHAR(255),
			module_source VARCHAR(500),
			module_version VARCHAR(100),
			resource_type VARCHAR(100) NOT NULL,
			resource_name VARCHAR(255) NOT NULL,
			provider VARCHAR(100),
			configuration JSONB,
			cloud_provider cloud_provider,
			region VARCHAR(100),
			security_findings JSONB,
			compliance_violations JSONB,
			last_plan_at TIMESTAMP WITH TIME ZONE,
			last_apply_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS cncf_tools (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			tool_name VARCHAR(100) NOT NULL,
			tool_type VARCHAR(100),
			version VARCHAR(50),
			installation_type VARCHAR(100),
			endpoint VARCHAR(500),
			metrics_endpoint VARCHAR(500),
			status VARCHAR(50) DEFAULT 'active',
			configuration JSONB,
			security_scan_results JSONB,
			last_health_check_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS security_events (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			event_type VARCHAR(100) NOT NULL,
			severity VARCHAR(20) NOT NULL,
			source VARCHAR(255) NOT NULL,
			category VARCHAR(100),
			description TEXT,
			affected_assets UUID[],
			metadata JSONB,
			resolved BOOLEAN DEFAULT FALSE,
			resolved_by VARCHAR(255),
			resolved_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS kubernetes_clusters (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			cloud_account_id UUID REFERENCES cloud_accounts(id),
			name VARCHAR(255) NOT NULL,
			endpoint VARCHAR(500) NOT NULL,
			version VARCHAR(50),
			platform VARCHAR(100),
			provider cloud_provider,
			region VARCHAR(100),
			node_count INTEGER,
			status VARCHAR(50) DEFAULT 'active',
			security_config JSONB,
			network_policy_enabled BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS compliance_reports (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			report_type VARCHAR(100) NOT NULL,
			framework compliance_framework,
			title VARCHAR(255) NOT NULL,
			summary JSONB,
			details JSONB,
			risk_summary JSONB,
			recommendations JSONB,
			generated_by VARCHAR(255),
			generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS api_keys (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			name VARCHAR(255) NOT NULL,
			key_prefix VARCHAR(8) NOT NULL,
			key_hash VARCHAR(64) NOT NULL,
			role VARCHAR(50) DEFAULT 'viewer',
			scopes TEXT DEFAULT '',
			expires_at TIMESTAMP WITH TIME ZONE,
			last_used_at TIMESTAMP WITH TIME ZONE,
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS webhooks (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tenant_id UUID NOT NULL REFERENCES tenants(id),
			name VARCHAR(255) NOT NULL,
			url VARCHAR(1024) NOT NULL,
			secret VARCHAR(255) NOT NULL,
			events JSONB NOT NULL DEFAULT '[]',
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS webhook_deliveries (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
			event_type VARCHAR(100) NOT NULL,
			status VARCHAR(20) NOT NULL,
			status_code INT DEFAULT 0,
			response_body TEXT,
			delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255) DEFAULT '';`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query: %w", err)
		}
	}

	if err := createEnterpriseIndexes(db); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	logger.Info("Enterprise database migrations completed")
	return nil
}

func createEnterpriseIndexes(db *EnterpriseDB) error {
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_inventory_assets_tenant ON inventory_assets(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_inventory_assets_category ON inventory_assets(category);`,
		`CREATE INDEX IF NOT EXISTS idx_inventory_assets_cloud_provider ON inventory_assets(cloud_provider);`,
		`CREATE INDEX IF NOT EXISTS idx_inventory_assets_asset_id ON inventory_assets(asset_id);`,
		`CREATE INDEX IF NOT EXISTS idx_cryptographic_assets_inventory ON cryptographic_assets(inventory_asset_id);`,
		`CREATE INDEX IF NOT EXISTS idx_cryptographic_assets_quantum_safe ON cryptographic_assets(quantum_safe);`,
		`CREATE INDEX IF NOT EXISTS idx_ai_assets_inventory ON ai_assets(inventory_asset_id);`,
		`CREATE INDEX IF NOT EXISTS idx_hardware_assets_inventory ON hardware_assets(inventory_asset_id);`,
		`CREATE INDEX IF NOT EXISTS idx_software_assets_inventory ON software_assets(inventory_asset_id);`,
		`CREATE INDEX IF NOT EXISTS idx_infrastructure_assets_inventory ON infrastructure_assets(inventory_asset_id);`,
		`CREATE INDEX IF NOT EXISTS idx_cloud_accounts_tenant ON cloud_accounts(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_tenant ON compliance_frameworks(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_compliance_controls_framework ON compliance_controls(framework_id);`,
		`CREATE INDEX IF NOT EXISTS idx_risk_assessments_tenant ON risk_assessments(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_risk_assessments_asset ON risk_assessments(asset_id);`,
		`CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_level ON risk_assessments(risk_level);`,
		`CREATE INDEX IF NOT EXISTS idx_quantum_attestations_tenant ON quantum_attestations(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_terraform_assets_tenant ON terraform_assets(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_cncf_tools_tenant ON cncf_tools(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON security_events(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);`,
		`CREATE INDEX IF NOT EXISTS idx_kubernetes_clusters_tenant ON kubernetes_clusters(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant ON compliance_reports(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);`,
		`CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);`,
		`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered ON webhook_deliveries(delivered_at);`,
	}

	for _, idx := range indexes {
		if _, err := db.Exec(idx); err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	return nil
}
