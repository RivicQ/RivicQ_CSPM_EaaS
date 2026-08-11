# Integration & Audit Status

**Last updated:** 2026-08-09  
**Version:** 1.2.0  
**Repository:** https://github.com/RivicQ/RivicQ_CSPM_EaaS

This document records which integrations are implemented against real
providers/SDKs and which fall back to demo data, so reviewers can tell a real
feature from a stub at a glance.

Legend:
- **Real** — talks to the actual provider/SDK when credentials are present.
- **Fallback** — returns demo/seed data when credentials or an endpoint are
  unavailable (server keeps working standalone).
- **Stub** — returns static data only; no real call path.

---

## Database

| Component | Status | Details |
|---|---|---|
| OSS / shared schema | Real | `database.New(logger)` + `RunMigrations` against the OSS-schema DB (`CRYPTOBOM_DB_*`). |
| Enterprise schema | Real | Separate `cryptobom_enterprise` DB via `NewEnterpriseConnection` + `RunEnterpriseMigrations`, wired in `internal/api/enterprise/handlers.go` `SetupRoutes`. DB name via `CRYPTOBOM_ENTERPRISE_DB_NAME`. |
| Migrations | Real | Embedded, idempotent (`IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object`). Safe to re-run at every boot. |

The two-DB split avoids a schema clash between the legacy OSS `tenants` table
(TEXT `tenant_id`) and the enterprise schema (UUID FKs).

## Authentication

| Component | Status | Details |
|---|---|---|
| Login / JWT | Real | bcrypt password check, expiry/rotation, edition claim. |
| Work-domain restriction | Real | `AUTH_ALLOWED_DOMAINS` enforced on login/OAuth. |
| **TOTP MFA** | Real | `github.com/pquerna/otp`; server-side single-use 10-min `MFASession`; routes `/mfa/setup`, `/mfa/confirm`, `/mfa/disable`, and rewritten `/mfa/verify`. Wrong codes and session replay are rejected. |
| Google / GitHub OAuth | Real (needs creds) | Uses configured OAuth client IDs/secrets; disabled when unset. |
| Demo access | Real | `GET /api/v1/auth/demo?edition=...` issues a token for `demo@rivicq.com`. |

## Cloud providers

| Component | Status | Details |
|---|---|---|
| AWS inventory (EC2/S3/RDS/EKS) | Real + Fallback | `awscloud.NewClient` uses the SDK default credential chain; `cloud_sdk.go` falls back to demo data when unconfigured. |
| **AWS KMS / CloudHSM / CloudTrail** | Real + Fallback | `awscloud.NewCloudHSMClient` builds KMS/CloudHSM/CloudTrail SDK v2 clients (static creds or default chain). Handlers `/enterprise/aws/*` return real data when configured, demo otherwise. |
| **GCP inventory (Compute/Storage/GKE)** | Real + Fallback | `gcpcloud.NewClient` prefers `GCP_KEY_FILE`, then ADC; `STORAGE_EMULATOR_HOST` only used for an emulator. `ListGCEInstances` reuses one authenticated client. |
| Azure inventory (VM/Storage/AKS) | Real + Fallback | `azurecloud.NewClient` via `AZURE_SUBSCRIPTION_ID`; demo fallback when unconfigured. |
| **IBM HPCS** | Real + Fallback | `ibmcloud.NewHPCSClient` authenticates via IBM Cloud IAM (`IBM_API_KEY`) and calls the HPCS REST API (`/api/v2/instance`, `/api/v2/keys`, `/api/v2/keys/{id}/attestation`) when `HPCS_ENABLED` + `HPCS_INSTANCE` are set; demo fallback otherwise. |
| IBM COS buckets | Real + Fallback | S3-compatible list against `IBM_COS_ENDPOINT` using `IBM_COS_ACCESS_KEY`/`IBM_COS_SECRET_KEY`; demo fallback otherwise. |
| GCP KMS / HSM keyrings | Stub | Hardcoded JSON in handlers (no SDK yet). |

## Compliance integrations

| Component | Status | Details |
|---|---|---|
| **Delve** | Real + Fallback | `/compliance/delve/connect` verifies the API (`DELVE_ENDPOINT`/`DELVE_API_KEY` or request body) before enabling; `/sync` fetches `/api/v1/controls`; `/status` reflects the DB flag. Demo sync payload when unconfigured. |
| **Kertos** | Real + Fallback | Same pattern via `/api/compliance/controls` with `KERTOS_*` envs; demo sync payload when unconfigured. |

## Observability

| Component | Status | Details |
|---|---|---|
| OpenTelemetry | Real + Fallback | `InitOTEL` builds a tracer provider with service resource. When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, spans export via OTLP/HTTP (Jaeger/Tempo/collector); otherwise spans are dropped so the app works standalone. |

## Quantum / crypto

| Component | Status | Details |
|---|---|---|
| PQC service | Real (software) + optional HSM | `PQCService.GenerateKeyPair` seeds from `crypto/rand`; if an `AWSHSMClient` is supplied and returns entropy it is used, with safe fallback to `crypto/rand` (nil/error guarded). |
| IBM Quantum | Real (needs creds) | `IBMQ_API_KEY` + endpoint; attestation endpoints enabled when `IBMQ_ENABLED`. |
| AWS HSM entropy | Stub/optional | `GenerateHSMEntropy` returns nil so callers use software entropy; production would call the CloudHSM SDK. |

## Verified during audit (2026-08-09)

- Enterprise server boots on `CRYPTOBOM_PORT`, runs idempotent migrations, serves
  `/api/v1/inventory/summary`.
- MFA E2E: setup → confirm → login requires MFA → wrong code rejected → correct
  code grants tokens → session replay rejected.
- AWS/IBM handlers return demo JSON when unconfigured; HTTP 200 with `demo: true`
  or empty-real shapes.
- `go build ./...`, `go build -tags enterprise ./...`, and `go test ./...` pass.
- `npm run type-check` passes (web).

## Known gaps

- GCP KMS/HSM endpoints and AWS HSM entropy are stubs (documented above).
- In-memory token blacklist (lost on restart); no encryption at rest for secrets.
- SSO (SAML/LDAP) handlers remain demo-level placeholders.
