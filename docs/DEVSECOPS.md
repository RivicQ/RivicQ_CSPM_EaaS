# DevSecOps: SDLC, CI/CD, and Security Gates

This document describes how RivicQ CSPM changes flow through source, CI, security scanning, and release. The product repo practices what it ships: the repository is scanned by its own `rivicq` engine on every push and PR. The standalone EaaS build (`cmd/eaas`, `internal/eaas`, `web/eaas`) is a separate surface with a narrower path-filtered workflow; its controls and limits are called out below and in [EAAS_TESTING_CI.md](EAAS_TESTING_CI.md).

## 1. SDLC and branch model

- Trunk-based: `main` (and legacy `master`) is the integration branch; `develop` exists for staging promotion and manual milestone work.
- Feature branches use a `cursor/*` or topic prefix; all PRs target `main`/`master` and run the CSPM CI matrix. EaaS-only changes additionally run the narrow path-filtered EaaS workflow described in section 2.
- CI triggers vary by workflow and currently include combinations of `main`, `master`, and `develop`; confirm the configured branches before relying on a gate.
- `pull_request_template.md` and `.github/ISSUE_TEMPLATE/` (bug, feature, question, security) standardize contributions.
- `release-drafter.yml` and `release.yml` operate on the triggers declared in their workflow files; confirm branch/tag behavior before relying on release automation in a private beta.
- Contributor rules: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `GOVERNANCE.md`, `docs/README.md`.

## 2. CI gate matrix (.github/workflows/)

| Workflow | Triggers | What it does |
|---|---|---|
| `ci.yml` | push `main`/`develop`, PR `main` | Backend build + tests |
| `eaas-ci.yml` | push/PR touching `internal/eaas/**`, `cmd/eaas/**`, `web/eaas/**`, `deploy/migrations/004_eaas_schema.sql`, `docs/EAAS_*.md`, `go.mod`, `go.sum`, or the workflow; manual | Path-filtered EaaS checks only: `gofmt -l internal/eaas cmd/eaas`, `go vet ./internal/eaas/... ./cmd/eaas/...`, `go build ./...`, `go test ./... -count=1` |
| `ci-oss.yml` | push/PR `master`,`main` | golangci-lint v2, unit tests (non-enterprise) with race + coverage, OSS binary build, manual demo smoke, GHCR OSS image |
| `ci-enterprise.yml` | push/PR `master`,`main` | Enterprise-tagged unit tests, Enterprise binary build + smoke (mock IBMQ), and conditional Enterprise Helm lint (blocking once chart templates exist) |
| `ci-cd.yml` | push `main`,`master`,`develop`, PR, manual | Full pipeline as configured: security/code analysis jobs, OSS gate, build/test, integration/validation/perf/container/docs/deploy jobs. Some deploy and validation steps depend on secrets, cluster credentials, external services, and complete chart artifacts; treat them as environment-gated rather than universally available in private beta. |
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

The EaaS row is a deliberate exception: its path-filtered job runs formatting, vet, build, and
test only. It does **not** run race detection, coverage, govulncheck, migration validation, a
portal build, container builds, or a deploy gate. Do not describe it as the full CSPM matrix, and
do not treat a green EaaS job as production-readiness evidence.

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

Linters: `.golangci.yml` enables `errcheck`, `govet`, `ineffassign`, `staticcheck`, `unused`; frontend uses ESLint (`react-app` presets) + `prettier --check`, `tsc --noEmit` type-check in `web/package.json` (`lint`, `format:check`, `type-check`). These CSPM-wide scanners and frontend checks are not wired into `eaas-ci.yml`.

## 4. Release and rollback

- Release: tag `v*.*.*` -> `release.yml` builds and publishes images + SLSA provenance; `release-drafter.yml` prepared the notes; `CHANGELOG.md` keeps the ledger (latest tagged `v1.6.4`).
- Deploy: Helm charts `deploy/helm/cryptobom-oss`, `cryptobom-saas`, `cryptobom-enterprise`, namespaced by environment (staging `cryptobom-staging` / `cryptobom-enterprise-staging`, production equivalents), `--wait --timeout`, resource requests/limits, replicaCount 2 for production Enterprise.
- Verification: `kubectl rollout status`, health checks at `healthz`, API smoke against assets endpoint, dashboard 200.
- Rollback: `rollback.yml` (helm rollback to previous or explicit revision) and in-pipeline `Rollback on Failure` jobs that record current revision before `helm upgrade`; post-rollback smoke tests. Runbook: `docs/ROLLBACK_RUNBOOK.md`, `docs/OPS_RUNBOOK.md`.
- Environment promotion: local (`docker-compose.yml` / `make dev-*`) -> staging (gated on `develop`, environment `staging`) -> production (gated on `main` push + `KUBE_CONFIG_PROD` present). The public site deploys via GitHub Pages (`pages.yml`) and Cloudflare Pages (`cloudflare-pages.yml`); Helm production is skipped when no kubeconfig exists.
- Confirm workflow configuration, environments, secrets, images, and complete chart contents before relying on a staging→production Helm path in a private beta.
- EaaS has no deployment promotion in CI. Its portal (`web/eaas`) is served by the EaaS binary at `/` and `/portal` (default `:9091`), not by GitHub Pages; `deploy/migrations/004_eaas_schema.sql` is a target schema with no Go Postgres repository. EaaS also has no hosted deployment, Stripe/payment collection, payment webhooks, email delivery, HSM custody, or FIPS/CAVP validation. See [EAAS_DEPLOYMENT.md](EAAS_DEPLOYMENT.md) and [EAAS_LIMITATIONS.md](EAAS_LIMITATIONS.md).

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
| `EAAS_ADDR`, `EAAS_DATA_FILE`, `EAAS_ENV`, `EAAS_STATIC_DIR`, `EAAS_ADMIN_TOKEN`, `EAAS_ALLOWED_ORIGINS` | standalone EaaS binary (local sandbox); not consumed by the CSPM deploy or Pages workflows |

Application secrets (`JWT_SECRET`, `DB_PASSWORD`, OAuth secrets, cloud keys) are **never** commit-time secrets: they live in `.env` (gitignored) or cluster secrets; `.env.demo` and `.env.example` contain only placeholders (`docs/SECURITY_SECRET_REMEDIATION.md`).