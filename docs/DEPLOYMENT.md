# Deploying CryptoBOM OSS

This guide covers how to run and deploy the **Open Source Edition** locally
and on a minimal cloud target using Docker Compose.

---

## Contents

1. [Prerequisites](#prerequisites)
2. [Run locally (Go binary)](#run-locally-go-binary)
3. [Run with Docker Compose](#run-with-docker-compose)
4. [Build the container image yourself](#build-the-container-image-yourself)
5. [Kubernetes (minimal)](#kubernetes-minimal)
6. [CI/CD workflows](#cicd-workflows)
7. [Required secrets & variables](#required-secrets--variables)

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Go   | 1.25 (as per `go.mod`) |
| Docker + Compose | v2 |
| (optional) kubectl | 1.24 |

---

## Run locally (Go binary)

```bash
# 1. Clone the repository
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd cryptobom-saas

# 2. Copy the environment template and adjust values
cp .env.example .env

# 3. Download Go dependencies
go mod download

# 4. Build the OSS binary
./build.sh oss

# 5. Run the server
./bin/cryptobom-oss
```

The server starts on **http://localhost:8080** by default.

| Endpoint | Description |
|----------|-------------|
| `GET /healthz` | Health check |
| `GET /api/v1/dashboard/demo` | Demo CBOM data |
| `GET /api/v1/assets` | Cryptographic asset list |

---

## Run with Docker Compose

Docker Compose starts the OSS API server and the React web frontend
without requiring a local Go or Node installation.

```bash
# 1. Clone
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd cryptobom-saas

# 2. Copy env template (edit JWT_SECRET at minimum)
cp .env.example .env

# 3. Start all services
docker compose up -d

# 4. Verify
curl http://localhost:8080/healthz
```

Note: The compose stack now ensures database migrations complete before the API server starts by using a shared migration-status volume. If migrations fail, the `app` container will not start — check the `migrate` container logs for errors.

Services started:

| Service | Port | Description |
|---------|------|-------------|
| `app` | 8080 | OSS API server (Go) |
| `web` | 3000 | React dashboard |
| `scanner` | – | One-shot CBOM scanner example |

Stop everything:

```bash
docker compose down
```

---

## Build the container image yourself

The production-grade Dockerfile lives at `deploy/docker/Dockerfile.oss`.

```bash
docker build -f deploy/docker/Dockerfile.oss -t cryptobom-oss:local .
docker run --rm -p 8080:8080 cryptobom-oss:local
```

Pre-built images are published to the GitHub Container Registry on every
push to `master`:

```
ghcr.io/RivicQ/RivicQ_CSPM_EaaS/cryptobom-oss:latest
```

---

## Kubernetes (minimal)

Minimal manifests are provided under `deploy/oss/k8s/`.

```bash
# Create the namespace
kubectl apply -f deploy/oss/k8s/namespace-oss.yaml

# Deploy the OSS server
kubectl apply -f deploy/oss/k8s/deployment-oss.yaml

# Verify
kubectl get pods -n cryptobom-oss
kubectl port-forward svc/cryptobom-oss-service 8080:8080 -n cryptobom-oss
curl http://localhost:8080/healthz
```

To use a specific image tag, edit `deploy/oss/k8s/deployment-oss.yaml`
and change the `image:` field before applying.

---

## CI/CD workflows

All **deploy** workflows are **manual-only** (`workflow_dispatch`).  They
never run automatically on push so there is no risk of an accidental
production deployment.  CI checks (lint, test, build) still run on every
push and pull request.

| File | Trigger | Purpose | Secrets required |
|------|---------|---------|-----------------|
| `.github/workflows/ci-oss.yml` | Push / PR to `master` or `main`, or manual | Lint, unit tests, build OSS binary, build container image | None (uses `GITHUB_TOKEN`) |
| `.github/workflows/ci-cd.yml` | Push / PR to `master`, `main`, `develop`, or manual | Full CI pipeline (security scan, tests, container build) | None for CI; deploy steps need `KUBE_CONFIG_*` / `IBMQ_API_KEY` |
| `.github/workflows/deploy-oss.yml` | **Manual only** | Publish OSS container image to a configurable OCI registry | Optional – see [Required secrets](#required-secrets--variables) |
| `.github/workflows/deploy-gcp.yml` | **Manual only** | Build and deploy OSS image to GCP / GKE | `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID` |
| `.github/workflows/deploy-enterprise.yml` | **Manual only** | Build and deploy Enterprise image to GCP, AWS, and IBM Cloud | `GCP_*`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `IBM_CLOUD_API_KEY` |
| `.github/workflows/google.yml` | **Manual only** | GKE deploy using Kustomize (template stub) | `WORKLOAD_IDENTITY_PROVIDER` and GKE cluster configured |

### Running the CI workflow manually

1. Go to **Actions → CI – OSS** in the GitHub UI.
2. Click **Run workflow**, choose the branch, then **Run workflow**.

### Running the deploy workflow

1. Go to **Actions → Deploy OSS (manual)** in the GitHub UI.
2. Click **Run workflow**.
3. Fill in:
   - `image_tag` – the version tag to apply (e.g. `v1.2.0`).
   - `registry` – override the target registry (optional; defaults to
     the `REGISTRY` secret or `ghcr.io`).
4. Click **Run workflow** again to start the job.

### SBOM and Security Scans

The CI pipeline now generates an SBOM for built container images (via `syft`) and runs static analysis (CodeQL, `gosec`, `golangci-lint`) and container scanning (`trivy`). SBOM files and SARIF results are uploaded as workflow artifacts for review.

### Deployment Smoke Tests and Automatic Rollback

Staging and production deployments now include comprehensive smoke tests:
- **Health check** (`/healthz` and `/ready` endpoints) with retry logic
- **API endpoints** (`/api/v1/assets`) validation
- **Dashboard accessibility** check
- **Rollout status** verification using `kubectl rollout status`

If any smoke test fails, the deployment automatically rolls back to the previous Helm release revision using `helm rollback`.

**Automatic rollback steps:**
1. Helm detects health check failure
2. Current deployment revision is captured before deploy
3. On any failure, `helm rollback` is triggered
4. Post-rollback verification runs the same smoke tests
5. Slack notification sent (if webhook configured)

### Manual Rollback

For emergencies, rollback can be triggered manually via GitHub Actions or kubectl. See [ROLLBACK_RUNBOOK.md](ROLLBACK_RUNBOOK.md) for detailed procedures.

**Quick rollback via GitHub Actions:**
1. Go to **Actions → Rollback Deployment**
2. Run workflow with target environment (staging/production) and edition (oss/enterprise/both)
3. Optionally specify revision number, or leave blank to rollback to previous
4. Monitor logs and verify smoke tests pass

### Running the GCP deploy workflow

1. Go to **Actions → Deploy to GCP**.
2. Click **Run workflow**.
3. Choose the target `environment` (`production` or `staging`).
4. Ensure `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, and
   `GCP_PROJECT_ID` secrets are configured (see
   [Required secrets](#required-secrets--variables)).

### Running the Enterprise deploy workflow

1. Go to **Actions → Deploy Enterprise (Multi-Cloud)**.
2. Click **Run workflow**.
3. Specify the target `clouds` (e.g. `gcp,aws,ibm`) and `environment`.
4. All cloud credentials must be configured as repository secrets.

---

## Required secrets & variables

Configure these under **Settings → Secrets and variables → Actions**.

### Secrets

#### Full CI/CD pipeline deploy steps (`ci-cd.yml`)

These secrets are only needed when the `deploy-staging` and
`deploy-production` jobs run (they are guarded by branch conditions and
`environment` protection rules):

| Name | Required | Description |
|------|----------|-------------|
| `KUBE_CONFIG_STAGING` | For staging deploy | Base64-encoded kubeconfig for staging cluster |
| `KUBE_CONFIG_PROD` | For production deploy | Base64-encoded kubeconfig for production cluster |
| `IBMQ_API_KEY` | For production deploy | IBM Quantum API key used by the Enterprise server |
| `DATABASE_URL` | For production deploy | Production PostgreSQL connection string used by deploy checks and migrations |
| `JWT_SECRET` | For production deploy | Signed JWT secret used by the API server |

#### OSS deploy (`deploy-oss.yml`)

| Name | Required | Description |
|------|----------|-------------|
| `REGISTRY` | Optional | OCI registry host (default: `ghcr.io`) |
| `REGISTRY_USERNAME` | Optional | Registry login (default: `github.actor` for GHCR) |
| `REGISTRY_PASSWORD` | Optional | Registry password/token (default: `GITHUB_TOKEN` for GHCR) |

> **Note:** For GitHub Container Registry (`ghcr.io`) the built-in
> `GITHUB_TOKEN` is used automatically – no extra secrets are required.
> Only set `REGISTRY_*` secrets when pushing to a different registry
> (Docker Hub, AWS ECR, GCP Artifact Registry, etc.).

#### GCP deploy (`deploy-gcp.yml`, `deploy-enterprise.yml`)

| Name | Required | Description |
|------|----------|-------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Yes | Workload Identity Provider resource name |
| `GCP_SERVICE_ACCOUNT` | Yes | GCP service account email |
| `GCP_PROJECT_ID` | Yes | GCP project ID |

#### AWS deploy (`deploy-enterprise.yml`)

| Name | Required | Description |
|------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |

#### IBM Cloud deploy (`deploy-enterprise.yml`)

| Name | Required | Description |
|------|----------|-------------|
| `IBM_CLOUD_API_KEY` | Yes | IBM Cloud API key |
| `IBM_HPCS_INSTANCE` | Yes | IBM Hyper Protect Crypto Services instance ID |

### Environment variables (`.env` / Docker)

See [`.env.example`](../.env.example) for the full list with descriptions.
Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CRYPTOBOM_PORT` | `8080` | API server listening port |
| `CRYPTOBOM_LOG_LEVEL` | `info` | Log verbosity |
| `DATABASE_URL` | _(empty)_ | PostgreSQL connection URL; leave blank for demo mode |
| `JWT_SECRET` | `change-me-in-production` | **Must** be changed before production use |

Before promoting to production, verify the deploy-time secrets above are present in GitHub Actions and the corresponding cloud secret stores.

### Production Terraform inputs

Copy the matching example file before running `terraform plan` or `terraform apply`:

- [deploy/terraform/gcp/production.tfvars.example](../deploy/terraform/gcp/production.tfvars.example)
- [deploy/terraform/aws/production.tfvars.example](../deploy/terraform/aws/production.tfvars.example)
- [deploy/terraform/ibm/production.tfvars.example](../deploy/terraform/ibm/production.tfvars.example)

### Monitoring and rollback

Production Helm charts now ship Prometheus alert rules for deployment availability and pod restart spikes. Use the rollback workflow in `.github/workflows/rollback.yml` together with `scripts/post_deploy_smoke.sh` when a deployment fails health checks.

---

## Database migrations

SQL migrations live under `deploy/migrations/`.
Apply them manually with `psql` or via your preferred migration tool:

```bash
psql "$DATABASE_URL" -f deploy/migrations/001_initial_schema.sql
```
