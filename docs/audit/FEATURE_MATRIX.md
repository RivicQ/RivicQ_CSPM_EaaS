# RivicQ CSPM — Feature Matrix (Phase 1)

Classification is based on **source + observed behavior**, not on README/marketing
claims. Legend:

- **T** — Implemented and covered by automated tests.
- **I** — Implemented, exercised manually, but thin/absent automated tests.
- **P** — Partial (works on some inputs / some paths only).
- **C** — Connector-dependent (requires live cloud/IdP/credential to function).
- **D** — Demo-only / synthetic data path.
- **N** — Not implemented.

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| Static crypto SAST | **T** | `internal/cryptoscan`, `internal/intelligence/{pipeline,normalize,finding}.go`; CLI `scan fixtures/crypto-test` → MD5/SHA-1/RSA/TLS/3DES findings | Marker/regex based; deterministic rules. |
| Secrets detection | **T** | `rule_id: secrets-generic`; `secrets` summary flag | Placeholder-aware. |
| SCA (dependency vulns) | **P** | `summary.sca`, `internal/discovery/sbom_scanner.go`; `internal/intelligence/adapters_external.go` | External adapter dependent for advisory data. |
| SBOM (CycloneDX) | **T** | `internal/intelligence/cyclonedx.go`; embedded `cyclonedx` in scan output | Generated in scan JSON. |
| CBOM (crypto BOM) | **T** | `rivicq cbom` → CycloneDX algorithm components w/ `pqc_status` | Also embedded in scan output. |
| IaC / Terraform | **T** | `fixtures/terraform-test`; `summary.iac`; `internal/discovery/inventory_scanner.go` | |
| Container scanning | **P** | `fixtures/vulnerable-container`; `summary.container` | Evidence of image path; depth unverified here. |
| Compliance mapping | **T** | `internal/compliance`, `internal/controls`; `summary.compliance` | Mapping ≠ certification (see branding rule). |
| Policy gate / fail-on | **T** | `internal/intelligence/{failon,policy}.go`; CLI exit codes 0/1 | BLOCK/WARN verified live. |
| PQC readiness / classification | **T** | `internal/intelligence/pqc_class.go`, `internal/quantum/*`; `pqc_readiness` field | Classification only; no key extraction. |
| Qiskit / quantum provider | **P** | `internal/quantum/qiskitprofile`, `internal/quantum/{provider,ibmquantum}` | Provider/registry tested; live IBM path connector-dependent. |
| Firmware static analysis | **T** | `internal/firmware` (+tests); `rivicq firmware scan/cbom/compare` | Static/string-based only. No execution/flashing. |
| Device identity / X.509 | **T** | `internal/identity` (+tests); `rivicq identity scan` | Parses cert/identity artifacts. |
| Hardware / RoT attestation | **P** | `internal/hardware` (+test); `internal/quantum/attestation*.go` | Attestation claims must be validated per-vendor. |
| Unified BOM / framework | **P** | `internal/bom/{unified,framework,hsm}.go` (+test) | Framework present; end-to-end traceability under review (Phase 8). |
| RivicQ Graph (fabric UI) | **I** | `fabric/` React app → `graph` data | UI present; data sourced from scan/CBOM. |
| AuthN (JWT, bcrypt, TOTP MFA) | **T** | `internal/authn` (+tests) | |
| AuthZ / RBAC | **T** | `internal/auth/{rbac,route_permissions,public_routes}.go` (+tests) | Route-level permissions enumerated. |
| Multi-tenancy isolation | **T** | `internal/tenant/context.go` (+test); `internal/middleware` (+tests) | See SECURITY_FINDINGS + Phase 6 tests. |
| Rate limiting / CORS / security headers | **T** | `internal/middleware/{ratelimit,cors,security,audit}.go` (+tests) | |
| Audit logging | **I** | `internal/middleware/audit.go`; scan `audit_score` | Persistence backend-dependent. |
| Database / migrations | **P** | `internal/database/{database,queries,migrations}.go`; **no tests** | Postgres optional; in-memory demo otherwise. |
| Observability | **P** | `internal/observability`; **no tests** | |
| Editions & licensing | **T** | `internal/edition` (+test); OSS `:8080` / Ent `:9090` | |
| Cloud connectors (AWS/Azure/GCP/IBM) | **C** | `internal/{aws,azure,gcp,ibm}cloud`; **no tests** | Need live creds; unverified here. |
| Kubernetes / Cilium | **C** | `internal/cilium`, `internal/operator`; **no tests** | |
| Platform (billing/leads/IBM/payments/notifications) | **I** | `internal/platform/*` (+`platform_test.go`) | Mix of real handlers and demo/stub targets. |
| Scheduling / retries / jobs | **P** | `internal/discovery/scan_manager.go` | Enterprise scheduling depth under review (Phase 7). |
| Integrations pivot (Convex/Better Auth/PostHog/R2/Stripe/n8n) | **D** | `integrations/*` | Inert scaffolds; **not wired** into running app. |
| SSO / IdP handshake | **N/P** | — | Do not claim "SSO complete" until an IdP handshake is tested. |
| Firmware execution / key extraction | **N** | — | Explicitly out of scope; must never be claimed. |

## Gaps called out for later phases

- **Phase 2**: golden-corpus CBOM correctness (positive/negative/malformed).
- **Phase 6**: explicit cross-tenant negative tests.
- **Phase 7**: migrations/backups/recovery/rollback evidence.
- **Phase 8**: graph provenance & traceability against real findings.
