#!/usr/bin/env bash
# Build the full composite site (same as CI / Cloudflare) and publish to a Pages branch.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${1:-gh-pages}"
BUILD_DIR="${2:-$ROOT/web/build}"
TMP_WORKTREE="$(mktemp -d /tmp/cspm-ghpages.XXXXXX)"

if [[ "$BUILD_DIR" != /* ]]; then
  BUILD_DIR="$ROOT/$BUILD_DIR"
fi

cd "$ROOT"
REMOTE=origin
if [[ -n "${GITHUB_TOKEN:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
  REMOTE_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
  git -C "$ROOT" remote remove pages-github 2>/dev/null || true
  git -C "$ROOT" remote add pages-github "$REMOTE_URL"
  REMOTE=pages-github
fi

if [[ "${SKIP_BUILD:-0}" == "1" ]]; then
  echo "==> Reusing existing composite build"
  bash scripts/verify-pages-build.sh
else
  echo "==> Composite Pages build"
  bash scripts/build-pages.sh
fi

echo "==> Publishing to ${BRANCH} branch"
git -C "$ROOT" fetch "$REMOTE" "$BRANCH" || true
if git -C "$ROOT" show-ref --verify --quiet "refs/remotes/${REMOTE}/${BRANCH}"; then
  git -C "$ROOT" worktree add --quiet --detach "$TMP_WORKTREE" "${REMOTE}/${BRANCH}"
else
  git -C "$ROOT" worktree add --quiet --detach "$TMP_WORKTREE"
  git -C "$TMP_WORKTREE" checkout --quiet --orphan "$BRANCH"
  git -C "$TMP_WORKTREE" rm -rf . >/dev/null 2>&1 || true
fi
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
    commit -q -m "deploy: ${BRANCH} ${SRC_SHA}"
  git push "$REMOTE" "HEAD:${BRANCH}"
fi
echo "==> Deployed: ${BRANCH}"
