# How to preview this branch

GitHub Pages workflows deploy from `main`. This branch also publishes a nebula overlay so `/preview/` matches the PR. Production github.io stays the last `main` deploy until merge — hard-refresh `/preview/` to review.

## 1. Temporary live preview (this PR)

Published to a `/preview` folder on `gh-pages`. Production files at the site root are unchanged. The next deploy from `main` removes this folder.

| Page | URL |
|------|-----|
| Home | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/ |
| Contact | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/contact/ |
| Product | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/product/ |
| CSPM | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/product/cspm/ |
| CBOM | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/cbom/ |
| PQC | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/pqc/ |
| Enterprise | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/enterprise/ |
| Security | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/security/ |
| Pricing | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/pricing/ |
| Request demo | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/request-demo/ |
| IBM Partner Plus | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/ibm/ |
| Sign in | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/login/ |
| Demo trail | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/demo/ |
| Findings (console) | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/findings/ |
| Scans | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/scanner/ |
| CBOM workspace | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/bom/ |
| PQC migration | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/migration/ |
| Governance | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/governance/ |
| RivicQ Graph | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/fabric/ |
| Docs hub | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/docs/ |
| Docs contact | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/docs/contact.html |

Hard-refresh (Ctrl+Shift+R) if a cached page appears.

## 2. GitHub source (proof the code is on the branch)

- Pull request: https://github.com/RivicQ/RivicQ_CSPM_EaaS/pull/73
- Files changed: https://github.com/RivicQ/RivicQ_CSPM_EaaS/pull/73/files
- Diff vs `main`: https://github.com/RivicQ/RivicQ_CSPM_EaaS/compare/main...cursor/rivicq-com-platform-86cc
- Contact page source: https://github.com/RivicQ/RivicQ_CSPM_EaaS/blob/cursor/rivicq-com-platform-86cc/web/src/pages/ContactHub.tsx
- Branch tip: https://github.com/RivicQ/RivicQ_CSPM_EaaS/commits/cursor/rivicq-com-platform-86cc

## 3. Local (full console + API)

```bash
git fetch origin
git checkout cursor/rivicq-com-platform-86cc
make dev-backend          # Community API :8080
cd web && npm ci && npm start   # http://localhost:3000/platform
```

Graph demo: `cd fabric && npm ci && npm run dev`

## 4. After merge to `main`

Production will use this nebula stack:

https://rivicq.github.io/RivicQ_CSPM_EaaS/  
https://rivicq.github.io/RivicQ_CSPM_EaaS/contact  
https://rivicq.github.io/RivicQ_CSPM_EaaS/fabric/

## 5. Public site vs RivicQ engine

GitHub Pages is static. Live CBOM scans and IBM readiness need a Community API (`:8080`). Until `REACT_APP_API_URL` is set at Pages build time, public pages show **Needs the RivicQ engine** and never invent findings or co-sell records.

| Surface | When the engine is unreachable |
|---------|--------------------------------|
| Home scan | Honest banner + sign-in / labeled demo |
| Product / CSPM / CBOM / PQC / Enterprise / Security | Same engine notice |
| IBM Partner Plus | Honesty line always; Pages cannot load live checklist state |
