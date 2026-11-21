# Technical Requirements: RivicQ CSPM / CryptoBOM EaaS

Technical requirements for the CSPM/CryptoBOM platform in this repository, read alongside `docs/ARCHITECTURE.md`, `docs/PRD.md`, and `docs/KNOWN_LIMITATIONS.md`.

## 1. System components

| Component | Tech | Locations |
|---|---|---|
| OSS API | Go 1.26, Gin | `cmd/server/oss/main.go`, listens `:8080` |
| Enterprise API | Go 1.26, Gin (release mode) | `cmd/server/enterprise/main.go`, listens `:9090` |
| Shared engine | Go packages under `internal/` | `internal/discovery`, `internal/intelligence`, `internal/bom`, `internal/cryptoart`, `internal/compliance`, `internal/quantum` |
| Auth | Go | `internal/authn` (JWT, bcrypt, TOTP), `internal/auth` (RBAC) |
| Tenant isolation | Go | `internal/tenant/context.go` |
| Edge middleware | Go | `internal/middleware` (`ratelimit.go`, `cors.go`, `security.go`, `audit.go`, `requestid.go`) |
| Datastore | PostgreSQL >= 15 (optional) | `internal/database`, `deploy/migrations/*.sql`, in-memory demo when absent |
| Scanner CLI | Go | `cmd/rivicq` (`scan`, `sbom`, `cbom`, `vuln`, `secrets`, `iac`, `compliance`, `policy`, `firmware`, `identity`) |
| Demo scanner | Go | `cmd/demo-scanner` (`make demo-scan`) |
| Frontend | React 18 + TS + MUI 5 + react-router 6 + react-query + zustand (declared) | `web/` (Create React App) |
| Graph demo | React 18 + Vite | `fabric/` (RivicQ Graph, labeled demo) |
| Marketing site | Static HTML/CSS/JS | `marketing/`, copied into Pages build |
| Docs hub | Static MD/HTML | `docs/`, ReDoc from `docs/openapi.yaml` |
| Diagram site | Static HTML + inline SVG | `archify/` (`site/` + `diagrams/`) |
| CI/CD | GitHub Actions | `.github/workflows/*.yml` |

## 2. Runtime environment

- Go toolchain: `go 1.26.0` / `toolchain go1.26.9` (`go.mod`).
- Docker base: `golang:1.26-alpine` for build stage; `alpine:3.18` runtime (`deploy/docker/Dockerfile.oss`, `Dockerfile.enterprise`).
- Local stack: `docker-compose.yml` (Postgres 15, migrate job, app `:8080`, web `:3000`, scanner sidecar).
- Config: `.env.example` → `.env`; loaded via `internal/config/dotenv.go` + viper (`internal/config/config.go`); environment variables override YAML/config.
- Edition: `CRYPTOBOM_LICENSE_KEY=ENT-...` switches to Enterprise; port default OSS `8080`, Enterprise `9090` (`internal/server/server.go:111`).

## 3. Data flow

```text
Operator / CLI / GitHub Action / Webhook
        |
        v
/api/v1 (Gin) -> [RequestID, SecurityHeaders, Audit, RateLimit, CORS] -> [Edition + tenant resolution]
        |
        v
internal/discovery (TLS/SSH/HTTP/SBOM/GitHub-content) -> discovery.ScanResult
        |
        v
internal/intelligence (normalize -> risk -> policy gate -> PQC class -> CycloneDX)
        |
        v
PostgreSQL (if configured)  |  in-memory demo store (else)
        |
        v
/scan report, /findings, /cyclonedx, dashboard, compliance packs
```

Scans higher from the API return `202` and stream progress over SSE (`/api/v1/scans/:id/stream`, `internal/api/shared/events.go`).

## 4. Interfaces

| Interface | Contract |
|---|---|
| REST API | `/api/v1` — see `docs/editions.md` route list, `docs/openapi.yaml`, `GET /openapi.json` |
| Health | `GET /healthz` (never fails on dependency), `GET /readyz` (503 without DB or in demo mode) |
| Edition | `GET /edition` returns `edition.Detect().Public()` feature flags |
| CLI | `rivicq scan <target> --format json --fail-on BLOCK` | 
| GitHub Action | Composite action `.github/actions/rivicq-scan/action.yml` |
| Webhook | `POST /api/v1/github/webhook`, HMAC-SHA256 verified, 8 MiB body cap, replay TTL 30 min, concurrency 4 |
| SSE | `/api/v1/scans/:id/stream` for scan progress |

