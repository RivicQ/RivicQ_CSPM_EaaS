# Community (Open Source) vs Enterprise

RivicQ ships **one cryptographic intelligence engine** and two **legal editions**.

| | Community (OSS) | Enterprise |
|--|-----------------|------------|
| **Legal** | [Apache License 2.0](../LICENSE) | Commercial contract with RivicQ GmbH |
| **Distribution** | This public GitHub repository | Licensed binaries / charts / support |
| **CLI + GitHub Action** | Yes | Yes |
| **Dashboard / scanner / inventory** | Yes | Yes |
| **Multi-cloud inventory** | No | Yes (customer cloud credentials) |
| **SSO** | No | OIDC; SAML configuration store (IdP ACS is operational work) |
| **RBAC** | Basic roles in the UI | Server-side `RequireRole` (Viewer &lt; Analyst &lt; Operator &lt; Admin) |
| **Audit viewer** | No | Yes — tenant from JWT claims only |
| **Compliance PDFs / packs** | No | Control **mappings** (DORA / BSI / eIDAS / ISO / NIST, etc.) — **not a certification** |
| **Support** | GitHub issues | Contracted |

See [LEGAL.md](../LEGAL.md), [PRIVACY.md](../PRIVACY.md), [TRADEMARKS.md](../TRADEMARKS.md), and the comparison table in [README.md](../README.md).

## Open Source (Community)

- **Server:** `cmd/server/oss/main.go` · **Port:** `8080`
- **CLI:** `cmd/rivicq` · `rivicq scan .`
- CBOM scan engine (TLS, SSH, HTTP, SBOM) plus GitHub content analysis
- Security intelligence layer (normalized findings, crypto risk, policy gate)
- Basic dashboard; Kubernetes and Cilium **hooks** (not a shipped eBPF program)
- GitHub Action: `.github/workflows/rivicq-security.yml`

You may use Community software in commercial products under Apache-2.0, provided you keep copyright, license, and [NOTICE](../NOTICE) attributions.

## Enterprise

- **Server:** `cmd/server/enterprise/main.go` · **Port:** `9090`
- Everything in Community, plus licensed control-plane features:
  - Multi-cloud inventory (AWS, GCP, Azure, IBM Cloud) when credentials are configured
  - Enterprise SSO, RBAC enforcement, audit log viewer
  - Compliance report packs (mappings)
  - Optional IBM Quantum / HSM connectors when the customer supplies keys — **never a hard runtime dependency**

Enterprise is **not** granted by cloning this repo. Contact [rivicq.com](https://rivicq.com).

## API base paths

Both editions expose `/api/v1/` with shared CBOM scan endpoints:

```
POST /api/v1/scans              # Trigger CBOM scan
GET  /api/v1/scans              # List scans
GET  /api/v1/scans/:id          # Scan status & findings
GET  /api/v1/scans/:id/report   # Unchanged ScanResult JSON
GET  /api/v1/scans/:id/intelligence  # Normalized findings + policy gate + Qiskit/audit scores
GET  /api/v1/scans/:id/qiskit        # Qiskit-aligned estate score (not IBM Quantum hardware)
GET  /api/v1/scans/:id/cyclonedx     # CycloneDX 1.6 cryptographic-asset BOM
GET  /api/v1/findings           # Normalized findings across completed scans
GET  /api/v1/policies           # Policy catalog
POST /api/v1/policies/evaluate  # Evaluate findings against default policies
GET  /api/v1/inventory/assets   # Crypto asset inventory
```

Enterprise adds `/cloud/*`, `/enterprise/*`, `/sso/*`, `/audit/*`, and extended compliance routes. Mutating SSO and cloud-connector routes require an **Admin** role.

## Honesty rules for both editions

- GitHub Pages has no production scan API.
- Do not treat demo / simulation dashboards as live customer telemetry.
- RSA-2048 is classified, not automatically vulnerable.
- Rejected NVD entries are not treated as vulnerabilities.
