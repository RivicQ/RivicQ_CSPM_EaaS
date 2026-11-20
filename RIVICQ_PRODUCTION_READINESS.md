# RivicQ Production Readiness Report

Assessment against the gaps identified in `RIVICQ_BASELINE.md` §9–§10.

**Scope:** this verdict covers the **CSPM scanner/control plane only**. The standalone EaaS foundation is on `main` (`2720da2`; latest committed Pages/docs commit `d0e9dbf`, with documentation fixes in the current local tree) at `cmd/eaas`, `internal/eaas`, and `web/eaas`. It is a separate local sandbox product surface, is not included in the CSPM pilot/production verdict, and is not production-ready or hosted. GitHub Pages publishes EaaS documentation, not the EaaS portal or API. See §7 and `docs/EAAS_PRODUCT_STATUS.md`.

**Verdict for CSPM: Pilot Ready with a production operator. Not approved for
unattended production deployment.** The CSPM application is now internally
consistent, tested at its seams, and fails closed on its dependency boundaries.
The three medium-severity baseline defects (M1–M3) are implemented as described
in §3; the open items that keep production unapproved are the operational risks
in §4–§5.

Every CSPM status in §1–§6 was re-verified against the tree in that pass, not
inherited from the baseline. On the current tree after `d0e9dbf`, local
`go vet ./...`, `go build ./...`, full `go test ./...`, web `type-check`/`lint`,
and `bash scripts/verify-pages-build.sh` (109 checks) passed; GitHub Pages
workflow run `#120` succeeded for the earlier EaaS docs publication. EaaS in
§7 is scoped to its own evidence and remains excluded from the CSPM verdict.
None of this is customer validation or a hosted backend deployment.

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

## 3. Previously open M1–M3 — implemented in the current tree

These three medium-severity baseline items are no longer open. Their status was
corrected by reading the current tree; no customer or production validation is
claimed.

### M1. Proxy trust is explicit opt-in

**Baseline severity: Medium. Status: implemented.**

`internal/middleware/middleware.go:21-30` calls `router.SetTrustedProxies(nil)`
unless `TRUSTED_PROXIES` is set, so gin trusts no `X-Forwarded-For` chain by
default. When the variable is set, the comma-separated CIDRs are passed to
`SetTrustedProxies`; invalid values abort startup. Documented in
`docs/ARCHITECTURE.md:91` and `docs/SECURITY_GUIDE.md:261-263`. There is no
dedicated unit test for this configuration path in `internal/middleware`.

### M2. CORS uses an allowlist, not a wildcard

**Baseline severity: Medium. Status: implemented.**

`internal/middleware/cors.go:24-43` defaults `AllowedOrigins` to
`https://rivicq.github.io` plus any comma-separated `CORS_ORIGINS` entries; `"*"`
is not in the default. The handler sets `Access-Control-Allow-Origin` and
`Access-Control-Allow-Credentials` only for an allowed origin (`:55-62`), and
`AllowLocalDev` is off in production (`:40`). Covered by
`internal/middleware/cors_test.go:11-117`, including rejection of an unknown
cross-site origin and of localhost in production.

### M3. Audit query strings are redacted

**Baseline severity: Medium. Status: implemented.**

`internal/middleware/audit.go:14-21,69-92` passes `URL.RawQuery` through
`redactQuery` before the path reaches the logger and `audit_events`. The
sensitive-key list includes `code`, `token`, `secret`, `authorization`, and `sig`,
so OAuth authorization codes are no longer written in the clear. Unparsable
queries become `[unparsable]`. `internal/middleware/audit_test.go:5-27` covers
token, access/refresh token, signature/`sig`, private key, and unparsable input;
it has no dedicated `code=` case, which is noted rather than inferred.

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

## 6. Pilot entry criteria (CSPM only)

EaaS is not part of this pilot gate; see §7.

Suitable for a **pilot** — a named set of users, on a known network, with an
operator watching — because:

