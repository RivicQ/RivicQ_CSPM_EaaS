# Production Readiness Checklist

A concrete checklist for running RivicQ CSPM in production (self-hosted), mapped to the code that implements each item. Companion documents: `docs/PRODUCTION_READINESS.md` (status board), `docs/PRODUCT_STATUS.md`, `docs/LAUNCH_CHECKLIST.md`, `docs/OPS_RUNBOOK.md`, `docs/DEPLOYMENT.md`.

## 1. Images and deployment artifacts

| Item | Definition of done | Enforced by |
|---|---|---|
| Edition images build reproducibly | `make build-oss` / `build-enterprise` green; Dockerfiles in `deploy/docker/` | CI `container-build`, `ci-oss.yml` |
| Images published with provenance | GHCR tags + SBOM + SLSA3 provenance | `publish-image.yml`, `release.yml`, `go-ossf-slsa3-publish.yml` |
| Helm charts install cleanly | Charts `deploy/helm/cryptobom-oss|enterprise|saas` lint + `--dry-run` | local `helm lint` / CI `container-build` consumers |
| Rollback works end-to-end | `rollback.yml` reverts a deployed revision and smoke passes | `docs/ROLLBACK_RUNBOOK.md`, gated job in `ci-cd.yml` |

## 2. Secrets and configuration

| Item | Definition of done | Where |
|---|---|---|
| No secrets in the repo | `rg` scan for tokens; `.env*` gitignored; `.env.example`/`.env.demo` placeholders only | rule 1 `docs/MASTER_RULES.md`; `docs/SECURITY_SECRET_REMEDIATION.md` |
| Strong `JWT_SECRET` in prod | length preference enforced; dev default rejected on enterprise | `internal/config`, hardened bootstrap test |
| Postgres password from secret, network private | `DB_PASSWORD`/`DATABASE_URL` sourced from Kubernetes secret / vault, TLS or VPC | Helm charts, `deploy/helm/*` |
| License key injected, not committed | `CRYPTOBOM_LICENSE_KEY` env/secret | `internal/edition/edition.go` |
| OAuth/SSO/cloud credentials as platform secrets | never in config files/`process.env` in the SPA | settings docs + `docs/DEPLOYMENT.md` |

## 3. Hardening at the edge (per  `docs/SECURITY_GUIDE.md`)

| Control | Check |
|---|---|
| Proxy trust list explicit | `TRUSTED_PROXIES` set to the LB CIDRs; default is trust-nothing (`internal/middleware/middleware.go`) |
| Rate limits tuned | `CRYPTOBOM_RATE_LIMIT` set; `Retry-After` header visible in `429`s |
| Security headers on | HSTS, CSP `frame-ancestors 'none'`, nosniff, DENY frame, no-store on API (`internal/middleware/security.go`) |
| CORS allowlist real | `CORS_ORIGINS` equals the console origin(s), not `*`; `https://rivicq.github.io` is the shipped default for Pages |
| TLS at LB | 1.2+ enforced; see controls in `internal/middleware/security.go` + ingress controller |
| OAuth redirect allowlist | only configured callback hosts accepted (`internal/api/shared/oauth.go`) |
| Scanner egress bounded | public nets only (no private/loopback/cloud-metadata) unless explicitly allowed (`internal/discovery/target_policy.go`) |

## 4. Runtime operations

| Item | Check |
|---|---|
| `/healthz` green, `/readyz` green (DB present, not demo mode) | `internal/server/server.go`; readiness 503 in demo mode is expected and documented |
| Graceful shutdown on pod SIGTERM | 20s drain (`internal/server/server.go:164`); helm `terminationGracePeriodSeconds` >= 25s |
| Resource limits set | Helm requests/limits on app and sidecars; replicaCount 2 for enterprise production |
| Observability wired | logrus level + `OTEL_EXPORTER_OTLP_ENDPOINT` for traces (`internal/observability/otel.go`); PrometheusRule templates in charts |
| Audit trail live | enterprise audit events visible in `/audit`; retention policy set per tenant |
| Backups | Postgres backups/restore per `docs/DATABASE_GUIDE.md`; migration ledger guards schema drift (`internal/database/migrations.go` + `migrate.go` checksum) |
| Stdout logs structured | JSON assertions in `scripts/production-readiness.sh --strict` include log format check |

## 5. Security scanning cadence (operator-owned)

- Weekly: CodeQL (`codeql.yml`); daily: DAST ZAP on staging (`dast-scan.yml`).
- Every push/PR: self-scan (`rivicq-security.yml`), Snyk when token present, Trivy container SARIF, mirror tests at `docs/TESTING.md`.
- Quarterly: adjust SBOM/SLSA provenance and renew image signing; review `docs/SECURITY_CONTROL_MATRIX.md` mappings.
- Incident: `SECURITY.md` path (48h ack / 7-day fix for critical); emergency rollback via `rollback.yml`.

## 6. Data and compliance (mappings, not certifications)

| Item | Check |
|---|---|
| Tenant isolation validated in prod | `tests/scan_tenant_isolation_test.go` run against the deployed instance (smoke) |
| Compliance packs are mappings | every pack/PDF labels itself as a mapping, not certification (`internal/compliance`, `docs/SECURITY_CONTROL_MATRIX.md`, UI copy) |
| Retention and deletion understood | GDPR-focused keys in `docs/SECURITY_CONTROL_MATRIX.md` (SDC/transparency) mapped to wherever the operator stores tenant data |
| Public site stays static | Pages serves community demo; never point Pages at a production API without an explicit written decision |

## 7. Launch gates

- `scripts/production-readiness.sh --strict` passes (job `production-validation` in `ci-cd.yml`).
- Benchmark regression <= 20% vs `tests/benchmark-baseline.json`.
- Smoke against a genuinely deployed instance (`RIVICQ_SMOKE_URLS`) passes for both editions.
- Current flag status, including items still in development, is tracked honestly in `docs/PRODUCT_READINESS.md` and `docs/KNOWN_LIMITATIONS.md` — fix that board before claiming readiness, never the reverse.