# Alpha / beta test report

Evidence snapshot of the local tree after `d0e9dbf`
(`fix(site): publish EaaS documentation on GitHub Pages`), including the
standalone EaaS foundation added in `2720da2`. This report records program
evidence and locally run checks only. It is not a certification, an SLA,
customer validation, a Stable/GA declaration, or Production approval.

Companions: [Test report](../RIVICQ_TEST_REPORT.md) · [Production readiness](../RIVICQ_PRODUCTION_READINESS.md) · [Beta program](../BETA_PROGRAM.md) · [EaaS product status](EAAS_PRODUCT_STATUS.md) · [EaaS testing & CI](EAAS_TESTING_CI.md) · [Pilot readiness](PILOT_READINESS.md)

## Program evidence

| Gate | Status | Evidence |
|---|---|---|
| Formal alpha program | NOT RECORDED | No alpha cohort, enrolment, sign-off, feedback log, or exit record exists in tracked documentation. No customer validation is claimed. |
| Internal/local validation only | VERIFIED (local) | Commands below were run locally on the current tree after `d0e9dbf`; see `RIVICQ_TEST_REPORT.md`. |
| CSPM beta | Qualified-team process documented; beta exit not recorded | `BETA_PROGRAM.md` is "open for qualified teams" with enrolment by `sales@rivicq.com` or a GitHub Discussion. `docs/PILOT_ACCEPTANCE_CRITERIA.md` P1–P6 are controlled-pilot tests, not a beta exit gate. |
| EaaS beta | Early beta, manual review | `BETA_PROGRAM.md` and `docs/EAAS_PRODUCT_STATUS.md`: registration returns `received_pending_review`; admin review listing requires `EAAS_ADMIN_TOKEN`. Maturity labels are `Beta implemented` (classical operations), `Experimental` (ML-KEM-768 / ML-DSA-65), `LIMITED` (sandbox state file and manual review), `PARTIALLY_IMPLEMENTED` (plan switch), `BLOCKED` (Postgres repository), `NOT_IMPLEMENTED` (hosted EaaS, payments, HSM, FIPS/CAVP, AI, quantum hardware, wireless), `Integration pending` (email), `Planned` (SLH-DSA). |

## Verification actually run on the current tree

| Command | Result |
|---|---|
| `go vet ./...` | pass |
| `go build ./...` | pass |
| `go test ./...` | pass — full repository suite, 30 packages with tests; includes the seven EaaS tests below |
| `go vet -tags enterprise ./...` | pass |
| `go build -tags enterprise ./...` | pass |
| `go test -tags enterprise ./...` | pass |
| `go test -tags integration ./tests/integration/` | pass — 11 skipped locally without `RIVICQ_TEST_DATABASE_URL`; earlier DSN-backed run: 10 pass, 1 skip |
| `npm run --prefix web type-check` | pass |
| `npm run --prefix web lint` | pass |
| `bash scripts/verify-pages-build.sh` | pass — 109 checks over the `scripts/build-pages.sh` output |
| GitHub Pages workflow run `#120` | succeeded, publishing the earlier EaaS documentation on Pages |

The Pages result is a static-site publication. It does **not** deploy a backend:
GitHub Pages has no API, and the EaaS portal is served by `cmd/eaas` at `/` and
`/portal`. No hosted backend deployment or customer beta cohort is evidenced.

## Seven EaaS tests

Names and line numbers are from `internal/eaas/eaas_test.go` and
`docs/EAAS_TESTING_CI.md`; all seven pass locally as part of `go test ./...`.

| Test | What it exercises |
|---|---|
| `TestDeveloperJourneyEndToEnd` (line 109) | Registration → verification → project → sandbox key → AES/HMAC/digest/random → ML-KEM and ML-DSA round trips → metadata-only usage → plans → key rotate/revoke |
| `TestTenantIsolation` (line 323) | Cross-tenant key use returns `E_KEY_NOT_FOUND`; cross-tenant project access returns `404` |
| `TestQuotaAndRateLimitEnforcement` (line 350) | Free-tier quota returns `E_QUOTA_EXCEEDED`; lowered RPM returns `E_RATE_LIMITED` |
| `TestBetaRegistrationValidationAndReview` (line 394) | Missing consent `400`, submission `received_pending_review`, duplicate `409`, wrong/missing admin token `403` |
| `TestSecretsAreNotPersistedInStateFile` (line 434) | No API key, session token, plaintext message, or password in the state file |
| `TestClassicalCryptoPrimitives` (line 455) | AES-GCM round trip, tampered AAD rejection, zero-length `random` rejection |
| `TestCORSAllowsConfiguredOriginOnly` (line 478) | Configured origin receives `Access-Control-Allow-Origin`; unconfigured origin does not |

These are handler, service, and JSON-file-store tests against
`httptest.NewServer(Router(service))` (`internal/eaas/eaas_test.go:23-36`). They
are not Postgres, hosted-deployment, browser-UI, PQC-interoperability, or
FIPS/CAVP validation.

## Exit criteria

No formal alpha exit criteria and no EaaS or CSPM beta exit criteria are
documented in tracked files. `docs/PILOT_ACCEPTANCE_CRITERIA.md` (P1–P6) and the
checklist in `docs/PILOT_READINESS.md` govern a controlled pilot, not an
alpha/beta graduation decision. EaaS submissions remain `received_pending_review`
under manual admin review with no promotion rule. **Alpha/beta exit criteria:
MISSING.**

## Deployment verdict

| Surface | Verdict | Evidence |
|---|---|---|
| GitHub Pages | READY / DEPLOYED | Static docs and labeled demos; `scripts/verify-pages-build.sh` 109 checks passed locally on the current tree; workflow `#120` succeeded for the earlier EaaS docs publication. No API or customer estate on Pages. |
| EaaS standalone sandbox | RUNNABLE locally — `LIMITED` | `go run ./cmd/eaas`, default `:9091`, `internal/eaas/store.go` atomic JSON state; `docs/EAAS_DEPLOYMENT.md`. Not hosted; Postgres repository `BLOCKED`. |
| CSPM hosted backend | NOT DEPLOYED in evidence | `docs/PILOT_READINESS.md` marks the hosted API `LIMITED`; CLI or a separately deployed API is required. |
| Production (CSPM or EaaS) | NOT READY / NOT APPROVED | `RIVICQ_PRODUCTION_READINESS.md` keeps the production-not-approved verdict; EaaS has no hosted deployment, no beta exit record, and no customer validation. |
