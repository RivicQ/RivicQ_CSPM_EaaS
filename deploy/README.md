# CryptoBOM — Deployment Guide

This guide covers deploying CryptoBOM to GKE (Google Kubernetes Engine) using the Terraform infrastructure and Kubernetes manifests in this repository.

## Prerequisites

- `gcloud` CLI authenticated and configured
- `kubectl` configured for the target GKE cluster
- `helm` >= 3.x (for Helm-based deployments)
- Terraform >= 1.6.0 (for infrastructure provisioning)

## 1. Provision Infrastructure (Terraform)

```bash
# Authenticate to GCP
gcloud auth application-default login

# Initialize and apply GCP infrastructure (production example)
terraform -chdir=deploy/terraform/gcp init \
  -backend-config=environments/prod.backend.hcl

terraform -chdir=deploy/terraform/gcp apply \
  -var-file=environments/prod.tfvars \
  -var="ibm_quantum_api_key=$IBM_QUANTUM_API_KEY" \
  -var="stripe_secret_key=$STRIPE_SECRET_KEY" \
  -var="stripe_webhook_secret=$STRIPE_WEBHOOK_SECRET"
```

See [`deploy/terraform/gcp/README.md`](terraform/gcp/README.md) for full variable reference.

## 2. Get GKE Credentials

```bash
export GKE_CLUSTER=$(terraform -chdir=deploy/terraform/gcp output -raw gke_cluster_name)
export GCP_REGION=europe-west3
export GCP_PROJECT=cryptobom-prod  # your project ID

gcloud container clusters get-credentials "$GKE_CLUSTER" \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT"
```

## 3. Create Kubernetes Secrets

Populate secrets before applying manifests. The `deploy/kubernetes/secret-template.yaml` shows the required keys.

```bash
kubectl create namespace cryptobom-system --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic cryptobom-secrets \
  --namespace cryptobom-system \
  --from-literal=JWT_SECRET="$(gcloud secrets versions access latest \
      --secret=cryptobom-jwt-secret-production)" \
  --from-literal=DB_PASSWORD="$(gcloud secrets versions access latest \
      --secret=cryptobom-db-password-production)" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## 4. Apply Kubernetes Manifests

```bash
kubectl apply -f deploy/kubernetes/namespace.yaml
kubectl apply -f deploy/kubernetes/configmap.yaml
kubectl apply -f deploy/kubernetes/secret-template.yaml   # populated above
kubectl apply -f deploy/kubernetes/deployment.yaml
kubectl apply -f deploy/kubernetes/service.yaml
kubectl apply -f deploy/kubernetes/ingress.yaml
kubectl apply -f deploy/kubernetes/hpa.yaml
kubectl apply -f deploy/kubernetes/pdb.yaml
kubectl apply -f deploy/kubernetes/networkpolicy.yaml
```

Or apply the whole directory at once:

```bash
kubectl apply -f deploy/kubernetes/
```

## 5. Run Database Migrations

```bash
# Port-forward Cloud SQL via proxy or run from a migration job
kubectl run migration --image=postgres:15 --restart=Never \
  --env="PGPASSWORD=$DB_PASSWORD" \
  -- psql -h "$DB_HOST" -U cryptobom_app -d cryptobom \
     -f /migrations/001_initial_schema.sql

# Clean up
kubectl delete pod migration
```

See [`deploy/migrations/`](migrations/) for all migration files.

## 6. Verify Deployment

```bash
kubectl -n cryptobom-system get pods
kubectl -n cryptobom-system get svc
kubectl -n cryptobom-system get ingress

# Health check
curl https://<your-domain>/healthz
```

## Helm Deployment (Alternative)

```bash
helm upgrade --install cryptobom deploy/helm/cryptobom-saas \
  --namespace cryptobom-system \
  --create-namespace \
  --values deploy/helm/cryptobom-saas/values.yaml \
  --set image.tag=<version>
```

## CI/CD

The `.github/workflows/deploy-gcp.yml` workflow automates build, push to Artifact Registry, and `kubectl apply` on push to `main`/`master`.

Required GitHub secrets:
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_PROJECT_ID`

## Cross-Cloud Integrations

| Integration | Module | Docs |
|---|---|---|
| AWS CloudHSM | `deploy/terraform/aws/` | [`deploy/terraform/aws/README.md`](terraform/aws/README.md) |
| IBM HPCS / Key Protect | `deploy/terraform/ibm/` | [`docs/ibm-integration.md`](../docs/ibm-integration.md) |
| Quantum Attestation | — | [`docs/quantum-attestation.md`](../docs/quantum-attestation.md) |
| Compliance Controls | — | [`docs/compliance/`](../docs/compliance/) |
