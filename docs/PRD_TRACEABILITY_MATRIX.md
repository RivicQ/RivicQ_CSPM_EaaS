# EaaS PRD traceability matrix

Maps the CSPM functional requirements in `docs/PRD.md` (FR-1–FR-13) and the EaaS requirements added to that PRD (FR-14–FR-22) to evidence paths. FR-14–FR-22 are a separate product surface derived from the EaaS evidence scope: `internal/eaas/*.go`, `cmd/eaas/main.go`, `web/eaas/index.html`, `deploy/migrations/004_eaas_schema.sql`, `.github/workflows/eaas-ci.yml`. No completion is claimed beyond that evidence.

Companions: [PRD](PRD.md) · [Product status](EAAS_PRODUCT_STATUS.md) · [EaaS API](EAAS_API.md) · [Limitations](EAAS_LIMITATIONS.md)

## Labels used

`VERIFIED` — implementation present in cited files. `LIMITED` — sandbox/local boundary. `PARTIALLY_IMPLEMENTED` — code exists with an integration gap. `NOT_IMPLEMENTED` / `BLOCKED` — do not claim. `Experimental`, `Beta implemented`, `Integration pending`, `Planned` are the product's own maturity labels.

## FR-1–FR-13: existing CSPM requirements

These belong to the scanner/control-plane product. The EaaS router is explicitly independent of the legacy CSPM router (`internal/eaas/http.go:10-12`), so EaaS does not implement, replace, or re-verify them. Evidence paths below are the ones cited by `docs/PRD.md:51-65`; this pass did not re-run CSPM tests.

| ID | PRD requirement (CSPM) | Evidence path cited in `docs/PRD.md` | EaaS relevance |
|---|---|---|---|
| FR-1 | Scan website, host/IP, server, declared pod, hardware catalog targets | `internal/discovery/targetclass.go`, `internal/discovery/demo_targets.go` | None — separate CSPM service |
| FR-2 | Produce a `ScanResult` JSON without breaking the contract | `docs/CORE_ENGINE.md`, `internal/discovery/scanner.go` | None |
| FR-3 | Normalize findings with PQC class, risk, evidence, remediation | `internal/intelligence/pipeline.go`, `internal/intelligence/pqc_class.go` | None |
| FR-4 | Policy gate with BLOCK/WARN semantics and severity fail-on | `internal/intelligence/failon.go`, `internal/intelligence/policy.go` | None |
| FR-5 | Export CycloneDX 1.6 CBOM | `GET /api/v1/scans/:id/cyclonedx` (`internal/intelligence/cyclonedx.go`) | None |
| FR-6 | Scan GitHub repositories via token or synthetic fixture | `/api/v1/github/scan` (`internal/api/shared/github_scanning.go`) | None |
| FR-7 | Accept signed GitHub webhooks (HMAC) with replay protection | `internal/api/shared/github_webhook_security_test.go` | None — EaaS has no webhooks |
| FR-8 | Authenticate users: JWT, bcrypt, TOTP MFA, Google/GitHub OAuth | `internal/authn/authn.go`, `internal/authn/password.go` | None — EaaS has bcrypt + bearer sessions only |
| FR-9 | Tenant isolation from JWT claims; reject `X-Tenant-ID` | `internal/tenant/context.go`, `internal/api/enterprise/tenancy.go` | Separate mechanism: EaaS derives identity from stored API key (`internal/eaas/service.go:535-560`) |
| FR-10 | Enforce edition flags server-side (Enterprise APIs 403 on OSS) | `internal/edition/edition.go`, `internal/api/enterprise/handlers.go` | None — EaaS plan flags are display-only |
| FR-11 | Static firmware and identity analysis with size limits and RBAC | `internal/firmware/limits.go`, `docs/FIRMWARE_IDENTITY_API.md` | None |
| FR-12 | Community UI for scans, findings, assets, analytics, pipeline | `web/src/pages/`, routes in `web/src/App.tsx` | None — EaaS portal is `web/eaas/index.html` |
| FR-13 | Enterprise UI for inventory, compliance, multi-cloud, quantum, admin | `web/src/pages/enterprise/`, gated by `RequireEnterprise` | None |

