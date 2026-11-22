# EaaS limitations

Honest boundary list for the standalone EaaS build. Status labels match the rest of this document set: `VERIFIED`, `LIMITED`, `PARTIALLY_IMPLEMENTED`, `NOT_IMPLEMENTED`, `BLOCKED`, `Experimental`, `Beta implemented`, `Integration pending`, `Planned`. Sources: `internal/eaas/*.go`, `cmd/eaas/main.go`, `web/eaas/index.html`, `deploy/migrations/004_eaas_schema.sql`, `.github/workflows/eaas-ci.yml`, `docs/PRD.md`.

Companions: [Product status](EAAS_PRODUCT_STATUS.md) · [API](EAAS_API.md) · [Deployment](EAAS_DEPLOYMENT.md) · [Security & privacy](EAAS_SECURITY_PRIVACY.md) · [Testing & CI](EAAS_TESTING_CI.md) · [Freemium & metering](EAAS_FREEMIUM_AND_METERING.md)

## Capability gaps

| Item | Status | Evidence / boundary |
|---|---|---|
| Classical crypto operations (AES-256-GCM, HMAC-SHA-256, SHA-256, `crypto/rand`) | Beta implemented | `internal/eaas/crypto.go:29-35`; not a validated cryptographic module |
| ML-KEM-768 / ML-DSA-65 | Experimental | `github.com/cloudflare/circl` v1.6.1; labelled `Experimental` in all catalogue and operation responses (`internal/eaas/crypto.go:12-13,36-41`) |
| SLH-DSA | Planned | `web/eaas/index.html:70`; no implementation in `internal/eaas/crypto.go` |
| Email delivery (including verification codes) | Integration pending | Code returned once in development with an explicit notice; no mail sender in EaaS files (`internal/eaas/service.go:174-177`) |
| Payment collection, Stripe, payment webhooks, card data | NOT_IMPLEMENTED | Billing is manual/not configured; plan-change notice states no card data collected (`internal/eaas/service.go:837-859`; `web/eaas/index.html:72,140`) |
| Product webhooks (outbound event delivery) | NOT_IMPLEMENTED | No webhook route or dispatcher in `internal/eaas/http.go` or `internal/eaas/service.go`; portal lists as integration-pending (`web/eaas/index.html:72`) |
| Hosted deployment / SaaS | NOT_IMPLEMENTED | No hosted deployment in evidence scope; portal frames hosting as requiring PostgreSQL (`web/eaas/index.html:72,84`) |
| Production Postgres repository | BLOCKED | `deploy/migrations/004_eaas_schema.sql` is a target schema only; no repository/host/migration runner in EaaS files. Runtime state remains the sandbox JSON file (`internal/eaas/store.go:12-18`) |
| HSM/KMS custody | NOT_IMPLEMENTED | Private bytes are base64 in sandbox state; schema comment says production columns must use HSM/KMS references (`internal/eaas/store.go:79-89`; `deploy/migrations/004_eaas_schema.sql:47-48`) |
| FIPS / CAVP validation | NOT_IMPLEMENTED | Algorithm labels are not certifications; portal states it is not a certified cryptographic module (`web/eaas/index.html:70`) |
| AI operations | NOT_IMPLEMENTED | No AI route or operation in EaaS catalogue; `ai` is only a selectable beta interest (`internal/eaas/crypto.go:29-42`; `internal/eaas/service.go:877`) |
| Quantum hardware | NOT_IMPLEMENTED | PQC is a software library only; `quantum` is a beta interest, not an integration (`internal/eaas/crypto.go:12-13`; `internal/eaas/service.go:877`) |
| Wireless operations | NOT_IMPLEMENTED | No wireless route or operation; `wireless` is only a beta interest (`internal/eaas/crypto.go:29-42`; `internal/eaas/service.go:877`) |
| SSO / SAML / OIDC login in EaaS | NOT_IMPLEMENTED | `SSO` is a display-only plan flag; EaaS auth is registration + bcrypt password + bearer session (`internal/eaas/plans.go:19`; `internal/eaas/service.go:107-292`) |
| Audit log as an entitlement | NOT_IMPLEMENTED | `AuditLog` is display-only; metadata-only usage events exist for all users regardless of plan (`internal/eaas/plans.go:18`; `internal/eaas/service.go:754-829`) |
| Advanced analytics as an entitlement | NOT_IMPLEMENTED | `AdvancedAnalytics` is display-only; usage summary is the same for all plans (`internal/eaas/plans.go:17`; `internal/eaas/service.go:772-808`) |

Plan flags `AdvancedAnalytics`, `AuditLog`, `SSO`, `HSM` and `PQCExperimental` are **VERIFIED as display-only**: the portal renders them from `/plans` but no gate reads them in the service (`internal/eaas/plans.go:16-25`; `web/eaas/index.html:268-270`). PQC operations are available on every plan, including free.

## Operational limits

- Sandbox persistence only: atomic JSON write + rename and a process-local mutex; no multi-process coordination in the evidence scope (`internal/eaas/store.go:12-18,195-222`). Treat the state file as sensitive because it contains base64 private keys (`web/eaas/index.html:163`).
- `EAAS_ENV=production` does not by itself provide Postgres, email, HSM, payments, or key custody; it suppresses the dev verification code and changes the reported environment (`internal/eaas/service.go:80,174-177`; `cmd/eaas/main.go:17`).
- Beta registration is manual review only; submission returns `received_pending_review` and is not approval or an invitation (`internal/eaas/service.go:905-925`). The admin listing is gated by `EAAS_ADMIN_TOKEN`, not by a user role (`internal/eaas/http.go:374-382`).
- CI has no deploy gate: gofmt, go vet, go build and go test only (`.github/workflows/eaas-ci.yml:38-47`).
- Local test evidence covers seven EaaS package tests; the full repository `go test ./...` suite, `go vet ./...`, and `go build ./...` also passed locally (`internal/eaas/eaas_test.go`; see [EAAS_TESTING_CI.md](EAAS_TESTING_CI.md)).

## Not EaaS scope

The CSPM requirements FR-1–FR-13 in `docs/PRD.md` describe the separate scanner/control-plane product. Nothing in the EaaS evidence files migrates, re-implements, or verifies those features. See [PRD_TRACEABILITY_MATRIX.md](PRD_TRACEABILITY_MATRIX.md).
