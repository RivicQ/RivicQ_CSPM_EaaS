# RivicQ Hardening Report

Baseline commit: `82a6785`. This report records what was changed, why, and what
each change does **not** fix. Every claim below is backed by a test that runs in
CI; where something is only partially addressed, that is stated plainly rather
than implied.

Verification commands used throughout:

```
go build ./... && go build -tags enterprise ./...
go vet ./...   && go vet -tags enterprise ./...
go test ./...  && go test -tags enterprise ./...
go test -tags integration ./tests/integration/...
```

All of the above pass at the time of writing.

---

## 1. Authentication

| Change | Evidence |
|---|---|
| `EnforceAuth` denies by default across `/api/v1`; only routes in `auth.PublicRoutes` are anonymous | `internal/auth/enforce_test.go`, `internal/auth/enforce_router_test.go` |
| Public-route matching is prefix-aware | `internal/auth/enforce_router_test.go` |
| Only the `Bearer` scheme is accepted | `internal/auth/enforce_test.go` |

**The bug that mattered:** `EnforceAuth` compared a group's relative path
(`/login`) against the full request path (`/api/v1/login`), so it never matched.
Every allow-list entry was dead. Fixed by resolving the group mount prefix before
matching. The route audit in `internal/server/route_audit_test.go` now fails if
the allow-list and the real route table drift in either direction.

## 2. Authorization

This was the largest gap in the baseline and it was not a bug — it was an
absence.

`internal/auth/permissions.go` defined a 30-permission matrix, and
`RequirePermission` was written, tested, and **called from nowhere**. Every
authenticated role could call every route: a viewer could delete a CBOM report,
a developer could mint API keys, an analyst could change another user's role.

What was added:

- `internal/auth/route_permissions.go` — maps a path's first segment plus the
  HTTP verb to a permission. `RequireRoutePermission()` is installed immediately
  after `EnforceAuth` in `internal/api/shared/standard_auth.go`.
- **Fail-closed on unmapped mutations.** An unrecognised `POST`/`PUT`/`PATCH`/
  `DELETE` is refused with 403. An unrecognised `GET` is allowed, because
  denying unknown reads would break the product on every new dashboard.
- `internal/server/route_audit_test.go` — `TestEveryMutatingRouteHasAPermission`
  enumerates the real route table and fails if any mutating route is unmapped, so
  the deny branch cannot fire on a legitimate feature.
- `internal/auth/route_permissions_test.go` — behavioural tests on HTTP status
  codes, including a full separation-of-duties matrix.

Two real bugs were found by these tests while writing them:

1. **`DELETE` fell back to the *write* permission.** `cbom:delete` existed but
   was never consulted, so any operator could delete a report. `DELETE` now
   resolves to a dedicated delete permission where one is defined.
2. **`Any()` on OAuth callbacks.** `authGroup.Any("/google/callback", …)`
   registered `PUT`, `PATCH`, and `DELETE` on an unauthenticated path — dead
   endpoints that the audit flagged. Now `GET` + `POST` only.

`POST /auth/workspace/users/:id/role` now requires `users:manage` **and**
`RequireRole("admin")`. The redundant check is deliberate: authorization at the
route and in the handler fail independently.

## 3. Tenant isolation

`tenantIDFor(c)` falls back to a shared default tenant when a request carries no
tenant claim. That is correct for an anonymous demo read and wrong for a write:
a token that authenticates a user without naming a tenant would deposit data
into the tenant every other anonymous caller can see.

A comment in `tenancy.go` already said "callers that mutate tenant data must use
`jwtTenantOrAbort`". Nobody had done it. Thirteen write handlers were using the
fallback, including `CreateFramework`, `RegisterTool`, `AddCloudAccount`,
`CreateAttestation`, `MigrateAlgorithm`, `ImportSBOM`, and the four cloud scan
handlers.

- `mutatingTenantIDFor` now fails closed: tenant claim → use it; authenticated
  with no tenant → 403; no identity at all (demo) → default tenant.
- `internal/api/enterprise/tenant_audit_test.go` enforces the rule by parsing the
  package's AST. It caught the original thirteen and will catch the next one. A
  comment does not enforce anything; a test does.

## 4. Database

Four real defects were found by running the integration suite against a live
PostgreSQL 16 instance. None of them were visible to unit tests.

1. **`CREATE TABLE IF NOT EXISTS` never repairs a legacy table shape.** A
   pre-existing `cbom_reports` without `version` or `cyclonedx_bom` was skipped
   entirely, and the query layer then failed at runtime with
   `column "version" does not exist`. Migration
   `0007_converge_legacy_columns` idempotently adds every column the query layer
   reads, plus a guarded `key_length` → `key_size` backfill. Retyping a primary
   key in place is not attempted; that is a judgement call for an operator.
