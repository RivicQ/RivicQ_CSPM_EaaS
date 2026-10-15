-- Indexes for the SQL migration chain (001_initial_schema.sql).
-- Idempotent and guarded: a database that only has the Go ledger
-- (internal/database/migrations.go) may not have scan_jobs, assets, or
-- bom_reports. Missing tables are skipped. This file does not enable RLS
-- and does not rewrite 002_enterprise_features.sql.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tenant_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scan_jobs' AND column_name = 'tenant_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_scan_jobs_tenant_created ON scan_jobs(tenant_id, created_at DESC);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bom_reports' AND column_name = 'tenant_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_bom_reports_tenant_created ON bom_reports(tenant_id, created_at DESC);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bom_reports' AND column_name = 'asset_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_bom_reports_asset_id ON bom_reports(asset_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'tenant_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_assets_tenant_created ON assets(tenant_id, created_at DESC);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_events' AND column_name = 'tenant_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created ON audit_events(tenant_id, created_at DESC);
  END IF;
END $$;
