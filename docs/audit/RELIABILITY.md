# RivicQ CSPM — Enterprise Reliability (Phase 7)

Commit `1fa0910`. Assessed by source inspection; nothing below is inferred from
documentation.

| Area | Status | Evidence / notes |
|---|---|---|
| Scan state machine | **Present** | `discovery.ScanManager`: `pending → running → completed | failed`. |
| Scheduling | **Absent** | No scheduler/cron anywhere in `internal/` or `cmd/` (grep for scheduler/cron/periodic/ticker → none). Scans are on-demand/API-triggered. |
| Retries / backoff | **Absent** | No retry/backoff logic in `scan_manager.go`. A failed scan is terminal. |
| Concurrency / lifecycle | **Present** | `ScanManager` uses RWMutex-guarded maps keyed by `tenantID/assetID`; persists via `PersistFunc`. |
| Migrations | **Present** | `internal/database/migrations.go` (59 `CREATE/ALTER`), `enterprise_database.go` (24), plus `migrate.go`. Applied via `make migrate`. |
| Migration tests | **Absent** | `internal/database` has no tests; `tests/integration/postgres_test.go` exercises some Postgres paths (tag-gated). |
| Backups / restore | **Partial** | A `backup_enabled` column and an IBM Cloud bucket reference exist; **no automated backup/restore procedure** in code or `scripts/`. |
| Recovery (process) | **Present** | Gin `Recovery()` middleware (`internal/server/server.go:83`). |
| Observability | **Minimal** | `internal/observability/otel.go` (OpenTelemetry). No tests; no dashboards/traces wired in CI evidence. |
| Deploy rollback | **Present** | `ci-cd.yml` captures the current Helm revision and runs `helm rollback` on failure for staging **and** production. |
| Dependency vuln scan | **Unverified** | `govulncheck` not installed; no `govulncheck` step found in workflows. GitHub Dependabot/CodeQL config may exist (CodeQL workflow present; default setup noted in workflow comments). |
| Prod config safety | **Partial** | Postgres optional; in-memory demo mode when `DATABASE_URL` unset (see F-6). CORS `AllowLocalDev` default on (F-3). |
| Web build reproducibility | **Present** | `web/package-lock.json` with `npm ci` in CI; `CI=false` needed for CRA build. |

## Highest-value gaps (recommended, not implemented here)

1. **Scheduling + retries**: without them, "enterprise reliability" claims rest
   on the caller. A periodic scheduler and bounded retry/backoff with a dead-letter
   state would materially raise the bar.
2. **Backup/restore runbook + script** (pg_dump/restore, RPO/RTO targets).
3. **`govulncheck` in CI** for Go dependency vulnerabilities.
4. **`internal/database` unit tests** (migration idempotency + tenant scoping).

## Honesty note

The studied code supports a credible **single-node / small-cluster** deployment.
Claims of high-availability, multi-region failover, or guaranteed RPO/RTO are
**not** supported by the code and should not be made without load/failover tests.
