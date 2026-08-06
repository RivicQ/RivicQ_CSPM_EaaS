# CryptoBOM SaaS – Demo Environment Guide

**Audience:** Sales engineers, solutions architects, and team members preparing a live demo for bank CISOs, compliance officers, or enterprise security leadership.

---

## 1. Recommended Environment: Local Docker Compose

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Local Docker Compose** | No cloud credentials; starts in <5 min; fully isolated; identical every time; no external network dependencies | Not GCP-hosted; demo URL is `localhost` | ✅ **Recommended for live demos** |
| GCP Staging (GKE) | Cloud URL; closer to production topology | Requires active GCP project, Workload Identity config, and $50–100/month GKE cluster | Use for customer POC or post-demo follow-up |
| GCP Production | True enterprise scale, WAF, Cloud Armor | Full cloud credentials needed; cost; riskier to demo live | For signed contracts / pilot deployments |

**Why Local Docker Compose for demos:**

* Single command start (`make dev`) — zero cloud accounts or secrets required.
* Deterministic: every demo presenter gets exactly the same environment.
* Completely air-gapped: no customer data ever leaves the demo machine.
* Includes a live *intentionally-vulnerable lab* (`make demo`) to show real-time cryptographic weakness discovery — the most compelling part of the demo.
* The same Docker images run in GCP production — what you demo is what you ship.

---

## 2. Prerequisites

| Tool | Minimum version | Install |
|---|---|---|
| Docker Desktop (or Docker Engine + Compose v2) | Docker 24+, Compose 2.20+ | https://docs.docker.com/get-docker/ |
| Go | 1.22+ | https://go.dev/doc/install |
| `make` | any | Included on macOS/Linux; `choco install make` on Windows |
| Node.js *(optional — only for frontend hot-reload)* | 18+ | https://nodejs.org |

Verify:

```bash
docker --version        # Docker version 24.x
docker compose version  # Docker Compose version v2.x
go version              # go1.22+
make --version          # GNU Make 4.x
```

---

## 3. Quick Start (5 minutes)

```bash
# 1. Clone
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd cryptobom-saas

# 2. Start full stack  (PostgreSQL → migrations → backend → frontend)
make dev
```

`make dev` automatically:
- Copies `.env.example` → `.env` (demo-safe defaults, no secrets required).
- Pulls/builds all container images.
- Starts PostgreSQL, applies DB migrations, starts the API server and React UI.

Once you see `cryptobom-saas | Listening on :8080` in the logs, the stack is ready.

| Service | URL | Description |
|---|---|---|
| React Dashboard | http://localhost:3000 | Full enterprise UI |
| Backend API | http://localhost:8080 | REST API |
| Health check | http://localhost:8080/healthz | Liveness probe |
| Demo CBOM | http://localhost:8080/api/v1/dashboard/demo | Sample dashboard data |
| PostgreSQL | localhost:5432 | Database (internal only) |

---

## 4. End-to-End Demo Script (10-minute CISO walk-through)

### Step A – Live Infrastructure Scan (the "wow" moment)

Run this in a separate terminal before the meeting starts:

```bash
make demo-lab    # starts 6 intentionally-vulnerable local services
```

During the demo:

```bash
make demo-scan   # runs the weak-crypto discovery scanner
```

**What the CISO sees:** A color-coded table of real cryptographic weaknesses (TLS 1.0, RC4, DSA keys, MD5 hashes) detected in seconds, each mapped to BSI TR-02102, DORA, and eIDAS 2.0 article references.

```
SEVERITY     TARGET                                 PROTOCOL  FINDING                          COMPLIANCE REF
🔴 CRITICAL  NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)  tls       TLS 1.0 Detected                 BSI TR-02102-2 §3.2 / DORA Art. 9(2)
🔴 CRITICAL  NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)  tls       RC4 Cipher Suite Detected        BSI TR-02102-2 §3.3.1 / eIDAS ETSI 119312
🔴 CRITICAL  SSH Weak KEX + DSA Host Key            ssh       DSA Host Key Detected            BSI TR-02102-4 §3.4 / DORA Art. 9(2)
🟠 HIGH      NGINX TLS 1.2 (No Forward Secrecy)    tls       No Forward Secrecy               BSI TR-02102-2 §3.3
🟡 MEDIUM    MD5 API (port 5001)                   http      MD5 Hash Usage Detected          BSI TR-02102-1 §3.3 / DORA Art. 9(2)

📊 Scanned 6 targets → 12 findings  (CRITICAL: 4  HIGH: 3  MEDIUM: 3  LOW: 2)
⚛  Quantum-unsafe assets: 12
📄 Full report: cbom-findings.json
```

