-- CryptoBOM SaaS - Add auth columns to existing users tables
-- PostgreSQL 15

-- Add auth columns to users table in migration schema (org-based)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_secret TEXT;

-- Add auth columns to users table in database.go schema (tenant-based)
-- This handles the case where the table was created by the application's createTables()
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';
        EXCEPTION WHEN duplicate_column THEN
            NULL;
        END;
        BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        EXCEPTION WHEN duplicate_column THEN
            NULL;
        END;
        BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
        EXCEPTION WHEN duplicate_column THEN
            NULL;
        END;
    END IF;
END $$;
