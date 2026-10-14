# API

Canonical HTTP contract: [`docs/openapi.yaml`](openapi.yaml). Narrative: [`docs/API_GUIDE.md`](API_GUIDE.md). Firmware/identity: [`docs/FIRMWARE_IDENTITY_API.md`](FIRMWARE_IDENTITY_API.md).

## Surfaces

| Surface | Binary | Default port |
|---------|--------|----------------|
| Community | `cmd/server/oss` (`cryptobom-oss`) | 8080 (Makefile `dev-backend` currently binds **9090** via `CRYPTOBOM_PORT`) |
| Enterprise | `cmd/server/enterprise` | 9090 |

Router: `internal/server/server.go`. Intelligence routes: `internal/api/shared/intelligence.go`.

## Auth

- JWT from `/api/v1/auth/*` (`internal/authn`).
- Tenant comes from the JWT `tenant_id` claim. `X-Tenant-ID` is **not** a source of truth (`internal/tenant/context.go`).
- Unauthenticated reads share the public tenant (Home CBOM pilot). Cross-tenant scan IDs return 404.

SSO: OAuth Google/GitHub handlers exist. SAML configuration can be stored. A complete IdP ACS handshake is **not** claimed.

## Scan / CBOM / intelligence (verified in source)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/scans` | Discovery scan |
| GET | `/api/v1/scans/:id` | Status |
| GET | `/api/v1/scans/:id/report` | `discovery.ScanResult` |
| GET | `/api/v1/scans/:id/intelligence` | `intelligence.Report` (findings, gate, cyclonedx, pqc_readiness) |
| GET | `/api/v1/scans/:id/cyclonedx` | CycloneDX CBOM |
| GET | `/api/v1/findings` | Normalized findings for the caller tenant |
| POST | `/api/v1/firmware/analyze` | Static firmware |
| POST | `/api/v1/identity/analyze` | Static identity / cert |

QBOM/HBOM/AIBOM/IBOM Enterprise routes return **403** on Community (`internal/edition`).

## Input validation

Gin bindings return 400 on malformed JSON. Path/archive limits live in `internal/firmware/limits.go`. SSRF-ish dial policy: `internal/discovery/target_policy.go` (private nets blocked unless `RIVICQ_SCAN_ALLOW_PRIVATE_NETS=true`).

This file does not invent endpoints. If a UI control calls a path not listed in `openapi.yaml` / these packages, treat it as a gap.
