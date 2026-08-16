# RivicQ CryptoBOM SaaS

Cryptographic Bill of Materials (CBOM) platform for discovering, inventorying, and assessing post-quantum crypto risk across cloud, Kubernetes, and code estates.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Pages](https://img.shields.io/github/actions/workflow/status/RivicQ/RivicQ_CSPM_EaaS/pages.yml?label=Pages)](https://github.com/RivicQ/RivicQ_CSPM_EaaS/actions/workflows/pages.yml)
[![Go Version](https://img.shields.io/github/go-mod/go-version/RivicQ/RivicQ_CSPM_EaaS)](https://golang.org/)

**Live app:** https://rivicq.github.io/RivicQ_CSPM_EaaS/

Design-partner beta: [BETA_PROGRAM.md](BETA_PROGRAM.md) · [Live outcome](docs/STATUS.md) · [Known limitations](docs/KNOWN_LIMITATIONS.md) · [Beta checklist](docs/BETA_READY.md)

---

## What is a CBOM?

A **Cryptographic Bill of Materials** inventories every cryptographic component in your stack — algorithms, key sizes, libraries, certificates, and PQC readiness — so you can detect weak crypto, plan migration, and prove compliance.

---

## Quick start — first CBOM in 10 minutes

1. Open https://rivicq.github.io/RivicQ_CSPM_EaaS/
2. Paste a **public** GitHub URL (for example `https://github.com/owner/repo`) and click **Scan for Crypto Risk**.
3. Read the CBOM: algorithms, key sizes, quantum exposure, BSI / DORA / eIDAS mapping. Export JSON + PDF.
4. Register (Community) to keep scan history, inventory, and workspace settings.
5. For containers, private repos, or live TLS: run the engine locally (`make dev-stack`) and use `/scanner`.

Full CLI/API guide: [QUICKSTART_CBOM.md](QUICKSTART_CBOM.md)

---

## Local engine (CLI)

```bash
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd RivicQ_CSPM_EaaS

# Start backend (OSS on :8080 or Enterprise on :9090)
go run ./cmd/server/enterprise/main.go

# Run CBOM scan against a repo or hostname
chmod +x scripts/scan-cbom.sh
./scripts/scan-cbom.sh ./ --output cbom-report.json

# Or via REST API
curl -s -X POST http://localhost:9090/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"target": "./", "scan_type": "cbom"}' | jq .
```

Full guide: [QUICKSTART_CBOM.md](QUICKSTART_CBOM.md)

---

## Dev stack (recommended)

```bash
cp .env.example .env
make dev-stack          # Enterprise API :9090 + React UI :3000
```

Open **http://localhost:3000/platform/scanner** to run CBOM scans from the UI.

---

## Editions

| Edition | Port | Use case |
|---------|------|----------|
| **OSS** | 8080 | CBOM discovery, basic dashboard, community |
| **Enterprise** | 9090 | Full inventory, cloud integrations, SSO, compliance |

Details: [docs/editions.md](docs/editions.md) · Beta program: [BETA_PROGRAM.md](BETA_PROGRAM.md)

---

## Repository layout

```
cmd/server/          # OSS & Enterprise API servers
internal/discovery/  # CBOM scan engine (TLS, SSH, HTTP, SBOM)
internal/api/        # REST handlers
web/                 # React SaaS frontend
docs/                # Documentation & OpenAPI spec
deploy/              # Docker, Helm, Terraform, migrations
scripts/             # Dev stack, CBOM CLI, deploy helpers
```

---

## Documentation

| Topic | Link |
|-------|------|
| All docs | [docs/README.md](docs/README.md) |
| Deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| API spec | [docs/openapi.yaml](docs/openapi.yaml) |
| PQC migration | [docs/PQC_MIGRATION.md](docs/PQC_MIGRATION.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Security | [SECURITY.md](SECURITY.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |

---

## Contact

**RivicQ GmbH** — https://rivicq.com  
Enterprise & beta: [BETA_PROGRAM.md](BETA_PROGRAM.md)
