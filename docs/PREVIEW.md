# How to preview this branch

GitHub Pages workflows deploy from `main`. A nebula overlay is also published from this PR so `/contact` and `/preview/contact` show black/violet instead of terracotta. The next official `main` Pages job can replace the overlay until the PR is merged.

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
| RivicQ Graph | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/fabric/ |
| Docs hub | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/docs/ |
| Docs contact | https://rivicq.github.io/RivicQ_CSPM_EaaS/preview/docs/contact.html |

Hard-refresh (Ctrl+Shift+R) if a cached cream page appears.

## 2. GitHub source (proof the code is on the branch)

- Pull request: https://github.com/RivicQ/RivicQ_CSPM_EaaS/pull/73
- Files changed: https://github.com/RivicQ/RivicQ_CSPM_EaaS/pull/73/files
- Diff vs `main`: https://github.com/RivicQ/RivicQ_CSPM_EaaS/compare/main...cursor/rivicq-com-platform-86cc
- Contact page source: https://github.com/RivicQ/RivicQ_CSPM_EaaS/blob/cursor/rivicq-com-platform-86cc/web/src/pages/ContactHub.tsx
- Latest commit: https://github.com/RivicQ/RivicQ_CSPM_EaaS/commit/075158d8fcb8c1fcf84f8f68b4711f54d49b51a6

## 3. Local (full console + API)

```bash
git fetch origin
git checkout cursor/rivicq-com-platform-86cc
make dev-backend          # Community API :8080
cd web && npm ci && npm start   # http://localhost:3000/platform
```

Graph demo: `cd fabric && npm ci && npm run dev`

## 4. After merge to `main`

Production will replace cream with nebula:

https://rivicq.github.io/RivicQ_CSPM_EaaS/  
https://rivicq.github.io/RivicQ_CSPM_EaaS/contact  
https://rivicq.github.io/RivicQ_CSPM_EaaS/fabric/