Then open the UI:

```
http://localhost:3000/demo/infrastructure
```

Click **Run Live Scan** to replay the scan live in the browser.

---

### Step B – CBOM Dashboard Walk-through

Open http://localhost:3000 and walk through:

1. **Dashboard** — live metrics: total assets, quantum-risk score, compliance posture.
2. **Assets** → drill into any asset → see full Cryptographic Bill of Materials tree.
3. **Compliance** → NIST PQC migration readiness, DORA ICT risk status, BSI TR-02102 gap analysis.
4. **Quantum Risk** → per-asset quantum vulnerability score with migration pathway.
5. **Settings** → show RBAC roles (Admin / Operator / Analyst / Viewer) and multi-tenant config.

---

### Step C – API / Integration Demo (optional, for technical audience)

```bash
# Health
curl http://localhost:8080/healthz

# List crypto assets
curl -s http://localhost:8080/api/v1/assets | jq '.data[0]'

# Trigger a CBOM scan
curl -s -X POST http://localhost:8080/api/v1/cbom/scan \
     -H "Content-Type: application/json" \
     -d '{"target":"localhost","protocol":"tls","port":4431}' | jq .

# View compliance report
curl -s http://localhost:8080/api/v1/dashboard/demo | jq '.complianceScore'
```

---

### Step D – Stop & Clean up

```bash
make docker-down   # stop the main stack (preserves DB volume)
make demo-stop     # stop the vulnerable lab containers
# Full reset (removes all data):
docker compose down -v && make demo-clean
```

---

## 5. GCP Staging / Production (post-demo follow-up)

Use these for a customer **Proof of Concept** or pilot after the initial demo.

### Secrets required

| GitHub Secret | Description |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider resource name |
| `GCP_SERVICE_ACCOUNT` | Service account email with roles/container.developer + roles/container.clusterViewer |

### One-time infrastructure provisioning

```bash
cd deploy/terraform/gcp
terraform init
terraform apply -var="project_id=<GCP_PROJECT_ID>" -var="region=europe-west3"
```

### Deploy to GCP GKE (GitHub Actions – manual trigger)

```
GitHub → Actions → "Deploy to GCP" → Run workflow → branch: master
```

This builds and pushes the container to Artifact Registry, applies DB migrations, and rolls out the Kubernetes deployment.

### Deploy to GCP GKE (CLI)

```bash
gcloud container clusters get-credentials cryptobom-cluster --region europe-west3
kubectl apply -f deploy/kubernetes/
kubectl rollout status deployment/cryptobom -n cryptobom-production
```

### Helm (enterprise)

```bash
helm upgrade --install cryptobom-enterprise ./deploy/helm/cryptobom-enterprise \
  --namespace cryptobom-production \
  --set image.tag=$(git rev-parse --short HEAD) \
  --set replicaCount=2
```

---

## 6. Security Posture (CISO Summary)

### Local Demo Environment

| Control | Status |
|---|---|
| **Data isolation** | ✅ All data stays on the presenter's machine; no external network calls |
| **Authentication** | ✅ JWT tokens, 4-role RBAC (Admin/Operator/Analyst/Viewer) |
| **Input validation** | ✅ Server-side validation, SQL injection prevention, XSS/CSP headers |
| **Secrets** | ✅ Demo uses only placeholder values; no real credentials in `.env.example` |
| **Container images** | ✅ Trivy-scanned on every CI run; minimal Alpine-based images |
| **Network** | ✅ All services communicate on an isolated Docker bridge network (`cryptobom-net`); no ports exposed beyond localhost |
| **Compliance scanning** | ✅ Findings mapped to BSI TR-02102, DORA Art. 9, eIDAS 2.0, NIST PQC, FIPS 140-3 |

