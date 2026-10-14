# Incident response (engineering)

- Security disclosure: `SECURITY.md`
- Secret remediation notes: `docs/SECURITY_SECRET_REMEDIATION.md`
- Rollback: `docs/ROLLBACK_RUNBOOK.md`

This product’s scanners must never log raw secrets (secret rules mask values). If a real key is committed, rotate at the origin; do not rely on git history deletion alone.
