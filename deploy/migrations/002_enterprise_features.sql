-- CryptoBOM SaaS - Enterprise Features Schema
-- PostgreSQL 15
--
-- NOTE: this file is applied AFTER 001_initial_schema.sql on fresh installs.
-- The embedded Go migrations in internal/database/enterprise_database.go are
-- the source of truth at runtime; this file mirrors that schema for manual /
-- ops-managed installs. Tables reference `tenants` (not `organizations`),
-- matching the Go schema.

-- HSM Key Management
CREATE TABLE IF NOT EXISTS hsm_keys (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider          TEXT NOT NULL,
    key_id            TEXT NOT NULL,
    hsm_cluster_id    TEXT,
    key_type          TEXT,
    key_size          INT,
    attestation_cert  TEXT,
    status            TEXT NOT NULL DEFAULT 'active',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsm_keys_org_provider
ON hsm_keys(org_id, provider);


-- Quantum Security Scans
CREATE TABLE IF NOT EXISTS quantum_scans (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asset_id              UUID REFERENCES inventory_assets(id) ON DELETE SET NULL,
    risk_score            INT NOT NULL DEFAULT 0,
    pqc_algorithms        JSONB NOT NULL DEFAULT '[]',
    vulnerable_algorithms JSONB NOT NULL DEFAULT '[]',
    migration_status      TEXT NOT NULL DEFAULT 'not_started',
    attestation_report    JSONB,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quantum_scans_org_id
ON quantum_scans(org_id);


-- Cloud Connections
CREATE TABLE IF NOT EXISTS cloud_connections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL,
    account_id      TEXT,
    region          TEXT,
    status          TEXT NOT NULL DEFAULT 'active',
    credentials     JSONB,
    last_scan_at    TIMESTAMPTZ,
    score           INT NOT NULL DEFAULT 0,
    findings        JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cloud_connections_org_id
ON cloud_connections(org_id);


-- Enterprise Compliance Events
-- NOTE:
-- audit_events already exists in 001_initial_schema.sql
-- so we create enterprise audit events separately

CREATE TABLE IF NOT EXISTS enterprise_audit_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    resource        TEXT NOT NULL,
    resource_id     TEXT,
    source_cloud    TEXT,
    source_ip       TEXT,
    details         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_events_org_id
ON enterprise_audit_events(org_id, created_at DESC);
