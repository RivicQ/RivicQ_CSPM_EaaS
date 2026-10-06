package database

// migrations is the ordered, append-only schema ledger.
//
// Rules for editing this file:
//   - Never modify an applied migration. Append a new one.
//   - Every statement must be idempotent so a retried deployment is a no-op.
//   - A migration that changes tenant ownership must backfill before it
//     constrains, so no row is ever orphaned by the constraint.
//
// The checksum guard in migrate.go turns an edited migration into a startup
// failure rather than silent schema drift.

// CoreMigrations returns the ordered migration set applied at startup.
//
// It is exported so an integration test can apply, tamper with, and re-apply the
// exact same list the binary uses, rather than a copy that can drift.
func CoreMigrations() []Migration { return coreMigrations() }

func coreMigrations() []Migration {
	return []Migration{
		{
			ID:   "0001_core_schema",
			Name: "core schema: tenants, users, cbom_reports, assets, events, audit",
			Statements: []string{
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
					organisation TEXT NOT NULL DEFAULT '',
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
				);`,
				`ALTER TABLE users ADD COLUMN IF NOT EXISTS organisation TEXT NOT NULL DEFAULT '';`,
				`CREATE TABLE IF NOT EXISTS commercial_leads (
					id TEXT PRIMARY KEY,
					name TEXT,
					email TEXT NOT NULL,
					company TEXT,
					intent TEXT,
					source TEXT,
					stage TEXT,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
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
				`CREATE TABLE IF NOT EXISTS sso_configs (
					id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
					tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
					provider TEXT NOT NULL,
					enabled BOOLEAN DEFAULT FALSE,
					metadata JSONB,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					UNIQUE(tenant_id, provider)
				);`,
				`CREATE TABLE IF NOT EXISTS cloud_accounts (
					id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
					tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
					provider TEXT NOT NULL,
					account_id TEXT NOT NULL,
					account_name TEXT,
					status TEXT DEFAULT 'active',
					metadata JSONB,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
				);`,
			},
		},
		{
			ID:   "0002_core_indexes",
			Name: "core indexes for tenant-scoped access paths",
			Statements: []string{
				`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);`,
				`CREATE INDEX IF NOT EXISTS idx_cbom_reports_tenant_id ON cbom_reports(tenant_id);`,
				`CREATE INDEX IF NOT EXISTS idx_crypto_assets_cbom_report_id ON crypto_assets(cbom_report_id);`,
				`CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);`,
				`CREATE INDEX IF NOT EXISTS idx_kubernetes_clusters_tenant_id ON kubernetes_clusters(tenant_id);`,
				`CREATE INDEX IF NOT EXISTS idx_crypto_assets_quantum_safe ON crypto_assets(quantum_safe);`,
				`CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);`,
				`CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);`,
				`CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);`,
				`CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created ON audit_events(tenant_id, created_at DESC);`,
				`CREATE INDEX IF NOT EXISTS idx_security_events_tenant_unresolved ON security_events(tenant_id, resolved);`,
			},
		},
		{
			ID:   "0003_tenant_owned_crypto_assets",
			Name: "denormalise tenant ownership onto crypto_assets and quantum_attestations",
			Statements: []string{
				// Backfill before constraining: derive ownership from the owning
				// report so no existing row is orphaned by the NOT NULL.
				`ALTER TABLE crypto_assets ADD COLUMN IF NOT EXISTS tenant_id TEXT;`,
				`UPDATE crypto_assets ca
				 SET tenant_id = cr.tenant_id
				 FROM cbom_reports cr
				 WHERE ca.cbom_report_id = cr.id AND ca.tenant_id IS NULL;`,
				`DELETE FROM crypto_assets ca
				 WHERE ca.tenant_id IS NULL
				   AND NOT EXISTS (SELECT 1 FROM cbom_reports cr WHERE cr.id = ca.cbom_report_id);`,
				`DO $$ BEGIN
					ALTER TABLE crypto_assets
						ALTER COLUMN tenant_id SET NOT NULL;
					EXCEPTION WHEN others THEN
						RAISE NOTICE 'crypto_assets.tenant_id has orphan rows; leaving nullable for operator repair';
					END $$;`,
				`DO $$ BEGIN
					ALTER TABLE crypto_assets
						ADD CONSTRAINT crypto_assets_tenant_id_fkey
						FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
					EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
				`CREATE INDEX IF NOT EXISTS idx_crypto_assets_tenant_id ON crypto_assets(tenant_id);`,
				`CREATE INDEX IF NOT EXISTS idx_crypto_assets_tenant_algorithm ON crypto_assets(tenant_id, algorithm);`,

				`ALTER TABLE quantum_attestations ADD COLUMN IF NOT EXISTS tenant_id TEXT;`,
				`UPDATE quantum_attestations qa
				 SET tenant_id = cr.tenant_id
				 FROM cbom_reports cr
				 WHERE qa.cbom_report_id = cr.id AND qa.tenant_id IS NULL;`,
				`DO $$ BEGIN
					ALTER TABLE quantum_attestations
						ALTER COLUMN tenant_id SET NOT NULL;
					EXCEPTION WHEN others THEN
						RAISE NOTICE 'quantum_attestations.tenant_id has orphan rows; leaving nullable for operator repair';
					END $$;`,
				`DO $$ BEGIN
					ALTER TABLE quantum_attestations
						ADD CONSTRAINT quantum_attestations_tenant_id_fkey
						FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
					EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
				`CREATE INDEX IF NOT EXISTS idx_quantum_attestations_tenant_id ON quantum_attestations(tenant_id);`,
			},
		},
		{
			ID:   "0004_findings_lifecycle",
			Name: "fingerprinted findings with first_seen/last_seen/status lifecycle",
			Statements: []string{
				`CREATE TABLE IF NOT EXISTS findings (
					id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
					tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
					repository_id TEXT NOT NULL DEFAULT '',
					fingerprint TEXT NOT NULL,
					rule_id TEXT NOT NULL,
					title TEXT NOT NULL DEFAULT '',
					severity TEXT NOT NULL DEFAULT 'medium',
					confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5,
					crypto_algorithm TEXT NOT NULL DEFAULT '',
					crypto_primitive TEXT NOT NULL DEFAULT '',
					key_size INTEGER NOT NULL DEFAULT 0,
					file_path TEXT NOT NULL DEFAULT '',
					line_number INTEGER NOT NULL DEFAULT 0,
					evidence TEXT NOT NULL DEFAULT '',
					impact TEXT NOT NULL DEFAULT '',
					remediation TEXT NOT NULL DEFAULT '',
					pqc_class TEXT NOT NULL DEFAULT 'pqc_unknown',
					pqc_taxonomy_version TEXT NOT NULL DEFAULT '',
					pqc_reason TEXT NOT NULL DEFAULT '',
					risk_score INTEGER NOT NULL DEFAULT 0,
					risk_explanation JSONB,
					status TEXT NOT NULL DEFAULT 'new',
					scanner_version TEXT NOT NULL DEFAULT '',
					first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					resolved_at TIMESTAMP WITH TIME ZONE,
					reopened_at TIMESTAMP WITH TIME ZONE,
					ignored_reason TEXT NOT NULL DEFAULT '',
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					UNIQUE(tenant_id, fingerprint)
				);`,
				`CREATE INDEX IF NOT EXISTS idx_findings_tenant_status ON findings(tenant_id, status);`,
				`CREATE INDEX IF NOT EXISTS idx_findings_tenant_severity ON findings(tenant_id, severity);`,
				`CREATE INDEX IF NOT EXISTS idx_findings_tenant_rule ON findings(tenant_id, rule_id);`,
				`CREATE INDEX IF NOT EXISTS idx_findings_last_seen ON findings(last_seen DESC);`,
			},
		},
		{
			ID:   "0005_audit_event_actor_and_action",
			Name: "explicit audit actor/action columns for the security event vocabulary",
			Statements: []string{
				`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_role TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS resource_id TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS result TEXT NOT NULL DEFAULT '';`,
				`CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(event_type, created_at DESC);`,
			},
		},
		{
			ID:   "0006_repositories",
			Name: "connected repositories as the owner of scans",
			Statements: []string{
				`CREATE TABLE IF NOT EXISTS repositories (
					id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
					tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
					provider TEXT NOT NULL DEFAULT 'github',
					full_name TEXT NOT NULL,
					default_branch TEXT NOT NULL DEFAULT 'main',
					visibility TEXT NOT NULL DEFAULT 'private',
					connection_id TEXT NOT NULL DEFAULT '',
					status TEXT NOT NULL DEFAULT 'connected',
					last_scanned_at TIMESTAMP WITH TIME ZONE,
					metadata JSONB,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
					UNIQUE(tenant_id, provider, full_name)
				);`,
				`CREATE INDEX IF NOT EXISTS idx_repositories_tenant ON repositories(tenant_id);`,
			},
		},
		{
			ID:   "0007_converge_legacy_columns",
			Name: "add columns the query layer reads to pre-existing legacy tables",
			Statements: []string{
				// Every statement here is CREATE TABLE IF NOT EXISTS's blind spot.
				// If a table already existed with an older shape, 0001 skipped it
				// and the application then failed on "column does not exist".
				// Adding columns idempotently is the only safe repair: renaming or
				// retyping a primary key in place is not.

				`ALTER TABLE cbom_reports ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '1';`,
				`ALTER TABLE cbom_reports ADD COLUMN IF NOT EXISTS cyclonedx_bom JSONB NOT NULL DEFAULT '{}'::jsonb;`,
				`ALTER TABLE cbom_reports ADD COLUMN IF NOT EXISTS metadata JSONB;`,
				`ALTER TABLE cbom_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();`,

				`ALTER TABLE crypto_assets ADD COLUMN IF NOT EXISTS key_size INTEGER;`,
				`ALTER TABLE crypto_assets ADD COLUMN IF NOT EXISTS usage TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE crypto_assets ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE crypto_assets ADD COLUMN IF NOT EXISTS vulnerability_score INTEGER;`,
				`ALTER TABLE crypto_assets ADD COLUMN IF NOT EXISTS metadata JSONB;`,
				`ALTER TABLE crypto_assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();`,
				`ALTER TABLE crypto_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();`,

				// Legacy deployments called this key_size column key_length. Copy it
				// across when the legacy column is present, then leave the old
				// column alone: dropping a column an operator still reads is not
				// this migration's decision.
				`DO $$ BEGIN
					IF EXISTS (
						SELECT 1 FROM information_schema.columns
						 WHERE table_schema = 'public' AND table_name = 'crypto_assets' AND column_name = 'key_length'
					) THEN
						UPDATE crypto_assets SET key_size = key_length WHERE key_size IS NULL;
					END IF;
				END $$;`,

				`ALTER TABLE quantum_attestations ADD COLUMN IF NOT EXISTS attestation_type TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE quantum_attestations ADD COLUMN IF NOT EXISTS quantum_network TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE quantum_attestations ADD COLUMN IF NOT EXISTS result JSONB;`,
				`ALTER TABLE quantum_attestations ADD COLUMN IF NOT EXISTS attested_at TIMESTAMP WITH TIME ZONE;`,
				`ALTER TABLE quantum_attestations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();`,
				`ALTER TABLE quantum_attestations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();`,

				`ALTER TABLE security_events ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE security_events ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE security_events ADD COLUMN IF NOT EXISTS metadata JSONB;`,
				`ALTER TABLE security_events ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT false;`,

				`ALTER TABLE kubernetes_clusters ADD COLUMN IF NOT EXISTS endpoint TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE kubernetes_clusters ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE kubernetes_clusters ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE kubernetes_clusters ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE kubernetes_clusters ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT '';`,
				`ALTER TABLE kubernetes_clusters ADD COLUMN IF NOT EXISTS metadata JSONB;`,

				// Ownership must not drift: an asset has to belong to the same
				// tenant as the report it hangs off. Two independent foreign keys
				// allowed tenant-b to attach an asset to tenant-a's report, which
				// then shows up in neither tenant's queries but still exists.
				`DO $$ BEGIN
					ALTER TABLE cbom_reports
						ADD CONSTRAINT cbom_reports_id_tenant_key UNIQUE (id, tenant_id);
				EXCEPTION WHEN duplicate_table THEN NULL;
					WHEN others THEN RAISE NOTICE 'could not add cbom_reports_id_tenant_key'; END $$;`,
				`DO $$ BEGIN
					ALTER TABLE crypto_assets
						ADD CONSTRAINT crypto_assets_report_tenant_fkey
						FOREIGN KEY (cbom_report_id, tenant_id)
						REFERENCES cbom_reports(id, tenant_id) ON DELETE CASCADE;
				EXCEPTION WHEN others THEN RAISE NOTICE 'crypto_assets ownership constraint not added'; END $$;`,
				`DO $$ BEGIN
					ALTER TABLE quantum_attestations
						ADD CONSTRAINT quantum_attestations_report_tenant_fkey
						FOREIGN KEY (cbom_report_id, tenant_id)
						REFERENCES cbom_reports(id, tenant_id) ON DELETE CASCADE;
				EXCEPTION WHEN others THEN RAISE NOTICE 'quantum_attestations ownership constraint not added'; END $$;`,
			},
		},
	}
}
