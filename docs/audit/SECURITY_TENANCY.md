# RivicQ CSPM — Security & Tenancy (Phase 6)

Commit `1fa0910` + Phase 2/6 test additions.

## Tenant derivation (single source of truth)

`internal/tenant/context.go`:
- Tenant is read from the validated JWT claim (`c.GetString("tenant_id")`).
- `X-Tenant-ID` and other spoofable headers are **explicitly ignored**.
- Unauthenticated requests map to a fixed `PublicTenantID` constant; the former
  anonymous "public pilot" scan surface has been removed (deny-by-default).
- `DefaultTenantResolver` prefers JWT tenant over any header.

## Enforcement layers

1. **HTTP auth** — JWT middleware (`internal/authn`) validates issuer, audience,
   expiry; refresh tokens cannot be used as access tokens.
2. **Route authorization** — `internal/auth/{rbac,route_permissions,public_routes}.go`
   enumerate permissions; `public_routes.go` is the allow-list (deny-by-default).
3. **Handler scoping** — shared handlers use `tenantScanJob` /
   `tenantScanList` / `GetResultForTenant` (`internal/api/shared/tenant.go`),
   never a raw ID lookup.
4. **Store scoping** — `discovery.ScanManager.GetScanForTenant` compares
   `normalize(job.TenantID) == normalize(tenantID)` and returns not-found on
   mismatch (`scan_manager.go:199-208`).
5. **SQL scoping** — `internal/database/queries.go` carries `WHERE … tenant_id = $…`
   on every accessor (including aggregate metrics), and `mapRowError` returns
   `ErrForbidden` vs `ErrNotFound` to avoid cross-tenant existence probing.
6. **Schema** — every data table declares `tenant_id UUID NOT NULL REFERENCES
   tenants(id)` with tenant-scoped indexes.

## Tests (all passing)

`tests/scan_tenant_isolation_test.go`:

| Test | Asserts |
|---|---|
| `TestScanIsolationAcrossTenants` | cross-tenant GET → 404; `X-Tenant-ID` spoof ignored; anon → 401 |
| `TestScanReportIsTenantScoped` *(new)* | cross-tenant `/scans/:id/report` → 404; owner 200/409 |
| `TestIntelligenceReportIsTenantScoped` | cross-tenant `/intelligence` → 404; `/cyclonedx` owner-scoped |
| `TestScanListDoesNotLeakOtherTenants` | list contains own scan, never another tenant's |
| `TestAnonymousScanIsRejected` | create/read require auth |
| `TestInvalidBearerDoesNotFallBackToPublicTenant` | malformed token and refresh-as-access both rejected |

`internal/discovery/scan_manager_tenant_test.go` — unit-level tenant scoping of
`GetScanForTenant` / `ListScansForTenant` (incl. public-tenant isolation).

## Coverage vs the required resource list

Verified by test: **scans, scan reports, intelligence reports, CycloneDX, scan
lists**. Verified by code inspection (tenant-scoped helpers / SQL): asset BOM
(`GetAssetBOM` → `GetResultForTenant`), findings/inventory/CBOM views
(`tenantScanList`), DB-backed resources (tenant predicate in `queries.go`).

Gaps to close (not yet covered by an explicit negative test): API keys,
connectors, graph/asset endpoints, and enterprise-only resources. These reuse
the same `tenant` resolution, so risk is low, but an explicit cross-tenant
assertion per resource is the stronger posture.

## Other security controls

- CORS default allow-list (`https://rivicq.github.io`); `*` only if configured.
- Security headers, rate limiting, and audit middleware present (+tests).
- Password hashing (bcrypt) and TOTP MFA (`internal/authn`, +tests).
- No real secrets in the tree (synthetic only). See SECURITY_FINDINGS.md.

## Not claimed

- No SSO/IdP federation (no handshake tested).
- No claim of third-party penetration testing or certification.
