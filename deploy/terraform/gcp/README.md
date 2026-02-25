# CryptoBOM GCP Terraform Module

Provisions the full CryptoBOM SaaS platform on Google Cloud Platform (europe-west3 / Frankfurt primary, BSI/DORA jurisdiction).

## Resources

| Resource | Description |
|---|---|
| `google_compute_network` | Private VPC with flow logs |
| `google_compute_subnetwork` | GKE subnet with secondary ranges for pods/services |
| `google_container_cluster` | Private GKE cluster (Standard, STABLE channel) |
| `google_container_node_pool` | Enterprise (n2-standard-4) and OSS (e2-standard-2) node pools |
| `google_sql_database_instance` | Cloud SQL PostgreSQL 15, CMEK-encrypted, private IP |
| `google_kms_key_ring` / `google_kms_crypto_key` | HSM-backed keys for DB encryption, JWT signing, PQC placeholder |
| `google_redis_instance` | Memorystore Redis (HA in production) |
| `google_secret_manager_secret` | Application secrets |
| `google_service_account` | Node SA + App SA with Workload Identity |

## Prerequisites

- Terraform >= 1.6.0
- `gcloud` CLI authenticated (`gcloud auth application-default login`)
- GCP project with the following APIs enabled:
  - `container.googleapis.com`
  - `sqladmin.googleapis.com`
  - `servicenetworking.googleapis.com`
  - `cloudkms.googleapis.com`
  - `secretmanager.googleapis.com`
  - `redis.googleapis.com`
- GCS bucket for Terraform state (see `environments/*.backend.hcl`)

## Usage

### Initialize for an environment

```bash
# Production
terraform -chdir=deploy/terraform/gcp init \
  -backend-config=environments/prod.backend.hcl

# Staging
terraform -chdir=deploy/terraform/gcp init \
  -backend-config=environments/staging.backend.hcl

# Dev
terraform -chdir=deploy/terraform/gcp init \
  -backend-config=environments/dev.backend.hcl
```

### Plan and apply

```bash
# Review changes
terraform -chdir=deploy/terraform/gcp plan \
  -var-file=environments/prod.tfvars \
  -var="ibm_quantum_api_key=$IBM_QUANTUM_API_KEY" \
  -var="stripe_secret_key=$STRIPE_SECRET_KEY"

# Apply (production requires explicit approval)
terraform -chdir=deploy/terraform/gcp apply \
  -var-file=environments/prod.tfvars
```

## Required Variables

| Variable | Description | Sensitive |
|---|---|---|
| `gcp_project_id` | GCP Project ID | No |
| `environment` | `staging` or `production` | No |
| `ibm_quantum_api_key` | IBM Quantum Network API key | **Yes** |
| `ibm_cloud_api_key` | IBM Cloud API key | **Yes** |
| `slack_webhook_url` | Slack webhook for alerts | **Yes** |
| `stripe_secret_key` | Stripe API secret | **Yes** |
| `stripe_webhook_secret` | Stripe webhook secret | **Yes** |

Sensitive variables should be passed via environment variables (`TF_VAR_*`) or a secrets manager — **never committed to source control**.

## Environments

| Environment | tfvars | Backend |
|---|---|---|
| Dev | `environments/dev.tfvars` | `environments/dev.backend.hcl` |
| Staging | `environments/staging.tfvars` | `environments/staging.backend.hcl` |
| Production | `environments/prod.tfvars` | `environments/prod.backend.hcl` |

## Outputs

| Output | Description |
|---|---|
| `gke_cluster_name` | GKE cluster name |
| `gke_cluster_endpoint` | GKE API endpoint (sensitive) |
| `cloudsql_connection_name` | Cloud SQL connection name for Cloud SQL Proxy |
| `cloudsql_private_ip` | Cloud SQL private IP (sensitive) |
| `redis_host` | Memorystore host (sensitive) |
| `kms_keyring_id` | KMS key ring ID |
| `app_service_account_email` | Application service account email |

## CI Validation

Terraform fmt/validate/plan runs automatically via `.github/workflows/terraform.yml` on every PR.
