# DevSecOps: SDLC, CI/CD, and Security Gates

This document describes how RivicQ CSPM changes flow through source, CI, security scanning, and release. The product repo practices what it ships: the repository is scanned by its own `rivicq` engine on every push and PR.

## 1. SDLC and branch model

- Trunk-based: `main` (and legacy `master`) is the integration branch; `develop` exists for staging promotion and manual milestone work.
- Feature branches use a `cursor/*` or topic prefix; all PRs target `main`/`master` and run the full CI matrix.
- `pull_request_template.md` and `.github/ISSUE_TEMPLATE/` (bug, feature, question, security) standardize contributions.
- `release-drafter.yml` drafts release notes on pushes/PRs to `main`/`master`; `release.yml` publishes images + provenance on `v*.*.*` tags.
- Contributor rules: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `GOVERNANCE.md`, `docs/README.md`.

## 2. CI gate matrix (.github/workflows/)

| Workflow | Triggers | What it does |
|---|---|---|
| `ci.yml` | push `main`/`develop`, PR `main` | Backend build + tests |
| `ci-oss.yml` | push/PR `master`,`main` | golangci-lint v2, unit tests (non-enterprise) with race + coverage, OSS binary build, manual demo smoke, GHCR OSS image |
| `ci-enterprise.yml` | push/PR `master`,`main` | Enterprise unit tests, Enterprise binary build + smoke (mock IBMQ) |
| `ci-cd.yml` | push `main`,`master`,`develop`, PR, manual | Full pipeline: CodeQL (codeql-analysis), security-scan, **oss-gate** (fails if OSS build imports enterprise packages), build-and-test (go test -race + coverage on Postgres 15 service), integration-tests (live OSS+Enterprise servers via `run-edition.sh`, `RIVICQ_SMOKE_URLS`), production-validation (`scripts/production-readiness.sh --strict`), performance-tests (benchmark regression <= 20%), container-build (Dockerfile.oss/.enterprise, Syft SBOM, Trivy SARIF), deploy-staging (develop), deploy-production (main), benchmark-tests, docs-build |
| `codeql.yml` | weekly schedule (Fri 02:35) + manual | CodeQL Advanced on actions/go/javascript-typescript/python, `build-mode: none`; uploads disabled while Default CodeQL setup is active |
| `snyk-security.yml` | push/PR `main` | Snyk Open Source / Code / IaC / Container when `SNYK_TOKEN` set; skips cleanly without it, uploads SARIF to code scanning |
| `dast-scan.yml` | daily 03:00 UTC + manual | OWASP ZAP baseline scan against `https://staging.cryptobom.io`, report artifact |
| `rivicq-security.yml` | push `main`/`develop`, PR `main` | Self-scan via composite action `.github/actions/rivicq-scan` (`rivicq scan . --fail-on BLOCK`) |
| `demo-ci.yml` | push/PR `master`,`main` | Demo scanner build + `go test ./internal/discovery/... -race -coverprofile` |
| `docker-image.yml` | push/PR `main` | Builds OSS + Enterprise images from `deploy/docker/` (starter-workflow replacement) |
| `publish-image.yml` | push `main` + manual | BuildKit multi-arch image publish to GHCR (`packages: write`, OIDC) |
| `releases` | `v*.*.*` tag | Docker images, SBOM, SLSA provenance (see below) |
| `go-ossf-slsa3-publish.yml` | release created / manual | SLSA Level 3 Go provenance via `slsa-framework/slsa-github-generator`, verifier-linked (`permissions: read-all`) |
| `rollback.yml` | manual | Helm rollback of oss/enterprise in staging/production to previous or specified revision + post-rollback smoke |
| `deploy-oss.yml` | manual | Publish OSS image to any OCI registry (REGISTRY/REGISTRY_USERNAME/REGISTRY_PASSWORD) |
| `deploy-gcp.yml`, `deploy-enterprise.yml`, `azure-kubernetes-service-helm.yml` | manual | Cloud-targeted deploy workflows (GKE, multi-cloud AKS/ECR, AKS Helm) |
| `update-benchmark-baseline.yml` | manual | Refresh `tests/benchmark-baseline.json` |
| `animation-ci.yml` | push/PR touching `media/cryptobom-animation.html` | Validates the animation artifact |
| `greetings.yml` | `pull_request_target` / issues | First-interaction welcome messages (tone-guard: automatic) |