## 5. Performance and scale targets

- Rate limit: OSS 100 req/min/IP; Enterprise 1000 req/min/IP (`internal/edition/edition.go`), toggleable via `CRYPTOBOM_RATE_LIMIT`, per-IP in-memory window limiter (`internal/middleware/ratelimit.go`).
- HTTP timeouts: ReadHeader 10s, Read 60s, Write 300s (scans stream over SSE), Idle 120s, MaxHeaderBytes 1 MiB (`internal/server/server.go:133`).
- Graceful shutdown: 20s drain (`internal/server/server.go:164`).
- Benchmarks: `BenchmarkAPICalls`, `BenchmarkDatasetGeneration` in `tests/`; regression gate 20% vs `tests/benchmark-baseline.json` (`.github/workflows/ci-cd.yml`).
- Webhook scan concurrency bounded to 4; delivery timeout 10 min (`internal/api/shared/github_scanning.go:400`).

## 6. Security requirements

| Control | Implementation |
|---|---|
| AuthN | JWT (`golang-jwt/jwt/v5`), bcrypt `DefaultCost`, password policy 12–72 chars with 3-of-4 classes and account-context checks (`internal/authn/password.go`) |
| MFA | TOTP via `pquerna/otp` server-side |
| OAuth | Google and GitHub OAuth (`internal/api/shared/google_oauth.go`, `github_oauth.go`) |
| Tenant identity | From JWT claims only; `X-Tenant-ID` never trusted (`internal/tenant/context.go`) |
| Secret handling | Refresh tokens and single-use tokens stored as SHA-256 hashes (`internal/database/migrations.go` 0008); Gitleaks findings never include secret values |
| Network egress | `TargetPolicy` blocks private/loopback/cloud-metadata destinations and non-allow-listed ports by default (`internal/discovery/target_policy.go`) |
| Headers | HSTS, CSP (`frame-ancestors 'none'`), nosniff, DENY framing, `Referrer-Policy`, no-store (`internal/middleware/security.go`) |
| Proxies | `SetTrustedProxies(nil)` unless `TRUSTED_PROXIES` is explicitly set (`internal/middleware/middleware.go`) |
| Rate limiting | Per-IP window with `Retry-After` header |
| Auditing | Every request logged to `audit_events` (JWT tenant); Enterprise audit viewer |
| Supply chain | SLSA3 Go builder publisher (`.github/workflows/go-ossf-slsa3-publish.yml`), Syft SBOM per image, Trivy container SARIF |
| Secrets | `.env*` gitignored; remediation trail in `docs/SECURITY_SECRET_REMEDIATION.md` |

## 7. Dependencies

- Go direct deps (`go.mod`): Gin, golang-jwt/jwt/v5, bcrypt (`x/crypto`), `x/oauth2`, viper, logrus, `lib/pq`, uuid, `pquerna/otp`, OpenTelemetry (`otlptracehttp`), AWS SDK v2, Azure SDK, GCP SDK, IBM/K8s SDKs.
- Frontend (`web/package.json`): `@mui/material@^5.15`, `@tanstack/react-query@^5`, axios, `recharts`, `@mui/x-charts`, `@mui/x-data-grid`, `@supabase/supabase-js`, `framer-motion`, `react-toastify`, Zustand (declared).
- External tools (optional, `RIVICQ_EXTERNAL_TOOLS=0` to disable): Syft, Trivy, Grype, Gitleaks, OSV Scanner (`internal/intelligence/adapters_external.go`).

## 8. Constraints

- **Do not break `discovery.ScanResult`** — core JSON contract shared by API, CLI, and dashboard (`docs/ARCHITECTURE.md`).
- Do not modify applied migrations; append new ones (`internal/database/migrations.go` rule comment).
- No real secrets in the tree; fixtures are synthetic (`fixtures/`, `datasets/`).
- OSS build must not import enterprise packages — enforced in `.github/workflows/ci-cd.yml` (`oss-gate` job).
- Cloud/quantum/HSM connectors require customer credentials; empty without them (never simulated as a live estate, except the labeled demo).
- Compliance frameworks are mappings, not certifications (repository-wide disclosure).