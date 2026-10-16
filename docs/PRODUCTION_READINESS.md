# Production readiness

**Current stage: demonstrable prototype / controlled-pilot candidate for Community CLI + labeled demo. Not a production candidate for a hosted multi-tenant control plane.**

A compile or green unit suite is not production-ready. See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) and [PILOT_ACCEPTANCE_CRITERIA.md](PILOT_ACCEPTANCE_CRITERIA.md).

## What a production deploy still requires

1. PostgreSQL with migrations (`DATABASE_URL`); process now **refuses** `CRYPTOBOM_ENV=production` (or `RIVICQ_ENV` / `APP_ENV` / `ENV=prod`) without a database unless `RIVICQ_ALLOW_DEMO_MODE=1`.
2. Strong `JWT_SECRET` (≥32 bytes).
3. `CORS_ORIGINS` matching the real console origin. Localhost CORS is **off** when production env is set.
4. `/readyz` must be 200 (database up, not demo mode) before a load balancer sends traffic.
5. Secrets never in GitHub Pages. Pages is a static shell.

## Verified in this pass

- Policy gate + fail-on enum validation (CI typo no longer silently treated as BLOCK).
- CORS does not echo unknown origins; credentials header only when origin is allowed.
- RSA-2048 is classified, not auto-vulnerable.

## Open (not production)

- Hosted Community/Enterprise API for GitHub Pages (Render blueprint exists; AUTH_BOOTSTRAP CI has been red historically).
- SSO IdP handshake.
- Cloud/HSM connectors without customer credentials.
- `internal/database` SQL tenant predicates still need a dedicated Postgres suite in every CI job (`tests/integration/postgres_test.go` is URL-gated).