## 3. SCA / SAST / DAST / secret scanning

| Category | Tool | Notes |
|---|---|---|
| SAST | CodeQL (GitHub) | Languages: actions, go, javascript-typescript, python; scheduled weekly |
| SAST | Snyk Code | Gated on `SNYK_TOKEN` |
| SCA | Snyk Open Source + Container + IaC | `snyk monitor --all-projects`, `snyk iac test --report`, container monitor |
| SCA | dependabot (`dependabot.yml`) | Go + npm groups: gin, viper, x/crypto, controller-runtime, eslint-plugin-react-hooks, react-query, react-toastify, etc. |
| SCA | govulncheck + toolchain bumps | e.g. go1.26.9, `x/crypto` v0.56.x in `CHANGELOG.md` |
| Container | Trivy (SARIF) + Syft SBOM | Per edition image in `ci-cd.yml` container-build |
| DAST | OWASP ZAP baseline | Daily against staging |
| Secret scanning | RivicQ self-scan + Gitleaks (optional PATH tool) | Gitleaks findings never include secret values (`docs/KNOWN_LIMITATIONS.md`) |
| Supply chain | SLSA3 + unsigned-release guard | `go-ossf-slsa3-publish.yml`, `provenance` artifact |

Linters: `.golangci.yml` enables `errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`; frontend uses ESLint (`react-app` presets) + `prettier --check`, `tsc --noEmit` type-check in `web/package.json` (`lint`, `format:check`, `type-check`).

## 4. Release and rollback

- Release: tag `v*.*.*` -> `release.yml` builds and publishes images + SLSA provenance; `release-drafter.yml` prepared the notes; `CHANGELOG.md` keeps the ledger (latest tagged `v1.6.4`).
- Deploy: Helm charts `deploy/helm/cryptobom-oss`, `cryptobom-saas`, `cryptobom-enterprise`, namespaced by environment (staging `cryptobom-staging` / `cryptobom-enterprise-staging`, production equivalents), `--wait --timeout`, resource requests/limits, replicaCount 2 for production Enterprise.
- Verification: `kubectl rollout status`, health checks at `healthz`, API smoke against assets endpoint, dashboard 200.
- Rollback: `rollback.yml` (helm rollback to previous or explicit revision) and in-pipeline `Rollback on Failure` jobs that record current revision before `helm upgrade`; post-rollback smoke tests. Runbook: `docs/ROLLBACK_RUNBOOK.md`, `docs/OPS_RUNBOOK.md`.
- Environment promotion: local (`docker-compose.yml` / `make dev-*`) -> staging (gated on `develop`, environment `staging`) -> production (gated on `main` push + `KUBE_CONFIG_PROD` present). The public site, however, deploys exclusively via GitHub Pages (`pages.yml`); Helm production is skipped when no kubeconfig exists.

## 5. Required secrets / variables

| Secret | Used by |
|---|---|
| `GITHUB_TOKEN` | All workflows (default), gh-pages publish, GHCR push |
| `SNYK_TOKEN` | `snyk-security.yml` (optional; skips when unset) |
| `KUBE_CONFIG_STAGING` / `KUBE_CONFIG_PROD` | `ci-cd.yml` deploy jobs, `rollback.yml` |
| `REACT_APP_API_URL`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_PUBLISHABLE_KEY` | `pages.yml` frontend build (supabase values are publishable project config) |
| `SLACK_WEBHOOK_URL` | Deploy/rollback notifications (optional) |
| `REGISTRY`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD` | `deploy-oss.yml` |
| `AZURE_CLIENT_ID/TENANT_ID/SUBSCRIPTION_ID`, GCP/AWS/IBM vars | cloud deploy workflows |

Application secrets (`JWT_SECRET`, `DB_PASSWORD`, OAuth secrets, cloud keys) are **never** commit-time secrets: they live in `.env` (gitignored) or cluster secrets; `.env.demo` and `.env.example` contain only placeholders (`docs/SECURITY_SECRET_REMEDIATION.md`).