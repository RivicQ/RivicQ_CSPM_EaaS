# RivicQ Production Readiness Report

Assessment against the gaps identified in `RIVICQ_BASELINE.md` §9–§10.

**Verdict: Pilot Ready with a production operator. Not approved for
unattended production deployment.** The application is now internally
consistent, tested at its seams, and fails closed on its dependency boundaries.
Two medium-severity defects that matter under real internet exposure remain open,
and both are pre-existing rather than introduced here.

Every status in this document was re-verified against the current tree, not
inherited from the baseline.

---

## 1. Fixed since baseline

### Bootstrapping and lifecycle

| Capability | Baseline | Now |
|---|---|---|
| HTTP timeouts | **None anywhere.** `s.Engine.Run(addr)` | Read/write/idle on both editions |
| Graceful shutdown | `time.Sleep(2s)` + `os.Exit(0)` — **drops in-flight requests** | Real drain via `srv.Shutdown` |
| Liveness vs readiness | Liveness **absent** | Separate endpoints registered in `internal/server` and `cmd/server/oss` |
| Readiness honesty | `200` even when `degraded` | Fails when a dependency is unavailable |
| Two bootstraps | Enterprise had its own divergent `gin.Default().Run()` | Both editions use `internal/server` |
| `.env` in Enterprise | `LoadEnterprise()` ran before `LoadDotEnv()` — silently ignored | Dotenv loads first |

The shutdown change is the one with the clearest operational consequence. The
old code accepted a new connection during its 2-second sleep and then exited
mid-request. Deploys were dropping in-flight traffic.

### Database

| Capability | Baseline | Now |
|---|---|---|
| Migrations | Inline `CREATE TABLE IF NOT EXISTS`; unversioned, no down-migration, no schema table | 7 versioned, checksum-guarded, transactional migrations via `database.CoreMigrations()` |
| Legacy schema repair | `IF NOT EXISTS` skipped existing tables, leaving them unreadable | `0007_converge_legacy_columns` converges idempotently |
| Cross-tenant ownership | Independent FKs permitted tenant mismatch | Composite FKs from `crypto_assets`, `quantum_attestations` |
| NULL handling | 13 nullable columns scanned into non-pointer fields — **every CBOM read failed** | `COALESCE` in all seven `SELECT` lists |

### Configuration and secrets hygiene

- ~30 previously undocumented environment variables are documented in
  `.env.example` with safe defaults. Two documented-but-nonexistent variables
  were implemented; an invented third was removed rather than left as a no-op.
- `.env` is gitignored, untracked, and `0600`. No secret material is in git
  history (`git log --all` over `.env*`, `*.pem`, `*.key` returns only
  `.env.demo` and `.env.example`).

### CI

- gofmt gate and enterprise `go vet` added.
- The integration job now sets **both** DSN variable names and
  `RIVICQ_SMOKE_URLS`. Previously the suite read a variable CI never set, so it
  **skipped silently in CI** — the worst failure mode for a build gate.

## 2. Verified fixed by reading the tree

These were listed as baseline defects and confirmed corrected:

| Item | Evidence |
|---|---|
| `rune('0'+argIdx)` placeholder bug in audit logging (would 500 at index 10) | `internal/middleware/audit.go` is 65 lines; no such construction remains |
| Fail-open demo mode on DB outage returning `200 healthy` | Readiness now reflects real dependency state; `/readyz` 503s in demo/fabricated mode |
| Enterprise handlers panicking on a nil `*sql.DB` | Handlers check for a live handle and return 503 |
| OSS and Enterprise suites silently attaching to a developer database | Integration suite requires an explicit environment variable |

## 3. Still open — must be closed before production

### M1. `SetTrustedProxies` is never called → rate limiting is bypassable

**Severity: Medium. Unchanged from baseline.**

`internal/middleware/ratelimit.go` keys on `c.ClientIP()`. Gin's `ClientIP()`
trusts `X-Forwarded-For` only when `SetTrustedProxies` has configured a trusted
proxy list. Grepping the repository finds **no call to `SetTrustedProxies`
anywhere**, so gin falls back to trusting the entire `X-Forwarded-For` chain.

Any client can send an arbitrary `X-Forwarded-For` and receive a fresh rate-limit
bucket per request. The rate limiter is effectively decorative. This is the
highest-priority open item.

