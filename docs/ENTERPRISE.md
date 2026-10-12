# Enterprise Edition: Controls, Routes, and Operations

Scope and behavior of the Enterprise edition. The full Community-vs-Enterprise feature table and route list live in `docs/editions.md`; this document focuses on the enterprise control plane, its security invariants, and how to operate it.

## 1. Activation and bounds

- Enterprise binary: `cmd/server/enterprise/main.go`, gin release mode, listens `:9090`.
- Activation: `CRYPTOBOM_LICENSE_KEY` with `ENT-` prefix and >= 20 characters (`internal/edition/edition.go`). The OSS binary refuses enterprise flags ("OSS build does not include enterprise features").
- Runtime feature flags are returned by `GET /edition`. The feature subsections are shown in grant coverage on the dashboard only when activated.
- Without credentials, enterprise connectors render honest empty states — they never fabricate a live cloud estate (disclosure in `docs/KNOWN_LIMITATIONS.md`).

## 2. Control plane routes

All routes under `/api/v1`, mounted by `internal/api/enterprise/SetupRoutes` on top of shared routes:

| Area | Primary handlers | Notes |
|---|---|---|
| SSO login + callback (SAML/OIDC/LDAP) | `internal/api/shared/sso.go`, `internal/api/oss/` | `login/sso`, `auth/sso/callback`; relay-injection protected (relay not in logs); session binding to canonical identity |
| API keys | `internal/api/enterprise/apikeys.go` (`POST /admin/keys`) | Admin-only; secret shown once as `key_...`; stored SHA-256-hashed |
| Outbound webhooks | `internal/api/enterprise/webhooks.go` (`/api/v1/webhooks`) | HMAC-SHA256 signed, retries, verified per delivery |
| Audit viewer | `internal/api/enterprise/audit.go` | Admin/Operator; search + export; data in `audit_events` |
| Verified security events | `internal/api/enterprise/security_events.go` | Event forwarding |
| Conformance/compliance packs | `internal/api/enterprise/compliance.go`, `cncf.go` | Data ownership, compliance score, PDF reports; mappings not certifications |
| Inventory | `internal/api/enterprise/inventory.go` (`/organizations/{id}/inventory`) | Cryptographic asset inventory + drill-downs |
| Multi-cloud | `internal/api/enterprise/multicloud.go` (`/api/v1/multicloud/*`) | AWS/Azure/GCP/IBM aggregation under `home/cloud/overview` etc.; customer credentials required |
| Quantum attestation | `internal/api/enterprise/quantum_attestation.go` | Per-tenant attestation + audit trail |
| Terraform IaC | `internal/api/enterprise/terraform.go` | Terraform config ingestion |
| Threat engine | `internal/api/enterprise/threat_engine.go` | Optional analytics events |
| AI analysis | `internal/api/enterprise/ai_analysis.go` | Disabled by default; opt-in flag only |
| Demo guard | `internal/api/enterprise/demoguard.go` | Blocks enterprise feature abuse in demo mode |

## 3. Tenancy and RBAC

- Tenant ownership: JWT `tenant_id` claim only (`internal/tenant/context.go`); `X-Tenant-ID` is never trusted. Cross-tenant lookup returns 404.
- Roles (viewer < analyst < operator < admin) enforced server-side via `internal/auth/rbac.go` `RequireRole`. Mutating SSO, cloud-connector, API-key, webhook, and workspace-role endpoints require admin.
- Administrator management: `api/v1/oss/admin/manage/{enable,disable,reset}` and `senior_admins` guards (`internal/api/shared/senior_admins.go`); admins cannot be disabled by operators/non-masters.
- Domain-restricted signup: `AUTH_ALLOWED_DOMAINS`, `INTERNAL_AUTH_ALLOWED_DOMAINS` config.
- Data remains tenant-partitioned in shared Postgres; all event/query filters are tenant-scoped in SQL.

## 4. Secret handling inventory

| Secret | Lifecycle |
|---|---|
| `CRYPTOBOM_LICENSE_KEY` | env var, Enterprise activation; gitignored `.env` |
| `JWT_SECRET` | env/secret; production refuses low-strength default; requirement in `docs/TRD.md` |
| `DB_PASSWORD` / `DATABASE_URL` | env/secret; never committed |
| GitHub webhook HMAC secret | per-workflow config, delivered to `VerifySignature` |
| Refresh/single-use tokens | only SHA-256 hashes stored (migration 0008) |
| SSO provider secrets, cloud keys, API keys | `.env` (gitignored) or cluster secrets; shown once in UI |

Remediation trail: `docs/SECURITY_SECRET_REMEDIATION.md`; policy `docs/MASTER_RULES.md` rule 1 (no secrets in the tree) applies to all repository content.

## 5. Enterprise observability and compliance

- Audit middleware records every request (JWT tenant) to `audit_events` with actor, action, resource, result, request id, ip; event viewer in `/audit`.
- OpenTelemetry trace export opt-in via `OTEL_EXPORTER_OTLP_ENDPOINT` (`internal/observability/otel.go`); `/healthz` stays dependency-independent.
- Enterprise charts (`deploy/helm/cryptobom-enterprise`, `deploy/helm/cryptobom-saas`) include cron-ready resource limits, PrometheusRule templates, and production replicaCount 2.
- Framework mappings (DORA Art. 9(2), eIDAS 2.0 / ETSI TS 119 312, BSI TR-02102, ISO 27001/27102, NIST 800-53/CSF, SOC 2) are mappings that help operators evidence controls; they are never a certification claim.

## 6. Operating the Enterprise edition

Local: `make dev-enterprise` (optional `CRYPTOBOM_PORT=9090`, `go run ./cmd/server/enterprise`, requires Postgres, `CRYPTOBOM_LICENSE_KEY`, strong `JWT_SECRET`), then `cat .env` for `AUTH_BOOTSTRAP_*` to log in.

Production: Helm chart upgrade with `--set image.tag`, `kubectl rollout status`, health at `/healthz`/`/readyz`, API smoke against the assets endpoint; deploy gated jobs and rollback runbook in `docs/DEVSECOPS.md` and `docs/ROLLBACK_RUNBOOK.md`.

Supported postgres: `deploy/migrations/*.sql` (+ embedded Go ledger). Backup/restore and single-tenant migration: `docs/DATABASE_GUIDE.md`, `docs/DEPLOYMENT.md`.