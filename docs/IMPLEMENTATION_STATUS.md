# Implementation status

Evidence-based snapshot refreshed on the current integration branch. The Pages pilot gate and composite build verification were added on 2026-11-14. The EaaS rows reflect the standalone build merged into `main` in `2720da2`. EaaS is a separate product surface: it does not change any CSPM result, pilot claim, or score. Classification:

> Current status: PARTIALLY IMPLEMENTED — controlled pilot ready for static cryptographic inventory; production Enterprise remains BLOCKED BY EXTERNAL CONFIGURATION. Next: validate the buyer, trigger, and authorized source tree with five security-leader interviews by 2026-11-24, then ship the workflow, console, scanner, evidence, security, accessibility, and release-readiness roadmap.

- `VERIFIED` — implementation exists, workflow works, tests ran in the recorded pass
- `LIMITED` — works inside a stated local/sandbox boundary; not production-capable
- `PARTIALLY_IMPLEMENTED` — code exists; coverage, connectors, or honesty bounds remain
- `NOT_IMPLEMENTED` — do not claim it
- `BLOCKED` — needs credentials, a running Postgres, or an operator task
- `Experimental` / `Integration pending` — labels used by the EaaS API and portal where integration or validation is absent

Product maturity labels used by the readiness API are exactly `Production implemented`, `Beta implemented`, `Experimental`, `Integration pending`, `Planned`, and `Not supported`; they describe surfaces, not customer standing.

