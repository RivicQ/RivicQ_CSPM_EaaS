# Community vs Enterprise

The **same CBOM / intelligence engine** is used in both editions. Enterprise is a commercial entitlement (SSO, RBAC, cloud connectors, compliance packs), not a second scanner.

| | Community | Enterprise |
|--|-----------|------------|
| License | Apache-2.0 | Commercial (RivicQ GmbH) |
| CLI + GitHub Action | Yes | Yes |
| Dashboard / scanner / inventory | Yes | Yes |
| Multi-cloud, SSO, audit viewer | No | Yes |
| Compliance PDFs (DORA / BSI / eIDAS mappings) | No | Yes — not a certification |

See [LEGAL.md](../LEGAL.md) and the comparison table in [README.md](../README.md).

## Open Source (OSS)

- **Server:** `cmd/server/oss/main.go` · **Port:** `8080`
- **CLI:** `cmd/rivicq` · `rivicq scan .`
- CBOM scan engine (TLS, SSH, HTTP, SBOM) plus GitHub content analysis
- Security intelligence layer (normalized findings, crypto risk, policy gate)
- Basic dashboard, Kubernetes & Cilium hooks
- Community support
- GitHub Action: `.github/workflows/rivicq-security.yml`

## Enterprise

- **Server:** `cmd/server/enterprise/main.go` · **Port:** `9090`
- Everything in OSS, plus:
- Multi-cloud inventory (AWS, GCP, Azure, IBM)
- Enterprise SSO, compliance dashboards, analytics
- IBM Quantum attestation hooks, HSM integrations

## API base paths

Both editions expose `/api/v1/` with shared CBOM scan endpoints:

```
POST /api/v1/scans              # Trigger CBOM scan
GET  /api/v1/scans              # List scans
GET  /api/v1/scans/:id          # Scan status & findings
GET  /api/v1/scans/:id/report   # Unchanged ScanResult JSON
GET  /api/v1/scans/:id/intelligence  # Normalized findings + policy gate
GET  /api/v1/scans/:id/cyclonedx     # CycloneDX 1.6 cryptographic-asset BOM
GET  /api/v1/findings           # Normalized findings across completed scans
GET  /api/v1/policies           # Policy catalog
POST /api/v1/policies/evaluate  # Evaluate findings against default policies
GET  /api/v1/inventory/assets   # Crypto asset inventory
```

Enterprise adds `/cloud/*`, `/enterprise/*`, and extended compliance routes.
