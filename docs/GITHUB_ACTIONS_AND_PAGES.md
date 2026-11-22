# GitHub Actions and GitHub Pages

This repository ships 25 workflow files under `.github/workflows/` (counted from that directory, including `eaas-ci.yml`, `pages.yml`, and `cloudflare-pages.yml`) and publishes a public CSPM product site from the `gh-pages` branch. `docs/DEVSECOPS.md` describes the security gates; this document details the action catalog and the Pages build pipeline. The EaaS portal is not a Pages site: it is served by the EaaS binary at `/` and `/portal`.

## 1. Workflow catalog

| Workflow | Purpose | Primary trigger |
|---|---|---|
| `ci.yml` | Backend, frontend, RevenueOS, dataset, and quantum SDK checks | push/PR to main, develop |
| `eaas-ci.yml` | Path-filtered EaaS checks: gofmt, go vet, go build, go test only | push/PR touching `internal/eaas/**`, `cmd/eaas/**`, `web/eaas/**`, `004_eaas_schema.sql`, `docs/EAAS_*.md`, `go.mod`, `go.sum`, or the workflow; manual |
| `ci-oss.yml` | Lint (golangci), OSS unit tests + race, OSS build, demo smoke, OSS image | push/PR master/main, manual |
| `ci-enterprise.yml` | Enterprise unit tests, build, smoke (mock IBMQ), conditional enterprise Helm lint | push/PR master/main, manual |
| `ci-cd.yml` | Full pipeline: CodeQL, security-scan, oss-gate, build+test, integration (Postgres), production-readiness, perf gate, container+SBOM+Trivy, deployments | push/PR main/master/develop, manual (`workflow_dispatch`) |
| `codeql.yml` | CodeQL weekly + manual on actions/go/javascript-typescript/python, `build-mode: none`, uploads disabled (Default CodeQL takes over) | schedule weekly, workflow_dispatch, PR |
| `snyk-security.yml` | Snyk Open Source/Code/IaC/Container SARIF upload when `SNYK_TOKEN` set | push/PR main |
| `dast-scan.yml` | OWASP ZAP baseline DAST against staging | schedule daily, manual |
| `rivicq-security.yml` | Self-scan of the repo via `.github/actions/rivicq-scan` composite (`rivicq scan . --fail-on BLOCK`) | push main/develop, PR main |
| `demo-ci.yml` | Demo scanner build + discovery race tests | push/PR master/main |
| `docker-image.yml` | OSS + Enterprise image build (starter templates) | push/PR main |
| `publish-image.yml` | BuildKit multi-arch publish to GHCR with OIDC token | push main, manual |
| `go-ossf-slsa3-publish.yml` | SLSA Level 3 Go provenance generator, read-all perms | release created, manual |
| `release.yml` | Build + publish images/provenance on tags | tag `v*.*.*` |
| `release-drafter.yml` | Draft release notes from PR titles | push/PR to main/master |
| `rollback.yml` | Helm rollback oss/enterprise + smoke | manual |
| `deploy-oss.yml` / `deploy-gcp.yml` / `deploy-enterprise.yml` | OCI publish / GKE+ECR / AKS+ACR Deployment Kit | manual |
| `azure-kubernetes-service-helm.yml` | AKS Helm deploy (starter template) | manual |
| `update-benchmark-baseline.yml` | Refresh `tests/benchmark-baseline.json` | manual |
| `animation-ci.yml` | Validate `media/cryptobom-animation.html` | PRs touching that file |
| `greetings.yml` | First-interaction comments (pull_request_target/issues, auto) | new issues/PRs |
| `pages.yml` | Build composite site via `scripts/build-pages.sh`, verify via `scripts/verify-pages-build.sh`, publish `web/build` to `gh-pages` | push main/master, workflow_dispatch |
| `cloudflare-pages.yml` | Same composite build; deploy to Cloudflare Pages via `cloudflare/wrangler-action@v3` when `CLOUDFLARE_API_TOKEN` is set, build-only otherwise | push main/master, workflow_dispatch |

