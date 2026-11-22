# Enterprise Edition: Controls, Routes, and Operations

Scope and behavior of the Enterprise edition. The full Community-vs-Enterprise feature table and route list live in `docs/editions.md`; this document focuses on the enterprise control plane, its security invariants, and how to operate it.

## 1. Activation and bounds

- Enterprise binary: `cmd/server/enterprise/main.go`, gin release mode, listens `:9090`.
- Activation: `CRYPTOBOM_LICENSE_KEY` must be a signed, unexpired `cryptobom-beta-v1.<tenant-or-*>.<unix-expiry>.<hex-hmac-sha256>` value, paired with `CRYPTOBOM_LICENSE_SIGNING_KEY`. Signing is HMAC-SHA256 over `<tenant>.<expiry>` using the signing key. The OSS binary refuses enterprise flags ("OSS build does not include enterprise features").
- Runtime feature flags are returned by `GET /edition`. The feature subsections are shown in grant coverage on the dashboard only when activated.
- Without credentials, enterprise connectors should render honest empty/unconfigured states — they must not fabricate a live cloud estate (disclosure in `docs/KNOWN_LIMITATIONS.md`). Private beta deployments should verify connector availability before making pilot claims.

## 2. Control plane routes

All routes under `/api/v1`, mounted by `internal/api/enterprise/SetupRoutes` on top of shared routes:

| Area | Primary handlers | Notes |
|---|---|---|
| SSO config/login plumbing (SAML/OIDC/LDAP) | `internal/api/shared/sso.go`, `internal/api/oss/` | Configuration and callback handling exist in code paths, but a complete IdP ACS/login handshake is an operator integration task and should not be claimed as turnkey for private beta |
| API keys | `internal/api/enterprise/apikeys.go` (`POST /admin/keys`) | Admin-only; secret shown once as `key_...`; stored SHA-256-hashed |
| Outbound webhooks | `internal/api/enterprise/webhooks.go` (`/api/v1/webhooks`) | HMAC-SHA256 signed, retries, verified per delivery |
| Audit viewer | `internal/api/enterprise/audit.go` | Admin/Operator; search + export; data in `audit_events` |
| Verified security events | `internal/api/enterprise/security_events.go` | Event forwarding |
| Conformance/compliance packs | `internal/api/enterprise/compliance.go`, `cncf.go` | Data ownership, compliance score, PDF reports; mappings not certifications |
| Inventory | `internal/api/enterprise/inventory.go` (`/organizations/{id}/inventory`) | Cryptographic asset inventory + drill-downs |
| Multi-cloud | `internal/api/enterprise/multicloud.go` (`/api/v1/multicloud/*`) | AWS/Azure/GCP live inventory; IBM HPCS status/keys and COS buckets; customer credentials required |
| Quantum attestation | `internal/api/enterprise/quantum_attestation.go` | Per-tenant attestation + audit trail |
| Terraform IaC | `internal/api/enterprise/terraform.go` | Terraform config ingestion |
| Threat engine | `internal/api/enterprise/threat_engine.go` | Optional analytics events |
| AI analysis | `internal/api/enterprise/ai_analysis.go` | Disabled by default; opt-in flag only |
| Demo guard | `internal/api/enterprise/demoguard.go` | Blocks enterprise feature abuse in demo mode |

## 3. Tenancy and RBAC

- Tenant ownership: JWT `tenant_id` claim only (`internal/tenant/context.go`); `X-Tenant-ID` is never trusted. Cross-tenant lookup returns 404.
- Roles (viewer < analyst < operator < admin) are intended to be enforced server-side via `internal/auth/rbac.go` `RequireRole` on covered routes. For private beta, treat mutating SSO/cloud-connector/API-key/webhook/workspace-role operations as admin-only and verify route coverage in the deployed build.
- Administrator management endpoints and senior-admin guard behavior are code-level controls (`api/v1/oss/admin/manage/*`, `internal/api/shared/senior_admins.go`) and should be validated in the target environment before pilot use.
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
- Helm chart artifacts exist under `deploy/helm/` (including enterprise/SaaS charts), but production-readiness features (resources, alert rules, replica settings, templates) are artifact-dependent. Verify chart contents (especially `deploy/helm/cryptobom-enterprise/templates` when present) before relying on them in a private beta.
- Framework mappings (DORA Art. 9(2), eIDAS 2.0 / ETSI TS 119 312, BSI TR-02102, ISO 27001/27102, NIST 800-53/CSF, SOC 2) are mappings that help operators evidence controls; they are never a certification claim.

## 6. Operating the Enterprise edition

Local: `make dev-enterprise` (optional `CRYPTOBOM_PORT=9090`, `go run ./cmd/server/enterprise`, requires Postgres, `CRYPTOBOM_LICENSE_KEY`, strong `JWT_SECRET`), then `cat .env` for `AUTH_BOOTSTRAP_*` to log in.

Production deployment claims should match available artifacts. Helm upgrades, rollout checks, and rollback flows apply only where complete charts/manifests and cluster credentials exist; verify `deploy/helm/cryptobom-enterprise/templates` and other chart contents before relying on enterprise Helm deployment in a private beta. See `docs/DEVSECOPS.md` and `docs/ROLLBACK_RUNBOOK.md` for operator runbooks.

Supported postgres: `deploy/migrations/*.sql` (+ embedded Go ledger). Backup/restore and single-tenant migration: `docs/DATABASE_GUIDE.md`, `docs/DEPLOYMENT.md`.