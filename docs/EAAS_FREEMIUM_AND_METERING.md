# EaaS freemium & metering

Plans, enforced entitlements and usage telemetry for the standalone EaaS service. Source of truth: `internal/eaas/plans.go`, enforced in `internal/eaas/service.go`, rendered in `web/eaas/index.html`, with the target columns in `deploy/migrations/004_eaas_schema.sql`. Billing is **Integration pending**; no payment collection is implemented.

Companions: [Product status](EAAS_PRODUCT_STATUS.md) · [API](EAAS_API.md) · [Deployment](EAAS_DEPLOYMENT.md) · [Limitations](EAAS_LIMITATIONS.md)

## Plan catalogue

`GET /api/eaas/v1/plans` returns these four entries in order free → startup → professional → enterprise (`internal/eaas/plans.go:29-70`; `internal/eaas/http.go:24-26`). Currency is `EUR` and `billing_integration` is `manual_not_configured` at the endpoint level.

| Plan | Monthly operations | Requests/minute | Projects | Keys/project | Production | Price/month | Overage | Support | Billing integration |
|---|---|---|---|---|---|---|---|---|---|
| free | 10,000 | 60 | 1 | 2 | no | €0 | €0 / 1k | Community | `not_required` |
| startup | 250,000 | 600 | 5 | 10 | yes | €490 | €0.40 / 1k | Email | `manual_not_configured` |
| professional | 1,000,000 | 3,000 | 25 | 50 | yes | €1,490 | €0.25 / 1k | Business hours | `manual_not_configured` |
| enterprise | `-1` (unlimited in enforcement) | `-1` (no RPM limit) | `-1` | `-1` | yes | `0` (portal renders zero-price plans as "Free") | `0` | Dedicated | `enterprise_contract` |

All four plans set `PQCExperimental: true`. `AdvancedAnalytics` and `AuditLog` are false for free/startup and true for professional/enterprise. `SSO` and `HSM` are true only for enterprise. Prices and overage values are display metadata; no charge is made (`internal/eaas/plans.go:29-58`).

## What is actually enforced

| Control | Implementation | Status |
|---|---|---|
| Monthly operation quota | `Execute` counts successful events for the current UTC calendar month; when `used >= MonthlyOperations` it records a `rejected` event and returns `429 E_QUOTA_EXCEEDED` (`internal/eaas/service.go:604-616,659-673`) | VERIFIED |
| Requests per minute | Fixed per-API-key UTC minute bucket; stale windows older than two minutes are pruned; over-limit returns `429 E_RATE_LIMITED` and records a `rejected` event (`internal/eaas/service.go:76-78,618-645,674-677`) | VERIFIED |
| Project count | `planCountLimit` blocks creation beyond `Projects`; `-1` allows unlimited (`internal/eaas/service.go:344-366`; `internal/eaas/plans.go:80`) | VERIFIED |
| Keys per project | Counts non-revoked keys against `KeysPerProject` (`internal/eaas/service.go:419-436`) | VERIFIED |
| Production eligibility | Free plan cannot create production projects or production API keys (`internal/eaas/service.go:341-347,402-405`) | VERIFIED |
| Downgrade guard | Changing plan is rejected with `409 E_DOWNGRADE_BLOCKED` if current usage exceeds the target quota (`internal/eaas/service.go:835-843`) | VERIFIED |
| Entitlement change | `POST /subscription` replaces the subscription immediately and labels billing manually unconfigured; no card data is collected (`internal/eaas/service.go:844-859`) | PARTIALLY_IMPLEMENTED (entitlements only) |
| `AdvancedAnalytics`, `AuditLog`, `SSO`, `HSM`, `PQCExperimental` flags | No gate in `internal/eaas/service.go`; PQC operations work on free; usage summary is identical across plans | VERIFIED as display-only |
| Billing integration strings (`not_required`, `manual_not_configured`, `enterprise_contract`) | Returned in plans/subscription responses only | Integration pending |

Tests covering the numeric quota/RPM enforcement: `TestQuotaAndRateLimitEnforcement`, and `TestDeveloperJourneyEndToEnd` for plan change and production eligibility (`internal/eaas/eaas_test.go:109-321,350-392`). Local result: seven EaaS package tests passed; full repository `go test ./...` suite passed after the EaaS addition.

## Usage events

`recordUsage` writes one event per execute attempt that reaches quota/rate/crypto handling, with `status` `success`, `failure` or `rejected` and fields: id, user, project, key, operation, category, status, error code, latency in ms, timestamp (`internal/eaas/store.go:91-105`; `internal/eaas/service.go:754-770`). No payload, plaintext, ciphertext, signature, shared secret or key is stored. The target SQL schema mirrors this metadata-only model (`deploy/migrations/004_eaas_schema.sql:60-74`).

`GET /api/eaas/v1/usage/summary` returns: `plan`, `period_start`, `period_end`, `operations_used` (successes this UTC month), `operations_failed`, `monthly_quota`, `remaining_quota` (floored at 0; `-1` for unlimited), `requests_per_minute`, `by_operation`, `by_category`, and `upgrade_interest` (true when successes are at least half a positive quota) (`internal/eaas/service.go:772-808`). `GET /api/eaas/v1/usage/events` returns up to 50 recent metadata events for the session user (`internal/eaas/http.go:332-336`; `internal/eaas/service.go:810-829`). The portal renders the same numbers and activity table (`web/eaas/index.html:263-266`).

## Honest billing boundary

The portal says plan changes update entitlements immediately and that payment collection is not implemented (`web/eaas/index.html:140,268-270`). There is no Stripe integration, invoice generation, payment webhook, email receipt, or hosted checkout in the evidence scope. Selecting `enterprise` in the portal changes entitlements only; it does not create a contract or provision HSM, SSO, audit, or advanced-analytics features.
