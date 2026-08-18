# RivicQ Security Intelligence Engine

RivicQ is an orchestrator, not a pile of unrelated scanners. Existing TLS, SSH, HTTP, SBOM, and GitHub content scanners stay in place. This layer **normalizes** their output, scores cryptographic risk, evaluates policy, and exposes the same engine through the CLI, API, GitHub Action, and dashboard.

```text
                    RIVICQ ECOSYSTEM
                           |
          +----------------+----------------+
          |                |                |
        CSPM             CBOM             EaaS
          |                |                |
          +----------------+----------------+
                           |
              Security Intelligence Engine
                           |
          +----------------+----------------+
          |                |                |
        SBOM            Risk Engine      Compliance
          |                |                |
          +----------------+----------------+
                           |
                    DevSecOps Engine
                           |
             +-------------+-------------+
             |             |             |
           GitHub        GitLab       CI/CD
```

## Data flow

```text
External tools (optional: Syft, Trivy, Gitleaks, …)
        ↓
Built-in scanners (discovery + github-content)
        ↓
Normalized Finding
        ↓
Risk engine (explainable crypto score)
        ↓
Policy engine (BLOCK / WARN / ALLOW / INFORM)
        ↓
CLI / API / Dashboard / CI gate
```

## What already existed (kept)

| Component | Location | Role |
|---|---|---|
| TLS / SSH / HTTP / SBOM scanners | `internal/discovery/` | Network and filesystem CBOM |
| Scan jobs | `internal/discovery/scan_manager.go` | `pending` → `running` → `completed`/`failed` |
| GitHub content analysis | `internal/api/shared/github_content_scan.go` | SAST, secrets, SCA, IaC, CBOM from source |
| CBOM scan API | `POST/GET /api/v1/scans` | Unchanged JSON shape for `/scans/:id/report` |
| Dashboard | `web/src/pages/` | Layout preserved; live numbers from the API |

## What this layer adds

| Component | Location |
|---|---|
| Unified finding + risk + policy | `internal/intelligence/` |
| CycloneDX 1.6 cryptographic-asset BOM | `GET /api/v1/scans/:id/cyclonedx` |
| Intelligence report | `GET /api/v1/scans/:id/intelligence` |
| Policy catalog / evaluate | `GET /api/v1/policies`, `POST /api/v1/policies/evaluate` |
| Community CLI | `cmd/rivicq` → `rivicq scan .` |
| Self-scan CI | `.github/workflows/rivicq-security.yml` |
| Detection fixtures | `fixtures/` |

RSA-2048 is **classified**, not automatically marked vulnerable. Weak keys (RSA < 2048), MD5/SHA-1, TLS < 1.2, 3DES/RC4, CISA KEV, and secrets **BLOCK** outside `testdata/` and `fixtures/`.

Optional scanners on `PATH` (Syft, Trivy, Grype, Gitleaks, Semgrep, OSV-Scanner, Checkov, Cosign) are probed and recorded. They are never required to scan.

## CLI

```bash
make build-rivicq
./bin/rivicq scan .
./bin/rivicq scan . --format json --fail-on BLOCK
```

Default path excludes: `testdata`, `fixtures`, `node_modules`, `vendor`, `web/build`, `.git`.

## Editions

The same intelligence engine is used for Community (CLI + Action), Team (dashboard + scheduled scans), and Enterprise (SSO, RBAC, cloud connectors). Feature flags and service boundaries — not a forked scanner.
