#!/usr/bin/env bash
# Build the full composite site (same as CI / Cloudflare) and publish to gh-pages.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT/web/build"
TMP_WORKTREE="$(mktemp -d /tmp/cspm-ghpages.XXXXXX)"

cd "$ROOT"
if [[ "${SKIP_BUILD:-0}" == "1" ]]; then
  echo "==> Reusing existing composite build"
  bash scripts/verify-pages-build.sh
else
  echo "==> Composite Pages build"
  bash scripts/build-pages.sh
fi

echo "==> Publishing to gh-pages branch"
git -C "$ROOT" fetch origin gh-pages
git -C "$ROOT" worktree add --quiet --detach "$TMP_WORKTREE" origin/gh-pages
cleanup() {
  git -C "$ROOT" worktree remove --force "$TMP_WORKTREE" 2>/dev/null || true
}
trap cleanup EXIT
cd "$TMP_WORKTREE"
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$BUILD_DIR/." .
touch .nojekyll
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
else
  SRC_SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
  git -c user.name="rivic-q" -c user.email="248756958+rivic-q@users.noreply.github.com" \
    commit -q -m "deploy: nebula unify ${SRC_SHA}"
  git push origin HEAD:gh-pages
fi
echo "==> Deployed: https://rivicq.github.io/RivicQ_CSPM_EaaS/"
