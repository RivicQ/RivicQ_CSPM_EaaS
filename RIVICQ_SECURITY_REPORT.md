# RivicQ Security Report

Assessment of the changes in `RIVICQ_HARDENING_REPORT.md`. No penetration test
was performed and none is implied. Every finding below is a defect found by
reading the code and by running the test suites — including a live PostgreSQL
integration run that unit tests could not substitute for.

---

## Critical — fixed

### C1. Authorization was not enforced anywhere

**Severity: Critical.** `RequirePermission` existed, was documented as "the
authorization boundary", and was called from no production code path. Every
authenticated user of every role could call every route: delete CBOM reports,
mint API keys, change other users' roles, read audit logs.

Any authenticated account was equivalent to full administrative access within its
tenant. Registration is open (`POST /auth/register` is in the public allow-list),
so the population of accounts that could do this was not bounded by the
operator's judgement.

Fixed by `internal/auth/route_permissions.go`, wired in
`internal/api/shared/standard_auth.go`, enforced by
`internal/server/route_audit_test.go` and
`internal/auth/route_permissions_test.go`.

### C2. The public-route allow-list never matched

**Severity: Critical.** `EnforceAuth` compared a group's relative path against
the full request path, so no allow-list entry could ever match. The direction of
the failure was safe (routes defaulted to protected), but it meant the
authentication layer's behaviour was accidental rather than designed, and the
route audit had no way to notice because both sides were wrong in the same way.

Fixed. `internal/server/route_audit_test.go` now fails on drift in either
direction.

### C3. Every CBOM report read failed against a migrated database

**Severity: Critical.** `metadata` is nullable with no default and was scanned
into a Go `string`. `converting NULL to string is unsupported`. This affected
`GetCBOMReport`, `ListCBOMReports`, and every other read of a nullable column
into a non-pointer field — 13 columns across 7 tables.

This was not found by unit tests. It was found by running the integration suite
against a real PostgreSQL instance, which is the argument for having that suite
at all.

Fixed with `COALESCE` in all seven `SELECT` lists.

### C4. Cross-tenant data contamination via ownership drift

**Severity: Critical.** `crypto_assets` had independent foreign keys to
`cbom_reports(id)` and `tenants(id)`. Nothing required the asset's tenant to match
its report's tenant. Tenant-b could attach an asset to tenant-a's report; the row
was then invisible to both tenants' queries but persisted, and tenant-b's write
had modified tenant-a's report subtree.

Fixed with `UNIQUE (id, tenant_id)` on `cbom_reports` and composite foreign keys
from `crypto_assets` and `quantum_attestations`.

## High — fixed

### H1. SSRF via DNS rebinding

`validateNetworkTarget` checked resolved addresses, then let the HTTP client
resolve the hostname again. A name that passed the policy could be rebound to
`127.0.0.1` or the cloud metadata endpoint between check and connect.

Fixed by `internal/discovery/safe_dial.go`: resolution and validation happen
inside the dialer and the connection is pinned to the validated IP literal. Wired
into the HTTP, SSH, and TLS scanners. Redirect hops are re-checked.

### H2. Unbounded webhook body read

`c.GetRawData()` with no limit, on an unauthenticated endpoint, before signature
verification. Memory exhaustion reachable by anyone who can open a TCP connection.

Fixed with `http.MaxBytesReader` (8 MiB default).

### H3. Webhook replay

A captured delivery replays byte-for-byte with a valid signature, because the
signature covers the body and not the delivery ID. Each replay started another
scan with unbounded goroutines and no timeout.

Fixed with a TTL delivery-ID cache plus a concurrency semaphore and scan timeout.
**Residual risk:** the cache is per-process. A multi-instance deployment needs a
shared store to reject a replay landing on another node.

### H4. Write handlers defaulting to a shared tenant

Thirteen write handlers resolved their tenant through a helper that falls back to
a single default tenant when no tenant claim is present. An authenticated token
without a tenant claim wrote into data visible to every other anonymous caller.
A comment in the code said this must not happen; it happened.

Fixed with `mutatingTenantIDFor` (fail closed) and
`internal/api/enterprise/tenant_audit_test.go`, which parses the package AST and
fails if any write handler uses a non-failing resolver.

