# CryptoBOM SaaS — Enterprise Deployment Guide

> **Target audience:** Platform engineers and DevSecOps teams deploying  
> CryptoBOM SaaS Enterprise in a regulated banking / financial-services environment.

---

## Overview

CryptoBOM SaaS uses **GCP as the primary deployment target**.  
AWS and IBM Cloud are supported as optional integration targets for HSM and storage.

```
┌──────────────────────────────────────────────────────────────┐
│                     GCP Project                              │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   GKE    │  │  Cloud SQL   │  │  Artifact Registry   │   │
│  │ (backend)│  │ (PostgreSQL) │  │  (container images)  │   │
│  └──────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Cloud   │  │  Secret Mgr  │  │     Cloud KMS        │   │
│  │  Armor   │  │ (credentials)│  │  (key management)    │   │
│  │  (WAF)   │  └──────────────┘  └──────────────────────┘   │
│  └──────────┘                                                │
└──────────────────────────────────────────────────────────────┘
           │                    │
    ┌──────┴──────┐    ┌────────┴────────┐
    │  AWS (HSM)  │    │  IBM Cloud HPCS │
    │ CloudHSM v2 │    │  (BYOK / KEEP)  │
    └─────────────┘    └─────────────────┘
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| `gcloud` CLI | 450+ |
| `kubectl` | 1.28+ |
| `terraform` | 1.6+ |
| `psql` | 14+ |
| `docker` | 24+ |
| Go | 1.25+ |
| Node.js | 18+ |

---

## Step 1: Provision GCP Infrastructure (Terraform)

```bash
cd deploy/terraform/gcp/

# Initialise remote state (replace with your bucket)
terraform init \
  -backend-config="bucket=<YOUR_TF_STATE_BUCKET>" \
  -backend-config="prefix=cryptobom/prod"

# Review plan
terraform plan -var-file=environments/prod.tfvars

# Apply
terraform apply -var-file=environments/prod.tfvars
```

Key resources created:
- **VPC** with private subnets for GKE nodes and Cloud SQL
- **GKE Autopilot** cluster with Workload Identity
- **Cloud SQL PostgreSQL 15** with private IP and automated backups
- **Artifact Registry** for container images
- **Cloud Armor WAF** rules (OWASP CRS, custom financial-services rules)
- **Cloud KMS** key ring for CMEK
- **Secret Manager** secrets for DB credentials and API keys

---

## Step 2: Build and Push Container Images

```bash
# Authenticate to Artifact Registry
gcloud auth configure-docker <REGION>-docker.pkg.dev

# Build and push Enterprise image
docker build \
  -f deploy/docker/Dockerfile.enterprise \
  -t <REGION>-docker.pkg.dev/<PROJECT>/cryptobom/cryptobom-enterprise:$(git rev-parse --short HEAD) \
  .

docker push <REGION>-docker.pkg.dev/<PROJECT>/cryptobom/cryptobom-enterprise:$(git rev-parse --short HEAD)
```

Or trigger via GitHub Actions:
```bash
# Push to master → deploy-gcp.yml runs automatically (requires GCP_SA_KEY secret)
git push origin master
```

---

## Step 3: Apply Database Migrations

```bash
# Export DB connection from Secret Manager
export DATABASE_URL=$(gcloud secrets versions access latest \
  --secret="cryptobom-db-url" --project=<PROJECT>)

# Run idempotent migrations
./scripts/migrate.sh prod
# or: make migrate-prod
```

Migration files applied in order:
1. `001_initial_schema.sql` — organizations, users, crypto assets, scan jobs
2. `002_enterprise_features.sql` — HSM keys, quantum scans, compliance mappings
3. `003_multi_cloud_orchestration.sql` — cloud accounts, compliance runs, attestations

---

## Step 4: Deploy to Kubernetes

```bash
gcloud container clusters get-credentials cryptobom-prod \
  --region=<REGION> --project=<PROJECT>

# Apply all manifests
kubectl apply -f deploy/kubernetes/

# Verify rollout
kubectl rollout status deployment/cryptobom-enterprise -n cryptobom
kubectl get pods -n cryptobom
```

**Required Kubernetes secrets** (create before deploying):
```bash
kubectl create secret generic cryptobom-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
  --from-literal=EDITION="enterprise" \
  -n cryptobom