### GCP Production Environment (additional controls)

| Control | Status |
|---|---|
| **TLS** | ✅ HTTPS enforced via GKE Ingress + managed certificates |
| **WAF** | ✅ Google Cloud Armor (OWASP CRS, rate limiting, geo-blocking) |
| **Secrets management** | ✅ GCP Secret Manager; no secrets in environment variables or K8s YAML |
| **HSM / KMS** | ✅ Cloud KMS for key encryption; IBM HPCS / AWS CloudHSM integrations available |
| **Network policies** | ✅ K8s NetworkPolicies restrict pod-to-pod communication |
| **Pod security** | ✅ Non-root user, read-only root filesystem, resource limits on all pods |
| **Audit logging** | ✅ GCP Cloud Audit Logs + structured application logs with correlation IDs |
| **Observability** | ✅ Prometheus metrics, Jaeger distributed tracing, Grafana dashboards |
| **SAST / SCA** | ✅ CodeQL, gosec, Trivy, and dependency review run on every PR |
| **SBOM** | ✅ CycloneDX SBOM generated and attested on every release |
| **Compliance standards** | ✅ SOC 2 Type II controls mapped; ISO 27001 annex A controls documented |

### Key security note for demos

> **The intentionally-vulnerable lab services** (`make demo-lab`) are confined to Docker containers on the local machine and listen only on `localhost`. They are designed to demonstrate real cryptographic weaknesses in a safe, controlled environment — they are not exposed to the network and do not affect the host OS.

---

## 7. Environment Comparison Cheat Sheet

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ENVIRONMENT      LOCAL DEMO        GCP STAGING        GCP PRODUCTION   │
├─────────────────────────────────────────────────────────────────────────┤
│  Setup time       ~5 min            ~30 min            ~2 hours          │
│  Cloud costs      $0                ~$50–100/month     ~$200–500/month   │
│  Cloud creds      None              GCP SA + WIF       All cloud creds   │
│  Demo URL         localhost:3000    https://staging.…  https://app.…     │
│  TLS              No (HTTP)         Yes (managed cert) Yes               │
│  WAF              No                Optional           Yes (Cloud Armor) │
│  HSM              No                Optional           Yes               │
│  Multi-tenant     Yes (RBAC)        Yes                Yes               │
│  Persistence      Docker volume     Cloud SQL          Cloud SQL HA      │
│  Best for         CISO live demo    Customer POC       Signed contract   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `docker compose` not found | Upgrade Docker Desktop ≥ 4.20 or install the `docker-compose-plugin` |
| Port 3000 already in use | `lsof -i :3000` → kill the conflicting process, or change `web` port in `docker-compose.yml` |
| Port 8080 already in use | Set `CRYPTOBOM_PORT=8081` in `.env` |
| `make demo-lab` fails (cert generation) | Ensure `openssl` is installed: `brew install openssl` (macOS) / `apt install openssl` (Linux) |
| Frontend shows "Cannot connect to API" | Verify backend is running: `curl http://localhost:8080/healthz` |
| DB migrations fail on restart | Run `docker compose down -v && make dev` to reset the volume |
| `go: module lookup disabled` | Run `go env -w GONOSUMCHECK=*` or ensure corporate proxy allows `sum.golang.org` |

---

## 9. References

- [`README.md`](README.md) — Project overview and feature list.
- [`COMMANDS.md`](COMMANDS.md) — Full command reference.
- [`demo/README.md`](demo/README.md) — Infrastructure discovery demo details.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Full deployment guide (local → GCP → IBM).
- [`ENTERPRISE_DEPLOYMENT.md`](ENTERPRISE_DEPLOYMENT.md) — Enterprise multi-cloud deployment.
- [`EDITION_COMPARISON.md`](EDITION_COMPARISON.md) — OSS vs. Enterprise feature matrix.
- [`docs/compliance/`](docs/compliance/) — SOC 2, ISO 27001, DORA, BSI mappings.
- [`SECURITY.md`](SECURITY.md) — Vulnerability reporting policy.