### H5. Legacy schema upgrade left tables unreadable

`CREATE TABLE IF NOT EXISTS` skips an existing table entirely. A pre-existing
`cbom_reports` missing `version` was never altered, and the application then
failed with `column "version" does not exist` — a startup failure on any
deployment whose schema predated the migration.

Fixed by migration `0007_converge_legacy_columns`.

### H6. `DELETE` used the write permission

`cbom:delete` was defined and granted only to admin, but the permission lookup
returned the *write* permission for `DELETE`. Any operator could delete a report.
Caught by the behavioural test written for C1.

### H7. OAuth callbacks accepted `PUT`/`PATCH`/`DELETE`

`authGroup.Any("/google/callback", …)` and the GitHub equivalent registered all
seven HTTP methods on unauthenticated callback paths. Dead endpoints on the
attack surface. Now `GET` + `POST` only.

## Medium — accepted or partially addressed

### M1. Scanner false negatives on primary detections

The content scanner missed `crypto/rc4`, Python `key_size=1024`, Go
`rsa.GenerateKey(rand.Reader, 1024)`, and Python `import jwt`. MD5, SHA-1, and
RC4 usage — the tool's core purpose — was invisible in common languages. Full
detail in `RIVICQ_SCANNER_ACCURACY.md`. Fixed; the labelled corpus now prevents
regression.

### M2. Prose false positives

A README stating "we do not use DESede" produced a CRITICAL 3DES finding. Crypto
rules now skip documentation extensions. Comment-stripping for code files is
still outstanding.

### M3. Enterprise handlers panicked on an unusable database

Handlers checked `db == nil`, which a zero-value `database.EnterpriseDB` passes,
then dereferenced a nil `*sql.DB`. A dependency outage became a 500 with a stack
trace rather than a 503. Now checks for a live handle.

### M4. Enterprise bootstrap had diverged

The Enterprise binary assembled its own router and called `gin.Default().Run()`,
lacking timeouts, graceful drain, and a truthful `/readyz`. Two bootstraps meant
hardening one left the other exposed. Unified behind `internal/server`.

Additionally: `config.LoadEnterprise()` ran before `server.New()`'s
`config.LoadDotEnv()`, so `.env` was silently ignored in Enterprise deployments.

### M5. Duplicate test databases

The Enterprise test suite silently attached to whatever PostgreSQL was reachable,
so a developer with a local database ran different tests than CI. Tests now
require an explicit environment.

## Open risks — not fixed

| ID | Risk | Why it is open |
|---|---|---|
| O1 | Webhook replay cache is process-local | Needs a shared store for multi-instance deployments |
| O2 | Webhook scans all land in `tenant.PublicTenantID` | Repository→tenant mapping does not exist; different repositories contaminate one tenant's scan history |
| O3 | No scan rate limiting | An authenticated caller can enqueue unbounded scans, driving outbound requests and disk |
| O4 | Test coverage is 26.6% | `internal/database` 0%, `internal/api/enterprise` 0.3% under the default build, `internal/server` 19.7% |
| O5 | Third-party dependencies unaudited | No `govulncheck` or equivalent run recorded |
| O6 | No independent penetration test | Out of scope for this pass |
| O7 | Scanner corpus is self-authored | Cannot establish real-world accuracy; see `RIVICQ_SCANNER_ACCURACY.md` |
| O8 | Local `.env` holds live-looking credentials | Untracked and gitignored, now `0600`. If the file was ever shared, those values must be rotated — that requires operator access |
| O9 | `Inventory.ImportSBOM` discards insert errors | `_, _ = h.db.Exec(...)` reports success with fabricated counts when persistence failed |

## Recommended order of work

1. **O8** — rotate any credential that has left the machine. Cheap, unbounded downside if skipped.
2. **O2, O9** — tenant mapping and error handling; both cause silent data corruption.
3. **O3** — scan rate limiting; straightforward availability control.
4. **O1** — shared replay store before running more than one replica.
5. **O5** — `govulncheck ./...` in CI.
6. **O7** — independently labelled corpus.
7. **O4** — coverage on `internal/database` and the enterprise handlers.
8. **O6** — external penetration test.