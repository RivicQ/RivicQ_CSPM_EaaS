-- CryptoBOM SaaS — Enterprise Features Schema
-- PostgreSQL 15

-- HSM-managed keys (GCP HSM, AWS CloudHSM, IBM HPCS)
CREATE TABLE hsm_keys (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,   -- 'gcp', 'aws', 'ibm'
  key_id           TEXT NOT NULL,
  hsm_cluster_id   TEXT,
  key_ring         TEXT,
  algorithm        TEXT NOT NULL,
  key_length       INTEGER,
  state            TEXT NOT NULL DEFAULT 'active',
  quantum_safe     BOOLEAN NOT NULL DEFAULT FALSE,
  attestation_cert TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_rotated     TIMESTAMPTZ,
  UNIQUE (provider, key_id, org_id)
);

CREATE INDEX idx_hsm_keys_org_id   ON hsm_keys(org_id);
CREATE INDEX idx_hsm_keys_provider ON hsm_keys(provider);

-- Quantum scans
CREATE TABLE quantum_scans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id              UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  risk_score            INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  pqc_algorithms        JSONB NOT NULL DEFAULT '[]',
  vulnerable_algorithms JSONB NOT NULL DEFAULT '[]',
  migration_status      TEXT NOT NULL DEFAULT 'not_started',
  migration_priority    TEXT NOT NULL DEFAULT 'low',
  attestation_status    TEXT,
  nist_compliant        BOOLEAN,
  scanned_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata              JSONB DEFAULT '{}'
);

CREATE INDEX idx_quantum_scans_asset_id    ON quantum_scans(asset_id);
CREATE INDEX idx_quantum_scans_risk_score  ON quantum_scans(risk_score);

-- Multi-cloud connections
CREATE TABLE cloud_connections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,   -- 'gcp', 'aws', 'ibm'
  region       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'disconnected',
  latency_ms   INTEGER,
  last_checked TIMESTAMPTZ,
  credentials  JSONB DEFAULT '{}',   -- reference to secret, not actual creds
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, provider, region)
);

CREATE INDEX idx_cloud_connections_org_id   ON cloud_connections(org_id);
CREATE INDEX idx_cloud_connections_provider ON cloud_connections(provider);

-- Compliance reports
CREATE TABLE compliance_reports (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  standard   TEXT NOT NULL,   -- 'FIPS-140-3', 'BSI-TR-02102', 'DORA', 'eIDAS'
  score      INTEGER CHECK (score BETWEEN 0 AND 100),
  compliant  BOOLEAN NOT NULL DEFAULT FALSE,
  findings   JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until  TIMESTAMPTZ
);

CREATE INDEX idx_compliance_reports_org_id   ON compliance_reports(org_id);
CREATE INDEX idx_compliance_reports_standard ON compliance_reports(standard);

-- Audit events
CREATE TABLE audit_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  action       TEXT NOT NULL,
  resource     TEXT NOT NULL,
  resource_id  UUID,
  source_cloud TEXT,
  source_ip    TEXT,
  user_agent   TEXT,
  result       TEXT NOT NULL DEFAULT 'success',
  details      JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_org_id     ON audit_events(org_id);
CREATE INDEX idx_audit_events_user_id    ON audit_events(user_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_action     ON audit_events(action);

-- IBM attestations
CREATE TABLE ibm_attestations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_id       TEXT NOT NULL,
  instance_id  TEXT NOT NULL,
  certificate  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'verified',
  nist_compliant BOOLEAN NOT NULL DEFAULT FALSE,
  attested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until  TIMESTAMPTZ
);

CREATE INDEX idx_ibm_attestations_org_id ON ibm_attestations(org_id);
CREATE INDEX idx_ibm_attestations_key_id ON ibm_attestations(key_id);
