# Contributing to RivicQ

Thank you for contributing to **RivicQ CSPM / CryptoBOM**. Community source is licensed under Apache License 2.0. Enterprise features are commercially licensed and are not “unlocked” by a Community pull request.

By contributing you agree that your patch is provided under Apache-2.0 (see [LEGAL.md](LEGAL.md)). Read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

**Do not commit secrets, customer data, live credentials, or personal data of third parties.** Dataset rules: [DATASETS.md](DATASETS.md).

---

## Principles

- **Preserve the working CBOM engine.** Extend scanners, APIs, and CLI behaviour; do not replace working scan JSON contracts (`GetCBOMScanReport` shape stays stable).
- **No fake production data.** Do not invent CVEs, EPSS scores, scan progress, or hardcoded production passwords. Community dashboards must not show unlabeled enterprise simulations.
- **RSA-2048 is classified, not auto-vulnerable.**
- **Honesty in copy.** Framework names are control mappings, not certifications of RivicQ GmbH.

---

## Prerequisites

- Go 1.25.x (see `go.mod`)
- Node.js 18+ and npm (frontend)
- Make, Git
- Docker (optional, for Compose / Helm checks)

## Development setup

```bash
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd RivicQ_CSPM_EaaS

cp .env.example .env
go mod download
cd web && npm ci && cd ..

make dev-backend    # Community API :8080
make dev-frontend   # http://localhost:3000
```

Enterprise API: `make dev-enterprise` (port **9090**).

---

## How to contribute

1. Fork the repository (or push a feature branch if you have write access).
2. Create a branch: `git checkout -b cursor/<short-description>`.
3. Make the change with tests.
4. Run the relevant suites (below).
5. Open a pull request that states **what**, **why**, and **how it was tested**.

### Bug reports

Use GitHub Issues with reproduction steps, expected vs actual behaviour, and versions (OS, Go, Node). **Do not** file public issues for exploitable vulnerabilities — use [SECURITY.md](SECURITY.md).

### Dataset contributions

Add synthetic fixtures only. Point `datasets/**/expected.json` at `fixtures/`. Run `make analyze-datasets`. Never duplicate a nested Go module under `datasets/` (breaks `embed`).

---

## Tests you should run

```bash
# Go (engine, auth, intelligence)
go test -count=1 -short ./internal/auth/ ./internal/api/shared/ ./internal/intelligence/ ./internal/api/enterprise/ ./tests/

# Frontend
cd web
npx tsc --noEmit
CI=true npm test -- --watchAll=false
CI=true npm run build

# Dataset harness
make analyze-datasets
```

- Format Go: `gofmt -w` on edited files.
- Frontend: `CI=true npm run build` treats ESLint warnings as errors.

---

## Architecture notes (do not regress)

- `internal/intelligence` must **not** import `internal/api/shared` (import cycle).
- Do not register GitHub scan routes twice (Enterprise already calls `SetupGitHubScanningRoutes`).
- Default `rivicq scan .` skips `testdata`, `fixtures`, `datasets`, and scanner implementation files.
- Client demo tokens must never look like JWTs (no `.` segments).
- Tenant isolation: do not reintroduce spoofable `X-Tenant-ID` as the source of truth on Enterprise mutating APIs.

Layout of this repo (not a separate `core-engine/` tree):

```
cmd/                    CLI and API entrypoints
internal/               Go services (discovery, intelligence, auth, api)
web/                    React (Create React App) SaaS UI
datasets/ + fixtures/   Synthetic accuracy harness
deploy/                 Helm / Compose
docs/                   Operator and developer documentation
```

---

## Enterprise vs Community in PRs

This repository contains **Community (OSS)** code and **Enterprise** packages used under a commercial license.

- Community PRs should keep Enterprise-only routes gated and documented.
- Do not claim SOC 2, ISO 27001, PCI DSS, HIPAA, FedRAMP, or TÜV certification in UI copy or docs.
- Licensed Enterprise capabilities: SSO, enforced RBAC, multi-cloud connectors, compliance report packs, contracted support — [docs/editions.md](docs/editions.md).

Commercial inquiries: https://rivicq.com

---

## Help

- Issues: https://github.com/RivicQ/RivicQ_CSPM_EaaS/issues
- Security: security@rivicq.com
- Conduct: conduct@rivicq.com

Thank you for helping build an honest cryptographic inventory tool.
