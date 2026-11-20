# RivicQ — Cryptographic Security Posture Management

**RivicQ GmbH** (Berlin) · Community **open source** (Apache License 2.0) and **Enterprise** (commercial)

RivicQ is **Cryptographic Security Posture Management** (CSPM): Community inventories cryptography (CBOM) and software components (SBOM). QBOM, HBOM, AIBOM, and IBOM are licensed Enterprise control-plane layers. The same cryptographic intelligence engine powers Community (Apache-2.0) and Enterprise (commercial). Editions are **licenses and feature entitlements**, not a second scanner.

A separate build on `main` adds a standalone **Encryption-as-a-Service (EaaS)** API and developer portal. It is a local sandbox product surface on port `:9091`, not production-ready, not hosted, and not part of the CSPM scores or editions below. See [EaaS](#encryption-as-a-service-eaas-standalone) and the linked EaaS docs below.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/github/actions/workflow/status/RivicQ/RivicQ_CSPM_EaaS/pages.yml?label=GitHub%20Pages)](https://github.com/RivicQ/RivicQ_CSPM_EaaS/actions/workflows/pages.yml)
[![Security](https://img.shields.io/badge/security-responsible%20disclosure-0f62fe.svg)](SECURITY.md)

| Resource | URL |
|----------|-----|
| **Live app (GitHub Pages)** | https://rivicq.github.io/RivicQ_CSPM_EaaS/ |
| **RivicQ Graph (labeled demo)** | https://rivicq.github.io/RivicQ_CSPM_EaaS/fabric/ |
| **Interactive demo** | https://rivicq.github.io/RivicQ_CSPM_EaaS/demo |
| **Sign in / register** | https://rivicq.github.io/RivicQ_CSPM_EaaS/login |
| **Documentation hub** | https://rivicq.github.io/RivicQ_CSPM_EaaS/docs/ |
| **Company** | https://rivicq.com |
| **This repository** | https://github.com/RivicQ/RivicQ_CSPM_EaaS |
| **Legal pack** | [LEGAL.md](LEGAL.md) · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [PRIVACY.md](PRIVACY.md) · [TRADEMARKS.md](TRADEMARKS.md) · [SECURITY.md](SECURITY.md) |

The Community console is the **RivicQ Security Cloud** — deep-space nebula chrome (`#000000` canvas, violet `#7C3AED`) with Inter and JetBrains Mono. Light mode remains available. **RivicQ Graph** (wordmark **GRAPH**) is the labeled security-graph demo at `/fabric` (formerly NEXUS / FABRIC). Control mappings are not certifications.

---

## Open Source (Community) vs Enterprise

| | **Community (Open Source)** | **Enterprise** |
|--|----------------------------|----------------|
| **License** | [Apache License 2.0](LICENSE) | Commercial license from RivicQ GmbH |
| **Who it is for** | Developers, security researchers, internal labs | Production estates that need SSO, tenancy, connectors, and support |
| **Engine** | Same CBOM / intelligence engine | Same engine + licensed control plane |
| CLI `rivicq scan .` | Yes | Yes |
| GitHub Action policy gate | Yes | Yes |
| CBOM / CycloneDX 1.6 export | Yes | Yes |
| CBOM / SBOM CSPM | Yes | Same engine |
| QBOM / HBOM / AIBOM / IBOM | Locked (Enterprise APIs return 403) | Licensed control-plane layers |
| API security (TLS/HTTPS hygiene) | Yes | Same + gateway inventory when a connector exists |
| DevSecOps pipeline view | Stages 1–6 + JSON evidence | Stage 7 continuous monitoring |
| Dashboard, inventory, scanner | Limited: website, host, IP, server, declared pod, QSIC catalog | Same engine + live kube attach, DORA pack |
| Labeled demo trail | Community-limited (sample data only) | UI preference is not a license |
| Multi-cloud inventory (AWS, Azure, GCP, and other connectors) | — | Yes — **customer credentials required** |
| SSO (OIDC; SAML configuration store) | — | Yes — ACS handshake is an operator task with your IdP |
| RBAC (Viewer, Analyst, Operator, Admin) | Basic roles | Enforced server-side (`RequireRole`) |
| Immutable audit log viewer | — | Yes — tenant taken from JWT, not spoofable headers |
| Compliance report packs (DORA, BSI, eIDAS, ISO, NIST mappings) | — | Yes — **engineering mappings, not a certification** |
| Air-gapped Helm / Compose | OSS chart | Enterprise chart |
| Support | GitHub issues | Contracted support via [rivicq.com](https://rivicq.com) |

**Community** is this public GitHub project. You may use, modify, and distribute it under Apache-2.0 (see [LICENSE](LICENSE) and [NOTICE](NOTICE)).

**Enterprise** is licensed separately. Copying Community source does **not** grant Enterprise connectors, SSO, or support. Contact commercial licensing at [rivicq.com](https://rivicq.com). Details: [docs/editions.md](docs/editions.md), [LEGAL.md](LEGAL.md), [BETA_PROGRAM.md](BETA_PROGRAM.md).

RSA-2048 is **classified**, not automatically marked vulnerable.

---

## What RivicQ does

This section describes the CSPM scanner/control plane only; EaaS is a separate surface (below).

```text
Cloud / code / CI
        ↓
Built-in scanners (TLS, SSH, HTTP, SBOM, GitHub content)
        ↓
Normalized findings
        ↓
Crypto risk + policy gate
        ↓
CLI / API / Dashboard / GitHub Action
```

Homepage workflow: **Discover → Analyze → Quantify** (scan → inventory → risk → report → migration planning).

This product does **not** claim SOC 2, ISO 27001, PCI DSS, FedRAMP, HIPAA, or TÜV certification of RivicQ itself. Framework names in the UI are **control mappings for operators**.

---

## Encryption-as-a-Service (EaaS, standalone)

EaaS is a separate Go binary and HTTP API (`cmd/eaas`, `internal/eaas`), not a CSPM edition or an extension of the CSPM scanner. It listens on `:9091` by default and exposes `/healthz`, `/api/eaas/v1/*`, and `/api/beta/v1/*`. The developer portal is a static page (`web/eaas/index.html`) served at `/` and `/portal` **by that binary**, not by GitHub Pages.

```bash
go run ./cmd/eaas
# Portal:  http://localhost:9091/
# Health:  http://localhost:9091/healthz
```

Free tier is **10,000 operations/month and 60 RPM**, both enforced numerically. API keys are hashed, shown once, and rotatable/revocable; usage events are metadata-only. Classical operations (AES-256-GCM, HMAC-SHA-256, SHA-256, `crypto/rand`) use the Go standard library; ML-KEM-768 and ML-DSA-65 via `github.com/cloudflare/circl` v1.6.1 are **Experimental**; SLH-DSA is not implemented. Server-held private key bytes are never returned by the API but are stored base64 in the sandbox state file (`./data/eaas-store.json` by default).

Beta enrollment is self-service via `POST /api/beta/v1/registrations`; submissions return `received_pending_review`, and admin review is gated by `EAAS_ADMIN_TOKEN`. No email is sent. Plan switching changes entitlements only — there is **no Stripe/payment collection or payment webhook**. Hosted EaaS, production Postgres, email delivery, CAVP/FIPS validation, AI operations, quantum hardware, HSM custody, and wireless operations are not implemented. Seven EaaS package tests and the full repository `go test ./...` suite passed locally; `go vet ./...` and `go build ./...` also passed. EaaS is excluded from the CSPM scores and pilot/production claims.

Docs: [Product status](docs/EAAS_PRODUCT_STATUS.md) · [API](docs/EAAS_API.md) · [Deployment](docs/EAAS_DEPLOYMENT.md) · [Security & privacy](docs/EAAS_SECURITY_PRIVACY.md) · [Limitations](docs/EAAS_LIMITATIONS.md) · [Testing & CI](docs/EAAS_TESTING_CI.md) · [Freemium & metering](docs/EAAS_FREEMIUM_AND_METERING.md)

---

## Quick start

```bash
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd RivicQ_CSPM_EaaS

cp .env.example .env
make dev-backend          # Community API :8080
# or: make dev-enterprise # Enterprise API :9090
make dev-frontend         # React UI (nebula black / violet / Inter) → :3000
```

Open http://localhost:3000/platform — choose **Community** or **Enterprise** on Sign in, or open `/demo`.

### RivicQ Graph (labeled demo)

```bash
cd fabric
npm ci
npm run dev
```

Same nebula chrome as the website (black / violet / Inter). Discovery, each detection (`QSF-*`), attack stages, and domain inventories have their own graphs. Synthetic fixture only — no secret values. See [docs/FABRIC.md](docs/FABRIC.md) and [docs/GRAPH.md](docs/GRAPH.md). `/nexus` bookmarks redirect to `/fabric`.

### CLI and GitHub Action

```bash
make build-rivicq
./bin/rivicq scan .
./bin/rivicq scan . --format json --fail-on BLOCK

# Embedded (Infineon) and identity (G+D) static analysis
./bin/rivicq firmware scan    fixtures/partners/infineon/classical-mcu/firmware.bin
./bin/rivicq firmware compare fixtures/partners/infineon/firmware-diff/v1.bin \
                              fixtures/partners/infineon/firmware-diff/v2.bin
./bin/rivicq identity scan    fixtures/partners/gd/certificate/device-rsa2048.pem
```

Static, metadata-only analysis: no firmware execution, no private-key/SIM/SE secret extraction.
See [docs/FIRMWARE_ANALYSIS.md](docs/FIRMWARE_ANALYSIS.md), [docs/IDENTITY_CRYPTO.md](docs/IDENTITY_CRYPTO.md),
and the [API](docs/FIRMWARE_IDENTITY_API.md) (`/api/v1/firmware/*`, `/api/v1/identity/*`).

Composite action: [`.github/actions/rivicq-scan`](.github/actions/rivicq-scan). Workflow: [`.github/workflows/rivicq-security.yml`](.github/workflows/rivicq-security.yml).

### Dataset accuracy

```bash
make analyze-datasets
```

See [DATASETS.md](DATASETS.md). Fixtures are synthetic. **Do not commit secrets, customer data, or production keys.**

---

## GitHub Pages vs production

| | GitHub Pages | Self-hosted / production |
|--|--------------|--------------------------|
| What it is | Static React build | Go API + React + your identity provider |
| API | **None** | Community `:8080` or Enterprise `:9090` |
| Demo | Isolated client session (`rivicq-demo-session`), **not a JWT** | Optional `DEMO_MODE` on the API |
| Auth | Supabase (if configured) or labeled demo | JWT / SSO as deployed |

This table is CSPM-only. The EaaS portal is served by the standalone `cmd/eaas` binary at `/` and `/portal`, not by GitHub Pages.

Known limitations: [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md), [docs/EAAS_LIMITATIONS.md](docs/EAAS_LIMITATIONS.md).

---

## Documentation

| Topic | Link |
|-------|------|
| Docs hub | [docs/README.md](docs/README.md) |
| EaaS product status | [docs/EAAS_PRODUCT_STATUS.md](docs/EAAS_PRODUCT_STATUS.md) |
| EaaS API | [docs/EAAS_API.md](docs/EAAS_API.md) |
| EaaS deployment | [docs/EAAS_DEPLOYMENT.md](docs/EAAS_DEPLOYMENT.md) |
| EaaS security & privacy | [docs/EAAS_SECURITY_PRIVACY.md](docs/EAAS_SECURITY_PRIVACY.md) |
| EaaS limitations | [docs/EAAS_LIMITATIONS.md](docs/EAAS_LIMITATIONS.md) |
| EaaS testing & CI | [docs/EAAS_TESTING_CI.md](docs/EAAS_TESTING_CI.md) |
| EaaS freemium & metering | [docs/EAAS_FREEMIUM_AND_METERING.md](docs/EAAS_FREEMIUM_AND_METERING.md) |
| Ops runbook (local demo & operations) | [docs/OPS_RUNBOOK.md](docs/OPS_RUNBOOK.md) |
| Known limitations | [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) |
| Editions (OSS vs Enterprise) | [docs/editions.md](docs/editions.md) |
| Client architecture | [docs/CLIENT_ARCHITECTURE.md](docs/CLIENT_ARCHITECTURE.md) |
| Operator UX audit | [docs/ux/README.md](docs/ux/README.md) |
| Contact | [docs/contact.html](docs/contact.html) · [CONTACT.md](docs/CONTACT.md) — public desks only |
| BOM framework | [docs/BOM_FRAMEWORK.md](docs/BOM_FRAMEWORK.md) |
| PQC migration | [docs/PQC_MIGRATION.md](docs/PQC_MIGRATION.md) |
| SaaS architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Legal | [LEGAL.md](LEGAL.md) |
| Privacy | [PRIVACY.md](PRIVACY.md) |
| Trademarks | [TRADEMARKS.md](TRADEMARKS.md) |
| Datasets | [DATASETS.md](DATASETS.md) |
| Security intelligence | [docs/security-intelligence.md](docs/security-intelligence.md) |
| Optional scanners | [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) |
| Partners (Infineon / G+D) | [docs/PARTNER_TECHNICAL_AUDIT.md](docs/PARTNER_TECHNICAL_AUDIT.md) · [INFINEON](docs/INFINEON.md) · [G+D](docs/GD.md) |
| Firmware analysis | [docs/FIRMWARE_ANALYSIS.md](docs/FIRMWARE_ANALYSIS.md) · [PQC embedded](docs/PQC_EMBEDDED.md) |
| Identity analysis | [docs/IDENTITY_CRYPTO.md](docs/IDENTITY_CRYPTO.md) · [PQC identity](docs/PQC_IDENTITY.md) |
| Firmware & identity API | [docs/FIRMWARE_IDENTITY_API.md](docs/FIRMWARE_IDENTITY_API.md) · [POC](scripts/poc/partner_artifact_analysis.sh) |
| CBOM quickstart | [QUICKSTART_CBOM.md](QUICKSTART_CBOM.md) |
| Deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Environment | [docs/DEPLOY_ENV.md](docs/DEPLOY_ENV.md) |
| API | [docs/openapi.yaml](docs/openapi.yaml) |
| Frontend | [web/README.md](web/README.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Code of conduct | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| Security disclosure | [SECURITY.md](SECURITY.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |

---

## Repository layout

```
cmd/rivicq/             Community CLI (scan/sbom/cbom/vuln/secrets/iac/compliance/policy + firmware/identity)
cmd/server/             OSS (:8080) and Enterprise (:9090) API
cmd/eaas/               Standalone EaaS binary (default :9091; separate from CSPM)
internal/eaas/          EaaS service, crypto operations, HTTP router, sandbox store
web/eaas/               EaaS developer portal served by cmd/eaas at / and /portal
deploy/migrations/004_eaas_schema.sql  EaaS target PostgreSQL schema (no runtime repository yet)
internal/discovery/     TLS, SSH, HTTP, SBOM scanners
internal/intelligence/  Findings, risk, policy, CycloneDX
internal/auth/          RBAC helpers and route permission table
internal/authn/         JWT, MFA, accounts, sessions, tokens
internal/profile/       Vendor-neutral domain profiles (embedded/*, identity/*)
internal/cryptoart/     Unified crypto artifact + relation model
internal/certeng/       Shared X.509 metadata engine
internal/firmware/      Static firmware analysis (no execution)
internal/identity/      Static identity/certificate analysis (no secrets)
web/                    React SaaS (deep-space nebula: black / violet / Inter)
datasets/               Expected results for fixture scans
fixtures/               Synthetic known-bad / known-good samples (incl. fixtures/partners/)
deploy/helm/            OSS and Enterprise charts
```

---

## Legal

Copyright © 2026 RivicQ GmbH, Berlin.

- **Community source:** Apache License 2.0 — [LICENSE](LICENSE)
- **Enterprise:** commercial license — contact [rivicq.com](https://rivicq.com)
- **Attribution / third-party:** [NOTICE](NOTICE)
- **Trademarks:** [TRADEMARKS.md](TRADEMARKS.md)
- **Privacy:** [PRIVACY.md](PRIVACY.md)
- **Warranty:** software is provided as described in Apache-2.0 §7–8 and [LEGAL.md](LEGAL.md). No certification, audit opinion, or legal advice is implied.

**Contact:** https://rivicq.com · hello@rivicq.com · sales@rivicq.com · security@rivicq.com · [directory](docs/contact.html)
