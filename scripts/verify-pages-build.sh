#!/usr/bin/env bash
#
# verify-pages-build.sh — fail closed on incomplete or unsafe Pages output.
#
# Run after scripts/build-pages.sh. CI invokes this before publishing so a
# missing pilot document, broken docs reader, absent SPA fallback, or accidental
# service-role key in browser code blocks the deploy.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${1:-$ROOT/web/build}"

failures=0
checks=0

ok() {
  checks=$((checks + 1))
  printf 'ok   %s\n' "$1"
}

bad() {
  checks=$((checks + 1))
  failures=$((failures + 1))
  printf 'FAIL %s\n' "$1" >&2
}

require_file() {
  local path="$1"
  if [[ -s "$BUILD_DIR/$path" ]]; then
    ok "$path"
  else
    bad "missing or empty: $path"
  fi
}

require_path() {
  local path="$1"
  if [[ -e "$BUILD_DIR/$path" ]]; then
    ok "$path"
  else
    bad "missing: $path"
  fi
}

require_dir() {
  local path="$1"
  if [[ -d "$BUILD_DIR/$path" ]]; then
    ok "$path/"
  else
    bad "missing directory: $path/"
  fi
}

require_grep() {
  local pattern="$1"
  local path="$2"
  local label="$3"
  if grep -R -q -- "$pattern" "$BUILD_DIR/$path" 2>/dev/null; then
    ok "$label"
  else
    bad "$label (pattern '$pattern' not found in $path)"
  fi
}

require_absent_grep() {
  local pattern="$1"
  local path="$2"
  local label="$3"
  if grep -RIl --include='*.js' -- "$pattern" "$BUILD_DIR/$path" >/dev/null 2>&1; then
    bad "$label (found '$pattern' under $path)"
  else
    ok "$label"
  fi
}

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "FAIL build directory missing: $BUILD_DIR" >&2
  exit 1
fi

echo "==> Verifying composite Pages build: $BUILD_DIR"

required_files=(
  "index.html"
  "404.html"
  "animation.html"
  "api/index.html"
  "pilot/index.html"
  "fabric/index.html"
  "fabric/404.html"
  "docs/index.html"
  "docs/read.html"
  "docs/assets/horizon-docs.css"
  "docs/assets/theme.js"
  "docs/assets/rivicq-mark.svg"
  "docs/README.md"
  "docs/PILOT_READINESS.md"
  "docs/PILOT_ONBOARDING.md"
  "docs/PILOT_ACCEPTANCE_CRITERIA.md"
  "docs/CAPABILITIES.yaml"
  "docs/IMPLEMENTATION_STATUS.md"
  "docs/KNOWN_LIMITATIONS.md"
  "marketing/index.html"
  "marketing/animation.html"
  "archify/site/index.html"
  "archify/site/css/archify-universal.css"
  "archify/site/js/archify-universal.js"
  "archify/diagrams/rivicq-architecture.html"
  "archify/diagrams/rivicq-finding-devsecops-workflow.html"
  "nexus/index.html"
  "_headers"
  "_redirects"
)

for file in "${required_files[@]}"; do
  require_file "$file"
done

require_path ".nojekyll"
require_path "capabilities.yaml"
require_dir "media"
require_dir "archify/diagrams"
require_file "docs/sdks/README.md"

if [[ -n "$(find "$BUILD_DIR/media" -type f -print -quit)" ]]; then
  ok "media assets present"
else
  bad "media directory has no files"
fi

if [[ -n "$(find "$BUILD_DIR/archify/diagrams" -maxdepth 1 -type f -name '*.html' -print -quit)" ]]; then
  ok "archify diagram HTML present"
else
  bad "archify diagrams directory has no HTML files"
fi

