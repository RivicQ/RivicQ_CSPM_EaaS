#!/usr/bin/env bash
# ============================================================
# CryptoBOM SaaS — Multi-Cloud Enterprise Deployment Script
#
# Orchestrates deployment across GCP (primary), AWS (CloudHSM),
# and IBM Cloud (HPCS / Quantum attestation).
#
# Usage:
#   ./deploy/scripts/deploy-multicloud.sh [OPTIONS]
#
# Options:
#   --env             production|staging          (default: production)
#   --clouds          gcp,aws,ibm                 (default: gcp,aws,ibm)
#   --image-tag       <tag>                        (default: git SHA)
#   --terraform       Apply Terraform changes      (flag, default: off)
#   --migrate         Run database migrations      (flag, default: off)
#   --dry-run         Print commands only          (flag, default: off)
#
# Required environment variables:
#   GCP_PROJECT_ID                GCP project ID
#   GCP_REGION                    GCP region (default: europe-west3)
#   GCP_WORKLOAD_IDENTITY_PROVIDER Workload Identity Provider resource name
#   GCP_SERVICE_ACCOUNT           GCP service account email
#   AWS_ACCESS_KEY_ID             AWS access key
#   AWS_SECRET_ACCESS_KEY         AWS secret key
#   AWS_REGION                    AWS region (default: eu-central-1)
#   IBM_CLOUD_API_KEY             IBM Cloud API key
#   IBM_REGION                    IBM Cloud region (default: eu-de)
#   IBM_HPCS_INSTANCE             IBM HPCS instance ID
#
# Compliance: BSI TR-02102-1, DORA Article 9, FIPS 140-3
# ============================================================

set -euo pipefail

# ── Defaults ───────────────────────────────────────────────
ENV="${DEPLOY_ENV:-production}"
CLOUDS="${DEPLOY_CLOUDS:-gcp,aws,ibm}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
DO_TERRAFORM=false
DO_MIGRATE=false
DRY_RUN=false
GCP_REGION="${GCP_REGION:-europe-west3}"
AWS_REGION="${AWS_REGION:-eu-central-1}"
IBM_REGION="${IBM_REGION:-eu-de}"
GKE_CLUSTER="cryptobom-${ENV}"
K8S_NAMESPACE="cryptobom-system"

# ── Argument parsing ───────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)          ENV="$2"; shift 2 ;;
    --clouds)       CLOUDS="$2"; shift 2 ;;
    --image-tag)    IMAGE_TAG="$2"; shift 2 ;;
    --terraform)    DO_TERRAFORM=true; shift ;;
    --migrate)      DO_MIGRATE=true; shift ;;
    --dry-run)      DRY_RUN=true; shift ;;
    -h|--help)      grep '^#' "$0" | sed 's/^# \?//'; exit 0 ;;
    *)              echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── Utilities ──────────────────────────────────────────────
log()  { echo "[$(date -u +%FT%TZ)] [INFO]  $*"; }
warn() { echo "[$(date -u +%FT%TZ)] [WARN]  $*" >&2; }
err()  { echo "[$(date -u +%FT%TZ)] [ERROR] $*" >&2; exit 1; }

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

require_cmd() {
  command -v "$1" &>/dev/null || err "Required command not found: $1"
}

# ── Prerequisites check ────────────────────────────────────
log "Checking prerequisites..."
require_cmd kubectl
require_cmd helm
[[ "$CLOUDS" == *"gcp"* ]] && require_cmd gcloud
[[ "$CLOUDS" == *"aws"* ]] && require_cmd aws
[[ "$CLOUDS" == *"ibm"* ]] && require_cmd ibmcloud
$DO_TERRAFORM && require_cmd terraform

log "Deployment parameters:"
log "  Environment : $ENV"
log "  Clouds      : $CLOUDS"
log "  Image tag   : $IMAGE_TAG"
log "  Terraform   : $DO_TERRAFORM"
log "  Migrations  : $DO_MIGRATE"
log "  Dry run     : $DRY_RUN"

