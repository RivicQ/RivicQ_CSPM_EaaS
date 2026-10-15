#!/usr/bin/env bash
#
# build-pages.sh — produce the complete static site in web/build/.
#
# This is the single source of truth for the composite Pages build. It mirrors
# .github/workflows/pages.yml (GitHub Pages) and is also used by the Cloudflare
# Pages pipeline (.github/workflows/cloudflare-pages.yml) so both hosts serve
# byte-identical output.
#
# Composite layout produced in web/build/:
#   /            React SaaS app (SPA, 404.html fallback)
#   /api/        ReDoc HTML from docs/openapi.yaml
#   /fabric/     RivicQ Graph (Vite build)
#   /docs/       Horizon docs (hand-authored HTML + markdown)
#   /marketing/  Static marketing site
#   /media/      Brand/media assets
#   /archify/    Diagram site + diagrams (two-level, preserves ../diagrams)
#   /nexus/      Bookmark redirect to /fabric/
#
# Usage:  bash scripts/build-pages.sh
# Env:    REACT_APP_EDITION (default "community"), REACT_APP_API_URL,
#         REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_PUBLISHABLE_KEY
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REACT_APP_EDITION="${REACT_APP_EDITION:-community}"
export REACT_APP_EDITION

echo "==> Building React app (web/)"
( cd web && npm ci && npm run build )

echo "==> Generating API docs (ReDoc)"
npx --yes redoc-cli@latest bundle docs/openapi.yaml -o web/build/api/index.html || \
  echo "warn: ReDoc bundle failed; continuing without /api/"

echo "==> SPA fallback (404.html)"
cp web/build/index.html web/build/404.html

echo "==> Building RivicQ Graph (fabric/)"
( cd fabric && npm ci && npm run build )

echo "==> Publishing Graph + redirects"
mkdir -p web/build/fabric web/build/docs web/build/nexus
cp -r fabric/dist/. web/build/fabric/
cp web/build/fabric/index.html web/build/fabric/404.html
printf '%s\n' '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/RivicQ_CSPM_EaaS/fabric/"><link rel="canonical" href="/RivicQ_CSPM_EaaS/fabric/"><title>Moved</title><p>This demo moved to <a href="/RivicQ_CSPM_EaaS/fabric/">RivicQ Graph</a>.</p>' > web/build/nexus/index.html
cp web/build/nexus/index.html web/build/nexus/404.html

echo "==> Publishing docs + SDK + legal markdown"
mkdir -p web/build/docs/sdks web/build/docs/ux web/build/docs/assets
cp docs/FABRIC.md docs/GRAPH.md web/build/docs/
cp docs/quantum-sdk.md docs/plugin-development.md docs/security-intelligence.md docs/README.md \
   docs/KNOWN_LIMITATIONS.md docs/INTEGRATIONS.md docs/LAUNCH_CHECKLIST.md docs/PRODUCT_STATUS.md \
   docs/PLATFORM.md docs/DESIGN_SYSTEM.md docs/CORE_ENGINE.md docs/ENGINEERING_AUDIT.md \
   docs/OPS_RUNBOOK.md docs/ROADMAP.md docs/QISKIT_PIPELINE.md docs/ARCHITECTURE.md \
   docs/CLIENT_ARCHITECTURE.md docs/BOM_FRAMEWORK.md docs/UX_DESIGN.md docs/CONTACT.md \
   docs/PQC_MIGRATION.md docs/editions.md \
   web/build/docs/
cp docs/ux/*.md web/build/docs/ux/ 2>/dev/null || true
cp docs/contact.html docs/read.html docs/index.html web/build/docs/
cp docs/assets/horizon-docs.css docs/assets/theme.js docs/assets/rivicq-mark.svg docs/assets/rivicq-mark.png web/build/docs/assets/
cp DATASETS.md LEGAL.md PRIVACY.md TRADEMARKS.md NOTICE CONTRIBUTING.md SECURITY.md web/build/docs/
cp docs/sdks/README.md docs/sdks/rust.md docs/sdks/python.md docs/sdks/typescript.md \
   docs/sdks/java.md docs/sdks/dotnet.md web/build/docs/sdks/

echo "==> Publishing media + marketing"
mkdir -p web/build/media web/build/marketing
cp -r media/. web/build/media/
cp -r marketing/. web/build/marketing/

echo "==> Publishing archify diagram site"
mkdir -p web/build/archify/site web/build/archify/diagrams
cp -r archify/site/. web/build/archify/site/
cp -r archify/diagrams/. web/build/archify/diagrams/

echo "==> Publishing Archify doc library and hiding raw markdown"
mkdir -p web/build/archify/site/library
if compgen -G "web/build/docs/*.md" > /dev/null; then cp web/build/docs/*.md web/build/archify/site/library/; fi
if compgen -G "web/build/docs/ux/*.md" > /dev/null; then cp web/build/docs/ux/*.md web/build/archify/site/library/; fi
if compgen -G "web/build/docs/sdks/*.md" > /dev/null; then cp web/build/docs/sdks/*.md web/build/archify/site/library/; fi
if [ -f web/build/docs/NOTICE ]; then cp web/build/docs/NOTICE web/build/archify/site/library/NOTICE; fi
find web/build -name '*.md' -not -path '*/archify/site/library/*' -delete
find web/build -path '*/docs/NOTICE' -delete

echo "==> Installing Cloudflare Pages host config (_headers, _redirects)"
cp cloudflare/_headers web/build/_headers
cp cloudflare/_redirects web/build/_redirects

echo "==> Done. Output: web/build/"
