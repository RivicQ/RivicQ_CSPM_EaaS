# Product Requirements: RivicQ CSPM / CryptoBOM EaaS

Owner: RivicQ GmbH (Berlin). Repository: `RivicQ/RivicQ_CSPM_EaaS` at https://github.com/RivicQ/RivicQ_CSPM_EaaS.

This document captures the product intent for **Cryptographic Security Posture Management (CSPM)** delivered as an Encryption-as-a-Service (CryptoBOM EaaS) product. It reflects what is actually built in this repository and explicitly does not claim certifications the project does not hold.

## 1. Problem

Organizations do not know what cryptography runs in their software, repositories, and infrastructure, or when it becomes unsafe:

- Cryptographic libraries and algorithms (RSA, ECC, MD5, SHA-1, TLS) are scattered across source, SBOMs, containers, websites, and hardware declarations.
- Post-quantum (PQC) migration is coming; teams need an inventory plus a migration plan, not a guessing game.
- Compliance regimes (BSI TR-02102, DORA Art. 9(2), eIDAS 2.0, NIST PQC) keep pointing operators at crypto hygiene, but there is no lightweight evidence trail.
- Existing SBOM tooling tracks components, not whether the crypto inside them is quantum-safe or policy-compliant.

## 2. Solution overview

RivicQ delivers a Community (Apache-2.0) scanner and dashboard plus a licensed Enterprise control plane. Core value loop: **Discover → Analyze → Quantify** (scan → inventory → risk → report → migration planning). The engine is one shared Go codebase; editions are feature entitlements, not a second scanner (`internal/edition/edition.go`).

## 3. Personas

| Persona | What they need | Primary surface |
|---|---|---|
| CISO | Posture overview, compliance mappings, decision-ready evidence | Dashboard, compliance packs (`web/src/pages/enterprise/Compliance.tsx` context) |
| Security engineer | Run scans, triage findings, gate CI | `cmd/rivicq` CLI, `/api/v1/scans`, findings UI |
| DevOps / platform | CI/CD policy gate, repo scanning, webhooks | `.github/actions/rivicq-scan` composite action, `/api/v1/github/*` |
| Auditor / evaluator | Honest, reproducible capability boundaries | `docs/KNOWN_LIMITATIONS.md`, `docs/ARCHITECTURE.md`, datasets harness (`datasets/`) |
| Embedded/identity reviewer | Static firmware + certificate analysis | `rivicq firmware|identity`, `/api/v1/firmware/*`, `/api/v1/identity/*` |

## 4. Scope

In scope for this product and repo:

- CBOM (cryptographic BOM) + SBOM inventory for repositories and servers.
- Built-in scanners: TLS, SSH, HTTP/HTTPS headers, local SBOM path scan (`internal/discovery/`), GitHub content scanning (`internal/api/shared/github_scanning.go`).
- Normalized findings with risk score, PQC class, evidence, and remediation (`internal/intelligence/finding.go`).
- Policy gate with BLOCK/WARN/ALLOW/INFORM actions and `--fail-on` (`internal/intelligence/policy.go`), plus the GitHub Action wrapper.
- CycloneDX 1.6 CBOM export (`internal/intelligence/cyclonedx.go`).
- Static firmware and identity (certificate) analysis — metadata only, no execution, no secret extraction (`internal/firmware`, `internal/identity`, `internal/certeng`).
- Community UI (React) and in-memory demos; Enterprise control plane (SSO config, audit, API keys, webhooks, multi-cloud connectors when customer credentials exist).
- GitHub Pages static demo, marketing site (`marketing/`), RivicQ Graph demo (`fabric/`), archify diagram site (`archify/`).

Out of scope explicitly:

- Mobile applications and Ads (see `docs/ADMOB.md`).
- Runtime firmware emulation, silicon reverse engineering, private-key extraction.
- Claiming ISO 27001 / SOC 2 / PCI DSS / FedRAMP / HIPAA / TuV certification of RivicQ itself. Framework names in the UI and reports are **control mappings for operators**, never certifications.

## 5. Functional requirements