## FR-14–FR-22: EaaS requirements

| ID | Proposed requirement | Status | Evidence path |
|---|---|---|---|
| FR-14 | Standalone service on default `:9091` exposing `/healthz`, `/api/eaas/v1/*`, `/api/beta/v1/*` and a portal at `/` and `/portal` from `EAAS_STATIC_DIR` | VERIFIED | `cmd/eaas/main.go:15,18,33-37`; `internal/eaas/http.go:12-68`; `web/eaas/index.html` |
| FR-15 | Developer registration, bcrypt passwords, bearer sessions, 6-digit verification with five-attempt/24 h limits; email delivery excluded | PARTIALLY_IMPLEMENTED — email `Integration pending` | `internal/eaas/service.go:107-292`; `web/eaas/index.html:87-113,190-206` |
| FR-16 | Projects, one-time API keys, revoke/rotate, tenant identity from stored credential rather than a client tenant header | VERIFIED | `internal/eaas/service.go:330-560`; `internal/eaas/store.go:65-77`; `internal/eaas/eaas_test.go:323-348` |
| FR-17 | Server-held classical keys and real AES-256-GCM, HMAC-SHA-256, SHA-256 and `crypto/rand` operations with payload limits | Beta implemented | `internal/eaas/crypto.go:29-35,66-73,102-186`; `internal/eaas/service.go:502-533,696-751` |
| FR-18 | ML-KEM-768 and ML-DSA-65 keygen/use via `github.com/cloudflare/circl` v1.6.1, labelled in every response; SLH-DSA `Planned` | Experimental | `internal/eaas/crypto.go:12-13,36-41,188-269`; `web/eaas/index.html:70` |
| FR-19 | Four plans with enforced numeric monthly quota, RPM, project/key counts and production eligibility; billing metadata only | VERIFIED for enforcement; billing `Integration pending` | `internal/eaas/plans.go:29-80`; `internal/eaas/service.go:604-677,835-859`; `internal/eaas/eaas_test.go:350-392` |
| FR-20 | Metadata-only usage events, monthly summary and recent-activity listing; no payloads or secrets persisted | VERIFIED | `internal/eaas/store.go:91-105`; `internal/eaas/service.go:754-829`; `deploy/migrations/004_eaas_schema.sql:60-74`; `internal/eaas/eaas_test.go:273-284` |
| FR-21 | Beta registration with explicit consent, `received_pending_review` status, duplicate rejection and `EAAS_ADMIN_TOKEN`-gated admin listing; manual review only | Beta implemented — LIMITED | `internal/eaas/service.go:862-943`; `internal/eaas/http.go:62-66,359-382`; `web/eaas/index.html:144-159` |
| FR-22 | Strict CORS allowlist, security headers, atomic JSON sandbox store and a PostgreSQL target schema with tenant-isolation guidance | PARTIALLY_IMPLEMENTED — sandbox store `LIMITED`, Postgres `BLOCKED` | `internal/eaas/http.go:70-102`; `internal/eaas/store.go:12-18,195-222`; `deploy/migrations/004_eaas_schema.sql:1-3,47-48,99-101`; `cmd/eaas/main.go:20,62-74` |

## Cross-cutting EaaS boundaries

- No email delivery, Stripe/payments, payment webhooks, hosted deployment, production Postgres repository, FIPS/CAVP validation, AI operations, quantum hardware, HSM custody, or wireless operations: `NOT_IMPLEMENTED`, `Integration pending`, or `BLOCKED` as itemised in [EAAS_LIMITATIONS.md](EAAS_LIMITATIONS.md).
- Plan flags `AdvancedAnalytics`, `AuditLog`, `SSO`, `HSM`, `PQCExperimental` are display-only (`internal/eaas/plans.go:16-25`).
- CI verifies gofmt, go vet, go build and go test; no deploy gate (`.github/workflows/eaas-ci.yml:38-47`). Seven EaaS package tests and the full repository `go test ./...` suite passed locally, including `TestCORSAllowsConfiguredOriginOnly`; no deployment or hosted-service gate is implied.
