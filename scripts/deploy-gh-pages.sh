#!/usr/bin/env bash
# Build the full composite site (same as CI / Cloudflare) and publish to gh-pages.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT/web/build"
TMP_WORKTREE="$(mktemp -d /tmp/cspm-ghpages.XXXXXX)"

cd "$ROOT"
echo "==> Composite Pages build"
bash scripts/build-pages.sh

echo "==> Publishing to gh-pages branch"
git -C "$ROOT" fetch origin gh-pages 2>/dev/null || true
git -C "$ROOT" worktree add --quiet "$TMP_WORKTREE" gh-pages
cd "$TMP_WORKTREE"
git rm -rf --quiet . 2>/dev/null || true
rm -rf -- ./* ./.github 2>/dev/null || true
cp -R "$BUILD_DIR/." .
touch .nojekyll
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
else
  SRC_SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
  git -c user.name="rivic-q" -c user.email="248756958+rivic-q@users.noreply.github.com" \
    commit -q -m "deploy: nebula unify ${SRC_SHA}"
  git push origin gh-pages
fi
git -C "$ROOT" worktree remove --force "$TMP_WORKTREE"
echo "==> Deployed: https://rivicq.github.io/RivicQ_CSPM_EaaS/"
