#!/usr/bin/env bash
#
# verify-beta-readiness.sh — realistic beta readiness gate for RivicQ/CSPM.
#
# Runs local build/test/validation steps across Go, web, RevenueOS, datasets,
# Pages, and Helm (where available). Fails fast with clear section labels.
#
# External/secret-gated checks are not part of this gate. Set
# SKIP_EXTERNAL_SECRET_CHECKS=1 to explicitly acknowledge environments where such
# checks are intentionally unavailable (currently none are executed by default).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_EXTERNAL_SECRET_CHECKS="${SKIP_EXTERNAL_SECRET_CHECKS:-0}"

section() {
  echo
  echo "==> [$1]"
}

info() {
  echo "    $*"
}

skip() {
  echo "    SKIP: $*"
}

fail() {
  echo "    FAIL: $*" >&2
  exit 1
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1
}

if [ "$SKIP_EXTERNAL_SECRET_CHECKS" = "1" ]; then
  info "SKIP_EXTERNAL_SECRET_CHECKS=1 set; external/secret-gated checks (if any) will be skipped."
fi

section "Go vet"
have_cmd go || fail "go is required"
go vet ./...
go vet -tags enterprise ./...

section "Go build"
mkdir -p bin
go build -o bin/cryptobom-oss ./cmd/server/oss
go build -tags enterprise -o bin/cryptobom-enterprise ./cmd/server/enterprise
go build -o bin/rivicq ./cmd/rivicq

section "Go tests (short)"
go test -count=1 -short ./...

section "Go tests (enterprise tags, short)"
go test -tags enterprise -count=1 -short ./...

section "Dataset validation"
have_cmd python3 || fail "python3 is required for dataset validation"
python3 scripts/analyze-datasets.py

section "CLI self-scan"
if [ ! -x ./bin/rivicq ]; then
  fail "bin/rivicq is missing; build step must produce the CLI"
fi
./bin/rivicq scan . --fail-on BLOCK

section "Web checks"
if [ ! -d web ]; then
  fail "web/ directory not found"
fi
have_cmd npm || fail "npm is required for web checks"
(
  cd web
  npx tsc --noEmit
  npm run lint
  CI=true npm test -- --watchAll=false
  npm run build
)

section "RevenueOS checks"
if [ ! -d revenueos ]; then
  fail "revenueos/ directory not found"
fi
(
  cd revenueos
  have_cmd npm || fail "npm is required for RevenueOS checks"
  npm run db:generate
  npm run typecheck
  npm run lint
  npm test
  npm run build
)

section "Pages build verification"
have_cmd bash || fail "bash is required"
bash scripts/build-pages.sh

section "Helm lint (where available)"
if ! have_cmd helm; then
  skip "helm not installed; skipping Helm lint"
else
  if [ -d deploy/helm/cryptobom-oss ]; then
    helm lint deploy/helm/cryptobom-oss
  else
    skip "deploy/helm/cryptobom-oss not found"
  fi

  if [ -d deploy/helm/cryptobom-enterprise/templates ] && \
     find deploy/helm/cryptobom-enterprise/templates -maxdepth 1 -type f \( -name '*.yaml' -o -name '*.yml' -o -name '*.tpl' \) | grep -q .; then
    helm lint deploy/helm/cryptobom-enterprise
  else
    skip "enterprise Helm chart templates absent; helm lint will be required once templates are added"
  fi
fi

section "Beta readiness gate"
echo "    PASS: realistic beta gate checks completed"