require_grep "RivicQ_CSPM_EaaS" "index.html" "SPA uses the GitHub Pages base path"
require_grep "PILOT_READINESS.md" "docs/read.html" "docs reader allows pilot readiness"
require_grep "PILOT_ONBOARDING.md" "docs/read.html" "docs reader allows pilot onboarding"
require_grep "PILOT_ACCEPTANCE_CRITERIA.md" "docs/read.html" "docs reader allows pilot acceptance"
require_grep "IMPLEMENTATION_STATUS.md" "docs/read.html" "docs reader allows implementation status"
require_grep "CORE_ENGINE.md" "docs/read.html" "docs reader allows the core engine"
require_grep "PILOT_READINESS.md" "pilot/index.html" "pilot page links readiness"
require_grep "PILOT_ONBOARDING.md" "pilot/index.html" "pilot page links onboarding"
require_grep "CAPABILITIES.yaml" "pilot/index.html" "pilot page links the manifest"
require_grep "PILOT_READINESS.md" "docs/index.html" "docs hub links pilot readiness"
require_grep "CAPABILITIES.yaml" "docs/index.html" "docs hub links the manifest"
require_grep "../pilot/" "marketing/index.html" "marketing links the pilot gate"
require_grep "../animation.html" "marketing/index.html" "marketing links the platform animation"
require_grep "../animation.html" "marketing/showcase.html" "showcase links the platform animation"
require_grep "../animation.html" "docs/index.html" "docs link the platform animation"
require_grep "../../animation.html" "archify/site/index.html" "Archify links the platform animation"
require_grep "animation.html" "static/js" "bundle links the platform animation"
require_grep "Open Source" "static/js" "bundle links the open source repo"
require_grep "status: ready" "docs/CAPABILITIES.yaml" "manifest has ready entries"
require_grep "status: planned" "docs/CAPABILITIES.yaml" "manifest has planned entries"
require_grep "status: blocked" "docs/CAPABILITIES.yaml" "manifest has blocked entries"
require_grep "RivicQ_CSPM_EaaS/fabric/" "nexus/index.html" "nexus redirect targets the Graph"
require_grep "PILOT" "docs/README.md" "docs index links the pilot set"
require_grep "rivicq-finding-devsecops-workflow.html" "archify/site/index.html" "Archify gallery includes finding-to-DevSecOps map"
require_grep "rivicq-finding-devsecops-workflow.html" "marketing/index.html" "marketing includes finding-to-DevSecOps map"
require_grep "rivicq-finding-devsecops-workflow.html" "docs/index.html" "docs include finding-to-DevSecOps map"
require_grep "archify-universal.css" "archify/site/index.html" "Archify site loads universal motion styles"
require_grep "archify-universal.css" "marketing/index.html" "marketing loads universal motion styles"
require_grep "archify-universal.css" "docs/index.html" "docs load universal motion styles"
require_grep "archify-universal.css" "pilot/index.html" "pilot loads universal motion styles"
require_grep "archify-universal.js" "pilot/index.html" "pilot loads universal motion script"
require_grep "motion=1" "archify/site/index.html" "Archify embeds allow motion"
require_grep "motion=1" "marketing/index.html" "marketing embeds allow motion"
require_grep "motion=1" "docs/index.html" "docs embeds allow motion"
require_grep "motion=1" "archify/site/js/rivicq-site.js" "Archify gallery embeds allow motion"
require_grep "data-allow-motion" "archify/diagrams/rivicq-finding-devsecops-workflow.html" "new diagram honors explicit motion"
require_grep "findingDevsecops" "static/js" "bundle includes finding-to-DevSecOps diagram id"

if find "$BUILD_DIR" -type f \( -name '.env' -o -name '.env.*' \) -print -quit | grep -q .; then
  bad "environment file found in Pages output"
else
  ok "no environment files in Pages output"
fi

require_absent_grep "SUPABASE_SERVICE_ROLE" "static/js" "no service-role key in browser code"
require_absent_grep "service_role" "static/js" "no service-role reference in browser code"

if (( failures > 0 )); then
  echo "==> Pages verification failed: $failures of $checks checks." >&2
  exit 1
fi

echo "==> Pages verification passed: $checks checks."
