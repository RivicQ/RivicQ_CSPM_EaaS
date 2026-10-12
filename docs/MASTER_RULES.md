# Master Rules

The single canonical "house rules" for the RivicQ CSPM / CryptoBOM EaaS
repository (`RivicQ/RivicQ_CSPM_EaaS`, Go module `github.com/rivic-q/cryptobom-saas`). If a rule here conflicts with
a comment or a habit, this file and the linked deeper guides win.

These rules are **enforced by CI and by code review**, not by good intentions.
A pull request that breaks one is expected to fail the pipeline or be blocked in
review. See [Enforcement](#enforcement) and the PR checklist in
`.github/pull_request_template.md`.

## How to use this file

- Skim the summary table, then read the rule that applies to your change.
- Each rule states **Why**, **How (in this repo)**, and links to the deeper doc.
- Items that are guidance but **not yet implemented** are labeled
  `Recommended (not yet implemented)`. Never describe those as shipped.
- Where this file is silent, prefer the deeper guide; where everything is
  silent, prefer the safer, simpler option and say so in the PR.

## Rule index

| # | Rule | Primary implementation |
|---|------|------------------------|
| 1 | Never hardcode secrets | `internal/authn/config.go`, `.gitignore` |
| 2 | All `.env` files are ignored | `.gitignore`, `.env.example` |
| 3 | Authenticate every request | `internal/authn/enforce.go`, `internal/auth/public_routes.go` |
| 4 | Authorize server-side | `internal/auth/route_permissions.go`, `internal/auth/rbac.go` |
| 5 | Never trust client-supplied identities | `internal/authn/middleware.go`, `internal/tenant/context.go` |
| 6 | Isolate tenant data on every query | `internal/database/queries.go`, `internal/database/migrations.go` |
| 7 | Lock down the database | `internal/database/database.go` |
| 8 | Secure third-party backends (Supabase et al.) | `web/src/services/supabase.ts` |
| 9 | Protect admin routes | `internal/auth/route_permissions.go`, `internal/auth/rbac.go` |
| 10 | Disable production debug mode | `internal/server/server.go`, `cmd/server/*/main.go` |
| 11 | Hide detailed errors from clients | `internal/authn/handlers.go`, `internal/middleware/audit.go` |
| 12 | Validate all input server-side | `internal/authn/password.go`, `internal/firmware/limits.go` |
| 13 | Sanitize and escape user content | `web/src`, `internal/api/**` |
| 14 | Secure file uploads | `internal/firmware/limits.go`, `internal/api` |
| 15 | Prevent SQL/NoSQL injection | `internal/database/*.go`, `internal/authn/store_sql.go` |
| 16 | Rate-limit login and signup | `internal/middleware/ratelimit.go` |
| 17 | Add security headers | `internal/middleware/security.go` |
| 18 | Restrict CORS to an allowlist | `internal/middleware/cors.go` |
| 19 | Test as an untrusted user | `internal/auth/*_test.go`, `internal/tenant/context_test.go` |

## The ruleset

### 1. Never hardcode secrets

**Why.** A committed secret is compromised the moment it lands; history keeps a
copy even after deletion (see `docs/SECURITY_SECRET_REMEDIATION.md`).

**How (in this repo).**
- Secrets come from the environment only. There is deliberately **no default
  signing secret**: `internal/authn/config.go` fails startup unless
  `AUTH_JWT_SECRET` (or `JWT_SECRET`) is at least 32 bytes.
- `internal/database/database.go` refuses to connect with a default password
  when `CRYPTOBOM_DB_PASSWORD` is empty.
- Never log secrets. The audit middleware redacts sensitive query parameters in
  `internal/middleware/audit.go` (`redactQuery`).
- `Recommended (not yet implemented)`: pre-commit secret scanning with
  `gitleaks` / `trufflehog` (recommended in `docs/SECURITY_SECRET_REMEDIATION.md`).

### 2. All `.env` files are ignored

**Why.** Local overrides frequently contain real credentials.

**How (in this repo).** `.gitignore` ignores `*.env`, `.env`, `.env.*`,
`.env.local`, `.env.production`, `secrets/`, `*.pem`, `*.key`, `*.ppk`, and
`web/.env`, `web/.env.*`. Only `.env.example` is tracked, and it must contain
placeholder values only. Add new variables to `.env.example` with a comment,
never to a tracked `.env`.

### 3. Authenticate every request

**Why.** Deny-by-default is the only safe default; an allow-list is auditable.

**How (in this repo).**
- The API group is guarded by `internal/authn/enforce.go` (`EnforceAuth`),
  which rejects any request without a valid token unless it is on the explicit
  public allow-list in `internal/auth/public_routes.go` (`PublicRoutes`).
- Access tokens are HS256 JWTs verified in `internal/authn/token.go`; only
  HS256 is accepted, and issuer, audience and expiry are required.
- Adding a public route is a security decision: edit `PublicRoutes` and expect
  that edit to be reviewed closely.

### 4. Authorize and verify permissions server-side

**Why.** Authentication proves *who*; authorization proves *what*. A viewer
must not be able to delete evidence just because they can call an endpoint.

**How (in this repo).**
- `internal/auth/route_permissions.go` maps resources and verbs to permissions
  and **fails closed on unmapped mutations**.
- `internal/auth/rbac.go` defines the role ladder `viewer < analyst < operator
  < admin` and `RequireRole`.
- Frontend role labels are display only. Never treat a client-supplied role,
  permission list, or edition as authorization.

### 5. Never trust frontend-supplied user IDs or tenant IDs

**Why.** Header and body fields are attacker-controlled; using them is tenancy
breakout.

**How (in this repo).**
- The tenant is derived from the verified JWT/API-key context
  (`c.GetString("tenant_id")`) in `internal/tenant/context.go`. `Resolve`
  **ignores** `X-Tenant-ID` and other spoofable headers.
- `internal/authn/middleware.go` sets `user_id`, `tenant_id`, `email`, `role`,
  `edition`, `permissions` on the request context **from verified claims only**.
- Enterprise API keys are resolved the same way in
  `internal/api/enterprise/apikeys.go` (`APIKeyAuthMiddleware`).
- Unauthenticated traffic maps to `tenant.PublicTenantID`
  (`00000000-0000-0000-0000-000000000001`), never to a client-declared tenant.

### 6. Isolate tenant data on every query

**Why.** One unscoped query is a cross-tenant data leak.

**How (in this repo).**
- Every tenant-owned query carries a `tenant_id` predicate. See
  `internal/database/queries.go` (`GetCBOMReport`, `UpdateCBOMReport`,
  `DeleteCBOMReport`, `ListCBOMReports`) and `internal/authn/store_sql.go`
  (`ListUsersByTenant`).
- Inserts that require tenant ownership validate it: e.g. "crypto asset requires
  tenant_id" in `internal/database/queries.go`.
- Schema enforces it: `tenant_id` is `NOT NULL REFERENCES tenants(id)` with
  tenant indexes and composite `(id, tenant_id)` keys in
  `internal/database/migrations.go`.
- `requireOneRow` turns "matched nothing" into `ErrNotFound`, so a scoped write
  can never silently succeed as a no-op.

### 7. Lock down the database

**Why.** A database reachable from the internet, or one account with `SUPERUSER`,
turns any application bug into total compromise.

**How (in this repo).**
- Connection config: `DATABASE_URL`, or `CRYPTOBOM_DB_HOST`,
  `CRYPTOBOM_DB_PORT`, `CRYPTOBOM_DB_USER`, `CRYPTOBOM_DB_PASSWORD`,
  `CRYPTOBOM_DB_NAME`, `CRYPTOBOM_DB_SSLMODE` (`internal/database/database.go`).
- Use a **least-privilege** application role (only the DML and migration rights
  it needs), never `SUPERUSER` and never the database owner for runtime traffic.
- Do not expose PostgreSQL publicly. In `docker-compose.yml` the dev port
  `5432:5432` is for local use only; production must keep the database on a
  private network.
- Use `sslmode=require` (or `verify-full`) in production. Note the built-in
  fallback default is `disable`; set `CRYPTOBOM_DB_SSLMODE` explicitly.
- Full detail: `docs/DATABASE_GUIDE.md`. `Recommended (not yet implemented)`:
  row-level security when the database is Supabase (see rule 8).

### 8. Secure third-party backends (Supabase, Firebase, Convex, R2)

**Why.** A leaked service key or missing backend rules bypasses your entire
authorization layer.

**How (in this repo).**
- Supabase is wired into the frontend in `web/src/services/supabase.ts` using
  only `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_KEY`. Only
  the **publishable** (anon) key may ever reach the browser; a `service_role`
  key must never be shipped in `web/`.
- `Recommended (not yet implemented)`: enable Supabase **Row Level Security** on
  every table and write policies keyed on `auth.uid()` / tenant claims. The Go
  backend talks to PostgreSQL directly via `lib/pq`, so RLS is defense in depth,
  not a substitute for rule 6.
- Firebase, Convex, and Cloudflare R2 are **not currently used** by this
  repository (no client in `internal/` or `web/src`). If a backend is adopted:
  use least-privilege, scoped keys; never embed an admin/service credential in
  `web/`; enable that platform's security rules; and scope object storage keys
  per tenant. Label it `Recommended (not yet implemented)` until it exists.

### 9. Protect admin routes

**Why.** Admin endpoints are the highest-value target and are often the least
guarded.

**How (in this repo).**
- Administrative actions require an admin-equivalent permission. Role changes go
  through `PermUsersManage` in `internal/auth/route_permissions.go`
  (`/auth/workspace/users/:id/role`), and `RequireRole("admin")`
  (`internal/auth/rbac.go`) can gate a route directly.
- Self-service endpoints (login, refresh, `/auth/me`, own sessions) are the only
  authentication routes that skip the permission table.
- Frontend hiding of an admin control is **not** protection. Assume a user can
  call the endpoint directly.

### 10. Disable production debug mode

**Why.** Debug mode leaks internals, stack traces, and sometimes credentials.

**How (in this repo).**
- `internal/server/server.go` forces `gin.ReleaseMode` for the Enterprise
  edition; `cmd/server/oss/main.go` sets `gin.SetMode(gin.ReleaseMode)`.
- Keep `DEMO_MODE` / `RIVICQ_ALLOW_DEMO_MODE` off in production. Demo responses
  are fabricated and never pass readiness (`/readyz` returns 503).
- Never enable test-only environment hooks (e.g. `RIVICQ_TEST_DATABASE_URL`,
  `RIVICQ_SMOKE_URLS`) in production.

### 11. Hide detailed errors from clients

**Why.** Stack traces, SQL errors, and library messages map your internals for an
attacker.

**How (in this repo).**
- Handlers return a stable error envelope (`error`, `message`, `request_id`) as
  in `internal/authn/middleware.go` and `internal/authn/enforce.go`; the message
  is user-facing, not the raw cause.
- Internal failures are logged with the `request_id` (see
  `internal/middleware/audit.go`) so an operator can correlate without exposing
  detail to the caller.
- Do not return `err.Error()` for unexpected failures. Some handlers currently
  return `gin.H{"error": err.Error()}` for `ShouldBindJSON` and validation
  errors; that is acceptable for input validation only, never for 5xx causes.

### 12. Validate all input server-side

**Why.** Client validation is a convenience, not a control.

**How (in this repo).**
- Bind and validate request bodies on the server with `ShouldBindJSON` and
  explicit checks; never trust a value because the UI constrained it.
- Passwords are validated in `internal/authn/password.go`: 12–72 bytes, at least
  three character classes, not a common password, and not derivable from the
  account's email or organisation.
- Untrusted artifacts are bounded by hard limits in `internal/firmware/limits.go`
  (file size, decompressed size, entries, depth, timeout).
- Set explicit HTTP server timeouts and a max header size
  (`internal/server/server.go`, `cmd/server/oss/main.go`) to resist slow clients.

### 13. Sanitize and escape user content

**Why.** Stored XSS turns one user's input into code running as another user.

**How (in this repo).**
- React escapes text by default; never inject untrusted data with
  `dangerouslySetInnerHTML` and never build HTML from user input.
- Keep the Content-Security-Policy in `internal/middleware/security.go` as tight
  as the app allows; do not widen it to `*`.
- Sanitize any content that is stored and later rendered, and escape it at the
  point of rendering.

### 14. Secure file uploads

**Why.** Uploads are a direct path to code execution and resource exhaustion.

**How (in this repo).**
- Firmware and identity analysis is **static and metadata-only**: artifacts are
  never executed and secrets/keys are never extracted
  (`internal/server/server.go` OpenAPI summaries; `internal/firmware`,
  `internal/identity`).
- Enforce size, decompressed-size, entry-count, depth, and timeout limits
  (`internal/firmware/limits.go`, `DefaultLimits`: 64 MiB file, 256 MiB
  decompressed, 2048 entries, depth 4, 30s).
- Validate the declared type against the actual content; do not trust the
  filename or `Content-Type`.
- `Recommended (not yet implemented)`: antivirus/content scanning on upload, and
  storing uploads outside the web root with no execute permission.

### 15. Prevent SQL and NoSQL injection

**Why.** String-concatenated queries execute attacker-supplied SQL.

**How (in this repo).**
- Every query uses parameter placeholders (`$1`, `$2`, …) with `database/sql`:
  see `internal/database/queries.go` and `internal/authn/store_sql.go`.
- `ListUsersByTenant` chooses between two fixed, parameterized statements, never
  concatenating the tenant value.
- For document stores, use typed operations and server-side rules rather than
  building query strings from input (see rule 8).

### 16. Rate-limit login and signup

**Why.** Without throttling, credential stuffing and signup abuse are free.

**How (in this repo).**
- `internal/middleware/ratelimit.go` applies a per-IP fixed-window limit and
  returns `429` with a `Retry-After: 60` header.
- Limits are edition-driven (`internal/edition/edition.go`): OSS 100/min,
  Enterprise 1000/min (overridable with `CRYPTOBOM_RATE_LIMIT`).
- The middleware trusts no proxy by default (`internal/middleware/middleware.go`);
  set `TRUSTED_PROXIES` explicitly so `X-Forwarded-For` cannot be spoofed to
  evade the limiter.
- `Recommended (not yet implemented)`: a dedicated, stricter bucket for
  `/auth/login` and `/auth/register`, per-account lockout/backoff, and emission
  of `X-RateLimit-*` response headers.

### 17. Add security headers

**Why.** Headers cheaply remove whole classes of browser attacks.

**How (in this repo).** `internal/middleware/security.go` sets
`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`,
`Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`,
`Content-Security-Policy`, and no-store cache headers. Security headers are not
optional and must not be removed to "make something work".

### 18. Restrict CORS to an allowlist

**Why.** Wildcard origins with credentials let any site act as a logged-in user.

**How (in this repo).**
- `internal/middleware/cors.go` allows only `https://rivicq.github.io` plus
  origins listed in `CORS_ORIGINS`, and echoes the request origin only when it
  is on the list. It never returns `*` together with credentials.
- Plain-http localhost/127.0.0.1/`::1` are allowed for local development only.
- Add allowed origins through `CORS_ORIGINS`; do not loosen the matcher.

### 19. Test as an untrusted user

**Why.** Tests written from the happy path miss exactly the holes attackers use.

**How (in this repo).**
- Assert cross-tenant denial and permission failures, not just success. See
  `internal/auth/route_permissions_test.go`, `internal/auth/enforce_test.go`,
  `internal/tenant/context_test.go`, and
  `internal/discovery/scan_manager_tenant_test.go`.
- For every change to auth, tenancy, or an admin route, add a test that proves
  the unauthorized caller is rejected. The manual checklist lives in
  `docs/SECURITY_GUIDE.md`.

## Enforcement

| Control | Where |
|---------|-------|
| Build, `go vet`, `gofmt -l`, tests | `.github/workflows/ci.yml` |
| `golangci-lint` | `.github/workflows/ci.yml`, `.github/workflows/ci-oss.yml` |
| OSS unit tests + build | `.github/workflows/ci-oss.yml` |
| Enterprise tests + build + smoke | `.github/workflows/ci-enterprise.yml` |
| CodeQL (actions, go, js/ts, python) | `.github/workflows/codeql.yml` |
| Snyk Open Source / Code / IaC / Container | `.github/workflows/snyk-security.yml` |
| RivicQ self-scan (`--fail-on BLOCK`) | `.github/workflows/rivicq-security.yml` |
| OWASP ZAP baseline DAST | `.github/workflows/dast-scan.yml` |
| Review checklist | `.github/pull_request_template.md` |

Reviewers reject changes that skip a rule; the pipeline catches formatting,
lint, type, and scanner regressions automatically.

## Deeper guides

- `docs/SECURITY_GUIDE.md` — secure coding and operations for this codebase.
- `docs/DATABASE_GUIDE.md` — schema, migrations, roles, TLS, backups, tenancy.
- `docs/API_GUIDE.md` — API conventions, auth headers, errors, OpenAPI.
- `docs/CODE_STYLE.md` — Go and TypeScript/React conventions.
- `SECURITY.md` (repository root) — vulnerability reporting and severity targets.
- `docs/SECURITY_CONTROL_MATRIX.md` — control-to-implementation mapping.
