# Production readiness

**Decision: not production-ready** as a paid multi-tenant SaaS (see `FINAL_AUDIT.md` decision C).

Community CLI/engine: suitable for **technical review** and **synthetic partner PoC**.

Missing production gates in this environment: docker/helm verification, backups/restore drill, SSO E2E, connector credentials, golangci-lint, browser e2e, enforced `APP_ENV=production` refuse-in-memory.

Existing ops docs: `docs/DEPLOYMENT.md`, `docs/OPS_RUNBOOK.md`, `docs/ROLLBACK_RUNBOOK.md`, `docs/KNOWN_LIMITATIONS.md`.
