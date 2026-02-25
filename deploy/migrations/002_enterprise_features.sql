-- CryptoBOM SaaS - Enterprise Features Schema
-- PostgreSQL 15

CREATE TABLE IF NOT EXISTS hsm_keys (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_hsm_keys_org_provider ON hsm_keys(org_id, provider);

CREATE TABLE IF NOT EXISTS quantum_scans (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id             UUID REFERENCES assets(id) ON DELETE SET NULL,
    risk_score           INT NOT NULL DEFAULT 0,
    pqc_algorithms       JSONB NOT NULL DEFAULT '[]',
    vulnerable_algorithms JSONB NOT NULL DEFAULT '[]',
    migration_status     TEXT NOT NULL DEFAULT 'not_started',
    attestation_report   JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cloud_connections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL,
    region          TEXT,
    status          TEXT NOT NULL DEFAULT 'unknown',
    latency_ms      INT,
    last_checked    TIMESTAMPTZ,
    config          JSONB NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_connections_org_provider ON cloud_connections(org_id, provider);

CREATE TABLE IF NOT EXISTS compliance_reports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    standard    TEXT NOT NULL,
    score       INT NOT NULL DEFAULT 0,
    findings    JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    resource        TEXT NOT NULL,
    resource_id     TEXT,
    source_cloud    TEXT,
    source_ip       TEXT,
    details         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_org_id ON audit_events(org_id, created_at DESC);
