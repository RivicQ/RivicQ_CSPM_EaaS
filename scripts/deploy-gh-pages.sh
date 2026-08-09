#!/usr/bin/env bash
# Build the React SaaS app and publish it directly to the gh-pages branch
# (GitHub Pages is configured in legacy/branch mode, so no Actions runner needed).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT/web/build"
TMP_WORKTREE="$(mktemp -d /tmp/cspm-ghpages.XXXXXX)"

cd "$ROOT/web"
echo "==> Building with REACT_APP_EDITION=enterprise, relative API base"
REACT_APP_EDITION=enterprise REACT_APP_API_URL=/api/v1 npm run build

echo "==> Preparing build artifacts (docs, media, SPA 404)"
cp "$BUILD_DIR/index.html" "$BUILD_DIR/404.html"
mkdir -p "$BUILD_DIR/docs/sdks" "$BUILD_DIR/media"
cp "$ROOT/docs/quantum-sdk.md" "$BUILD_DIR/docs/"
cp "$ROOT/docs/plugin-development.md" "$BUILD_DIR/docs/"
cp "$ROOT/docs/enterprise-sdk.md" "$BUILD_DIR/docs/"
cp "$ROOT/docs/AUDIT_STATUS.md" "$BUILD_DIR/docs/"
cp "$ROOT/docs/index.html" "$BUILD_DIR/docs/"
cp "$ROOT/docs/sdks/README.md" "$BUILD_DIR/docs/sdks/"
cp "$ROOT/docs/sdks/rust.md" "$BUILD_DIR/docs/sdks/"
cp "$ROOT/docs/sdks/python.md" "$BUILD_DIR/docs/sdks/"
cp "$ROOT/docs/sdks/typescript.md" "$BUILD_DIR/docs/sdks/"
cp "$ROOT/docs/sdks/java.md" "$BUILD_DIR/docs/sdks/"
cp "$ROOT/docs/sdks/dotnet.md" "$BUILD_DIR/docs/sdks/"
cp -r "$ROOT/media/." "$BUILD_DIR/media/"

echo "==> Publishing to gh-pages branch"
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
  git -c user.name="rivic-q" -c user.email="248756958+rivic-q@users.noreply.github.com" commit -q -m "Deploy CryptoBOM SaaS site to GitHub Pages"
  git push origin gh-pages
fi
git -C "$ROOT" worktree remove --force "$TMP_WORKTREE"
echo "==> Deployed: https://rivicq.github.io/RivicQ_CSPM_EaaS/"