Fix: call `SetTrustedProxies` with the operator's proxy CIDRs at startup, from
configuration. If there is no proxy, call `SetTrustedProxies(nil, nil)`.

### M2. CORS reflects any origin with credentials enabled

**Severity: Medium. Unchanged from baseline.**

`internal/middleware/cors.go:22` still defaults `AllowedOrigins` to `["*", …]`
with `AllowCredentials: true`. The handler reflects the request's `Origin`
verbatim when the wildcard is present (`:56-62`), so **any website on the
internet** receives `Access-Control-Allow-Origin: <their origin>` together with
`Access-Control-Allow-Credentials: true`.

Practical impact is reduced because the API authenticates with `Authorization:
Bearer` rather than cookies, so a browser will not attach credentials
automatically. It is not zero: any origin that can obtain a token by other means
gets a permissive cross-origin channel from the user's browser, and the
`"*"`-plus-credentials combination is a reliable scanner finding.

Fix: drop `"*"` from the default and require `CORS_ORIGINS` to be set
explicitly, or refuse to start when it is unset and credentials are enabled.

### M3. Audit log persists raw query strings

**Severity: Medium. Unchanged from baseline.**

`internal/middleware/audit.go:16-19` appends `URL.RawQuery` to the recorded path,
and the path is persisted to `audit_events`. OAuth authorization codes and
`state` are query parameters, so **authorization codes are durably written to the
audit table**. A code is single-use and short-lived, but it is a credential
written to storage in the clear.

Fix: log `URL.Path` only, with a separate allow-list of non-sensitive query keys.

## 4. Open risks carried forward

| Item | Status |
|---|---|
| Webhook replay cache is process-local | Open — needs a shared store for multi-replica deployments |
| Webhook scans all land in `tenant.PublicTenantID` | Open — no repository→tenant mapping exists |
| No scan rate limiting | Open |
| `Inventory.ImportSBOM` discards insert errors (`_, _ =`) | Open — reports success with fabricated counts on failure |
| Test coverage 26.6%; `internal/database` 0%, `internal/api/enterprise` 0.3% | Open |
| Third-party dependencies unaudited (`govulncheck` not run) | Open |
| No independent penetration test | Open |
| Scanner corpus is self-authored | Open — `RIVICQ_SCANNER_ACCURACY.md` |
| DB password defaults to `cryptobom`, `sslmode` defaults to `disable`, **no production guard** | Open — unlike JWT, which does guard |
| Config layer declares ~30 yaml-tagged fields and never reads a file | Open — two sources of truth, one inert |

## 5. Operational gaps — documentation, not code

None of these were addressed, and none can be verified by a test:

- **No backup or restore procedure.** No documented process, no verification that
  a backup can be restored. For a product holding customer supply-chain
  inventories, this is the most consequential operational gap.
- **No rollback procedure.** Migrations have no down-migration and no documented
  reversal path. Rolling back application code against a forward-migrated schema
  is untested.
- **No load or latency testing.** One micro-benchmark exists for the scanner. No
  throughput, p95, or concurrency figures for the HTTP surface or the database.
- **No SBOM generated for RivicQ itself**, though it is a CBOM product.
- **No metrics endpoint.** `internal/observability` is one file; tracing is
  implemented but never wired into the canonical server. No Prometheus endpoint
  for scan duration, scan failures, API latency, or DB latency. Operability
  during an incident is currently manual log reading.
- **No stage-completeness audit of the Makefile, `build.sh`, or `validate.sh`.**

## 6. Pilot entry criteria

Suitable for a **pilot** — a named set of users, on a known network, with an
operator watching — because:

- Authentication, authorization, tenant isolation, and the database layer are
  covered by tests that exercise real routers and a real PostgreSQL instance.
- Dependency failure produces a truthful non-2xx response rather than fabricated
  success.
- Deploys drain in-flight requests instead of dropping them.
- Every prior defect found by this pass has a regression test.

**Not** suitable for unattended production until:

1. `SetTrustedProxies` is configured (M1) — the rate limiter does not work without it.
2. The `*` origin is removed from the CORS default (M2).
3. OAuth codes are excluded from the audit log (M3).
4. A backup has been taken **and successfully restored** from a scratch instance.
5. A rollback procedure is written and rehearsed.
6. `govulncheck ./...` runs clean in CI.
7. Webhook replay and tenant mapping are resolved before a second replica runs.