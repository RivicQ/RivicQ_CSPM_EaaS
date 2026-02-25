-- CryptoBOM SaaS — Initial Database Schema
-- PostgreSQL 15

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'oss',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'viewer',
  password_hash TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org_id ON users(org_id);

-- Assets
CREATE TABLE assets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  cloud_provider TEXT NOT NULL DEFAULT 'unknown',
  category       TEXT NOT NULL DEFAULT 'unknown',
  algorithm      TEXT,
  key_size       INTEGER,
  quantum_safe   BOOLEAN NOT NULL DEFAULT FALSE,
  risk_level     TEXT NOT NULL DEFAULT 'unknown',
  compliance_score DECIMAL(5,2),
  status         TEXT NOT NULL DEFAULT 'active',
  location       TEXT,
  owner          TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_org_id ON assets(org_id);
CREATE INDEX idx_assets_cloud_provider ON assets(cloud_provider);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_quantum_safe ON assets(quantum_safe);
CREATE INDEX idx_assets_risk_level ON assets(risk_level);

-- Crypto algorithms per asset
CREATE TABLE crypto_algorithms (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id         UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  key_size         INTEGER,
  quantum_vulnerable BOOLEAN NOT NULL DEFAULT FALSE,
  usage            TEXT,
  detected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crypto_algorithms_asset_id ON crypto_algorithms(asset_id);
CREATE INDEX idx_crypto_algorithms_quantum_vulnerable ON crypto_algorithms(quantum_vulnerable);

-- Scan jobs
CREATE TABLE scan_jobs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'pending',
  scan_type      TEXT NOT NULL DEFAULT 'full',
  target_ids     UUID[] DEFAULT '{}',
  findings_count INTEGER DEFAULT 0,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  error          TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scan_jobs_org_id ON scan_jobs(org_id);
CREATE INDEX idx_scan_jobs_status ON scan_jobs(status);

-- BOM reports
CREATE TABLE bom_reports (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id   UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  format     TEXT NOT NULL DEFAULT 'cyclonedx',
  version    TEXT NOT NULL DEFAULT '1.0.0',
  content    JSONB NOT NULL DEFAULT '{}',
  hash       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bom_reports_asset_id ON bom_reports(asset_id);

-- API keys
CREATE TABLE api_keys (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id),
  name       TEXT NOT NULL,
  key_hash   TEXT NOT NULL UNIQUE,
  scopes     TEXT[] DEFAULT '{}',
  last_used  TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_org_id ON api_keys(org_id);
