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
git clone https://github.com/rivic-q/cryptobom-saas.git
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
git clone https://github.com/rivic-q/cryptobom-saas.git
cd cryptobom-saas

# 2. Copy env template (edit JWT_SECRET at minimum)
cp .env.example .env

# 3. Start all services
docker compose up -d

# 4. Verify
curl http://localhost:8080/healthz
```

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
ghcr.io/rivic-q/cryptobom-saas/cryptobom-oss:latest
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

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/ci-oss.yml` | Push / PR to `master` or `main` | Lint, test, build binary, build & push container image |
| `.github/workflows/deploy-oss.yml` | **Manual** (`workflow_dispatch`) | Publish OSS container image to a configurable registry |

### Running the deploy workflow

1. Go to **Actions → Deploy OSS (manual)** in the GitHub UI.
2. Click **Run workflow**.
3. Fill in:
   - `image_tag` – the version tag to apply (e.g. `v1.2.0`).
   - `registry` – override the target registry (optional; defaults to
     the `REGISTRY` secret or `ghcr.io`).
4. Click **Run workflow** again to start the job.

---

## Required secrets & variables

Configure these under **Settings → Secrets and variables → Actions**.

### Secrets

| Name | Required | Description |
|------|----------|-------------|
| `REGISTRY` | Optional | OCI registry host (default: `ghcr.io`) |
| `REGISTRY_USERNAME` | Optional | Registry login (default: `github.actor` for GHCR) |
| `REGISTRY_PASSWORD` | Optional | Registry password/token (default: `GITHUB_TOKEN` for GHCR) |

> **Note:** For GitHub Container Registry (`ghcr.io`) the built-in
> `GITHUB_TOKEN` is used automatically – no extra secrets are required.
> Only set `REGISTRY_*` secrets when pushing to a different registry
> (Docker Hub, AWS ECR, GCP Artifact Registry, etc.).

### Environment variables (`.env` / Docker)

See [`.env.example`](../.env.example) for the full list with descriptions.
Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CRYPTOBOM_PORT` | `8080` | API server listening port |
| `CRYPTOBOM_LOG_LEVEL` | `info` | Log verbosity |
| `DATABASE_URL` | _(empty)_ | PostgreSQL connection URL; leave blank for demo mode |
| `JWT_SECRET` | `change-me-in-production` | **Must** be changed before production use |

---

## Database migrations

SQL migrations live under `deploy/migrations/`.
Apply them manually with `psql` or via your preferred migration tool:

```bash
psql "$DATABASE_URL" -f deploy/migrations/001_initial_schema.sql
```
