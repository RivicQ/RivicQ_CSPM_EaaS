#!/usr/bin/env bash
# RivicQ local development stack: builds + runs backend (:9090) and frontend (:3000).
# Run this in YOUR OWN terminal — the processes stay alive while it runs.
# Usage:
#   ./scripts/dev-stack.sh                 # OSS (Community) backend on :9090 + frontend :3000
#   ./scripts/dev-stack.sh enterprise      # Enterprise backend on :9090 + frontend :3000 (needs license)
#   ./scripts/dev-stack.sh docker          # Full stack via docker compose

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-oss}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

# Kill stale dev servers so the new bundle on :3000 is the only one running.
for pid in $(pgrep -f "react-scripts/scripts/start.js" || true); do
  kill "$pid" 2>/dev/null || true
done

case "$MODE" in
  docker)
    exec docker compose up --build
    ;;
  enterprise|ent)
    make build-enterprise
    export CRYPTOBOM_PORT=9090
    export CRYPTOBOM_LICENSE_KEY="${CRYPTOBOM_LICENSE_KEY:-ENT-dev-local-2026Pitch}"
    export FRONTEND_REDIRECT_URL="http://localhost:3000/platform"
    export FRONTEND_BASE_PATH="/platform"
    export REACT_APP_API_URL="http://localhost:9090/api/v1"
    echo "Starting Enterprise backend on :9090 and frontend on :3000"
    echo "  API:  http://localhost:9090/api/v1  (health: http://localhost:9090/healthz)"
    echo "  UI:   http://localhost:3000/platform/"
    trap 'kill 0' EXIT
    ./bin/cryptobom-enterprise &
    cd web && npm run dev
    ;;
  oss|*)
    make build-oss
    export CRYPTOBOM_PORT=9090
    export FRONTEND_REDIRECT_URL="http://localhost:3000/platform"
    export FRONTEND_BASE_PATH="/platform"
    export REACT_APP_API_URL="http://localhost:9090/api/v1"
    echo "Starting OSS backend on :9090 and frontend on :3000"
    echo "  API:  http://localhost:9090/api/v1  (health: http://localhost:9090/healthz)"
    echo "  UI:   http://localhost:3000/platform/login"
    echo "  Login: admin@rivicq.com / <AUTH_BOOTSTRAP_PASSWORD from .env>"
    trap 'kill 0' EXIT
    ./bin/cryptobom-oss &
    cd web && npm run dev
    ;;
esac