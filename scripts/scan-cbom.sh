#!/usr/bin/env bash
# =============================================================================
# scan-cbom.sh – CryptoBOM headleap CBOM scan CLI
#
# Usage:
#   ./scripts/scan-cbom.sh [OPTIONS] <target>
#
# Arguments:
#   <target>        Required. What to scan:
#                   - A local repository path:  ./myrepo
#                   - A container image:        ghcr.io/org/image:tag
#                   - A hostname / endpoint:    api.example.com
#
# Options:
#   -t, --type      Scan type: cbom (default), quick, full, compliance
#   -o, --output    Output file path (default: cbom-report.json)
#   -u, --url       CryptoBOM API base URL (default: http://localhost:8080/api/v1)
#   -h, --help      Show this help message
#
# Examples:
#   # Scan a local repo and write report to cbom.json
#   ./scripts/scan-cbom.sh ./myrepo -o cbom.json
#
#   # Scan a container image with a full scan
#   ./scripts/scan-cbom.sh ghcr.io/myorg/myapp:latest --type full
#
#   # Point at a remote CryptoBOM instance
#   ./scripts/scan-cbom.sh api.example.com --url https://cbom.mycompany.com/api/v1
# =============================================================================
set -euo pipefail

API_URL="http://localhost:8080/api/v1"
SCAN_TYPE="cbom"
OUTPUT_FILE="cbom-report.json"
TARGET=""

usage() {
  sed -n '/^# Usage:/,/^# ==/p' "$0" | sed 's/^# //' | sed 's/^#//'
  exit 0
}

die() { echo "ERROR: $*" >&2; exit 1; }

# ── Parse arguments ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)    usage ;;
    -t|--type)    SCAN_TYPE="$2"; shift 2 ;;
    -o|--output)  OUTPUT_FILE="$2"; shift 2 ;;
    -u|--url)     API_URL="$2"; shift 2 ;;
    -*)           die "Unknown option: $1" ;;
    *)
      [[ -z "$TARGET" ]] || die "Multiple targets specified."
      TARGET="$1"; shift ;;
  esac
done

[[ -n "$TARGET" ]] || die "No scan target specified. Run with --help for usage."

# ── Check dependencies ───────────────────────────────────────────────────────
for cmd in curl jq; do
  command -v "$cmd" >/dev/null 2>&1 || die "'$cmd' is required but not found. Please install it."
done

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      CryptoBOM CBOM Scanner – Enterprise MVP beta           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Target    : $TARGET"
echo "  Scan type : $SCAN_TYPE"
echo "  API URL   : $API_URL"
echo "  Output    : $OUTPUT_FILE"
echo ""

# ── Health check ─────────────────────────────────────────────────────────────
HEALTH_URL="${API_URL%/api/v1}/healthz"
echo "⏳  Checking backend at $HEALTH_URL …"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$HEALTH_URL" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "⚠️  Backend not reachable (HTTP $HTTP_CODE). Falling back to demo mode."
  echo "    To start the backend: go run ./cmd/server/oss/main.go"
  echo ""
  # Write a minimal demo report so the script still produces output
  cat > "$OUTPUT_FILE" <<EOF
{
  "demo_mode": true,
  "target": "$TARGET",
  "scan_type": "$SCAN_TYPE",
  "message": "Backend not running – this is a sample CBOM report.",
  "components": [
    {"algorithm": "RSA-2048",   "key_size": 2048, "quantum_safe": false, "risk_level": "HIGH",   "pqc_status": "migration_required"},
    {"algorithm": "AES-256-GCM","key_size": 256,  "quantum_safe": true,  "risk_level": "LOW",    "pqc_status": "safe"},
    {"algorithm": "ML-KEM-768", "key_size": 768,  "quantum_safe": true,  "risk_level": "LOW",    "pqc_status": "pqc_ready"}
  ],
  "summary": {"total": 3, "quantum_safe": 2, "at_risk": 1, "pqc_ready": 1}
}
EOF
  echo "✅  Demo CBOM report written to $OUTPUT_FILE"
  exit 0
fi
echo "✅  Backend healthy."
echo ""

# ── Trigger scan ─────────────────────────────────────────────────────────────
echo "🔍  Triggering CBOM scan …"
SCAN_RESP=$(curl -s -X POST "$API_URL/scans" \
  -H "Content-Type: application/json" \
  -d "{\"target\": \"$TARGET\", \"scan_type\": \"$SCAN_TYPE\"}")

SCAN_ID=$(echo "$SCAN_RESP" | jq -r '.scan_id // empty')
[[ -n "$SCAN_ID" ]] || die "Failed to start scan. Response: $SCAN_RESP"
echo "✅  Scan accepted (ID: $SCAN_ID)"
echo ""

# ── Poll for completion ───────────────────────────────────────────────────────
echo "⏳  Waiting for scan to complete …"
MAX_POLLS=30
POLL_INTERVAL=3
for ((i=1; i<=MAX_POLLS; i++)); do
  STATUS_RESP=$(curl -s "$API_URL/scans/$SCAN_ID")
  STATUS=$(echo "$STATUS_RESP" | jq -r '.status // "unknown"')
  PROGRESS=$(echo "$STATUS_RESP" | jq -r '.progress // 0')
  printf "    [%2d/%d] status=%-12s progress=%d%%\n" "$i" "$MAX_POLLS" "$STATUS" "$PROGRESS"
  if [[ "$STATUS" == "completed" ]]; then
    echo ""
    break
  fi
  if [[ "$STATUS" == "failed" ]]; then
    die "Scan failed. Check backend logs."
  fi
  sleep "$POLL_INTERVAL"
done

# ── Fetch BOM for target asset (if scan returns an asset_id) ─────────────────
ASSET_ID=$(echo "$STATUS_RESP" | jq -r '.asset_id // empty')
BOM_RESP="$STATUS_RESP"
if [[ -n "$ASSET_ID" ]]; then
  echo "📦  Fetching CBOM for asset $ASSET_ID …"
  BOM_RESP=$(curl -s "$API_URL/assets/$ASSET_ID/bom")
fi

# ── Write report ─────────────────────────────────────────────────────────────
echo "$BOM_RESP" | jq '.' > "$OUTPUT_FILE"
echo "✅  CBOM report written to $OUTPUT_FILE"
echo ""

# ── Print summary ─────────────────────────────────────────────────────────────
TOTAL=$(echo "$BOM_RESP" | jq -r '.summary.total // (.findings.total // "?")' 2>/dev/null || echo "?")
AT_RISK=$(echo "$BOM_RESP" | jq -r '.summary.at_risk // (.findings.critical // "?")' 2>/dev/null || echo "?")
QS=$(echo "$BOM_RESP" | jq -r '.summary.quantum_safe // "?"' 2>/dev/null || echo "?")

echo "────────────────────────────────────────────────────────────────"
echo "  CBOM Summary"
echo "  Total components : $TOTAL"
echo "  At risk          : $AT_RISK"
echo "  Quantum-safe     : $QS"
echo "────────────────────────────────────────────────────────────────"
echo ""
echo "🔗  Full report: $OUTPUT_FILE"
echo "🌐  For more details, open the CryptoBOM dashboard:"
echo "    http://localhost:3000/scanner"
echo ""
echo "📣  Want enterprise features (multi-cloud, quantum attestation, compliance reports)?"
echo "    Join the beta: https://github.com/rivic-q/cryptobom-saas/discussions"
