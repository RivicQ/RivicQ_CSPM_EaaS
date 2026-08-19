# RivicQ — Cryptographic Security Posture Management

**RivicQ GmbH** · CSPM + CBOM + SBOM + DevSecOps · Community (Apache 2.0) and Enterprise (commercial)

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Pages](https://img.shields.io/github/actions/workflow/status/RivicQ/RivicQ_CSPM_EaaS/pages.yml?label=GitHub%20Pages)](https://github.com/RivicQ/RivicQ_CSPM_EaaS/actions/workflows/pages.yml)

| Resource | URL |
|----------|-----|
| **Live app (GitHub Pages)** | https://rivicq.github.io/RivicQ_CSPM_EaaS/ |
| **Interactive demo** | https://rivicq.github.io/RivicQ_CSPM_EaaS/demo |
| **Sign in** | https://rivicq.github.io/RivicQ_CSPM_EaaS/login |
| **Docs hub** | https://rivicq.github.io/RivicQ_CSPM_EaaS/docs/ |
| **Company** | https://rivicq.com |
| **GitHub org** | https://github.com/RivicQ |
| **This repository** | https://github.com/RivicQ/RivicQ_CSPM_EaaS |
| **Legal** | [LEGAL.md](LEGAL.md) · [LICENSE](LICENSE) · [NOTICE](NOTICE) · [SECURITY.md](SECURITY.md) |

The UI follows **IBM Carbon** color (Blue 60 `#0f62fe`, Gray 100, Green 50) and **IBM Plex** typography — the same visual language used across IBM Cloud and enterprise security consoles. RivicQ is not an IBM product.

---

## Open Source (Community) vs Enterprise

The **same security engine** scans TLS, SSH, HTTP, SBOM, GitHub content, and policy. Editions are feature flags and commercial terms, not a second scanner.

| Capability | Community (OSS) | Enterprise |
|------------|-----------------|------------|
| License | Apache License 2.0 | Commercial license (RivicQ GmbH) |
| CLI `rivicq scan .` | Yes | Yes |
| GitHub Action policy gate | Yes | Yes |
| CBOM / CycloneDX 1.6 export | Yes | Yes |
| Dashboard, inventory, scanner | Yes | Yes |
| Demo trail (labeled sample data) | Yes | Yes |
| Multi-cloud inventory (AWS, Azure, GCP, IBM) | — | Yes (credentials required) |
| SSO (OIDC; SAML configuration) | — | Yes |
| RBAC (Admin, Operator, Analyst, Viewer) | Basic roles | Enforced server-side |
| Immutable audit log viewer | — | Yes |
| Compliance report packs (DORA, BSI, eIDAS mappings) | — | Yes — **not a certification** |
| Air-gapped Helm / Compose | OSS chart | Enterprise chart |

**Community** is the public GitHub project. **Enterprise** is licensed separately. See [docs/editions.md](docs/editions.md), [LEGAL.md](LEGAL.md), and [BETA_PROGRAM.md](BETA_PROGRAM.md).

RSA-2048 is **classified**, not automatically marked vulnerable.

---

## Quick start

```bash
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd RivicQ_CSPM_EaaS

cp .env.example .env
make dev-backend          # Community API :8080
# or: make dev-enterprise # Enterprise API :9090
make dev-frontend         # React UI (IBM Carbon / Plex)
```

Open http://localhost:3000/platform — **Community** or **Enterprise** on Sign in, or `/demo`.

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

See [DATASETS.md](DATASETS.md). Fixtures are synthetic. Do not commit secrets.

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

---

## Documentation

| Topic | Link |
|-------|------|
| Known limitations | [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) |
| Datasets | [DATASETS.md](DATASETS.md) |
| Editions | [docs/editions.md](docs/editions.md) |
| Legal | [LEGAL.md](LEGAL.md) |
| Security intelligence | [docs/security-intelligence.md](docs/security-intelligence.md) |
| CBOM quickstart | [QUICKSTART_CBOM.md](QUICKSTART_CBOM.md) |
| Deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Environment | [docs/DEPLOY_ENV.md](docs/DEPLOY_ENV.md) |
| API | [docs/openapi.yaml](docs/openapi.yaml) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
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
web/                    React SaaS (IBM Carbon visual language)
datasets/               Expected results for fixture scans
fixtures/               Synthetic known-bad/known-good samples
deploy/helm/            OSS and Enterprise charts
```

---

## Legal

Copyright © 2026 RivicQ GmbH. Community source: Apache-2.0. Enterprise: commercial license. Trademarks and third-party names are described in [LEGAL.md](LEGAL.md) and [NOTICE](NOTICE).

**Contact:** https://rivicq.com · security@rivicq.com
