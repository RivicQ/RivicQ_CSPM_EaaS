# RivicQ — Encryption as a Service & CSPM

Open-source-to-enterprise cybersecurity platform for **CSPM + CBOM + SBOM + DevSecOps + supply-chain security + crypto-agility + compliance**.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Pages](https://img.shields.io/github/actions/workflow/status/RivicQ/RivicQ_CSPM_EaaS/pages.yml?label=GitHub%20Pages)](https://github.com/RivicQ/RivicQ_CSPM_EaaS/actions/workflows/pages.yml)
[![Go Version](https://img.shields.io/github/go-mod/go-version/RivicQ/RivicQ_CSPM_EaaS)](https://golang.org/)

| Resource | URL |
|----------|-----|
| **Live app (GitHub Pages)** | https://rivicq.github.io/RivicQ_CSPM_EaaS/ |
| **Interactive demo trail** | https://rivicq.github.io/RivicQ_CSPM_EaaS/demo |
| **Sign in / Try Demo** | https://rivicq.github.io/RivicQ_CSPM_EaaS/login |
| **Docs hub (Pages)** | https://rivicq.github.io/RivicQ_CSPM_EaaS/docs/ |
| **Company** | https://rivicq.com |
| **GitHub org** | https://github.com/RivicQ |
| **This repository** | https://github.com/RivicQ/RivicQ_CSPM_EaaS |

Pages is a static DEMO workspace (labeled sample data). It does not mix with customer estates. With a running API, **Try Interactive Demo** uses `GET /api/v1/auth/demo` (disabled when `DEMO_MODE=false`).

---

## What RivicQ does

RivicQ is an **orchestrator**, not a pile of unrelated scanners.

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

- **CSPM** — cloud and cryptographic posture
- **CBOM** — CycloneDX cryptographic bill of materials
- **SBOM** — dependency inventory correlated with crypto usage
- **DevSecOps** — `rivicq scan .` and GitHub Action policy gate
- **EaaS** — encryption intelligence toward PQC migration

RSA-2048 is **classified**, not automatically marked vulnerable.

---

## Quick start

```bash
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd RivicQ_CSPM_EaaS

cp .env.example .env
make dev-backend          # OSS API :8080 (demo mode, no DB required)
# or: make dev-enterprise # Enterprise API :9090
make dev-frontend         # React UI
```

Open http://localhost:3000/platform — **Try Interactive Demo** on Sign in, or `/demo`.

### CLI

```bash
make build-rivicq
./bin/rivicq scan .
./bin/rivicq scan . --format json --fail-on BLOCK
```

### CBOM scan API

```bash
curl -s -X POST http://localhost:8080/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"target": "./", "scan_type": "cbom"}'
```

---

## Editions

| Edition | Port | Includes |
|---------|------|----------|
| **Community / OSS** | 8080 | CLI, local/CBOM scan, GitHub Action, dashboard |
| **Team** | — | Community + shared projects (same engine) |
| **Enterprise** | 9090 | SSO, cloud connectors, compliance, RBAC |

Same security engine — feature flags, not a fork. Details: [docs/editions.md](docs/editions.md) · intelligence layer: [docs/security-intelligence.md](docs/security-intelligence.md)

---

## Repository layout

```
cmd/rivicq/          Community CLI
cmd/server/          OSS & Enterprise API
internal/discovery/  TLS, SSH, HTTP, SBOM scanners
internal/intelligence/  Normalized findings, risk, policy, CycloneDX CBOM
internal/api/        REST handlers (auth demo: GET /auth/demo)
web/                 React SaaS (demo trail, command center)
docs/                Architecture, SDKs, OpenAPI
fixtures/            Deterministic CBOM / IaC test projects
.github/workflows/rivicq-security.yml  Self-scan policy gate
```

---

## Documentation

| Topic | Link |
|-------|------|
| Docs hub | [docs/README.md](docs/README.md) |
| Security intelligence | [docs/security-intelligence.md](docs/security-intelligence.md) |
| CBOM quickstart | [QUICKSTART_CBOM.md](QUICKSTART_CBOM.md) |
| Deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Environment variables | [docs/DEPLOY_ENV.md](docs/DEPLOY_ENV.md) |
| API spec | [docs/openapi.yaml](docs/openapi.yaml) |
| PQC migration | [docs/PQC_MIGRATION.md](docs/PQC_MIGRATION.md) |
| SDKs | [docs/sdks/README.md](docs/sdks/README.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Security | [SECURITY.md](SECURITY.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |
| Beta | [BETA_PROGRAM.md](BETA_PROGRAM.md) |

---

## Contact

**RivicQ GmbH** — https://rivicq.com  
Enterprise & beta: [BETA_PROGRAM.md](BETA_PROGRAM.md)
