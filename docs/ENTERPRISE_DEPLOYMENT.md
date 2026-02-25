# CryptoBOM SaaS — Enterprise Multi-Cloud Deployment Guide

This document covers the **complete production deployment** of CryptoBOM Enterprise
across GCP (primary), AWS (CloudHSM), and IBM Cloud (HPCS + Quantum attestation).

---

## Contents

1. [Architecture overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [GCP deployment (primary)](#gcp-deployment-primary)
4. [AWS CloudHSM integration](#aws-cloudhsm-integration)
5. [IBM Cloud HPCS + Quantum attestation](#ibm-cloud-hpcs--quantum-attestation)
6. [Multi-cloud orchestration script](#multi-cloud-orchestration-script)
7. [Database migrations](#database-migrations)
8. [GitHub Actions CI/CD](#github-actions-cicd)
9. [Required secrets & variables](#required-secrets--variables)
10. [Compliance and security posture](#compliance-and-security-posture)

---

## Architecture overview

```
                          ┌─────────────────────────┐
                          │   GCP (europe-west3)    │  Primary cloud
                          │  GKE + Cloud SQL + KMS  │
                          │  Cloud Armor WAF        │
                          │  Artifact Registry      │
                          └────────────┬────────────┘
                                       │ mTLS / VPC peering
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
  ┌───────────▼───────────┐            │           ┌────────────▼───────────┐
  │  AWS (eu-central-1)   │            │           │ IBM Cloud (eu-de)      │
  │  CloudHSM FIPS 140-3  │            │           │ HPCS FIPS 140-3 L4    │
  │  KMS master key       │            │           │ Key Protect backup KMS │
  │  CloudTrail audit     │            │           │ IBM Quantum attestation│
  └───────────────────────┘            │           └────────────────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │  PostgreSQL 15 (GCP)    │
                          │  Cloud SQL — CMEK/HSM   │
                          └─────────────────────────┘
```

**Deployment model:**
- GCP is the **primary workload** (GKE, application, database, caching)
- AWS CloudHSM provides **FIPS 140-3 Level 3** key material for the GCP workload
- IBM HPCS provides **FIPS 140-3 Level 4** key custody with quantum-safe attestation

---

## Prerequisites

| Tool         | Minimum version | Purpose                   |
|--------------|-----------------|---------------------------|
| Terraform    | 1.6             | Infrastructure provisioning|
| gcloud CLI   | 450+            | GCP authentication & GKE  |
| kubectl      | 1.28+           | Kubernetes management     |
| helm         | 3.13+           | Chart deployments         |
| aws CLI      | 2.x             | AWS CloudHSM / KMS        |
| ibmcloud CLI | 2.x             | IBM Cloud HPCS / IKS      |
| psql         | 15+             | Database migrations       |
| bash         | 4+              | Deployment script         |

---

## GCP deployment (primary)

### 1. Provision GCP infrastructure with Terraform

```bash
cd deploy/terraform/gcp

# Initialise (with GCS backend)
terraform init \
  -backend-config="bucket=cryptobom-terraform-state-eu" \
  -backend-config="prefix=cryptobom/gcp/terraform.tfstate"

# Review the plan
terraform plan \
  -var="gcp_project_id=YOUR_PROJECT_ID" \
  -var="environment=production" \
  -out=gcp.tfplan

# Apply
terraform apply gcp.tfplan
```

**Provisioned resources:**
- VPC with private GKE and Cloud SQL subnets, Cloud NAT
- GKE cluster (private nodes, Workload Identity, Binary Authorization)
- Enterprise node pool (n2-standard-4, autoscaling 2–10)
- Cloud SQL PostgreSQL 15 (HA, CMEK/HSM, TLS 1.3 only)
- Memorystore Redis 7 (HA, TLS)
- Cloud KMS key ring: DB encryption key, JWT signing key (RSA-4096 HSM), PQC key
- Artifact Registry repository for container images
- Cloud Armor WAF (OWASP Top 10, DDoS adaptive protection, rate limiting)
- Secret Manager secrets (IBM Quantum API key, IBM Cloud key, etc.)

### 2. Build and push the Enterprise container image

```bash
GCP_REGION="europe-west3"
GCP_PROJECT_ID="YOUR_PROJECT_ID"
IMAGE_TAG="$(git rev-parse --short HEAD)"
REGISTRY="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/cryptobom"

gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev

docker build -f deploy/docker/Dockerfile.enterprise \
  -t "${REGISTRY}/cryptobom-enterprise:${IMAGE_TAG}" \
  -t "${REGISTRY}/cryptobom-enterprise:latest" .

docker push "${REGISTRY}/cryptobom-enterprise:${IMAGE_TAG}"
docker push "${REGISTRY}/cryptobom-enterprise:latest"
```

### 3. Deploy to GKE

```bash
gcloud container clusters get-credentials cryptobom-production \
  --region europe-west3 \
  --project YOUR_PROJECT_ID

kubectl apply -f deploy/kubernetes/namespace.yaml
kubectl apply -f deploy/kubernetes/configmap.yaml
kubectl apply -f deploy/kubernetes/networkpolicy.yaml
kubectl apply -f deploy/kubernetes/deployment.yaml -n cryptobom-system

kubectl set image deployment/cryptobom-server \
  cryptobom="${REGISTRY}/cryptobom-enterprise:${IMAGE_TAG}" \
  -n cryptobom-system

kubectl apply -f deploy/kubernetes/service.yaml  -n cryptobom-system
kubectl apply -f deploy/kubernetes/hpa.yaml      -n cryptobom-system
kubectl apply -f deploy/kubernetes/ingress.yaml  -n cryptobom-system

kubectl rollout status deployment/cryptobom-server \
  -n cryptobom-system --timeout=15m
```

---

## AWS CloudHSM integration

### 1. Provision AWS infrastructure

```bash
cd deploy/terraform/aws

terraform init
terraform plan \
  -var="aws_region=eu-central-1" \
  -var="environment=production" \
  -out=aws.tfplan

terraform apply aws.tfplan
```

**Provisioned resources:**
- VPC with private subnets across two AZs
- CloudHSM v2 cluster (FIPS 140-3 Level 3) with one HSM
- KMS master key (SYMMETRIC, 30-day deletion window, annual rotation)
- RDS PostgreSQL 15 (encrypted with KMS master key)
- S3 artifacts bucket (KMS-encrypted, versioning enabled)
- CloudTrail (multi-region audit log, KMS-encrypted)

### 2. Configure the application to use CloudHSM

Set these environment variables on the GKE deployment:

```bash
kubectl set env deployment/cryptobom-server \
  AWS_ACCESS_KEY_ID="<key-id>" \
  AWS_SECRET_ACCESS_KEY="<secret>" \
  AWS_REGION="eu-central-1" \
  AWS_CLOUDHSM_CLUSTER_ID="<cluster-id>" \
  AWS_KMS_KEY_ARN="<kms-key-arn>" \
  -n cryptobom-system
```

---

## IBM Cloud HPCS + Quantum attestation

### 1. Provision IBM Cloud infrastructure

```bash
cd deploy/terraform/ibm

terraform init
terraform plan \
  -var="ibm_region=eu-de" \
  -var="environment=production" \
  -out=ibm.tfplan

# NOTE: IBM provider requires IBMCLOUD_API_KEY env var
export IBMCLOUD_API_KEY="your-ibm-api-key"
terraform apply ibm.tfplan
```

**Provisioned resources:**
- IBM Hyper Protect Crypto Services (FIPS 140-3 Level 4)
- IBM Cloud Object Storage with HPCS-managed encryption
- IBM Key Protect backup KMS

### 2. IBM Quantum attestation

The enterprise server automatically invokes IBM Quantum attestation when
`IBMQ_ENABLED=true`. The service (`internal/quantum/ibm_quantum.go`) calls
`https://api.quantum-computing.ibm.com` to:

- Attest algorithm quantum-safety scores
- Retrieve PQC migration recommendations
- Return signed attestation reports stored in `quantum_scans` table

### 3. Apply the enterprise Kubernetes manifests for IBM credentials

```bash
# Edit the secret with your actual Base64-encoded API key first
kubectl apply -f deploy/enterprise/k8s/namespace-enterprise.yaml
kubectl apply -f deploy/enterprise/k8s/ibmq-secret.yaml
kubectl apply -f deploy/enterprise/k8s/deployment-enterprise.yaml
```

---

## Multi-cloud orchestration script

The `deploy/scripts/deploy-multicloud.sh` script orchestrates all three clouds
in a single command:

```bash
# Full production deployment (GCP + AWS validation + IBM)
export GCP_PROJECT_ID="my-project"
export GCP_SERVICE_ACCOUNT="cryptobom-deploy@my-project.iam.gserviceaccount.com"
export GCP_WORKLOAD_IDENTITY_PROVIDER="projects/123/locations/global/workloadIdentityPools/..."
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="secret..."
export IBM_CLOUD_API_KEY="ibm-api-key"
export IBM_HPCS_INSTANCE="hpcs-instance-id"

./deploy/scripts/deploy-multicloud.sh \
  --env production \
  --clouds gcp,aws,ibm \
  --image-tag "$(git rev-parse --short HEAD)"
```

**Optional flags:**

| Flag          | Description                                      |
|---------------|--------------------------------------------------|
| `--terraform` | Run `terraform apply` before deploying           |
| `--migrate`   | Run all SQL migrations (requires `DATABASE_URL`) |
| `--dry-run`   | Print all commands without executing them        |

---

## Database migrations

Apply migrations in order against the Cloud SQL (GCP) or RDS (AWS) instance:

```bash
# GCP Cloud SQL via Cloud SQL Auth Proxy
cloud-sql-proxy YOUR_PROJECT_ID:europe-west3:cryptobom-production-pg15 &
export DATABASE_URL="postgresql://cryptobom_app:PASSWORD@127.0.0.1:5432/cryptobom"

psql "$DATABASE_URL" -f deploy/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f deploy/migrations/002_enterprise_features.sql
psql "$DATABASE_URL" -f deploy/migrations/003_multi_cloud_orchestration.sql
```

**Migration summary:**

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Core tables: organizations, users, assets, scan_jobs, bom_reports |
| `002_enterprise_features.sql` | HSM keys, quantum scans, cloud connections, compliance reports, audit events |
| `003_multi_cloud_orchestration.sql` | Cloud health snapshots, HSM rotation schedules, PQC migration progress, deployment events |

---

## GitHub Actions CI/CD

All deploy workflows are **manual-only** (no accidental production deploys).

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `deploy-enterprise.yml` | Manual | Build + deploy Enterprise to GCP, AWS, IBM |
| `deploy-gcp.yml` | Manual | Build + deploy OSS/Enterprise to GKE |

### Running the enterprise deployment via Actions

1. Go to **Actions → Deploy Enterprise (Multi-Cloud)**
2. Click **Run workflow**
3. Set `clouds` (e.g. `gcp,aws,ibm`) and `environment` (`production`)
4. Ensure all required secrets are configured (see below)

---

## Required secrets & variables

Configure under **Settings → Secrets and variables → Actions**.

### GCP

| Secret | Description |
|--------|-------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name |
| `GCP_SERVICE_ACCOUNT` | Deployer service account email |
| `GCP_PROJECT_ID` | GCP project ID |

### AWS

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |

### IBM Cloud

| Secret | Description |
|--------|-------------|
| `IBM_CLOUD_API_KEY` | IBM Cloud API key |
| `IBM_HPCS_INSTANCE` | IBM HPCS instance GUID |

---

## Compliance and security posture

| Standard | Status | Implementation |
|----------|--------|----------------|
| FIPS 140-3 L3 | ✅ | AWS CloudHSM cluster |
| FIPS 140-3 L4 | ✅ | IBM HPCS |
| FIPS 140-3 L2 | ✅ | GCP Cloud KMS (HSM protection level) |
| BSI TR-02102-1 | ✅ | PQC scanner + NIST standard mapping |
| DORA Article 9 | ✅ | Audit events, compliance reports |
| eIDAS 2.0 | ✅ | Attestation reports, quantum-safe signatures |
| NIST PQC (FIPS 203/204/205) | ✅ | ML-KEM-768, ML-DSA-65, SLH-DSA algorithms |
| OWASP Top 10 | ✅ | Cloud Armor WAF (GCP) |

### Key security controls

- **Encryption at rest**: Cloud SQL (CMEK via GCP KMS HSM), S3 (KMS), IBM COS (HPCS)
- **Encryption in transit**: TLS 1.3 minimum enforced at all layers
- **Key rotation**: 90-day automatic rotation on all KMS/HPCS keys
- **Network isolation**: Private GKE nodes, VPC-native networking, Cloud NAT
- **Access control**: Workload Identity Federation (GCP), IAM roles least-privilege
- **Audit logging**: CloudTrail (AWS), Cloud Audit Logs (GCP), audit_events table
- **DDoS protection**: Cloud Armor adaptive protection (GCP)
- **Container security**: Binary Authorization, Shielded Nodes, read-only root FS