# ── Terraform (optional) ───────────────────────────────────
apply_terraform() {
  local provider="$1"
  local dir="deploy/terraform/${provider}"
  log "Running Terraform for ${provider}..."
  run terraform -chdir="$dir" init -input=false
  run terraform -chdir="$dir" plan -input=false -out="${provider}.tfplan"
  run terraform -chdir="$dir" apply -input=false -auto-approve "${provider}.tfplan"
  rm -f "${dir}/${provider}.tfplan"
}

if $DO_TERRAFORM; then
  [[ "$CLOUDS" == *"gcp"* ]] && apply_terraform "gcp"
  [[ "$CLOUDS" == *"aws"* ]] && apply_terraform "aws"
  [[ "$CLOUDS" == *"ibm"* ]] && apply_terraform "ibm"
fi

# ── Database migrations ────────────────────────────────────
run_migrations() {
  local db_url="$1"
  log "Running database migrations..."
  for f in deploy/migrations/*.sql; do
    log "  Applying migration: $(basename "$f")"
    run psql "$db_url" -f "$f" -v ON_ERROR_STOP=1
  done
}

if $DO_MIGRATE; then
  DB_URL="${DATABASE_URL:-}"
  [[ -z "$DB_URL" ]] && err "DATABASE_URL must be set when --migrate is used"
  run_migrations "$DB_URL"
fi

# ── GCP / GKE deployment ───────────────────────────────────
deploy_gcp() {
  log "=== Deploying to GCP (GKE: ${GKE_CLUSTER}, region: ${GCP_REGION}) ==="

  local required_vars=(GCP_PROJECT_ID GCP_SERVICE_ACCOUNT GCP_WORKLOAD_IDENTITY_PROVIDER)
  for v in "${required_vars[@]}"; do
    [[ -z "${!v:-}" ]] && err "Required variable not set: $v"
  done

  local registry="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/cryptobom"
  local image="${registry}/cryptobom-enterprise:${IMAGE_TAG}"

  log "Authenticating to GCP..."
  run gcloud auth activate-service-account \
      --key-file="${GCP_KEY_FILE:-}" 2>/dev/null || \
  log "Using Workload Identity (no key file)"

  log "Configuring kubectl for GKE..."
  run gcloud container clusters get-credentials "$GKE_CLUSTER" \
      --region "$GCP_REGION" \
      --project "$GCP_PROJECT_ID"

  log "Applying Kubernetes namespaces and config..."
  run kubectl apply -f deploy/kubernetes/namespace.yaml
  run kubectl apply -f deploy/kubernetes/configmap.yaml
  run kubectl apply -f deploy/kubernetes/networkpolicy.yaml

  log "Deploying enterprise image: ${image}"
  if kubectl get deployment cryptobom-server -n "$K8S_NAMESPACE" &>/dev/null; then
    run kubectl set image deployment/cryptobom-server \
        cryptobom="${image}" \
        -n "$K8S_NAMESPACE"
  else
    run kubectl apply -f deploy/kubernetes/deployment.yaml -n "$K8S_NAMESPACE"
    run kubectl set image deployment/cryptobom-server \
        cryptobom="${image}" \
        -n "$K8S_NAMESPACE"
  fi

  run kubectl apply -f deploy/kubernetes/service.yaml  -n "$K8S_NAMESPACE"
  run kubectl apply -f deploy/kubernetes/hpa.yaml      -n "$K8S_NAMESPACE"
  run kubectl apply -f deploy/kubernetes/ingress.yaml  -n "$K8S_NAMESPACE"

  log "Setting IBM Cloud and AWS secrets on GCP deployment..."
  run kubectl set env deployment/cryptobom-server \
      CRYPTOBOM_EDITION=enterprise \
      IBM_CLOUD_API_KEY="${IBM_CLOUD_API_KEY:-}" \
      IBM_HPCS_INSTANCE="${IBM_HPCS_INSTANCE:-}" \
      IBM_REGION="${IBM_REGION}" \
      AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}" \
      AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}" \
      AWS_REGION="${AWS_REGION}" \
      -n "$K8S_NAMESPACE"

  log "Waiting for GKE rollout..."
  run kubectl rollout status deployment/cryptobom-server \
      -n "$K8S_NAMESPACE" --timeout=15m

  log "GCP deployment complete ✓"
}

# ── AWS CloudHSM / EKS validation ─────────────────────────
deploy_aws() {
  log "=== Validating AWS CloudHSM (region: ${AWS_REGION}) ==="

  local required_vars=(AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY)
  for v in "${required_vars[@]}"; do
    [[ -z "${!v:-}" ]] && err "Required variable not set: $v"
  done

  log "Verifying AWS credentials..."
  run aws sts get-caller-identity --region "$AWS_REGION" \
      --query 'Account' --output text

  CLUSTER_ID="${AWS_CLOUDHSM_CLUSTER_ID:-}"
  if [[ -n "$CLUSTER_ID" ]]; then
    log "Checking CloudHSM cluster ${CLUSTER_ID}..."
    run aws cloudhsmv2 describe-clusters \
        --filters clusterIds="$CLUSTER_ID" \
        --region "$AWS_REGION" \
        --query 'Clusters[0].State' --output text
  else
    warn "AWS_CLOUDHSM_CLUSTER_ID not set — skipping HSM health check"
  fi

  log "Checking KMS master key..."
  KMS_KEY_ARN="${AWS_KMS_KEY_ARN:-}"
  if [[ -n "$KMS_KEY_ARN" ]]; then
    run aws kms describe-key --key-id "$KMS_KEY_ARN" \
        --region "$AWS_REGION" \
        --query 'KeyMetadata.KeyState' --output text
  else
    warn "AWS_KMS_KEY_ARN not set — skipping KMS key check"
  fi

  log "AWS CloudHSM validation complete ✓"
}

# ── IBM Cloud / HPCS + Quantum validation ─────────────────
deploy_ibm() {
  log "=== Validating IBM Cloud (HPCS + Quantum, region: ${IBM_REGION}) ==="

  [[ -z "${IBM_CLOUD_API_KEY:-}" ]] && err "IBM_CLOUD_API_KEY must be set"

  log "Authenticating to IBM Cloud..."
  run ibmcloud login --apikey "${IBM_CLOUD_API_KEY}" -r "$IBM_REGION" -q

  if [[ -n "${IBM_HPCS_INSTANCE:-}" ]]; then
    log "Verifying HPCS instance ${IBM_HPCS_INSTANCE}..."
    run ibmcloud resource service-instance "$IBM_HPCS_INSTANCE" --output json \
        | grep -q '"state": "active"' \
        && log "HPCS instance is active ✓" \
        || warn "HPCS instance may not be active — check manually"
  else
    warn "IBM_HPCS_INSTANCE not set — skipping HPCS verification"
  fi

  log "Applying IBM enterprise Kubernetes manifests..."
  run kubectl apply -f deploy/enterprise/k8s/namespace-enterprise.yaml
  run kubectl apply -f deploy/enterprise/k8s/deployment-enterprise.yaml

  log "IBM Cloud deployment complete ✓"
}

# ── Run selected cloud deployments ────────────────────────
[[ "$CLOUDS" == *"gcp"* ]] && deploy_gcp
[[ "$CLOUDS" == *"aws"* ]] && deploy_aws
[[ "$CLOUDS" == *"ibm"* ]] && deploy_ibm

log "============================================"
log "Multi-cloud deployment finished successfully"
log "Environment : ${ENV}"
log "Image tag   : ${IMAGE_TAG}"
log "Clouds      : ${CLOUDS}"
log "============================================"