```

---

## Step 5: Optional — IBM Cloud HPCS Integration

```bash
# Set IBM credentials as Kubernetes secrets
kubectl create secret generic ibm-hpcs-credentials \
  --from-literal=IBM_API_KEY="<IBM_API_KEY>" \
  --from-literal=IBM_HPCS_INSTANCE_ID="<INSTANCE_ID>" \
  --from-literal=IBM_HPCS_ENDPOINT="<ENDPOINT>" \
  -n cryptobom

# Provision IBM infrastructure (optional)
cd deploy/terraform/ibm/
terraform init && terraform apply -var-file=environments/prod.tfvars
```

---

## Step 6: Optional — AWS CloudHSM Integration

```bash
# Set AWS credentials as Kubernetes secrets
kubectl create secret generic aws-cloudhsm-credentials \
  --from-literal=AWS_ACCESS_KEY_ID="<KEY_ID>" \
  --from-literal=AWS_SECRET_ACCESS_KEY="<SECRET>" \
  --from-literal=AWS_REGION="<REGION>" \
  --from-literal=AWS_CLOUDHSM_CLUSTER_ID="<CLUSTER_ID>" \
  -n cryptobom

# Provision AWS infrastructure (optional)
cd deploy/terraform/aws/
terraform init && terraform apply -var-file=environments/prod.tfvars
```

---

## Day-2 Operations

### Scaling

```bash
# Scale manually
kubectl scale deployment cryptobom-enterprise --replicas=4 -n cryptobom

# HPA is pre-configured (min 2 / max 10 replicas, CPU >70%)
kubectl get hpa -n cryptobom
```

### Key Rotation

```bash
# Rotate Cloud KMS key version
gcloud kms keys versions create \
  --key=cryptobom-key \
  --keyring=cryptobom-keyring \
  --location=<REGION>

# Trigger HSM key rotation via API
curl -X POST https://<CRYPTOBOM_HOST>/api/v1/hsm/rotate \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"provider": "ibm_hpcs", "key_id": "<KEY_ID>"}'
```

### Backups

Cloud SQL automated backups run daily at 03:00 UTC (configurable in Terraform).  
To restore:
```bash
gcloud sql backups restore <BACKUP_ID> \
  --restore-instance=cryptobom-postgres \
  --backup-instance=cryptobom-postgres
```

### Monitoring

- **Cloud Monitoring** dashboards are provisioned by Terraform.
- Key alerts: Pod restart count > 3, DB connection pool exhaustion, API p99 > 2 s.
- Logs are structured JSON; use `jsonPayload.level="error"` filter in Cloud Logging.

---

## GitHub Pages Frontend

The React SPA is deployed to GitHub Pages automatically on every push to `master`:

```
https://rivic-q.github.io/cryptobom-saas/
```

To build locally:
```bash
cd web
REACT_APP_EDITION=enterprise npm run build
```

---

## Security Hardening Checklist

- [x] TLS 1.2+ enforced at Cloud Armor / Ingress layer
- [x] Non-root container user (UID 65534)
- [x] Read-only root filesystem
- [x] Resource limits on all containers
- [x] NetworkPolicy: deny-all default, allow only required paths
- [x] PodDisruptionBudget: minAvailable=1
- [x] RBAC: least-privilege ServiceAccount per deployment
- [x] Secrets via Secret Manager (never in plain ConfigMaps)
- [x] Image signing with Cosign (CI pipeline)
- [x] SBOM generated on each release (Syft → CycloneDX)
- [x] Dependency review on every PR (GitHub Advanced Security)
- [x] CodeQL static analysis on every push

---

## Known Limitations

| Area | Status |
|------|--------|
| Quantum attestation | **Detection + roadmap only** — not a certified PQC audit |
| IBM HPCS / AWS CloudHSM | Requires customer-supplied credentials; not bundled |
| Multi-region HA | Beta — single-region active/passive today |
| Helm charts | Beta — tested on GKE Autopilot; YMMV on other distributions |
| FIPS 140-3 | Go standard library is not FIPS 140-3 validated by default; use a FIPS-enabled Go toolchain in air-gapped environments |

---

## Support

- Issues: https://github.com/rivic-q/cryptobom-saas/issues
- Security disclosures: see `SECURITY.md`
- Commercial support: contact RivicQ
