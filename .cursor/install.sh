#!/usr/bin/env bash
# Idempotent Cloud Agent install for RivicQ CryptoBOM SaaS.
# Builds the Go backends + CLI, installs the pinned linter, and installs frontend deps.
set -euo pipefail

# Resolve repo root (this script lives in <repo>/.cursor/).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="$(go env GOPATH)/bin:${PATH}"

# 1. Local env file with demo-friendly defaults (no secrets; runs in DEMO_MODE).
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# 2. Build Go binaries (OSS :8080, Enterprise :9090, unified core, and rivicq CLI).
echo "Building Go binaries ..."
mkdir -p bin
go build -o bin/cryptobom-oss ./cmd/server/oss/
go build -tags enterprise -o bin/cryptobom-enterprise ./cmd/server/enterprise/
go build -o bin/cryptobom-core ./cmd/server/
go build -o bin/rivicq ./cmd/rivicq

# 3. golangci-lint pinned to the CI version so `make lint` works.
if ! golangci-lint version >/dev/null 2>&1; then
  echo "Installing golangci-lint v2.4.0 ..."
  go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.4.0
fi

# 4. Frontend dependencies (Create React App).
echo "Installing frontend dependencies ..."
( cd web && npm install --no-audit --no-fund )

echo "Install complete."
