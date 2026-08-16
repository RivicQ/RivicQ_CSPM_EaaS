# CBOM Quickstart – First CBOM in 10 minutes

> Public GitHub scan on the live site, or a full engine scan locally.

## 10 minutes on GitHub Pages

1. Open https://rivicq.github.io/RivicQ_CSPM_EaaS/
2. Paste `https://github.com/<owner>/<repo>` (public only).
3. Wait for Discovering files → Analyzing crypto → Building CBOM → Quantifying risk.
4. Review score, severity, algorithm chips (key size + quantum + BSI/DORA/eIDAS), then **Export JSON + PDF**.
5. Create a Community account to store scans in your workspace. Request Enterprise via **Request access**.

Private repos, containers, and live endpoints need the engine below.

---

## What Is a CBOM?

A **Cryptographic Bill of Materials (CBOM)** is a structured inventory of every cryptographic component used in your software or infrastructure:

| Field | Description |
|-------|-------------|
| `algorithm` | Detected crypto algorithm (e.g. RSA-2048, AES-256-GCM, ML-KEM-768) |
| `key_size` | Key length in bits |
| `library` | Implementing library (e.g. OpenSSL 3.0.8, liboqs 0.10.1) |
| `risk_level` | CRITICAL / HIGH / MEDIUM / LOW |
| `quantum_safe` | Whether the algorithm resists quantum attacks |
| `pqc_status` | `pqc_ready`, `safe`, `migration_required` |
| `location` | Where in the codebase / infra the algorithm was found |
| `bsi_ref` | BSI TR-02102-1 reference (Enterprise edition) |

---

## Option 1 – CLI (fastest, no UI needed)

### Prerequisites

```bash
# macOS
brew install curl jq

# Debian/Ubuntu
apt-get install -y curl jq
```

### Start the backend

```bash
# Clone the repo
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd cryptobom-saas

# Build and start the OSS server
go run ./cmd/server/oss/main.go
# Server listens on http://localhost:8080
```

### Run your first CBOM scan

```bash
# Make the script executable (once)
chmod +x scripts/scan-cbom.sh

# Scan a local repository
./scripts/scan-cbom.sh ./myrepo

# Scan a container image
./scripts/scan-cbom.sh ghcr.io/myorg/myapp:latest --type full

# Scan a live endpoint
./scripts/scan-cbom.sh api.example.com --type compliance --output compliance-cbom.json
```

### Sample output

```
╔══════════════════════════════════════════════════════════════╗
║      CryptoBOM CBOM Scanner – Enterprise MVP beta           ║
╚══════════════════════════════════════════════════════════════╝

  Target    : ./myrepo
  Scan type : cbom
  API URL   : http://localhost:8080/api/v1
  Output    : cbom-report.json

⏳  Checking backend at http://localhost:8080/healthz …
✅  Backend healthy.

🔍  Triggering CBOM scan …
✅  Scan accepted (ID: 3f1a2b4c-…)

⏳  Waiting for scan to complete …
    [ 1/30] status=accepted      progress=0%
    [ 2/30] status=running       progress=40%
    [ 3/30] status=completed     progress=100%

✅  CBOM report written to cbom-report.json

────────────────────────────────────────────────────────────────
  CBOM Summary
  Total components : 12
  At risk          : 3
  Quantum-safe     : 9
────────────────────────────────────────────────────────────────
```

---

## Option 2 – REST API directly

```bash
# 1. Trigger a scan
curl -s -X POST http://localhost:8080/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"target": "./myrepo", "scan_type": "cbom"}' | jq .

# Response:
# {
#   "scan_id": "3f1a2b4c-...",
#   "status": "accepted",
#   "target": "./myrepo",
#   "result_url": "/api/v1/scans/3f1a2b4c-..."
# }

# 2. Poll scan status
curl -s http://localhost:8080/api/v1/scans/3f1a2b4c-... | jq .

# 3. Get the CBOM for a specific asset
curl -s http://localhost:8080/api/v1/assets/<asset-id>/bom | jq .
```

---

## Option 3 – Web UI

1. Start the backend: `go run ./cmd/server/oss/main.go`
2. Start the frontend: `cd web && npm install && npm start`
3. Open **http://localhost:3000/scanner**
4. Enter your scan target and click **Start CBOM Scan**

---

## Scan Types

| Type | What it does |
|------|-------------|
| `cbom` (default) | Full cryptographic inventory – algorithms, libraries, key sizes, quantum readiness |
| `quick` | Fast surface scan – TLS certificates and SSH keys only |
| `full` | Deep scan – includes container layers, SBOM cross-reference, network traffic analysis |
| `compliance` | Maps findings to NIST, BSI TR-02102-1, DORA, eIDAS 2.0 controls |

---

## Understanding Results

### Risk levels

| Level | Meaning |
|-------|---------|
| `CRITICAL` | Actively broken algorithm (e.g. MD5, RC4) – fix immediately |
| `HIGH` | Quantum-vulnerable algorithm (e.g. RSA-2048, ECDSA) – plan migration |
| `MEDIUM` | Weak key size or deprecated parameter – review and update |
| `LOW` | Acceptable for now but monitor for deprecation |

### PQC Status

| Status | Meaning |
|--------|---------|
| `pqc_ready` | Already uses a NIST-approved post-quantum algorithm (ML-KEM, ML-DSA, SLH-DSA) |
| `safe` | Classical algorithm with no known quantum vulnerability within a 10-year horizon |
| `migration_required` | Algorithm is quantum-vulnerable – must be replaced before Q-Day |

---

## Docker Compose (full stack)

```bash
docker compose up -d
./scripts/scan-cbom.sh ./myrepo --url http://localhost:8080/api/v1
```

---

## Enterprise Features

The OSS edition provides core CBOM scanning. The **Enterprise beta** adds:

- 🌐 **Multi-cloud**: AWS CloudHSM, IBM HPCS, GCP KMS – scan keys in managed HSMs
- ⚛️ **Quantum attestation**: IBM Quantum Network–backed risk scoring
- 📋 **Compliance reports**: DORA Article 9, BSI TR-02102-1, eIDAS 2.0
- 🔄 **PQC migration plans**: Prioritised roadmaps with effort estimates and deadlines
- 🔍 **eBPF live scanning**: Real-time network traffic analysis via Cilium

→ [Join the Enterprise Beta](BETA_PROGRAM.md)

---

## Next Steps

- Read the [full API reference](docs/DEPLOYMENT.md)
- Explore [compliance mapping](docs/compliance/)
- Review the [quantum risk model](docs/quantum-attestation.md)
- [Deploy to GCP](deploy/terraform/gcp/) for production
