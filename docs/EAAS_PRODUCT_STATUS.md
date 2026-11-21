# EaaS product status

Evidence-based snapshot of the standalone RivicQ Encryption-as-a-Service (EaaS) build. Evidence scope for this document set: `internal/eaas/*.go`, `cmd/eaas/main.go`, `web/eaas/index.html`, `deploy/migrations/004_eaas_schema.sql`, `.github/workflows/eaas-ci.yml`, `docs/PRD.md`. This is not a certification, a hosted-service availability claim, or a claim that CSPM features moved into EaaS.

Companions: [EaaS API](EAAS_API.md) · [Deployment](EAAS_DEPLOYMENT.md) · [Security & privacy](EAAS_SECURITY_PRIVACY.md) · [Limitations](EAAS_LIMITATIONS.md) · [Testing & CI](EAAS_TESTING_CI.md) · [Freemium & metering](EAAS_FREEMIUM_AND_METERING.md) · [PRD traceability](PRD_TRACEABILITY_MATRIX.md) · [PRD](PRD.md)

## Classification labels

- `VERIFIED` — implementation exists in the cited source; behaviour covered by code and, where noted, a local test.
- `LIMITED` — works within a stated sandbox/local boundary; do not present as production-capable.
- `PARTIALLY_IMPLEMENTED` — code exists but coverage or an integration boundary remains.
- `NOT_IMPLEMENTED` / `BLOCKED` — do not claim.
- `Experimental`, `Beta implemented`, `Integration pending`, `Planned` — labels used verbatim by the API catalogue and developer portal.

## What ships

| Capability | Status | Evidence |
|---|---|---|
| Standalone HTTP service, default listen `:9091` | VERIFIED | `cmd/eaas/main.go:15`; `cmd/eaas/main.go:39-52` |
| Routes `/healthz`, `/api/eaas/v1/*`, `/api/beta/v1/*` | VERIFIED | `internal/eaas/http.go:12-68` |
| Developer portal at `/` and `/portal` from `EAAS_STATIC_DIR` | VERIFIED | `cmd/eaas/main.go:18,34-37`; `web/eaas/index.html` |
| Responsive portal UI: discovery, registration, verification, project/keys, operations, usage, plans, beta form | VERIFIED | `web/eaas/index.html:62-163,165-276` |
| Registration, bcrypt passwords, bearer sessions, 6-digit code verification | VERIFIED | `internal/eaas/service.go:107-292` |
| Email delivery of verification codes | Integration pending | `internal/eaas/service.go:174-177`; `web/eaas/index.html:109` |
| Projects, sandbox/live API keys, revoke and rotate | VERIFIED | `internal/eaas/service.go:330-500` |
| Tenant identity from stored credential, not a client tenant header | VERIFIED | `internal/eaas/service.go:535-560`; `internal/eaas/eaas_test.go:323-348` |
| AES-256-GCM, HMAC-SHA-256, SHA-256, `crypto/rand` operations | Beta implemented | `internal/eaas/crypto.go:30-35`; `internal/eaas/crypto.go:124-186` |
| ML-KEM-768 and ML-DSA-65 via `cloudflare/circl` v1.6.1 | Experimental | `internal/eaas/crypto.go:12-13,36-41`; `go.mod` |
| SLH-DSA | Planned | `web/eaas/index.html:70` ("SLH-DSA planned"); no implementation in `internal/eaas/crypto.go` |
| Four plans with enforced numeric monthly quota and RPM | VERIFIED | `internal/eaas/plans.go:29-58`; `internal/eaas/service.go:604-677` |
| Plan flags `AdvancedAnalytics`, `AuditLog`, `SSO`, `HSM`, `PQCExperimental` | VERIFIED as display-only | `internal/eaas/plans.go:16-25`; `internal/eaas/http.go:24-29`; no gate in `internal/eaas/service.go` |
| Metadata-only usage events, shown in portal | VERIFIED | `internal/eaas/store.go:91-105`; `internal/eaas/service.go:754-829` |
| Beta registration `received_pending_review`; admin listing requires `EAAS_ADMIN_TOKEN` | Beta implemented, LIMITED (manual review) | `internal/eaas/service.go:880-943`; `internal/eaas/http.go:62-66,374-382` |
| Atomic JSON file store (`.tmp` write + rename), single process | LIMITED — local sandbox only | `internal/eaas/store.go:12-18,139-163,195-222` |
| PostgreSQL target schema `004_eaas_schema.sql` | BLOCKED — schema only, no repository/implementation in evidence scope | `deploy/migrations/004_eaas_schema.sql:1-3,47-48,99-101` |
| Strict CORS allowlist, security headers | VERIFIED | `internal/eaas/http.go:70-102`; `internal/eaas/eaas_test.go:478-492` |
| Payment collection, Stripe, webhooks, email delivery | NOT_IMPLEMENTED / Integration pending | `internal/eaas/service.go:853`; `web/eaas/index.html:72,140` |
| HSM custody, FIPS/CAVP validation, AI operations, quantum hardware, wireless operations | NOT_IMPLEMENTED | No implementation in `internal/eaas/*.go`; `web/eaas/index.html:70,72` |
| CI: gofmt, go vet, go build, go test; no deploy gate | VERIFIED | `.github/workflows/eaas-ci.yml:38-47` |

## Honest boundaries

The portal at `/` and `/portal` is a user interface, not a hosted service. The service uses an atomic JSON file for sandbox state; private key bytes are persisted base64 in that file and require filesystem protection (`internal/eaas/store.go:79-89,195-205`; `web/eaas/index.html:163`). The PostgreSQL migration is a **target schema** only: the evidence files contain no repository, connection configuration, or hosted deployment. Classical operations are labelled `Beta implemented`; PQC operations are labelled `Experimental` in every operation response (`internal/eaas/service.go:748-749`). Plan flags are shown in the portal but no feature gate reads them in the service.

## Test snapshot

Seven EaaS package tests passed locally, including `TestCORSAllowsConfiguredOriginOnly` (`internal/eaas/eaas_test.go`). The full repository `go test ./...` suite, `go vet ./...`, and `go build ./...` also passed locally after the EaaS addition. See [EAAS_TESTING_CI.md](EAAS_TESTING_CI.md).