| ID | Requirement | Evidence in repo |
|---|---|---|
| FR-1 | Scan website, host/IP, server, declared pod, and hardware catalog targets | `internal/discovery/targetclass.go`, `internal/discovery/demo_targets.go` |
| FR-2 | Produce a `ScanResult` JSON without breaking the contract | `docs/CORE_ENGINE.md`, `internal/discovery/scanner.go` |
| FR-3 | Normalize findings and attach PQC class, risk score, evidence, remediation | `internal/intelligence/pipeline.go`, `internal/intelligence/pqc_class.go` |
| FR-4 | Gate on policies with BLOCK/WARN semantics and severity fail-on | `internal/intelligence/failon.go`, `internal/intelligence/policy.go` |
| FR-5 | Export CycloneDX 1.6 CBOM | `GET /api/v1/scans/:id/cyclonedx` (`internal/intelligence/cyclonedx.go`) |
| FR-6 | Scan GitHub repositories via token or synthetic demo fixture | `/api/v1/github/scan` (`internal/api/shared/github_scanning.go`) |
| FR-7 | Accept signed GitHub webhooks (HMAC) with replay protection | `README` webhook section, `internal/api/shared/github_webhook_security_test.go` |
| FR-8 | Authenticate users: JWT, bcrypt passwords, TOTP MFA, Google/GitHub OAuth | `internal/authn/authn.go`, `internal/authn/password.go` |
| FR-9 | Isolate data by tenant from JWT claims; reject spoofable `X-Tenant-ID` | `internal/tenant/context.go`, `internal/api/enterprise/tenancy.go` |
| FR-10 | Enforce edition feature flags server-side (Enterprise APIs 403 on OSS) | `internal/edition/edition.go`, `internal/api/enterprise/handlers.go` |
| FR-11 | Static firmware and identity analysis with hard size limits and RBAC | `internal/firmware/limits.go`, `docs/FIRMWARE_IDENTITY_API.md` |
| FR-12 | Community UI for scans, findings, assets, analytics, pipeline | `web/src/pages/`, routes in `web/src/App.tsx` |
| FR-13 | Enterprise UI for inventory, compliance, multi-cloud, quantum, admin | `web/src/pages/enterprise/`, gated by `RequireEnterprise` |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Edition split | OSS `:8080`, Enterprise `:9090`, activated by `CRYPTOBOM_LICENSE_KEY` with `ENT-` prefix and >= 20 chars (`internal/edition/edition.go:73`) |
| Tenancy | Every scan/inventory/finding/GitHub/intelligence query scoped by JWT `tenant_id`; cross-tenant scan IDs return 404 |
| Security | bcrypt cost default, JWT HMAC secret vector, HSTS + CSP + frame-ancestors headers, CORS allowlist (default `https://rivicq.github.io`), trusted-proxy opt-in, rate limit per IP |
| Robustness | Restrictive `TargetPolicy`: no local paths, no private nets, no cloud-metadata endpoints, port allow-list by default (`internal/discovery/target_policy.go`) |
| Performance target | Rate limit 100 req/min (OSS) / 1000 req/min (Enterprise), benchmark regression threshold 20% against `tests/benchmark-baseline.json` |
| Demo safety | `DEMO_MODE` never passes `/readyz`; fabricated data is labeled demo (`internal/server/server.go:217`) |
| Honesty | No false certification claims, no fake telemetry, demo dashboards labeled synthetic |

## 7. Success metrics

- Time-to-first-CBOM under 10 minutes (measured by `build.sh` + `QUICKSTART_CBOM.md` fast path).
- Dataset accuracy harness stays green (`make analyze-datasets`, `scripts/analyze-datasets.py`).
- Coverage artifacts produced on every merge in `.github/workflows/ci-cd.yml` (`coverage.out` build-and-test job).
- Zero regressions beyond 20% on benchmark suite (`.github/workflows/ci-cd.yml` performance-tests).
- GitHub Pages demo reachable with Community-limited feature set only (`REACT_APP_EDITION=community` in `.github/workflows/pages.yml`).

## 8. Out of scope (current release)

- Scheduled/continuous scanning.
- Live SAML ACS / OIDC IdP handshake (configuration store only).
- Firmware execution and key extraction.
- Certified compliance reports.
- Multi-region or HA guarantees for the experiment (relies on Helm replicaCount as documented in `deploy/helm/`).

## 9. Open questions

1. Which compliance "pack" becomes the first paid report artifact (DORA vs NIST vs BSI), given mappings-not-certifications framing?
2. Should scheduled scans land before live SAML ACS in the Enterprise roadmap?
3. How much of the optional external-tool integration (Syft/Trivy/Grype/Gitleaks/OSV, `internal/intelligence/adapters_external.go`) moves into a hard runtime dependency at scale?
4. Is the `docs/openapi.yaml` license string ("RivicQ Open Source License") reconciled to the Apache-2.0 root `LICENSE` and `NOTICE`?

Compliance note: any future marketing or report artifact must carry the mappings-not-certifications disclosure found throughout `README.md`, `docs/editions.md`, and `docs/KNOWN_LIMITATIONS.md`.