Global rules: workflows use delegated `GITHUB_TOKEN` permissions where it can (`contents: read`, `packages: write` only on publish paths) and keep secrets strictly to the matrix above. Workflows that check out use `actions/checkout@v4` except `codeql.yml` (`@v7`); `greetings.yml` and `go-ossf-slsa3-publish.yml` do not check out. Third-party actions are version-tagged, not commit-SHA pinned (`snyk/actions` is the SHA-pinned exception). `eaas-ci.yml` is intentionally narrow: it has no race, coverage, govulncheck, migration validation, portal build, container build, or deploy step.

## 2. How actions land in the repo

Repo-local composite action: `.github/actions/rivicq-scan/action.yml` wraps `cmd/rivicq scan` with config flags; used by `rivicq-security.yml`. Third-party actions are referenced by version tags in workflow files (e.g. `peaceiris/actions-gh-pages@v4`, `slsa-framework/slsa-github-generator@v1.4.0`, `anchore/sbom-action@v0`, `aquasecurity/trivy-action@v0.36.0`); `snyk/actions` uses a commit SHA. No vendored third-party code is kept in-tree (`fabric/`, `web/node_modules`, `fabric/node_modules` are excluded from lint and scan).

## 3. Pages pipeline (`pages.yml`)

Steps in order (as configured):

1. On push to `main`/`master` or `workflow_dispatch`.
2. Define build inputs (edition `community`, base path, API URL from secret `REACT_APP_API_URL`, Supabase publishable config). `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_KEY` are inlined as **non-secret publishable client config** — they are public keys/project URLs by design, never the service-role key.
3. `scripts/build-pages.sh` runs `npm ci` + `npm run build` in `web/`, builds ReDoc from `docs/openapi.yaml`, builds `fabric/`, and copies `docs/`, `marketing/`, `archify/`, SDK, legal, and media assets into `web/build/` with `_headers`, `_redirects`, and `.nojekyll`.
4. `scripts/verify-pages-build.sh` fails closed on incomplete or unsafe output (108 checks, including no environment files or service-role keys in browser output).
5. `peaceiris/actions-gh-pages` force-orphan publishes `web/build` to the `gh-pages` branch; `cloudflare-pages.yml` publishes the same vetted output when `CLOUDFLARE_API_TOKEN` is configured.

What Pages does **not** do: it hosts no backend, no database, no scan execution, and no EaaS portal. The EaaS surface has its own binary and static directory: its portal is served at `/` and `/portal` by the EaaS binary (default `:9091`, `EAAS_STATIC_DIR`), and its API lives under `/api/eaas/v1/*` and `/api/beta/v1/*`. Pages only publishes the EaaS documentation files. Every visible CSPM scan on the public site is the labeled synthetic demo (`fabric/`, `web/src/demo/`), or a client-side preview of data the operator passes to their own Community backend. The static site itself cannot be a source of secrets by construction — the Requests tab can inspect the empty network surface.

## 4. Behind the Pages actions at build time

Show-me examples served by the product site today: ReDoc CSPM API reference (`docs/openapi.yaml`), animated brand `media/cryptobom-animation.html`, RivicQ Graph at `/fabric`, product diagrams at `/archify`. All are rebuilt from this repository on merge, which keeps documentation and specs in sync with code. The separate EaaS API is documented in [EAAS_API.md](EAAS_API.md), not in `docs/openapi.yaml`.

## 5. Manual intervention points

- Rollback: use `rollback.yml` for Helm deployments; for Pages, push a revert to `gh-pages` or pin an earlier action artifact.
- Benchmark baseline refresh: trigger `update-benchmark-baseline.yml`.
- Image release: `publish-image.yml` manual, or `release.yml` on tag; both validate provenance via `go-ossf-slsa3-publish.yml`.
- `wrangler.toml` is committed at the repo root; `cloudflare/_headers` and `cloudflare/_redirects` are committed and copied into `web/build` by `scripts/build-pages.sh`. `.github/workflows/cloudflare-pages.yml` deploys the same build when `CLOUDFLARE_API_TOKEN` is set; GitHub Pages remains the canonical product site.
