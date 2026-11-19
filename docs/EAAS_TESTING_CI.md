# EaaS testing & CI

Evidence from `internal/eaas/eaas_test.go`, `.github/workflows/eaas-ci.yml`, `internal/eaas/crypto.go`, `internal/eaas/service.go` and `docs/PRD.md`. Local verification results were recorded after this document set was drafted.

Companions: [Product status](EAAS_PRODUCT_STATUS.md) · [API](EAAS_API.md) · [Deployment](EAAS_DEPLOYMENT.md) · [Limitations](EAAS_LIMITATIONS.md)

## Local test results

Seven EaaS package tests passed locally, including `TestCORSAllowsConfiguredOriginOnly`. The full repository `go test ./...` suite, `go vet ./...`, and `go build ./...` also passed locally after the EaaS addition. A live smoke run from the built binary passed: `/healthz`, the portal at `/portal/` (HTTP 200), the register → verify → project → API key → `digest` → usage journey, and a 12-operation catalogue.

| Test (`internal/eaas/eaas_test.go`) | What it exercises |
|---|---|
| `TestDeveloperJourneyEndToEnd` (line 109) | Register → verify → project → sandbox key → AES encrypt/decrypt and tamper failure → HMAC sign/verify and bad MAC → digest → random → ML-KEM round-trip → ML-DSA sign/verify and bad signature → usage summary/events with no payload fields → plans → plan change → production project/key after upgrade → rotate/revoke with old key rejected |
| `TestTenantIsolation` (line 323) | Cross-tenant key use returns `E_KEY_NOT_FOUND`; cross-tenant project access returns `404`; own credential still works |
| `TestQuotaAndRateLimitEnforcement` (line 350) | Seeds 10,000 free-tier success events → `E_QUOTA_EXCEEDED`; lowers free RPM to 1 → second request returns `E_RATE_LIMITED` |
| `TestBetaRegistrationValidationAndReview` (line 394) | Missing consent `400`, valid submission `received_pending_review`, duplicate `409`, wrong/missing admin token `403` |
| `TestSecretsAreNotPersistedInStateFile` (line 434) | State file contains neither API key, session token, plaintext test message, nor password |
| `TestClassicalCryptoPrimitives` (line 455) | AES-GCM round trip, tampered AAD rejection, zero-length `random` rejection |
| `TestCORSAllowsConfiguredOriginOnly` (line 478) | Configured origin receives `Access-Control-Allow-Origin`; unconfigured origin does not |

The test harness spins up `httptest.NewServer(Router(service))` with a temp JSON data file, `Environment: "development"`, `AdminToken: "admin-test-token"` and `AllowedOrigins: []string{"https://portal.example"}` (`internal/eaas/eaas_test.go:23-36`). Coverage is therefore at the HTTP handler + service + file-store level, not against Postgres or a hosted deployment.

## CI workflow

`.github/workflows/eaas-ci.yml` runs on push, pull request and manual dispatch. Path filters include `internal/eaas/**`, `cmd/eaas/**`, `web/eaas/**`, `deploy/migrations/004_eaas_schema.sql`, `docs/EAAS_*.md`, `go.mod`, `go.sum` and the workflow file itself. Permissions are `contents: read`.

| Step | Command | Status |
|---|---|---|
| Checkout | `actions/checkout@v4` | VERIFIED in workflow |
| Go setup | `actions/setup-go@v5`, version from `go.mod`, cache enabled | VERIFIED in workflow |
| Check formatting | `gofmt -l internal/eaas cmd/eaas` must output nothing | VERIFIED in workflow |
| Vet | `go vet ./internal/eaas/... ./cmd/eaas/...` | VERIFIED in workflow |
| Build | `go build ./...` | VERIFIED in workflow |
| Test | `go test ./... -count=1` | VERIFIED in workflow |

The workflow runs the full-repository `go test ./...` in CI; the same suite also passed locally after the EaaS addition. There is **no deploy step, environment promotion, migration application, or release gate** in `eaas-ci.yml` (`Integration pending` / `NOT_IMPLEMENTED`). The new `docs/EAAS_*.md` files are in the path filter, so documentation-only changes trigger the same verify job.

## Unverified areas

- Enterprise-tag build/vet/test commands: not re-run after the EaaS addition.
- PostgreSQL migration application: unverified; no repository or DB service in evidence scope (`deploy/migrations/004_eaas_schema.sql`).
- Browser interaction in `web/eaas/index.html`: no automated UI test in the EaaS evidence files.
- PQC interoperability beyond the in-package round trips above: unverified; operations remain `Experimental`.
- FIPS/CAVP validation and HSM integration: `NOT_IMPLEMENTED`.
