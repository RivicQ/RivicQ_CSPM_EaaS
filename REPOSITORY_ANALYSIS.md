# RivicQ / CryptoBOM — Repository Analysis & Enterprise Readiness Report

Generated for the **Open Source → Enterprise SaaS transformation program**.
Scope: full repository (`github.com/rivic-q/cryptobom-saas`), Go 1.25 backend (~22,164 LOC, 92 Go files) + React 18/TS frontend (`web/`).

---

## 1. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Web Frontend (React 18 + TS)                     │
│        CRA / react-scripts · MUI v5 · TanStack Query · Zustand · Recharts     │
│        editions.ts (OSS/Enterprise probe) · AuthContext · RequireEnterprise   │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │  REST /api/v1 (+ SSE /scans/:id/stream)
┌───────────────────────────────▼──────────────────────────────────────────────┐
│                        Go single binary — Gin HTTP server                     │
│  cmd/server/main.go (unified) · cmd/server/oss/main.go (8080)                 │
│  cmd/server/enterprise/main.go (:9090, //go:build enterprise)                 │
│                                                                                │
│  Router: internal/server → oss.SetupRoutes | enterprise.SetupRoutes            │
│  ├─ api/shared   : auth, OAuth(GitHub/Google), core CRUD, SSE, github-scan     │
│  ├─ api/oss      : cbom, assets, security, dashboard, k8s, benchmarks, cspm    │
│  └─ api/enterprise: inventory, compliance, multicloud, cncf, terraform,        │
│                     quantum, api-keys, webhooks, audit, cspm, cloud_sdk        │
│                                                                                │
│  middleware : RequestID · SecurityHeaders · Audit · RateLimit · CORS · Tracing │
│  auth       : JWT (jwt/v5) · bcrypt · MFA(stub) · RBAC · TokenManager         │
│  discovery  : Scanner orchestrator → TLS/SSH/HTTP scanners · SBOM scanner      │
│  quantum    : Provider SDK (Registry, plugins, ed25519 manifests, RBAC scopes) │
│               nistpqc (FIPS 203/204/205) · ibmquantum · attestation · PQC      │
│  compliance : policy engine (DORA, NIS2, NIST-CSF, CRA, ENISA)                 │
│  cloud      : awscloud / gcpcloud / azurecloud / ibmcloud SDK wrappers         │
│  cilium     : eBPF crypto-flow scanner                                          │
│  database   : raw database/sql + lib/pq (tenant schema + enterprise schema)    │
│  operator   : controller-runtime reconciler for CbomReport CRD                 │
└───────┬──────────────────────────────┬──────────────────────────────┬─────────┘
        │                              │                              │
   PostgreSQL :5432           K8s cluster (operator, CRD, Helm)   External SaaS
   (tenants/users/crypto/      deploy/helm/* · deploy/kubernetes    (IBMQ, GitHub,
    inventory/compliance)                                          Google OAuth)
```

- **Not a microservice monorepo** — one Go binary with two edition profiles (build tag `enterprise` OR runtime license-key detection via `internal/edition`).
- Multi-tenancy is a JWT `tenant_id` claim + per-tenant rows (lightweight; not isolated schemas).

## 2. Dependency Graph (internal packages)

```
cmd/server/* ──► internal/server ──► internal/api/{oss,enterprise,shared}
                                      │         │          │
                                      ▼         ▼          ▼
                            database · auth · tenant · edition · middleware
                                      │         │
                     ┌────────────────┘         └──► quantum/provider ──► nistpqc
                     ▼                                                     │
      discovery · compliance · cilium · awscloud · gcpcloud · azurecloud   │
                     └──────────────► observability · config · core        ▼
                                                                   ibmcloud / ibmquantum
```

Key seams: `auth.UserStore` interface (3 impls) · `quantum/provider.Provider` interface (plugin-registered) · `discovery.Scanner` (implicit, untyped interface) · `database.Queries` (hand-written).

## 3. Current Features

**Community/OSS:** CBOM scanner (TLS/SSH/HTTP), SBOM directory scanner, crypto asset inventory, dashboard, GitHub integration + repo scanning, Kubernetes scanner, benchmarks, Cilium eBPF flow scanning, REST API + OpenAPI, CLI (`cmd/scanner`), Docker + docker-compose, Helm charts, K8s operator + `CbomReport` CRD, CodeQL/gosec CI, GitHub Pages site.

**Enterprise (implemented):** inventory (assets/crypto/AI/hardware/software/infra), compliance frameworks + controls + reports + Delve/Kertos connectors, multi-cloud accounts (AWS/GCP/Azure/IBM), CNCF tool health, Terraform IaC scanning, quantum attestation + PQC algorithms + migration, API key manager, webhooks, audit log, SSO (SAML/LDAP stubs), analytics (reports/insights/forecasts), IBMQ routes, HSM wrappers (IBM HPCS, AWS CloudHSM/KMS), quantum provider SDK + plugin system.

## 4. Missing Features (vs. the enterprise vision)

| Domain | Status | Notes |
|---|---|---|
| Full CNAPP (CWPP, CIEM, DSPM, KSPM, ASPM, SSPM, AI-SPM) | 🔶 Partial | CSPM + inventory exist; the rest are roadmap |
| Identity Security (identity graph, machine/NHI identity, PAM, Zero Trust) | ❌ Stub | `/sso/saml`, `/sso/ldap` return hardcoded JSON |
| Supply chain (SBOM/CBOM/AIBOM/IBOM/QBOM unified, SLSA, Sigstore, VEX) | 🔶 Partial | SBOM scanner + `inventory/software/sbom`; no unified BOM |
| AI Security (prompt firewall, injection/jailbreak detection, AI registry, model gateway) | ❌ Missing | `ai_assets` table + `/inventory/ai` only |
| API Security (discovery, shadow/zombie API, OWASP API Top 10, GraphQL/gRPC) | 🔶 Partial | API key manager only |
| Runtime Security (eBPF detection, container escape, kernel threats) | 🔶 Partial | Cilium flow scanner only |
| Data Security / DSPM (PII, classification, lineage) | ❌ Missing | — |
| Threat Intelligence (MITRE ATT&CK, CVE/EPSS/KEV, IOC, threat graph) | ❌ Missing | `/security/threats` = static JSON |
| Vulnerability Management (CVSS, EPSS, KEV, patch, prioritization) | ❌ Missing | Benchmarks + security events only |
| Incident Response / SOAR (case mgmt, playbooks, integrations) | ❌ Missing | Quantum "emergency" mock only |
| Red Team / BAS | ❌ Missing | — |
| Enterprise SaaS ops (multi-tenant SaaS, billing, SCIM, feature flags, usage analytics) | ❌ Missing | RBAC + audit exist; no billing/SCIM |
| Marketplace / plugins / SDK ecosystem | 🔶 Partial | Quantum provider plugin SDK implemented; no marketplace |
| AI Copilot (chat with infra/cloud/logs/compliance, autofix, PR generation) | ❌ Missing | UI assistant components only, no backend |
| Enterprise analytics (exec/SOC/CISO/board dashboards, risk graph, digital twin) | 🔶 Partial | `/analytics` returns mocks |

## 5. Technical Debt

1. **Two divergent schema tracks**: OSS tenant schema (TEXT `tenant_id`) vs enterprise schema (UUID org/tenant). `deploy/migrations/002_enterprise_features.sql` references a non-existent `organizations` table → `make migrate` fails at that statement (runtime migrations are embedded and idempotent, so the server still boots).
2. **No scanner interface**: `discovery.Scanner` orchestrates via `switch target.Protocol`; scanner capabilities are implicit/untyped. The spec's `Discover()/Scan()/Analyze()/RiskScore()/Compliance()/Export()` contract is not implemented.
3. **Handler-level stubs** return hardcoded JSON for SSO, analytics, threat intel, HSM status — indistinguishable from real features to callers.
4. **MFA verification is a stub** (accepts any code). Not production-acceptable.
5. **Frontend has two design systems** (legacy indigo/purple MUI tokens vs gold/cyan/navy brand) — partially unified in `web/src/theme/*`, but pages still hardcode hex values; light-mode coverage is incomplete.
6. **Dead/legacy code**: `DevSecOpsLayout.tsx`, `InfraDiscovery.tsx`, `QuantumBOM.tsx` not routed; static/hardcoded data in `Analytics`, `Dashboard`, `CSPM`.
7. **`web/package.json` proxy** pointed at dead `:8080` (fixed to `:9090` in current branch); Pages/SPA deep links 404 in dev.
8. No DB-level encryption of secrets; tokens blacklist is in-memory (lost on restart).

## 6. Code Quality Report

- **Go**: idiomatic, well-structured packages; hand-written SQL queries are clear; strong test coverage in the deep areas (quantum SDK, scanners, compliance engine). ~15 test files; `go vet`, `golangci-lint`, `gosec`, CodeQL wired in CI.
- **Frontend**: consistent MUI + tokens usage; `PageFrame` is a good reusable shell; feature-flag gating via `editions.ts` is clean. Lint is warning-clean after current branch.
- **Docker/K8s**: Helm charts ×3, K8s manifests, Terraform ×4 clouds, operator + CRD — above-average for a young project.

## 7. Security Review

Strengths: JWT with expiry/rotation, bcrypt, RBAC permission checks, security headers middleware, audit middleware, rate limiting, tenant claim enforcement (`internal/tenant`), CORS config, gosec/CodeQL/OWASP ZAP (DAST) in CI, secret templates excluded from git.
Gaps: MFA stub; in-memory token blacklist; no secret encryption at rest; SSO stubs imply auth guarantees that don't exist; `CRYPTOBOM_BOOTSTRAP_PASSWORD` defaults leak into demo users; hardcoded OAuth client secret present in `.env` (must be rotated); no audit trail for admin actions beyond middleware.

## 8. Performance Review

- Single binary; scanner suite is concurrent per-target; async scan jobs with SSE progress. SQL is straightforward with indexes on key tables. No caching layer, no read replicas, no pagination on some list endpoints. Frontend refetches on intervals (30–60s) — fine at demo scale, needs backoff/abort at production scale. OTel tracing wired for enterprise edition.

## 9. Enterprise Readiness Score

| Criterion | Score /10 |
|---|---|
| Architecture modularity | 7 |
| Auth & RBAC | 6 (MFA stub) |
| Multi-tenancy | 5 (claim-level only) |
| Observability | 6 |
| Deployment (K8s/Helm/cloud) | 8 |
| Test coverage | 7 |
| Security posture | 5 |
| Enterprise module coverage | 3 |
| SaaS ops (billing/SCIM/tenants) | 1 |
| Docs & SDK story | 7 |
| **Overall** | **5.5 / 10** |

## 10. Refactoring Plan (ordered by value)

1. **Unify the edition model to three tiers** — Community / Professional / Enterprise — in `editions.ts` + backend `edition.Detect()`; license-key driven, backward-compatible.
2. **Formalize the scanner framework** — introduce the `Scanner` interface (`Discover/Fingerprint/Scan/Analyze/RiskScore/Compliance/GenerateEvidence/Export/Webhook/Streaming/History`), make existing TLS/SSH/HTTP/SBOM scanners implement it.
3. **Product-grade module layer (frontend-first)** — config-driven Security Module registry + pages for the headline domains (AI Security, Identity, Supply Chain BOM, DSPM, Threat Intel, Vulnerability, API Security, Incident Response) with live backend where present and clearly-labeled demo data elsewhere.
4. **Close the security gaps** — real MFA verification, persistent token store, secret encryption at rest, SSO/SCIM real implementations behind feature flags.
5. **Resolve schema drift** — single migration chain; fix `002_enterprise_features.sql`; add `organizations` table.
6. **Enterprise SaaS foundation** — organizations/teams/projects models, usage analytics, feature flags service, license management, billing readiness.
7. **AI Copilot** — OpenAI/IBM watsonx gateway behind `AGENTIC_SECURITY_ENDPOINT`, grounding on inventory/compliance/risk APIs.

> This document is a living analysis; it will be updated as transformation phases land.
