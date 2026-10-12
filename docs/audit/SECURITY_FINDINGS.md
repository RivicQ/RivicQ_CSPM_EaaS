# RivicQ CSPM — Security Findings (Phase 1)

Scope: repository working tree at commit `1fa0910`, static review + live CLI runs.
Severity: **High / Medium / Low / Info**.

## Positive controls observed (verified in source)

| Control | Evidence |
|---|---|
| Tenant from auth context, not headers | `internal/tenant/context.go` — `X-Tenant-ID` explicitly ignored; JWT `tenant_id` wins; public tenant constant for unauth demo. |
| Tenant-scoped reads/writes | `internal/database/queries.go` — every accessor carries `WHERE … tenant_id = $…` (incl. aggregate metrics joined on `cr.tenant_id`). |
| No cross-tenant probing | `mapRowError` distinguishes `ErrNotFound` (→404) vs `ErrForbidden` (row exists, other tenant). |
| Restrictive CORS default | `internal/middleware/cors.go` — default allow-list `https://rivicq.github.io`; `*` only if explicitly configured via `CORS_ORIGINS`. |
| Security headers / rate limit / audit | `internal/middleware/{security,ratelimit,audit}.go` (+tests). |
| Password + MFA | `internal/authn` — bcrypt + TOTP (`pquerna/otp`) (+tests). |
| Route-level authorization | `internal/auth/{rbac,route_permissions,public_routes}.go` (+tests). |
| Archive-slip defence tested | `internal/firmware/analyze_test.go` builds a tar with a symlink to `/etc/passwd` (escape attempt) — regression test present. |
| No real secrets in tree | Synthetic only: AWS doc-example key `AKIAIOSFODNN7EXAMPLE` (also asserted in `datasets/known-bad/terraform/expected.json` as a *must-match*), `sk_live_secret`, `whsec_test`. `.env*` real files are gitignored/untracked. |

## Findings

### F-1 — Medium — Encrypted SSH key material remains in git history
`sraande`/`rsande` (encrypted ed25519) were committed then deleted. Files were
removed from the working tree in a prior remediation, but history was **not**
purged (per owner decision). **Action:** rotate the key(s) at the origin; treat
as compromised until rotated. Tracked in `docs/SECURITY_SECRET_REMEDIATION.md`.

### F-2 — Medium — `internal/database` has no automated tests
The most security-sensitive SQL (tenant scoping, `ErrForbidden`/`ErrNotFound`)
is untested. A future refactor could drop a `tenant_id` predicate undetected.
**Action:** add a Postgres-backed (or sqlmock) test asserting cross-tenant
reads return `ErrForbidden`/`ErrNotFound` (see Phase 6 tests).

### F-3 — Low — `AllowLocalDev` CORS default is always on
`DefaultCORSConfig()` sets `AllowLocalDev: true`, which permits `localhost`
origins. Safe for dev, but must be forced off in production config.
**Action:** gate on `ENV`/`APP_ENV != production`.

### F-4 — Low — CLI flag-value validation
`rivicq … --fail-on BOGUS` / `--format bogus` exit `0` (silent fallback) instead
of a usage error (exit `2`). A CI job that typos the gate value could pass
unexpectedly. **Action:** validate enum values, return exit 2.

### F-5 — Low — 19 static-analysis issues (lint)
`golangci-lint run ./...` fails with 15 `errcheck`, 1 `ineffassign`,
2 `staticcheck`, 1 `unused`. Includes unchecked `Close()` on archive readers in
`internal/firmware/format.go`. Not exploitable as-is, but unchecked errors in
parsing paths reduce robustness. **Action:** hygiene PR.

### F-6 — Low — In-memory demo mode when Postgres unset
When `DATABASE_URL` is absent the app runs an in-memory demo store. If this path
were ever reachable in production it could cross tenant boundaries.
**Action:** refuse to start in-memory mode when `APP_ENV=production`.

### F-7 — Info — Integration scaffolds must mirror tenant scoping
`integrations/{convex,stripe,…}` are inert today. When wired, they must enforce
the same tenant predicate from auth context (mirror `internal/tenant/context.go`).
Documented in `integrations/README.md`.

### F-8 — Info — SSO not implemented
No IdP handshake exists. Do **not** claim "SSO complete" for enterprise
evaluations until a live IdP login is tested and evidenced.

## What was NOT claimed (guardrails upheld)

- No firmware execution, flashing, or secure-element key extraction.
- No silicon/RE analysis.
- No "auto key rotation".
- Compliance mappings presented as mappings, not certifications.
