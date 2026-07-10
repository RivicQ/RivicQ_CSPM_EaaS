-- CryptoBOM SaaS - Initial Schema
-- PostgreSQL 15

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS organizations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    plan        TEXT NOT NULL DEFAULT 'oss',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'viewer',
    password    TEXT NOT NULL DEFAULT '',
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    cloud_provider  TEXT,
    category        TEXT,
    algorithm       TEXT,
    key_size        INT,
    quantum_safe    BOOLEAN NOT NULL DEFAULT FALSE,
    risk_level      TEXT NOT NULL DEFAULT 'UNKNOWN',
    compliance_score FLOAT NOT NULL DEFAULT 0,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_org_id ON assets(org_id);
CREATE INDEX IF NOT EXISTS idx_assets_cloud_provider ON assets(cloud_provider);
CREATE INDEX IF NOT EXISTS idx_assets_algorithm ON assets(algorithm);

CREATE TABLE IF NOT EXISTS scan_jobs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending',
    scan_type   TEXT NOT NULL DEFAULT 'quick',
    started_at  TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    findings    INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_reports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id    UUID REFERENCES assets(id) ON DELETE SET NULL,
    format      TEXT NOT NULL DEFAULT 'cyclonedx',
    content     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
    event_type  TEXT NOT NULL,
    request_id  TEXT,
    method      TEXT,
    path        TEXT,
    status      INT,
    latency_ms  INT,
    ip          TEXT,
    user_agent  TEXT,
    actor_id    TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
