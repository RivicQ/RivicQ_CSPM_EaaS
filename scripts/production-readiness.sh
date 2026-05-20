#!/usr/bin/env bash
# =============================================================================
# production-readiness.sh – CryptoBOM production bootstrap checks
#
# Verifies the minimum production requirements before deployment:
#   - required secrets/environment variables are present
#   - API health endpoint responds
#   - CBOM scanner can create and poll a scan
#   - benchmark baseline artifacts exist for CI regression gating
# =============================================================================
set -euo pipefail

API_URL="${API_URL:-http://localhost:8080/api/v1}"
STRICT="false"
CHECK_SCANNER="true"

REQUIRED_VARS=(
  DATABASE_URL
  JWT_SECRET
  KUBE_CONFIG_STAGING
  KUBE_CONFIG_PROD
  IBMQ_API_KEY
  GCP_WORKLOAD_IDENTITY_PROVIDER
  GCP_SERVICE_ACCOUNT
  GCP_PROJECT_ID
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  IBM_CLOUD_API_KEY
  IBM_HPCS_INSTANCE
)

usage() {
  cat <<'EOF'
Usage: ./scripts/production-readiness.sh [--api-url URL] [--no-scanner] [--strict]

Options:
  --api-url URL   API base URL to validate (default: http://localhost:8080/api/v1)
  --no-scanner    Skip the CBOM scan trigger/poll check
  --strict        Fail if any non-critical check is missing
  -h, --help      Show help
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

ok() {
  echo "✅ $*"
}

warn() {
  echo "⚠️  $*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

check_required_vars() {
  local missing=()
  for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      missing+=("$var")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    printf 'Missing required production variables:\n' >&2
    printf '  - %s\n' "${missing[@]}" >&2
    [[ "$STRICT" == "true" ]] && return 1
    warn "continuing because strict mode is off"
  else
    ok "required production variables are present"
  fi
}

check_health() {
  local health_url="${API_URL%/api/v1}/healthz"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 "$health_url" || true)
  [[ "$code" == "200" ]] || die "health check failed for $health_url (HTTP $code)"
  ok "health check passed: $health_url"
}

check_scanner() {
  [[ "$CHECK_SCANNER" == "true" ]] || return 0

  local payload scan_id scan_status
  payload='{"target":"production-readiness-check","scan_type":"cbom"}'
  scan_id=$(curl -s -X POST "$API_URL/scans" -H 'Content-Type: application/json' -d "$payload" | jq -r '.scan_id // .scanId // empty')
  [[ -n "$scan_id" ]] || die "scanner check did not return a scan id"

  scan_status=$(curl -s "$API_URL/scans/$scan_id" | jq -r '.status // empty')
  [[ -n "$scan_status" ]] || die "scanner status lookup failed for scan $scan_id"

  ok "scanner check passed: $scan_id ($scan_status)"
}

check_benchmark_assets() {
  [[ -f scripts/compare_benchmarks.py ]] || die "missing scripts/compare_benchmarks.py"
  [[ -f tests/benchmark-baseline.json ]] || die "missing tests/benchmark-baseline.json"
  ok "benchmark regression assets are present"
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --api-url)
        API_URL="${2:-}"; shift 2 ;;
      --no-scanner)
        CHECK_SCANNER="false"; shift ;;
      --strict)
        STRICT="true"; shift ;;
      -h|--help)
        usage; exit 0 ;;
      *)
        die "unknown option: $1" ;;
    esac
  done

  require_cmd curl
  require_cmd jq

  echo "CryptoBOM production readiness checks"
  echo "API URL: $API_URL"

  check_required_vars
  check_benchmark_assets
  check_health
  check_scanner

  ok "production readiness bootstrap completed"
}

main "$@"
