#!/usr/bin/env bash
#
# RivicQ partner artifact-analysis POC.
#
# Demonstrates the firmware/identity analysis API end to end against the
# committed partner fixtures (Infineon embedded, G+D identity). The engine is
# metadata-only: the server never executes the artifacts and never extracts
# secrets (no private keys, SIM or secure-element secrets).
#
# Usage:
#   ./scripts/poc/partner_artifact_analysis.sh
#   POC_PORT=9101 ./scripts/poc/partner_artifact_analysis.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PORT="${POC_PORT:-9099}"
BASE="http://127.0.0.1:${PORT}/api/v1"

WORK="$(mktemp -d)"
SERVER_LOG="$WORK/server.log"
BIN="$WORK/cryptobom-oss"
PID=""

cleanup() {
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "==> Building OSS server"
go build -o "$BIN" ./cmd/server/oss/

# Run the server from an isolated working directory so a developer's .env does
# not change the POC. Auth is the in-memory store (no database required).
echo "==> Starting server on :$PORT (isolated, in-memory auth)"
(
  cd "$WORK"
  DEMO_MODE=true \
  AUTH_BOOTSTRAP_PASSWORD='Poc-Bootstrap-Passphrase-42!' \
  JWT_SECRET='poc-signing-secret-0123456789abcdef0123456789abcdef' \
  RIVICQ_ENV=development \
  CRYPTOBOM_PORT="$PORT" \
  "$BIN" >"$SERVER_LOG" 2>&1
) &
PID=$!

echo "==> Waiting for /healthz"
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "server exited early:"; cat "$SERVER_LOG"; exit 1
  fi
  sleep 0.5
done

echo "==> Authenticating (demo operator identity)"
TOKEN="$(curl -fsS "$BASE/auth/demo" | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')"
AUTH="Authorization: Bearer $TOKEN"

echo
echo "==> GET /firmware/profiles"
curl -fsS -H "$AUTH" "$BASE/firmware/profiles" | python3 -c '
import sys,json
d=json.load(sys.stdin)
print("  domain:", d["domain"], "| default:", d["default_profile"])
for p in d["profiles"]:
    print("   -", p["id"], "—", p["name"])
'

echo
echo "==> POST /firmware/analyze (Infineon classical MCU firmware)"
curl -fsS -H "$AUTH" \
  -F "file=@fixtures/partners/infineon/classical-mcu/firmware.bin" \
  -F "profile=embedded/infineon" \
  -F "device_lifetime=10y+" \
  "$BASE/firmware/analyze" | python3 -c '
import sys,json
d=json.load(sys.stdin); r=d["report"]; dec=d["decision"]
print("  profile      :", r["profile_id"])
print("  format       :", r["format"], "| size", r["size_bytes"], "| sha256", r["sha256"][:16])
print("  algorithms   :")
for a in r["algorithms"]:
    print("     -", a["algorithm"], "->", a["pqc_status"])
print("  certificates :", len(r["certificates"]))
print("  CBOM items   :", len(r["cbom"]))
print("  PQC readiness:", r["pqc"]["readiness"], "| priority", r["pqc"]["priority"])
print("  DECISION     :", dec["decision"], "(blocked", dec["block_count"], ", warned", dec["warn_count"], ")")
'

echo
echo "==> POST /identity/analyze (G+D RSA-2048 device certificate)"
curl -fsS -H "$AUTH" \
  -F "file=@fixtures/partners/gd/certificate/device-rsa2048.pem" \
  -F "profile=identity/gd" \
  "$BASE/identity/analyze" | python3 -c '
import sys,json
d=json.load(sys.stdin); r=d["report"]; dec=d["decision"]
print("  format       :", r["format"])
for c in r["certificates"]:
    m=c["metadata"]
    print("     cert:", m["subject"][:48], "| pub", m["public_key_algorithm"], "| quantum", c["risk"]["quantum_status"])
print("  identities   :", [i["type"] for i in r["identities"]])
print("  PQC readiness:", r["pqc"]["readiness"])
print("  DECISION     :", dec["decision"])
'

echo
echo "==> POST /firmware/compare (v1 -> v2)"
curl -fsS -H "$AUTH" \
  -F "from=@fixtures/partners/infineon/firmware-diff/v1.bin" \
  -F "to=@fixtures/partners/infineon/firmware-diff/v2.bin" \
  -F "profile=embedded/infineon" \
  "$BASE/firmware/compare" | python3 -c '
import sys,json
d=json.load(sys.stdin)["diff"]
print("  changed:", d["changed"])
print("  algorithms added  :", d["algorithms_added"])
print("  algorithms removed:", d["algorithms_removed"])
'

echo
echo "==> Gate check: an anonymous request must be rejected (deny by default)"
CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/firmware/analyze")"
echo "  anonymous POST /firmware/analyze -> HTTP $CODE (want 401)"

echo
echo "POC complete."
