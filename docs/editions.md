# OSS vs Enterprise Editions

## Open Source (OSS)

- **Server:** `cmd/server/oss/main.go` · **Port:** `8080`
- CBOM scan engine (TLS, SSH, HTTP, SBOM)
- Basic dashboard, Kubernetes & Cilium hooks
- Community support

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
GET  /api/v1/inventory/assets   # Crypto asset inventory
```

Enterprise adds `/cloud/*`, `/enterprise/*`, and extended compliance routes.
