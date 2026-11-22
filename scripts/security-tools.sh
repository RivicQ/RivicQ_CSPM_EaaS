#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REPORT_DIR="${REPORT_DIR:-reports/security}"
STRICT="${SECURITY_TOOLS_STRICT:-0}"
MODE="${1:-all}"
mkdir -p "$REPORT_DIR"
FAILED=0

TOOLS=(helm kubectl terraform gosec govulncheck trivy syft grype gitleaks osv-scanner cosign semgrep checkov)

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

run_tool() {
  local tool="$1"
  shift
  if ! have_cmd "$tool"; then
    printf 'SKIP  %-14s not installed\n' "$tool"
    return 0
  fi
  printf 'RUN   %-14s\n' "$tool"
  if "$@"; then
    printf 'OK    %-14s\n' "$tool"
  else
    local code=$?
    printf 'WARN  %-14s exit %d\n' "$tool" "$code"
    FAILED=1
  fi
}

check_tools() {
  local tool missing=0
  for tool in "${TOOLS[@]}"; do
    if have_cmd "$tool"; then
      printf 'OK    %-14s %s\n' "$tool" "$(command -v "$tool")"
    else
      printf 'MISS  %-14s not installed\n' "$tool"
      missing=1
    fi
  done
  if [ "$STRICT" = "1" ] && [ "$missing" -ne 0 ]; then
    FAILED=1
  fi
}

sast_gosec() {
  gosec -quiet -fmt=json -out="$REPORT_DIR/gosec.json" -exclude-dir=web -exclude-dir=revenueos ./...
}

sast_govulncheck() {
  govulncheck ./... > "$REPORT_DIR/govulncheck.txt" 2>&1
}

sast_semgrep() {
  semgrep scan --config p/ci --metrics off --quiet --json --output "$REPORT_DIR/semgrep.json" --exclude node_modules --exclude .git
}

sca_syft() {
  syft dir:. --exclude 'web/node_modules/**' --exclude 'revenueos/node_modules/**' -q -o "cyclonedx-json=$REPORT_DIR/sbom.cdx.json"
}

sca_grype() {
  if [ ! -s "$REPORT_DIR/sbom.cdx.json" ]; then
    printf 'SKIP  %-14s syft SBOM unavailable\n' grype
    return 0
  fi
  grype "sbom:$REPORT_DIR/sbom.cdx.json" -o json > "$REPORT_DIR/grype.json"
}

sca_trivy() {
  trivy fs --scanners vuln,secret,misconfig --skip-dirs web/node_modules,revenueos/node_modules,.git --exit-code 0 -f json -o "$REPORT_DIR/trivy-fs.json" .
}

sca_osv() {
  osv-scanner scan source --format json --output-file "$REPORT_DIR/osv.json" .
}

secrets_gitleaks() {
  gitleaks detect --source . --no-git --no-banner --redact=100 -f json -r "$REPORT_DIR/gitleaks.json" --exit-code 0
}

iac_checkov() {
  checkov -d deploy/terraform -d deploy/helm -d deploy/kubernetes --output json > "$REPORT_DIR/checkov.json"
}

iac_helm() {
  local chart
  for chart in deploy/helm/cryptobom-oss deploy/helm/cryptobom-saas deploy/helm/cryptobom-enterprise; do
    [ -d "$chart" ] || continue
    helm lint "$chart" || return 1
  done
}

iac_terraform() {
  local dir
  for dir in deploy/terraform/aws deploy/terraform/gcp deploy/terraform/ibm; do
    [ -d "$dir" ] || continue
    (cd "$dir" && terraform fmt -check -recursive && terraform init -backend=false -input=false >/dev/null && terraform validate) || return 1
  done
}

iac_kubectl() {
  if [ -z "${KUBECONFIG:-}" ] && [ ! -f /var/run/secrets/kubernetes.io/serviceaccount/token ]; then
    printf 'SKIP  %-14s no cluster context\n' kubectl
    return 0
  fi
  local chart
  for chart in deploy/helm/cryptobom-oss deploy/helm/cryptobom-saas deploy/helm/cryptobom-enterprise; do
    [ -d "$chart" ] || continue
    helm template "$chart" | kubectl apply --dry-run=client -f - >/dev/null || return 1
  done
}

image_cosign() {
  if [ -z "${IMAGE_REF:-}" ] || [ -z "${COSIGN_VERIFY_ARGS:-}" ]; then
    printf 'SKIP  %-14s set IMAGE_REF and COSIGN_VERIFY_ARGS\n' cosign
    return 0
  fi
  cosign verify $COSIGN_VERIFY_ARGS "$IMAGE_REF"
}

run_sast() {
  run_tool gosec sast_gosec
  run_tool govulncheck sast_govulncheck
  run_tool semgrep sast_semgrep
}

run_sca() {
  run_tool syft sca_syft
  run_tool grype sca_grype
  run_tool trivy sca_trivy
  run_tool osv-scanner sca_osv
}

run_secrets() {
  run_tool gitleaks secrets_gitleaks
}

run_iac() {
  run_tool terraform iac_terraform
  run_tool helm iac_helm
  run_tool kubectl iac_kubectl
  run_tool checkov iac_checkov
}

case "$MODE" in
  check)
    check_tools
    ;;
  sast)
    run_sast
    ;;
  sca)
    run_sca
    ;;
  secrets)
    run_secrets
    ;;
  iac)
    run_iac
    ;;
  all)
    check_tools
    run_sast
    run_sca
    run_secrets
    run_iac
    run_tool cosign image_cosign
    ;;
  *)
    printf 'usage: %s {check|sast|sca|secrets|iac|all}\n' "$0" >&2
    exit 2
    ;;
esac

printf 'Reports: %s\n' "$REPORT_DIR"
if [ "$STRICT" = "1" ] && [ "$FAILED" -ne 0 ]; then
  exit 1
fi
