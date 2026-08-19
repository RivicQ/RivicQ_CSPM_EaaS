# RivicQ — Cryptographic Security Posture Management

**RivicQ GmbH** (Berlin) · Community **open source** (Apache License 2.0) and **Enterprise** (commercial)

RivicQ is an Encryption-as-a-Service (EaaS) platform for **CSPM**, **CBOM**, **SBOM**, and DevSecOps. The same cryptographic intelligence engine powers both editions. Editions are **licenses and feature entitlements**, not a second scanner.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/github/actions/workflow/status/RivicQ/RivicQ_CSPM_EaaS/pages.yml?label=GitHub%20Pages)](https://github.com/RivicQ/RivicQ_CSPM_EaaS/actions/workflows/pages.yml)
[![Security](https://img.shields.io/badge/security-responsible%20disclosure-0f62fe.svg)](SECURITY.md)

| Resource | URL |
|----------|-----|
| **Live app (GitHub Pages)** | https://rivicq.github.io/RivicQ_CSPM_EaaS/ |
| **Interactive demo** | https://rivicq.github.io/RivicQ_CSPM_EaaS/demo |
| **Sign in / register** | https://rivicq.github.io/RivicQ_CSPM_EaaS/login |
| **Documentation hub** | https://rivicq.github.io/RivicQ_CSPM_EaaS/docs/ |
| **Company** | https://rivicq.com |
| **This repository** | https://github.com/RivicQ/RivicQ_CSPM_EaaS |
| **Legal pack** | [LEGAL.md](LEGAL.md) · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [PRIVACY.md](PRIVACY.md) · [TRADEMARKS.md](TRADEMARKS.md) · [SECURITY.md](SECURITY.md) |

The web UI uses **RivicQ violet** from [rivicq.com](https://rivicq.com) (`#8251f3`, plum `#301233`) with Outfit and JetBrains Mono.

**IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product. Control mappings are not certifications.** Optional IBM Cloud / IBM Quantum connectors are interoperability only and require the customer’s own credentials. See [TRADEMARKS.md](TRADEMARKS.md).

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
| Dashboard, inventory, scanner | Yes | Yes |
| Labeled demo trail | Yes (sample data only) | Yes |
| Multi-cloud inventory (AWS, Azure, GCP, IBM Cloud) | — | Yes — **customer credentials required** |
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

## Quick start

```bash
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd RivicQ_CSPM_EaaS

cp .env.example .env
make dev-backend          # Community API :8080
# or: make dev-enterprise # Enterprise API :9090
make dev-frontend         # React UI (RivicQ violet / Outfit) → :3000
```

Open http://localhost:3000/platform — choose **Community** or **Enterprise** on Sign in, or open `/demo`.

### CLI and GitHub Action

```bash
make build-rivicq
./bin/rivicq scan .
./bin/rivicq scan . --format json --fail-on BLOCK
```

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

Known limitations: [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

---

## Documentation

| Topic | Link |
|-------|------|
| Docs hub | [docs/README.md](docs/README.md) |
| Known limitations | [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) |
| Editions (OSS vs Enterprise) | [docs/editions.md](docs/editions.md) |
| Legal | [LEGAL.md](LEGAL.md) |
| Privacy | [PRIVACY.md](PRIVACY.md) |
| Trademarks | [TRADEMARKS.md](TRADEMARKS.md) |
| Datasets | [DATASETS.md](DATASETS.md) |
| Security intelligence | [docs/security-intelligence.md](docs/security-intelligence.md) |
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
cmd/rivicq/             Community CLI
cmd/server/             OSS (:8080) and Enterprise (:9090) API
internal/discovery/     TLS, SSH, HTTP, SBOM scanners
internal/intelligence/  Findings, risk, policy, CycloneDX
internal/auth/          JWT, MFA, RBAC helpers
web/                    React SaaS (RivicQ violet theme)
datasets/               Expected results for fixture scans
fixtures/               Synthetic known-bad / known-good samples
deploy/helm/            OSS and Enterprise charts
```

---

## Legal

Copyright © 2026 RivicQ GmbH, Berlin.

- **Community source:** Apache License 2.0 — [LICENSE](LICENSE)
- **Enterprise:** commercial license — contact [rivicq.com](https://rivicq.com)
- **Attribution / third-party:** [NOTICE](NOTICE)
- **Trademarks (IBM, IBM Plex, Carbon, IBM Quantum):** [TRADEMARKS.md](TRADEMARKS.md)
- **Privacy:** [PRIVACY.md](PRIVACY.md)
- **Warranty:** software is provided as described in Apache-2.0 §7–8 and [LEGAL.md](LEGAL.md). No certification, audit opinion, or legal advice is implied.

**Contact:** https://rivicq.com · security@rivicq.com · commercial inquiries via the company site
