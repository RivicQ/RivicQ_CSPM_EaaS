-- CryptoBOM SaaS – Multi-Cloud Orchestration Schema
-- PostgreSQL 15
-- Migration 003: Adds tables for multi-cloud deployment orchestration,
--                cloud account registry, and compliance run tracking.

-- Cloud accounts managed by this CryptoBOM instance
CREATE TABLE IF NOT EXISTS cloud_accounts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider     TEXT NOT NULL CHECK (provider IN ('gcp', 'aws', 'ibm')),  -- 'gcp' | 'aws' | 'ibm'
    account_id   TEXT NOT NULL,                         -- GCP project ID / AWS account ID / IBM account ID
    display_name TEXT NOT NULL,
    region       TEXT,
    status       TEXT NOT NULL DEFAULT 'active',        -- 'active' | 'inactive' | 'error'
    config       JSONB,                                 -- provider-specific metadata (no secrets)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, provider, account_id)
);

CREATE INDEX IF NOT EXISTS idx_cloud_accounts_org ON cloud_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_cloud_accounts_provider ON cloud_accounts(provider);

-- Multi-cloud scan orchestration jobs
CREATE TABLE IF NOT EXISTS cloud_scan_jobs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    account_id       UUID REFERENCES cloud_accounts(id) ON DELETE SET NULL,
    provider         TEXT NOT NULL CHECK (provider IN ('gcp', 'aws', 'ibm')),
    scan_type        TEXT NOT NULL DEFAULT 'full',      -- 'full' | 'incremental' | 'targeted'
    status           TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'running' | 'completed' | 'failed'
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    assets_discovered INT DEFAULT 0,
    error_message    TEXT,
    metadata         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cloud_scan_jobs_org ON cloud_scan_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_cloud_scan_jobs_status ON cloud_scan_jobs(status);

-- Compliance framework runs
CREATE TABLE IF NOT EXISTS compliance_runs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework     TEXT NOT NULL,   -- 'BSI_TR-02102' | 'eIDAS_2.0' | 'DORA' | 'FIPS_140-3' | 'ISO_27001' | 'NIST_PQC'
    status        TEXT NOT NULL DEFAULT 'pending',
    score         NUMERIC(5,2),   -- 0.00–100.00
    findings      INT DEFAULT 0,
    critical      INT DEFAULT 0,
    high          INT DEFAULT 0,
    medium        INT DEFAULT 0,
    low           INT DEFAULT 0,
    report_url    TEXT,
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    metadata      JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_runs_org_framework ON compliance_runs(org_id, framework);
CREATE INDEX IF NOT EXISTS idx_compliance_runs_status ON compliance_runs(status);

-- Quantum attestation results (extends quantum_scans from 002)
CREATE TABLE IF NOT EXISTS quantum_attestations (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id         UUID REFERENCES crypto_assets(id) ON DELETE CASCADE,
    attestation_type TEXT NOT NULL DEFAULT 'pqc_readiness',
    level            TEXT NOT NULL DEFAULT 'detection',  -- 'detection' | 'assessment' | 'certified'
    pqc_ready        BOOLEAN NOT NULL DEFAULT FALSE,
    algorithms_at_risk TEXT[],
    recommended_migration TEXT[],
    risk_score       NUMERIC(5,2),
    notes            TEXT,
    attested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMPTZ,
    metadata         JSONB
);

CREATE INDEX IF NOT EXISTS idx_quantum_attestations_org ON quantum_attestations(org_id);
CREATE INDEX IF NOT EXISTS idx_quantum_attestations_asset ON quantum_attestations(asset_id);

-- HSM key rotation audit log
CREATE TABLE IF NOT EXISTS hsm_key_rotations (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    hsm_key_id     UUID REFERENCES hsm_keys(id) ON DELETE SET NULL,
    rotation_type  TEXT NOT NULL DEFAULT 'scheduled',   -- 'scheduled' | 'emergency' | 'compliance'
    old_key_id     TEXT,
    new_key_id     TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    initiated_by   TEXT,
    completed_at   TIMESTAMPTZ,
    metadata       JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsm_key_rotations_org ON hsm_key_rotations(org_id);
