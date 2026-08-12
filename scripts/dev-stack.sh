#!/usr/bin/env bash
# Local development stack: PostgreSQL (optional), backend, frontend.
# Usage:
#   ./scripts/dev-stack.sh              # OSS backend on :8080 + frontend
#   ./scripts/dev-stack.sh enterprise   # Enterprise backend on :9090 + frontend
#   ./scripts/dev-stack.sh docker       # Full stack via docker compose

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-oss}"
export JWT_SECRET="${JWT_SECRET:-dev-jwt-secret-change-in-production-min-32-chars}"
export AUTH_BOOTSTRAP_EMAIL="${AUTH_BOOTSTRAP_EMAIL:-admin@rivicq.local}"
export AUTH_BOOTSTRAP_PASSWORD="${AUTH_BOOTSTRAP_PASSWORD:-DemoPass123!}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

case "$MODE" in
  docker)
    exec docker compose up --build
    ;;
  enterprise|ent)
    make build-enterprise
    export CRYPTOBOM_PORT=9090
    export CRYPTOBOM_LICENSE_KEY="${CRYPTOBOM_LICENSE_KEY:-ENT-dev-local}"
    export FRONTEND_REDIRECT_URL="http://localhost:3000/platform"
    export FRONTEND_BASE_PATH="/platform"
    export REACT_APP_API_URL="http://localhost:9090/api/v1"
    echo "Starting Enterprise backend on :9090 and frontend on :3000"
    echo "  API:  http://localhost:9090/api/v1"
    echo "  UI:   http://localhost:3000/platform/"
    trap 'kill 0' EXIT
    ./bin/cryptobom-enterprise &
    cd web && PUBLIC_URL=/platform REACT_APP_API_URL="$REACT_APP_API_URL" npm run dev
    ;;
  oss|*)
    make build-oss
    export CRYPTOBOM_PORT=8080
    export FRONTEND_REDIRECT_URL="http://localhost:3000/platform"
    export FRONTEND_BASE_PATH="/platform"
    export REACT_APP_API_URL="http://localhost:8080/api/v1"
    echo "Starting OSS backend on :8080 and frontend on :3000"
    echo "  API:  http://localhost:8080/api/v1"
    echo "  UI:   http://localhost:3000/platform/"
    trap 'kill 0' EXIT
    ./bin/cryptobom-oss &
    cd web && PUBLIC_URL=/platform REACT_APP_API_URL="$REACT_APP_API_URL" npm run dev
    ;;
esac