2. **NULL scans crashed reads.** Nullable `metadata`, `status`, `key_size`,
   `location`, `platform`, `region`, `version`, `result`, `source`,
   `description`, `resolved`, `quantum_safe`, and `vulnerability_score` were all
   scanned into plain `string`/`int`/`bool` fields. Since `metadata` has no
   default, **every CBOM report read failed**. All seven `SELECT` lists now
   `COALESCE`.
3. **Cross-tenant ownership was not enforced.** Two independent foreign keys let
   tenant-b attach an asset to tenant-a's report. The row then appears in neither
   tenant's queries but still exists. `cbom_reports` now has `UNIQUE (id,
   tenant_id)` and both `crypto_assets` and `quantum_attestations` carry composite
   foreign keys.
4. **`TestServersHealthy` hung for 30 seconds** against nothing, because it needs
   two running servers. It is now opt-in via `RIVICQ_SMOKE_URLS`.

Migration checksums are stored; editing an applied migration is a startup
failure, not silent drift. Migrations run in a transaction, so a failure leaves no
partial schema.

## 5. SSRF and target policy

`validateNetworkTarget` resolved DNS, checked the answers, and then handed the
**hostname** to the HTTP client, which resolved it again. Between those two
steps a name can be rebound to `127.0.0.1` or `169.254.169.254`. The existing
code said so in a comment and did nothing about it.

`internal/discovery/safe_dial.go` closes the window: `TargetPolicy.DialContext`
resolves the host itself, rejects any non-public answer, and **dials the validated
IP literal**. The name is never given to the transport's own resolver. Wired into
the HTTP, SSH, and TLS scanners; `SetPolicy` rebuilds the scanner so the manager
and its sub-scanners cannot disagree. Redirect hops are re-checked, since each
hop is a fresh request that could point somewhere new.

This required updating the scanner tests, which scanned `httptest` servers on
loopback. They now build their scanners with an explicit permissive policy rather
than inheriting a permissive default — the restrictive default is unchanged.

**Not addressed:** there is no per-tenant or per-user scan rate limit. A caller
can still enqueue unbounded scans.

## 6. Inbound webhooks

| Gap | Fix |
|---|---|
| `c.GetRawData()` with no limit — memory exhaustion **before** signature verification | `http.MaxBytesReader`, 8 MiB default, `RIVICQ_GITHUB_WEBHOOK_MAX_BYTES` |
| No replay protection — a captured, correctly signed delivery replays forever | TTL delivery-ID cache, `RIVICQ_WEBHOOK_REPLAY_TTL_SECONDS` |
| Unbounded goroutine per delivery with `context.Background()` | Semaphore (4 concurrent) + 10-minute timeout |
| `Any()` on callbacks | `GET` + `POST` only |

HMAC-SHA256 verification over the raw bytes with a constant-time compare already
existed and is unchanged.

**The replay cache is per-process.** A multi-instance deployment needs a shared
store (Redis, or a unique index on a deliveries table) to reject a replay landing
on a different node. This narrows the window; it does not close it globally.
Recorded here rather than left to be mistaken for a complete defence.

**Not addressed:** every webhook-triggered scan is stored against
`tenant.PublicTenantID`, so scans for different repositories land in one tenant.
A repository-to-tenant mapping is needed and does not exist yet.

## 7. Secrets

- `.env` is untracked and gitignored (`*.env`, `.env`, `.env.*`). Permissions
  tightened to `0600`.
- No secret material has ever been committed: `git log --all` over `.env*`,
  `*.pem`, `*.key` returns only `.env.demo` and `.env.example`, and the committed
  `.env.example` contains placeholders only.
- 29 previously undocumented variables are now documented in `.env.example`,
  each with its safe default. Three variables were initially documented but did
  not exist; rather than leave operators setting no-ops, the two that mattered
  were implemented and the invented third was removed.

## 8. Operational

- The Enterprise binary now assembles its router through `internal/server`
  instead of calling `gin.Default().Run()`. Two bootstraps had diverged: only the
  canonical one had timeouts, graceful drain, and a truthful `/readyz`.
- Enterprise handlers previously checked `db == nil`, which a zero-value wrapper
  passes, then panicked on the nil `*sql.DB`. They now check for a live handle
  and return 503.
- Enterprise tests no longer silently attach to a developer's local PostgreSQL.
- `.github/workflows/ci.yml` gained a `gofmt` gate and enterprise `go vet`.
  `ci-cd.yml`'s integration job sets both DSN variable names and `RIVICQ_SMOKE_URLS`
  — without them the new integration suite skipped silently in CI, which is worse
  than failing.

## 9. What this report does not claim

- No penetration test has been performed.
- No third-party dependency audit has been run as part of this work.
- Test coverage is **26.6% of statements** overall. `internal/database` is at 0%
  and `internal/api/enterprise` at 0.3% under the default build — the enterprise
  handlers are covered by the `-tags enterprise` tests and the PostgreSQL
  integration suite, not by unit tests. `internal/server` is at 19.7%.
- No claim is made that the system is free of further defects. The bugs in §4 are
  a reminder that a passing unit suite is not the same as a working system.