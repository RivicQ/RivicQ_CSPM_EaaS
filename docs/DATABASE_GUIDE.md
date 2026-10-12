# Database Guide

How RivicQ CSPM / CryptoBOM EaaS stores data, how to configure and migrate it,
and how to keep it locked down. See `docs/MASTER_RULES.md` rules 6 and 7 for the
mandatory rules this guide implements.

## Contents

- [Overview](#overview)
- [Connection configuration](#connection-configuration)
- [Demo (in-memory) mode](#demo-in-memory-mode)
- [Schema and migrations](#schema-and-migrations)
- [Migration workflow](#migration-workflow)
- [Tenant-scoped queries](#tenant-scoped-queries)
- [Least-privilege database roles](#least-privilege-database-roles)
- [TLS](#tls)
- [Backups](#backups)
- [Row-level security (Supabase)](#row-level-security-supabase)
- [Operational checks](#operational-checks)

## Overview

The backend uses PostgreSQL through `database/sql` with the `github.com/lib/pq`
driver. The connection, pooling, and migration entry points live in
`internal/database/`:

| File | Responsibility |
|------|----------------|
| `internal/database/database.go` | Connect, pool settings, readiness, demo gate, `RunMigrations` |
| `internal/database/migrate.go` | Migration engine: ledger, checksums, apply |
| `internal/database/migrations.go` | Core schema migrations (`coreMigrations`, `CoreMigrations`) |
| `internal/database/queries.go` | Tenant-scoped query layer (`Queries`) |
| `internal/database/enterprise_database.go` | Enterprise control-plane schema and migrations |
| `internal/authn/store_sql.go` | SQL-backed auth store (`users`, `auth_sessions`, `auth_tokens`) |

Two migration sources exist by design:

1. **Go migrations** (`internal/database/migrations.go`) run automatically at
   startup (`RunMigrations`) and via `ApplyMigrations`. They are the source of
   truth for the running binary.
2. **SQL files** (`deploy/migrations/*.sql`) are applied by the Docker Compose
   `migrate` service and `make migrate`. `deploy/migrations/` currently holds
   `001_initial_schema.sql`, `002_enterprise_features.sql`, and
   `003_add_auth_columns.sql`.

## Connection configuration

The DSN is resolved in `internal/database/database.go`:

- If `DATABASE_URL` is set, it is used verbatim.
- Otherwise, a DSN is built from discrete variables:

| Variable | Default | Notes |
|----------|---------|-------|
| `CRYPTOBOM_DB_HOST` | `localhost` | |
| `CRYPTOBOM_DB_PORT` | `5432` | |
| `CRYPTOBOM_DB_USER` | `cryptobom` | Use a least-privilege role (below) |
| `CRYPTOBOM_DB_PASSWORD` | *(none)* | **Required**; no fallback password |
| `CRYPTOBOM_DB_NAME` | `cryptobom_saas` | |
| `CRYPTOBOM_DB_SSLMODE` | `disable` | Set explicitly in production |

Pool settings applied on a successful connect: `SetMaxOpenConns(25)`,
`SetMaxIdleConns(25)`, `SetConnMaxLifetime(5 * time.Minute)`. A `Ping` must
succeed or `New` returns an error.

The application refuses to start against a database using a default password:
"`CRYPTOBOM_DB_PASSWORD is not set (refusing to fall back to a default database
password)`".

`.env.example` and `docs/DEPLOY_ENV.md` document the same variables. A typical
production DSN:

```
DATABASE_URL=postgresql://cryptobom_app:REPLACE_ME@db.internal:5432/cryptobom_saas?sslmode=verify-full
```

## Demo (in-memory) mode

The server never silently degrades to fabricated data. `NewOptional` reports
whether a real database is available; on failure the process starts degraded:

- `/healthz` still answers so a probe can see the process.
- `/readyz` returns `503` while there is no database (or while demo mode is
  active), so a load balancer will not route to it.
- Demo mode is only used when `RIVICQ_ALLOW_DEMO_MODE` is explicitly enabled
  (`DemoMode()` in `internal/database/database.go`).
- Auth falls back to an in-memory store, `authn.NewMemStore`
  (`internal/authn/store.go`). It is safe for concurrent use but **not shared
  across processes** and is not durable.

Never run a demo-mode instance as production, and never present demo data as
live (`docs/MASTER_RULES.md` rule 10).

## Schema and migrations

Core migrations (`internal/database/migrations.go`) are ordered and append-only:

| ID | Name |
|----|------|
| `0001_core_schema` | tenants, users, cbom_reports, crypto_assets, security_events, audit_events, commercial_leads |
| `0002_core_indexes` | tenant-scoped access-path indexes |
| `0003_tenant_owned_crypto_assets` | denormalise tenant ownership onto `crypto_assets`, `quantum_attestations` |
| `0004_findings_lifecycle` | fingerprinted findings with `first_seen`/`last_seen`/`status` |
| `0005_audit_event_actor_and_action` | explicit audit actor/action columns |
| `0006_repositories` | connected repositories as the owner of scans |
| `0007_converge_legacy_columns` | columns the query layer reads on legacy tables |
| `0008_authn_lifecycle` | user flags, refresh sessions, single-use tokens |

Engine behavior (`internal/database/migrate.go`):

- Every applied migration is recorded in `schema_migrations`
  (`id`, `name`, `checksum`, `applied_at`, `duration_ms`).
- Statements are idempotent (`IF NOT EXISTS` / guarded `DO` blocks) so a retried
  deployment is a no-op.
- A migration that changes tenant ownership must **backfill before it
  constrains**, so no row is orphaned (`0003` is the worked example).
- A changed checksum for an already-applied ID is reported as **drift** and
  fails startup rather than being silently ignored.
- Dollar-quoted bodies are preserved verbatim; line comments and whitespace are
  normalized so reformatting is not drift.

`RunMigrations` is called at startup by both editions
(`cmd/server/oss/main.go`, `internal/server/server.go`). The Enterprise binary
also runs `RunEnterpriseMigrations` (`internal/database/enterprise_database.go`).

## Migration workflow

1. **Never edit an applied migration.** Append a new one with the next ID. The
   checksum guard turns an edit into a startup failure.
2. **Make every statement idempotent.** A partial failure must be safe to retry.
3. **Backfill before constraining.** Adding `NOT NULL` or a foreign key requires
   first populating existing rows.
4. **Add a tenant index** for new tenant-owned tables, following `0002`.
5. **Test against a throwaway database.** Point
   `RIVICQ_TEST_DATABASE_URL` at an empty database; the integration suite drops
   and recreates the tables it touches. Never point it at production.
6. **Apply in the order the tooling applies.** Startup uses the Go migrations;
   Compose/`make` use `deploy/migrations/*.sql`. Keep the two in step.

Local application:

```
make migrate          # applies deploy/migrations/*.sql via DATABASE_URL
make seed             # optional dev seed data (development only)
docker compose up -d  # runs the `migrate` service, then `app`
```

## Tenant-scoped queries

Every tenant-owned statement includes a `tenant_id` predicate. The `Queries`
layer (`internal/database/queries.go`) is the pattern to follow:

- Reads: `WHERE id = $1 AND tenant_id = $2`.
- Writes: `WHERE id = $2 AND tenant_id = $1`, then `requireOneRow` converts
  "matched nothing" into `ErrNotFound`.
- Inserts: reject a missing tenant (e.g. "crypto asset requires tenant_id").
- Lists: `WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`.

New code must derive the tenant from verified context
(`internal/tenant/context.go`), never from a request field, and must carry the
predicate on every path. See `docs/MASTER_RULES.md` rule 6.

## Least-privilege database roles

`Recommended (not yet implemented)` — the repository does not ship role
provisioning scripts; provision these roles in your environment.

Use at least two roles:

| Role | Purpose | Grants |
|------|---------|--------|
| `cryptobom_app` | Runtime traffic | `CONNECT` on the database; `USAGE` on the schema; `SELECT, INSERT, UPDATE, DELETE` on application tables and `USAGE, SELECT` on their sequences. No DDL. |
| `cryptobom_migrate` | Startup/CI migrations | The above plus `CREATE` (DDL) on the schema. Used only by the migration step, never by request-serving instances. |

Do not give the application `SUPERUSER`, `CREATEDB`, `CREATEROLE`, or ownership
of the database. Do not expose PostgreSQL publicly: `docker-compose.yml` maps
`5432:5432` for local development only; production must keep the database on a
private network reachable only by the application.

## TLS

Encrypt database connections in transit.

- `CRYPTOBOM_DB_SSLMODE` defaults to `disable` when the DSN is assembled from
  discrete variables, so you **must set it explicitly** in production.
- Use `sslmode=require` (minimum) or `sslmode=verify-full` with a trusted CA for
  certificate verification.
- `internal/config/config.go` defaults the Viper config path to `sslmode=require`;
  align the runtime environment with that intent.

Example: `...?sslmode=verify-full&sslrootcert=/etc/ssl/certs/rds-ca.pem`.

## Backups

`Recommended (not yet implemented)` — there is no backup automation in this
repository; operate it in your environment.

- Take scheduled `pg_dump` (logical) and, where available, continuous
  WAL archiving / point-in-time recovery.
- Store backups encrypted, in a separate account or region, with a retention
  policy that meets your compliance obligations.
- **Test restores** on a schedule. An untested backup is not a backup.
- Never commit a database dump: `.gitignore` blocks `*.sql` and
  `cryptobom_backup.sql`.

## Row-level security (Supabase)

`Recommended (not yet implemented)`.

The Go backend connects to PostgreSQL directly and enforces tenancy in SQL
(above). The frontend can also use Supabase (`web/src/services/supabase.ts`),
which talks to Postgres over PostgREST. If you put application tables behind
Supabase:

- Enable Row Level Security on **every** table (RLS is off by default).
- Write policies keyed on the authenticated identity and tenant, e.g.
  `USING (tenant_id = auth.jwt() ->> 'tenant_id')` or `auth.uid()`.
- Ship only the **publishable (anon)** key to the browser
  (`REACT_APP_SUPABASE_PUBLISHABLE_KEY`). Never embed a `service_role` key in
  `web/`.
- Treat RLS as defense in depth, not a replacement for rule 6. A `service_role`
  connection bypasses RLS, so the Go query layer must still scope by tenant.

## Operational checks

- `/healthz` — process is up; never fails on the database.
- `/readyz` — `200` only when the database is reachable and demo mode is off;
  `503` otherwise (`internal/server/server.go`, `cmd/server/oss/main.go`).
- `AppliedMigrations` (`internal/database/migrate.go`) reads the
  `schema_migrations` ledger for operational reporting.
- On startup, a migration failure is fatal in both editions; the process refuses
  to serve against an unknown schema.

## Related documents

- `docs/MASTER_RULES.md` — canonical rules (rules 6 and 7).
- `docs/SECURITY_GUIDE.md` — tenant isolation and secret handling.
- `docs/API_GUIDE.md` — API conventions built on this data layer.
- `docs/DEPLOY_ENV.md` — environment variables, including `DATABASE_URL`.