- Authentication, authorization, tenant isolation, and the database layer are
  covered by tests that exercise real routers and a real PostgreSQL instance.
- Dependency failure produces a truthful non-2xx response rather than fabricated
  success.
- Deploys drain in-flight requests instead of dropping them.
- Every prior defect found by this pass has a regression test.

**Not** suitable for unattended production until:

1. A backup has been taken **and successfully restored** from a scratch instance.
2. A rollback procedure is written and rehearsed.
3. `govulncheck ./...` runs clean in CI.
4. Webhook replay and tenant mapping are resolved before a second replica runs.
5. The open risks in §4 (tracked as O1–O9 in `RIVICQ_SECURITY_REPORT.md`) are
   dispositioned, in particular the tenant mapping and discarded insert errors.
6. The documentation/operational gaps in §5 are closed (backup/restore, rollback,
   load and latency testing, RivicQ SBOM, and metrics).

M1–M3 are closed as described in §3 and are no longer production blockers. The
production-not-approved verdict above is unchanged.

---

## 7. EaaS — excluded from this verdict

The standalone EaaS build was added to `main` in `2720da2` and is present after
`d0e9dbf` as a separate product surface. Evidence:
`cmd/eaas/main.go`, `internal/eaas/`, `web/eaas/index.html`,
`deploy/migrations/004_eaas_schema.sql`, `.github/workflows/eaas-ci.yml`.
`d0e9dbf` published the EaaS documentation set to GitHub Pages via
`scripts/build-pages.sh` and `scripts/verify-pages-build.sh`; the current tree
adds the alpha/beta report to that composite build. That is static
documentation, not a hosted EaaS deployment. The service does not inherit the
CSPM verdict above, and no CSPM finding, fix, or score applies to it.

| Area | Status | Boundary |
|---|---|---|
| Standalone API on `:9091` with `/healthz`, `/api/eaas/v1/*`, `/api/beta/v1/*` | VERIFIED | Local binary only; independent of the CSPM router |
| Portal at `/` and `/portal` | VERIFIED | Served by the binary from `web/eaas/index.html`, not GitHub Pages; Pages only publishes docs |
| Accounts, projects, hashed API keys, quota/RPM, beta registration, strict CORS | VERIFIED (local) | `internal/eaas/`; seven package tests passed locally |
| Sandbox JSON state file with base64 private key bytes | LIMITED | `internal/eaas/store.go`; filesystem protection required, no HSM custody |
| Classical operations / ML-KEM-768 and ML-DSA-65 | VERIFIED (Go stdlib, Beta implemented) / Experimental | `internal/eaas/crypto.go`; `github.com/cloudflare/circl` v1.6.1; SLH-DSA not implemented |
| Plan switch | PARTIALLY_IMPLEMENTED | Entitlements only; no Stripe/payment collection or payment webhooks |
| Production Postgres repository / migration runner | BLOCKED | `deploy/migrations/004_eaas_schema.sql` is a target schema only |
| Hosted EaaS, email delivery, CAVP/FIPS validation, AI operations, quantum hardware, HSM custody, wireless operations | NOT_IMPLEMENTED | No implementation in the EaaS evidence files |
| Full repository suite | VERIFIED (local) | On the current tree after `d0e9dbf`: `gofmt -l internal/eaas cmd/eaas`, `go vet ./...`, `go build ./...`, full `go test ./...`, web `type-check`/`lint`, and `bash scripts/verify-pages-build.sh` (109 checks) passed; Pages workflow `#120` succeeded for the earlier EaaS docs publication. No deploy gate or hosted EaaS is implied |

See `docs/EAAS_PRODUCT_STATUS.md`, `docs/EAAS_DEPLOYMENT.md`,
`docs/EAAS_LIMITATIONS.md`, `docs/EAAS_TESTING_CI.md`, and
`docs/ALPHA_BETA_TEST_REPORT.md`. **EaaS Production Ready: not claimed.**
