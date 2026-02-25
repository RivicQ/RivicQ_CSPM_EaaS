-- CryptoBOM SaaS - Multi-Cloud Orchestration Schema
-- PostgreSQL 15
-- Migration 003: adds tables for multi-cloud health tracking,
-- HSM key-rotation schedules, and PQC migration progress.

-- Track per-provider health snapshots for the orchestration dashboard
CREATE TABLE IF NOT EXISTS cloud_health_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL,                 -- gcp | aws | ibm
    region          TEXT NOT NULL,
    component       TEXT NOT NULL,                 -- hsm | kms | gke | hpcs | quantum
    status          TEXT NOT NULL DEFAULT 'unknown', -- healthy | degraded | unavailable
    latency_ms      INT,
    details         JSONB NOT NULL DEFAULT '{}',
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cloud_health_org_provider
    ON cloud_health_snapshots(org_id, provider, recorded_at DESC);

-- HSM key-rotation schedule across providers (AWS CloudHSM, GCP KMS, IBM HPCS)
CREATE TABLE IF NOT EXISTS hsm_rotation_schedules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    hsm_key_id      UUID REFERENCES hsm_keys(id) ON DELETE SET NULL,
    provider        TEXT NOT NULL,
    rotation_period_days INT NOT NULL DEFAULT 90,
    last_rotated_at TIMESTAMPTZ,
    next_rotation_at TIMESTAMPTZ NOT NULL,
    auto_rotate     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsm_rotation_next
    ON hsm_rotation_schedules(next_rotation_at)
    WHERE auto_rotate = TRUE;

-- PQC migration progress tracker per asset and target algorithm
CREATE TABLE IF NOT EXISTS pqc_migration_progress (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id        UUID REFERENCES assets(id) ON DELETE SET NULL,
    current_algo    TEXT NOT NULL,
    target_algo     TEXT NOT NULL,
    nist_standard   TEXT,                          -- FIPS-203 | FIPS-204 | FIPS-205
    priority        INT NOT NULL DEFAULT 5,        -- 1 = highest
    status          TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | completed | deferred
    deadline        DATE,
    completed_at    TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pqc_migration_org_status
    ON pqc_migration_progress(org_id, status, priority);

-- Multi-cloud deployment events for audit traceability
CREATE TABLE IF NOT EXISTS deployment_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID REFERENCES organizations(id) ON DELETE SET NULL,
    clouds          TEXT[] NOT NULL,               -- e.g. {gcp,aws,ibm}
    environment     TEXT NOT NULL DEFAULT 'production',
    image_tag       TEXT NOT NULL,
    triggered_by    TEXT,                          -- user/SA that triggered the deploy
    status          TEXT NOT NULL DEFAULT 'in_progress',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    details         JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_deployment_events_status
    ON deployment_events(status, started_at DESC);