Companion: [PRODUCT_STATUS.md](PRODUCT_STATUS.md), [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [audit/FEATURE_MATRIX.md](audit/FEATURE_MATRIX.md). EaaS companions: [EAAS_PRODUCT_STATUS.md](EAAS_PRODUCT_STATUS.md), [EAAS_API.md](EAAS_API.md), [EAAS_DEPLOYMENT.md](EAAS_DEPLOYMENT.md), [EAAS_SECURITY_PRIVACY.md](EAAS_SECURITY_PRIVACY.md), [EAAS_LIMITATIONS.md](EAAS_LIMITATIONS.md), [EAAS_TESTING_CI.md](EAAS_TESTING_CI.md), [EAAS_FREEMIUM_AND_METERING.md](EAAS_FREEMIUM_AND_METERING.md).

All rows in the table below are CSPM only; EaaS starts in the section after it.

| Feature | Class | Evidence | Next |
|---|---|---|---|
| CLI `rivicq scan` / CBOM+SBOM / policy gate | VERIFIED | `cmd/rivicq`, `internal/intelligence`; `go test ./internal/intelligence ./cmd/rivicq` | Keep golden datasets in CI |
| Invalid `--fail-on` / `--format` as usage (exit 2) | VERIFIED | `ParseFailOn`, `ParseOutputFormat`; was silent BLOCK fallback | — |
| RSA-2048 classified, not auto-BLOCK | VERIFIED | `TestEvaluatePolicyAllowsRSA2048WithoutBlock` | — |
| CycloneDX CBOM export | VERIFIED | `internal/intelligence/cyclonedx.go` + tests | — |
| Tenant isolation on scan report | VERIFIED | `tests/scan_tenant_isolation_test.go` | SQL-layer tests still thin |
| JWT tenant_id; `X-Tenant-ID` ignored | VERIFIED | `internal/tenant/context.go` | — |
| CORS allow-list; localhost off in production env | VERIFIED | `internal/middleware/cors.go` + tests | Set `CORS_ORIGINS` per deploy |
| Production refuse start without DB | VERIFIED | `internal/server/server.go` unless `RIVICQ_ALLOW_DEMO_MODE=1` | — |
| Web network boundary | PARTIALLY_IMPLEMENTED | `web/src/services/network.ts`, `web/src/services/api.ts`; 8s timeout, one delayed retry for idempotent GETs, normalized errors, no raw "Network Error" in login/register/MFA | Browser/device evidence remains Planned |
| Console and public Home theme parity | PARTIALLY_IMPLEMENTED | Shared dark/light theme with dark default, header switcher, `rivicq.theme.mode` persistence, system preference support, grouped console navigation, global `RivicQ GmbH i.G.` footer, Archify plates/chips, skip link, and canonical static-build notices in `web/src/App.tsx`, `Layout.tsx`, `Home.tsx`, `Dashboard.tsx`; 36 suites / 126 web tests and production build passed, with details in `docs/UX_REDESIGN_REPORT.md` | Screenshot/device comparison remains Planned |
| Static HTTPS backend detection | PARTIALLY_IMPLEMENTED | `web/src/config/editions.ts` skips backend discovery on static HTTPS pages without explicit `REACT_APP_API_URL` | Operator must configure the API URL for hosted deployments |
| Server-validated auth UX | PARTIALLY_IMPLEMENTED | `web/src/context/AuthContext.tsx`, `web/src/pages/AuthPage.tsx`; sessions need server validation, errors are friendly, disconnected state labels the demo and sales routes | Email delivery and OAuth provider config remain `Integration pending` |
| Public beta request form | PARTIALLY_IMPLEMENTED | `/beta` and `/beta-signup` in `web/src/pages/BetaSignup.tsx`; `platformService.createLead` to `POST /api/v1/leads` when reachable, mailto fallback otherwise, no approval or invitation implied | Email delivery and admin review process remain external |
| Client onboarding checklist | PARTIALLY_IMPLEMENTED | Authenticated `/onboarding` in `web/src/pages/ClientOnboarding.tsx`; local-only links to `/account`, `/demo`, `/workflow-studio`, `/diagrams`, `/contact`; progress is not a backend record | Automated provisioning is `Planned` |
| Admin readiness report | PARTIALLY_IMPLEMENTED | Authenticated admin-only `GET /api/v1/platform/readiness` in `internal/platform/readiness.go` + `internal/platform/handlers.go`; `/readiness` UI in `web/src/pages/ProductionReadiness.tsx`; configuration-only checks with maturity labels and no secrets | No cloud, quantum, EaaS, email, payment, or hardware probes; not a production verdict or change to product status |
| Firmware / identity **static** analysis | PARTIALLY_IMPLEMENTED | CLI + API; no execution, no Infineon MCU, no private-key extract | Documented as static-only |
| GitHub Pages public scan | BLOCKED | Static SPA; no production API | Deploy API or use CLI |
| Pages pilot gate + capability manifest | VERIFIED | `docs/PILOT_READINESS.md`, `docs/PILOT_ONBOARDING.md`, `docs/CAPABILITIES.yaml`, `/pilot/` | Keep the manifest aligned with every phase |
| Composite Pages build verification | VERIFIED | `scripts/build-pages.sh` calls `scripts/verify-pages-build.sh`; both Pages workflows run it | Treat a failed verification as a failed deploy |
| Cloud connectors | BLOCKED | Need customer credentials | Empty state when missing |
| SSO ACS handshake | NOT_IMPLEMENTED | Config store only | Operator IdP task |
| Live Infineon MCU / HSM key inspection | NOT_IMPLEMENTED | Out of scope | Interface docs only |
| Integrations Convex/Stripe/Better Auth | NOT_IMPLEMENTED | Scaffolds in `integrations/` | Do not wire as live |

## EaaS (standalone; separate from CSPM)

Evidence scope: `cmd/eaas/main.go`, `internal/eaas/`, `web/eaas/index.html`, `deploy/migrations/004_eaas_schema.sql`, `.github/workflows/eaas-ci.yml`, `go.mod`.

| Feature | Class | Evidence | Next |
|---|---|---|---|
| Standalone binary/API on `:9091`; `/healthz`, `/api/eaas/v1/*`, `/api/beta/v1/*` | VERIFIED | `cmd/eaas/main.go`, `internal/eaas/http.go` | Keep independent of the CSPM router |
| Portal at `/` and `/portal`, served by the binary (not GitHub Pages) | VERIFIED | `cmd/eaas/main.go:34-37`, `web/eaas/index.html` | No Pages deployment is implied |
| Account/session lifecycle (bcrypt, verification code, bearer sessions) | VERIFIED | `internal/eaas/service.go:107-292`, `internal/eaas/eaas_test.go:109-321` | Email delivery Integration pending |
| Projects, hashed API keys shown once, rotate/revoke, tenant isolation | VERIFIED | `internal/eaas/service.go:330-500`, `internal/eaas/eaas_test.go:323-348` | Keep cross-tenant access at 404 |
| Classical crypto (AES-256-GCM, HMAC-SHA-256, SHA-256, `crypto/rand`) | VERIFIED | `internal/eaas/crypto.go`, `internal/eaas/eaas_test.go:455-477` | Labelled Beta implemented; no CAVP/FIPS claim |
| ML-KEM-768 / ML-DSA-65 via `github.com/cloudflare/circl` v1.6.1 | Experimental | `internal/eaas/crypto.go`, `go.mod`, `internal/eaas/eaas_test.go:109-321` | SLH-DSA NOT_IMPLEMENTED |
| Server-held key lifecycle; private bytes never returned | LIMITED | `internal/eaas/service.go`, `internal/eaas/store.go:79-89` | Private bytes are base64 in the sandbox state file; no HSM custody |
| Free = 10,000 operations/month, 60 RPM; numeric quota/RPM enforcement | VERIFIED | `internal/eaas/plans.go`, `internal/eaas/service.go:604-677`, `internal/eaas/eaas_test.go:350-392` | Keep metering metadata-only |
| Plan switch changes entitlements only | PARTIALLY_IMPLEMENTED | `internal/eaas/service.go:844-859`, `docs/EAAS_FREEMIUM_AND_METERING.md` | Stripe/payment collection NOT_IMPLEMENTED |
| Beta registration `received_pending_review`, admin review gated by `EAAS_ADMIN_TOKEN` | VERIFIED; LIMITED (manual review) | `internal/eaas/service.go:880-943`, `internal/eaas/http.go:62-66`, `internal/eaas/eaas_test.go:394-433` | No email delivery or automated approval |
| Strict CORS allowlist; security headers | VERIFIED | `internal/eaas/http.go:70-102`, `internal/eaas/eaas_test.go:478-492` | Configure `EAAS_ALLOWED_ORIGINS` per deploy |
| Metadata-only usage events | VERIFIED | `internal/eaas/store.go:91-105`, `internal/eaas/service.go:754-829` | Do not add payloads or secrets |
| Seven EaaS package tests and full repository suite passed locally | VERIFIED | `internal/eaas/eaas_test.go`, `docs/EAAS_TESTING_CI.md` | Full repository `go test ./...` passed after EaaS addition |
| CI: gofmt, vet, build, full `go test ./...` | PARTIALLY_IMPLEMENTED | `.github/workflows/eaas-ci.yml` | CI config is not local full-suite evidence; no deploy gate |
| Production Postgres repository / migration runner | BLOCKED | `deploy/migrations/004_eaas_schema.sql` is a target schema only | Needs a repository, host, and applied migration |
| Hosted EaaS, payments/payment webhooks, email delivery | NOT_IMPLEMENTED | No host, mailer, or payment adapter in `internal/eaas/` | Integration pending; do not claim |
| CAVP/FIPS validation, AI operations, quantum hardware, HSM custody, wireless operations | NOT_IMPLEMENTED | No implementation in `internal/eaas/`; `web/eaas/index.html` | Do not claim |

External integrations remain unconfigured/unverified across CSPM and EaaS: hosted DB/RLS, email, OAuth provider config, payments/checkout, cloud credentials, IBM Quantum/HPCS credentials, HSM/QKD/QRNG hardware, and wireless operations. The configuration-only readiness report (`GET /api/v1/platform/readiness`, admin UI `/readiness`) states these boundaries without secret values or cloud, quantum, EaaS, email, payment, or hardware probes and does not change the `PARTIALLY_IMPLEMENTED` product status.

Qiskit scores are a **local taxonomy**, not IBM Quantum jobs, and are a CSPM score only. EaaS is excluded from CSPM scores, pilot readiness, and production-readiness verdicts.
