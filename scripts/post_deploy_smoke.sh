#!/usr/bin/env bash
# =============================================================================
# post_deploy_smoke.sh – Simple post-deploy smoke and rollback helper
# =============================================================================
set -euo pipefail

SERVICE_URL="${SERVICE_URL:-http://localhost:8080}"
API_URL="${API_URL:-${SERVICE_URL%/}/api/v1}"
PREVIOUS_IMAGE_TAG="${PREVIOUS_IMAGE_TAG:-}"

usage() {
  cat <<'EOF'
Usage: ./scripts/post_deploy_smoke.sh [--service-url URL] [--api-url URL]

Checks:
  - /healthz and /readyz
  - /api/v1/metrics/overview
  - /api/v1/scans round-trip

Environment:
  PREVIOUS_IMAGE_TAG   Optional rollback target printed on completion
EOF
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }
}

check() {
  local url="$1"
  curl -fsS "$url" >/dev/null
}

scan_check() {
  local scan_id
  scan_id=$(curl -fsS -X POST "$API_URL/scans" -H 'Content-Type: application/json' -d '{"target":"post-deploy-smoke","scan_type":"cbom"}' | jq -r '.scan_id // .scanId // empty')
  [[ -n "$scan_id" ]]
  curl -fsS "$API_URL/scans/$scan_id" >/dev/null
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --service-url) SERVICE_URL="$2"; shift 2 ;;
      --api-url) API_URL="$2"; shift 2 ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done

  require_cmd curl
  require_cmd jq

  check "$SERVICE_URL/healthz"
  check "$SERVICE_URL/readyz"
  check "$API_URL/metrics/overview"
  scan_check

  echo "Smoke check passed for $SERVICE_URL"
  if [[ -n "$PREVIOUS_IMAGE_TAG" ]]; then
    echo "Rollback target: $PREVIOUS_IMAGE_TAG"
    echo "Rollback example: kubectl rollout undo deployment/<name> --to-revision=<previous>"
  fi
}

main "$@"