# Security findings (working tree)

Supersedes the 2026-10-12 audit notes in [audit/SECURITY_FINDINGS.md](audit/SECURITY_FINDINGS.md) where this file records a **new disposition**. Audit IDs F-1…F-8 remain the inventory.

| ID | Severity | Status | Disposition |
|---|---|---|---|
| F-1 Encrypted SSH key in git history | Medium | OPEN | Rotate at origin; see [SECURITY_SECRET_REMEDIATION.md](SECURITY_SECRET_REMEDIATION.md). History not purged by owner decision. |
| F-2 `internal/database` SQL tests | Medium | PARTIALLY_IMPLEMENTED | Cross-tenant scan report test exists (`tests/scan_tenant_isolation_test.go`). Query-layer sqlmock still missing. |
| F-3 `AllowLocalDev` CORS in production | Low | FIXED this pass | `AllowLocalDev` is false when `config.IsProductionEnv()`. Credentials header is not set unless origin is allowed. Tests in `cors_test.go`. |
| F-4 CLI `--fail-on` / `--format` silent fallback | Low | FIXED this pass | Unknown values are usage errors (exit 2). `ParseFailOn` / `ParseOutputFormat`. Firmware/identity gates use `BLOCK\|WARN\|NONE` only. |
| F-5 golangci-lint debt | Low | OPEN | Prior hygiene landed some issues; do not treat lint-clean as proven here without a local lint run. |
| F-6 In-memory demo in production | Low | FIXED this pass | `server.New` fatals in production env without DB unless `RIVICQ_ALLOW_DEMO_MODE=1`. `/readyz` already 503 in demo mode. |
| F-7 Integration scaffolds | Info | OPEN | Still inert. |
| F-8 SSO | Info | OPEN | Do not claim SSO complete. |

## Remaining risk

- Git history (F-1) until keys are rotated.
- Production CORS still allows `https://rivicq.github.io` by default plus `CORS_ORIGINS`. Operators must not set `CORS_ORIGINS=*`.
- Credentialed CORS only after origin echo; browsers should not send cookies to disallowed origins.
- Demo identities if `DEMO_MODE` is set in production — still a warning in `SetupStandardAuth`, not a hard refuse (warn-only). Next hardening: refuse demo identities when `IsProductionEnv()`.
