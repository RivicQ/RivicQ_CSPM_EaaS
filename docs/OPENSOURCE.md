# Open-Source Edition: Scope, Build, and Contribution

This document defines what ships in the Community (open-source) edition, how the codebase is split between OSS and Enterprise, and how community code is kept honest by CI.

## 1. The split in one rule

- One codebase, two binaries, one engine.
- `cmd/server/oss/main.go` builds the OSS/Community server (`:8080`).
- `cmd/server/enterprise/main.go` builds the Enterprise server (`:9090`) from the same `internal/` engine plus `internal/api/enterprise`.
- `internal/edition/edition.go` detects the edition at runtime from `CRYPTOBOM_LICENSE_KEY` (an `ENT-` prefix of >= 20 characters); the OSS binary refuses Enterprise feature flags (`OSS build does not include enterprise features`).
- A CI job (`oss-gate` in `.github/workflows/ci-cd.yml`) fails the build if an OSS build imports any enterprise package. This is the enforcement mechanism that keeps GPL-adjacent splitting honest in every commit.

## 2. What is free and open source

- The full scan engine used by both editions: `internal/discovery`, `internal/intelligence`, `internal/bom`, `internal/cryptoart`, `internal/firmware`, `internal/identity`, `internal/certeng`, `internal/quantum`, `internal/compliance` mappings, sample policies, and the reference rule sets visible in `docs/SECURITY_CONTROL_MATRIX.md`.
- The CLI `cmd/rivicq` (`scan`, `cbom`, `sbom`, `vuln`, `secrets`, `iac`, `compliance`, `policy`, `firmware`, `identity`) and the demo scanner `cmd/demo-scanner`.
- The Community API surface (auth, scans, SBOM/CBOM, findings, GitHub scans, report/CR profile export) and the React frontend under `web/`.
- Distribution: Apache-2.0 `LICENSE`, `NOTICE` for third-party notices; OSS and Enterprise Docker images are published to GHCR by `publish-image.yml` and `release.yml` (Community build `.github/workflows/ci-oss.yml` pushes the OSS image).
- Community enablement docs: `docs/editions.md` (route table), `docs/CLIENT_ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `DATASETS.md`, `CONTRIBUTING.md`, `GOVERNANCE.md`.

## 3. What stays Enterprise-only

Enterprise packages under `internal/api/enterprise/` and cloud connectors `internal/{awscloud,azurecloud,gcpcloud,ibmcloud}` are present in the repository (Apache-2.0 source) but only compiled into the Enterprise binary:

| Feature | Files |
|---|---|
| Multi-tenant controls / tenancy | `internal/api/enterprise/tenancy.go`, `internal/api/shared/senior_admins.go` |
| SSO (SAML/OIDC/LDAP) + domain discovery | `internal/api/shared/sso.go`, `internal/api/enterprise/` |
| API keys + webhooks (outbound) | `internal/api/enterprise/apikeys.go`, `webhooks.go` |
| Audit viewer + security event forwarding | `internal/api/enterprise/audit.go`, `security_events.go` |
| Compliance packs + conformance reports | `internal/api/enterprise/compliance.go`, `cncf.go`, `internal/compliance` |
| Cloud connectors (AWS/Azure/GCP/IBM) | `internal/api/enterprise/multicloud.go`, `cloud_sdk.go`, `internal/awscloud`, `azurecloud`, `gcpcloud`, `ibmcloud` |
| Quantum attestation | `internal/api/enterprise/quantum_attestation.go` |
| Terraform IaC reporting | `internal/api/enterprise/terraform.go` |
| Threat engine + AI analysis + analytics | `internal/api/enterprise/threat_engine.go`, `ai_analysis.go`, `analytics_engine.go` |
| RBAC roles Viewer < Analyst < Operator < Admin | `internal/auth/rbac.go` + `RequireRole` everywhere routes are mounted |

The enterprise feature list (names, not credentials) is exposed via `GET /edition` when `CRYPTOBOM_LICENSE_KEY` is set.

## 4. Serving relationship between editions

- Both editions serve the same core routes (`internal/api/oss`, `internal/api/shared`) so a Community scanner config can be lifted to Enterprise without rewrites.
- Enterprise mounts `internal/api/enterprise/SetupRoutes` on top of the shared routes (`cmd/server/server.go`, `routeHooks`).
- The `node_modules`/`web/node_modules` and `fabric/node_modules` trees are excluded from lint and scan configs (`.golangci.yml`, `Makefile`, `internal/intelligence/policy.go` excludes) — they are build artifacts, not third-party source we ship.

## 5. How to contribute

- Read `CONTRIBUTING.md` (test evidence required), `docs/CODE_STYLE.md`, `docs/MASTER_RULES.md` (no-secrets rule 1; never echo real secrets, fixtures are synthetic), and `docs/TESTING.md`.
- Changes touching the engine must keep `discovery.ScanResult` and `intelligence.Finding` stable (`docs/CORE_ENGINE.md`).
- Self-scan gates: `rivicq scan .` must be FIND_OK (`rivicq-security.yml`), unit tests + race must pass, lint via `.golangci.yml`, benchmark delta <= 20% (`tests/benchmark-baseline.json`).
- Dataset changes run `make analyze-datasets`; `expected.json` values come from real detector output, never fabricated CVEs.
- CI will reject OSS builds that import `internal/api/enterprise` (oss-gate). If a shared capability must be used by both editions, it belongs in `internal/api/shared`, never in an enterprise import.
- License headers on new Go files; keep `NOTICE` current; CHANGELOG under `## Unreleased`.

## 6. Community self-service

- Community runs free, fully local: `make dev` / `docker-compose up --build`, no license key required, Postgres optional (in-memory demo store), web on `:3000`.
- GitHub public repo scanning uses an operator-supplied `GITHUB_TOKEN`; the public `gh-pages` demo does not scan real infrastructure (see `docs/GITHUB_ACTIONS_AND_PAGES.md`).
- Fixes and features land under Apache-2.0; Enterprise-only features remain an upgrade via license key, not by branch divergence.