# GitHub Actions and GitHub Pages

This repository ships 23 workflow files under `.github/workflows/` and publishes a public product site from the `gh-pages` branch. `docs/DEVSECOPS.md` describes the security gates; this document details the action catalog and the Pages build pipeline.

## 1. Workflow catalog

| Workflow | Purpose | Primary trigger |
|---|---|---|
| `ci.yml` | Backend/frontend/RevenueOS checks and dataset validation | push/PR to main, develop |
| `ci-oss.yml` | OSS lint/test/build, optional demo smoke, container image build | push/PR master/main, manual |
| `ci-enterprise.yml` | Enterprise-tagged tests, enterprise build/smoke, conditional enterprise Helm lint | push/PR master/main, manual |
| `ci-cd.yml` | Broader CI/CD pipeline with analysis, build/test, validation, container, and environment-gated deploy jobs | push/PR main/master/develop, manual (`workflow_dispatch`) |
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

Global rules: every workflow uses pinned, delegated `GITHUB_TOKEN` permissions where it can (`contents: read`, `packages: write` only on publish paths), checks out `actions/checkout@v4`, and keeps secrets strictly to the matrix above.

## 2. How actions land in the repo

Repo-local composite action: `.github/actions/rivicq-scan/action.yml` wraps `cmd/rivicq scan` with config flags; used by `rivicq-security.yml`. Third-party actions are referenced by pins in workflow files (e.g. `peaceiris/actions-gh-pages`, `slsa-framework/slsa-github-generator`, `anchore/sbom-action`, `aquasecurity/trivy-action`, `owasp/zap-action`) — no vendored third-party code is kept in-tree (`fabric/`, `web/node_modules`, `fabric/node_modules` are excluded from lint and scan).

## 3. Pages pipeline (`pages.yml`)

Steps in order (as configured):

1. Trigger on push to `main`/`master` (or as configured in `pages.yml`) and `workflow_dispatch`.
2. Set build-time environment values (edition, optional API URL, publishable Supabase client config if provided). Publishable Supabase values are client-side configuration, not service-role secrets.
3. Run `scripts/build-pages.sh` to produce the composite static site in `web/build/` (React app, API docs, Graph, docs/marketing/archify/media assets, host config).
4. Run `scripts/verify-pages-build.sh` to fail closed on incomplete or unsafe output.
5. Publish `web/build/` to the `gh-pages` branch via the configured deploy action.

What Pages does **not** do: it hosts no backend, no database, no scan execution. Every visible scan on the public site is the labeled synthetic demo (`fabric/`, `web/src/demo/`), or a client-side preview of data the operator passes to their own Community backend. The static site itself cannot be a source of secrets by construction — the Requests tab can inspect the empty network surface.

## 4. Behind the Pages actions at build time

Show-me examples served by the product site today: ReDoc API reference, animated brand `media/cryptobom-animation.html`, RivicQ Graph at `/fabric`, product diagrams at `/archify`. All are rebuilt from this repository on merge, which keeps documentation and specs in sync with code.

## 5. Manual intervention points

- Rollback: use `rollback.yml` for Helm deployments; for Pages, push a revert to `gh-pages` or pin an earlier action artifact.
- Benchmark baseline refresh: trigger `update-benchmark-baseline.yml`.
- Image release: `publish-image.yml` manual, or `release.yml` on tag; both validate provenance via `go-ossf-slsa3-publish.yml`.
- `_headers`/`_redirects`/`wrangler.toml` for Cloudflare Pages are being added at repo root for a static Publish-Only replica; Pages remains the canonical product site.