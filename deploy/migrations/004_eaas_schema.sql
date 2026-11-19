-- RivicQ Encryption-as-a-Service — standalone product schema
-- PostgreSQL 15+. Applied after 003_add_auth_columns.sql.
-- The sandbox file store implements the same model for local development only.

CREATE TABLE IF NOT EXISTS eaas_accounts (
    id                     TEXT PRIMARY KEY,
    email                  TEXT NOT NULL UNIQUE,
    name                   TEXT NOT NULL,
    password_hash          TEXT NOT NULL,
    verified               BOOLEAN NOT NULL DEFAULT FALSE,
    verification_hash      TEXT,
    verification_expires   TIMESTAMPTZ,
    failed_verifications   INT NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eaas_sessions (
    token_hash   TEXT PRIMARY KEY,
    account_id   TEXT NOT NULL REFERENCES eaas_accounts(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eaas_sessions_expiry ON eaas_sessions(expires_at);

CREATE TABLE IF NOT EXISTS eaas_projects (
    id           TEXT PRIMARY KEY,
    account_id   TEXT NOT NULL REFERENCES eaas_accounts(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    environment  TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eaas_projects_account ON eaas_projects(account_id);

CREATE TABLE IF NOT EXISTS eaas_api_keys (
    id           TEXT PRIMARY KEY,
    account_id   TEXT NOT NULL REFERENCES eaas_accounts(id) ON DELETE CASCADE,
    project_id   TEXT NOT NULL REFERENCES eaas_projects(id) ON DELETE CASCADE,
    prefix       TEXT NOT NULL,
    key_hash     TEXT NOT NULL UNIQUE,
    environment  TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_eaas_keys_project ON eaas_api_keys(project_id);

-- Server-held key material. In production these columns must be backed by an
-- HSM/KMS reference rather than bytes; byte storage is sandbox-only.
CREATE TABLE IF NOT EXISTS eaas_crypto_keys (
    id           TEXT PRIMARY KEY,
    account_id   TEXT NOT NULL REFERENCES eaas_accounts(id) ON DELETE CASCADE,
    project_id   TEXT NOT NULL REFERENCES eaas_projects(id) ON DELETE CASCADE,
    algorithm    TEXT NOT NULL CHECK (algorithm IN ('aes-256-gcm','hmac-sha-256','mlkem-768','mldsa-65')),
    private_b64  TEXT NOT NULL,
    public_b64   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eaas_crypto_keys_project ON eaas_crypto_keys(project_id);

-- Metadata only: never add plaintext, ciphertext, signatures or secrets.
CREATE TABLE IF NOT EXISTS eaas_usage_events (
    id           TEXT PRIMARY KEY,
    account_id   TEXT NOT NULL REFERENCES eaas_accounts(id) ON DELETE CASCADE,
    project_id   TEXT NOT NULL REFERENCES eaas_projects(id) ON DELETE CASCADE,
    key_id       TEXT NOT NULL REFERENCES eaas_api_keys(id) ON DELETE SET NULL,
    operation    TEXT NOT NULL,
    category     TEXT NOT NULL,
    environment  TEXT NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('success','failure','rejected')),
    error_code   TEXT,
    latency_ms   BIGINT NOT NULL DEFAULT 0,
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eaas_usage_period ON eaas_usage_events(account_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS eaas_subscriptions (
    account_id      TEXT PRIMARY KEY REFERENCES eaas_accounts(id) ON DELETE CASCADE,
    plan            TEXT NOT NULL CHECK (plan IN ('free','startup','professional','enterprise')),
    status          TEXT NOT NULL DEFAULT 'active',
    billing_status  TEXT NOT NULL DEFAULT 'not_required',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eaas_beta_registrations (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    work_email        TEXT NOT NULL UNIQUE,
    organisation      TEXT NOT NULL,
    role              TEXT,
    use_case          TEXT NOT NULL,
    edition_interest  JSONB NOT NULL DEFAULT '[]',
    deployments       JSONB NOT NULL DEFAULT '[]',
    integrations      JSONB NOT NULL DEFAULT '[]',
    consent           BOOLEAN NOT NULL CHECK (consent IS TRUE),
    status            TEXT NOT NULL DEFAULT 'received_pending_review',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant isolation must be enforced in the data-access layer using account_id
-- resolved from the authenticated credential; client-supplied tenant headers
-- are never trusted.
