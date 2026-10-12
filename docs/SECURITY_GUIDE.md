# Security Guide

Secure coding and operations guide for the RivicQ CSPM / CryptoBOM EaaS
codebase. This is the deeper companion to `docs/MASTER_RULES.md`: it explains how
the controls are actually implemented and how to extend them without punching a
hole in them.

Reporting a vulnerability is governed by `SECURITY.md` (root). Report privately
to `security@rivicq.com`; do not open a public issue for an exploitable finding.

## Contents

- [Authentication model](#authentication-model)
- [Tenant isolation](#tenant-isolation)
- [Authorization (RBAC and route permissions)](#authorization-rbac-and-route-permissions)
- [CORS allowlist](#cors-allowlist)
- [Rate limiting](#rate-limiting)
- [Password hashing and policy](#password-hashing-and-policy)
- [Input validation](#input-validation)
- [Error redaction](#error-redaction)
- [Security headers](#security-headers)
- [Secret management](#secret-management)
- [Dependency and supply-chain scanning](#dependency-and-supply-chain-scanning)
- [Trusted proxies and client IP](#trusted-proxies-and-client-ip)
- [Untrusted-user test checklist](#untrusted-user-test-checklist)

## Authentication model

Implemented in `internal/authn/` (lifecycle) and `internal/auth/` (authorization
data). The lifecycle covers registration, email verification, login, optional
MFA, short-lived access tokens, rotating opaque refresh sessions, logout,
password reset/change, and per-session revocation.

| Concern | Implementation | File |
|---------|----------------|------|
| Access token | HS256 JWT, short TTL (default 15m) | `internal/authn/token.go` |
| Claims | `user_id`, `tenant_id`, `email`, `role`, `edition`, `permissions` | `internal/authn/token.go` |
| Token verification | HS256 only; issuer, audience and expiry required | `internal/authn/token.go` |
| Refresh session | Opaque random token, stored as SHA-256 only | `internal/authn/store.go`, `internal/authn/store_sql.go` |
| Reuse detection | Rotation records `rotated_to`; reuse revokes | `internal/authn/service.go` |
| Signing secret | Required, ≥32 bytes, no default | `internal/authn/config.go` |
| Single-use tokens | Email verify / password reset / MFA challenge | `internal/authn/authn.go` |
| Request binding | Sets context keys from verified claims | `internal/authn/middleware.go` |
| Deny-by-default gate | `EnforceAuth` + public allow-list | `internal/authn/enforce.go`, `internal/auth/public_routes.go` |

Design rules stated in `internal/authn/authn.go`:

- No default or published secrets. A signing secret must be supplied.
- Refresh tokens are opaque and stored only as SHA-256 hashes.
- Every credential is single-use and time-boxed.
- Demo identity exists only when `DemoMode` is explicitly enabled.

Configuration (`internal/authn/config.go`): `AUTH_JWT_SECRET` / `JWT_SECRET`,
`AUTH_JWT_ISSUER`, `AUTH_JWT_AUDIENCE`, `AUTH_ACCESS_TTL` (15m),
`AUTH_REFRESH_TTL` (168h), `AUTH_RESET_TTL` (30m), `AUTH_VERIFY_TTL` (24h),
`AUTH_MFA_SESSION_TTL` (10m), `DEMO_MODE`, `AUTH_ALLOW_REGISTRATION`,
`AUTH_REQUIRE_VERIFICATION`, `AUTH_ALLOWED_DOMAINS`, and the bootstrap account
(`AUTH_BOOTSTRAP_EMAIL` / `AUTH_BOOTSTRAP_PASSWORD` / `AUTH_BOOTSTRAP_ROLE`).

Enterprise API keys (`internal/api/enterprise/apikeys.go`) use the
`Authorization: Bearer cb_<hex>` form, are stored as SHA-256 with an indexed
8-character prefix, carry `status`/`expires_at`, and bind the same context keys
as a JWT.

Public (unauthenticated) endpoints are an explicit allow-list in
`internal/auth/public_routes.go`. Adding an entry there is a security decision and
must be justified in review. Do not add an "optional auth" path; the default is
deny.

## Tenant isolation

The tenant is derived from verified context, never from a client header or body.

- `internal/tenant/context.go` — `Resolve` reads `c.GetString("tenant_id")`
  (set by the JWT or API-key middleware). `X-Tenant-ID` and other spoofable
  headers are ignored. Unauthenticated traffic maps to `PublicTenantID`
  (`00000000-0000-0000-0000-000000000001`).
- `internal/authn/middleware.go` — `tenant_id` is set from verified claims.
- `internal/database/queries.go` — every tenant-owned query carries a
  `tenant_id` predicate; `requireOneRow` turns "matched nothing" into
  `ErrNotFound` so a scoped write cannot silently no-op.
- `internal/database/migrations.go` — schema enforces tenancy: `tenant_id` is
  `NOT NULL REFERENCES tenants(id)`, with tenant indexes and composite
  `(id, tenant_id)` keys.

Rules for new code:

1. Read the tenant from context (`tenant.Resolve(c)`), never from a request
   field.
2. Include `tenant_id` in every `WHERE` for reads, updates, and deletes, and on
   every insert.
3. Add a tenant index for new tenant-owned tables.
4. Add a test that proves a different tenant gets `ErrNotFound` / 404, not data.

## Authorization (RBAC and route permissions)

- `internal/auth/rbac.go` — role ladder `viewer < analyst < operator < admin`;
  `NormalizeRole` clamps unknown roles to `viewer`; `RequireRole` guards a route.
- `internal/auth/route_permissions.go` — maps resource prefix + HTTP verb to a
  permission and **fails closed on unmapped mutations** (POST/PUT/PATCH/DELETE).
  Reads are allowed when unmapped because reads are already tenant-scoped.
- `internal/auth/permissions.go` — the permission constants and role grants.

Frontend labels are display only (`internal/auth/rbac.go` role aliases note that
JWT still stores the four persisted roles). Never authorize on a client-supplied
role, permission, or edition value.

## CORS allowlist

`internal/middleware/cors.go`:

- Allowed origins default to `https://rivicq.github.io` plus `CORS_ORIGINS`
  (comma-separated).
- The request `Origin` is echoed only when it is on the allow-list; the matcher
  never emits `*` together with `Access-Control-Allow-Credentials: true`.
- Plain-http `localhost`, `127.0.0.1`, and `::1` are allowed for local
  development (`AllowLocalDev`), matching `react-scripts` first-free-port
  behavior.
- Allowed headers include `Authorization`, `X-Request-ID`, `Idempotency-Key`;
  exposed headers are `X-Request-ID`, `X-CryptoBOM-Edition`, `Retry-After`;
  `Max-Age` is 12h.

To add an origin, set `CORS_ORIGINS`; do not weaken the matcher.

## Rate limiting

`internal/middleware/ratelimit.go` implements a per-client-IP fixed window:

- `RateLimit(limit)` returns `429` with `Retry-After: 60` when exceeded.
- Window is 1 minute; a cleanup goroutine evicts stale visitors every 10
  minutes.
- The limit is edition-driven: OSS 100, Enterprise 1000
  (`internal/edition/edition.go`), overridable with `CRYPTOBOM_RATE_LIMIT`.

The limiter keys on `c.ClientIP()`, which is only trustworthy when proxies are
configured (see below). `Recommended (not yet implemented)`: a stricter,
dedicated bucket for `/auth/login` and `/auth/register`, per-account lockout,
and `X-RateLimit-*` response headers.

## Password hashing and policy

`internal/authn/password.go`:

- Hashing: `golang.org/x/crypto/bcrypt` at `bcrypt.DefaultCost`
  (`HashPassword`, `CheckPassword`).
- Length: minimum 12 characters; maximum 72 bytes (bcrypt truncates at 72).
- No leading/trailing whitespace.
- Deny list of common passwords (`commonPasswords`).
- At least three of four character classes: lowercase, uppercase, digit, symbol.
- Must not contain the account's email local part or organisation name.

Never log or return a password or hash. `User.PasswordHash` and `MFASecret` are
excluded from JSON (`json:"-"` in `internal/authn/authn.go`).

## Input validation

- Bind bodies on the server (`ShouldBindJSON`) and check every field explicitly.
- Password policy is enforced server-side regardless of any frontend meter.
- Untrusted artifacts are bounded by hard limits in `internal/firmware/limits.go`:
  64 MiB file, 256 MiB decompressed, 2048 archive entries, depth 4, 30s timeout.
- HTTP server timeouts and header size limits are set in
  `internal/server/server.go` and `cmd/server/oss/main.go`.

## Error redaction

- Handlers return a stable envelope (`error`, `message`, `request_id`) rather
  than raw errors for authentication and authorization failures
  (`internal/authn/enforce.go`, `internal/authn/middleware.go`).
- Audit/logging redacts sensitive query parameters
  (`internal/middleware/audit.go`, `redactQuery`): names containing `token`,
  `secret`, `password`, `api_key`, `private_key`, `authorization`, `code`,
  `client_secret`, or `sig` are replaced with `[REDACTED]`.
- Never return `err.Error()` for an unexpected (5xx) failure. Returning it for
  input-validation errors is acceptable.

## Security headers

`internal/middleware/security.go` sets, on every response:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | `default-src 'self'; ... frame-ancestors 'none'` |
| `Cache-Control` | `no-store, no-cache, must-revalidate` |

Do not relax these to unblock a feature; fix the feature instead.

## Secret management

- No default secrets anywhere. `internal/authn/config.go` fails startup without a
  sufficient signing secret; `internal/database/database.go` refuses a default
  database password.
- `.gitignore` blocks `.env`, `.env.*`, `secrets/`, `*.pem`, `*.key`, `*.ppk`,
  and the key files named in `docs/SECURITY_SECRET_REMEDIATION.md`.
- Keep secrets in environment variables or a secret manager. Add new variables
  to `.env.example` as placeholders only.
- Rotate any credential that was ever committed, even if deleted; history keeps
  a copy. See `docs/SECURITY_SECRET_REMEDIATION.md`.
- `Recommended (not yet implemented)`: pre-commit secret scanning (`gitleaks` /
  `trufflehog`) and a manager abstraction (e.g. Vault) for production.

## Dependency and supply-chain scanning

| Scanner | Workflow | Notes |
|---------|----------|-------|
| CodeQL (actions, go, js/ts, python) | `.github/workflows/codeql.yml` | Runs scheduled + manual; Go toolchain installed for extraction |
| Snyk (Open Source, Code, IaC, Container) | `.github/workflows/snyk-security.yml` | Skips cleanly until `SNYK_TOKEN` is set |
| RivicQ self-scan (`--fail-on BLOCK`) | `.github/workflows/rivicq-security.yml` | Builds the CLI and scans the repo |
| OWASP ZAP baseline | `.github/workflows/dast-scan.yml` | Daily against the staging target |
| Dependabot | `.github/dependabot.yml` | Dependency update PRs |

Go modules are pinned in `go.mod` / `go.sum`; the frontend lockfile is
`web/package-lock.json`. Do not add a dependency that is unmaintained or that
duplicates an existing library.

## Trusted proxies and client IP

`internal/middleware/middleware.go` trusts **no** proxies unless `TRUSTED_PROXIES`
is set. With Gin's default (trust all), `X-Forwarded-For` can be spoofed to
bypass the rate limiter and to poison the audit log. Set `TRUSTED_PROXIES` to
your load balancer's addresses in production; leave it unset otherwise.

## Untrusted-user test checklist

Run through this list for any change touching auth, tenancy, admin routes, or
input handling. Add automated tests where the existing suites do
(`internal/auth/*_test.go`, `internal/tenant/context_test.go`,
`internal/discovery/scan_manager_tenant_test.go`).

- [ ] A request with **no** `Authorization` header to a private route returns
  `401`.
- [ ] A request with a **garbage or expired** token returns `401`
  (`invalid_token`).
- [ ] A valid **viewer** token hitting a mutation returns `403`
  (`insufficient_permissions`), not success.
- [ ] A token for **tenant A** cannot read, update, or delete **tenant B** data
  (expect `404` / `ErrNotFound`, never data).
- [ ] A client-supplied `X-Tenant-ID` (or body `tenant_id`/`user_id`) is
  ignored; the JWT's tenant still wins.
- [ ] An **unmapped mutating route** fails closed (`permission_not_defined`).
- [ ] Login/refresh endpoints are rate-limited; the 429 carries `Retry-After`.
- [ ] CORS: an unlisted origin gets no `Access-Control-Allow-Origin`; a listed
  one does, and credentials are never combined with `*`.
- [ ] Error responses do not leak stack traces, SQL text, or library messages.
- [ ] Security headers are present on the response.
- [ ] Passwords and tokens never appear in logs or response bodies.
- [ ] Uploaded/analyzed artifacts are never executed and are size-bounded.

## Related documents

- `docs/MASTER_RULES.md` — the canonical ruleset.
- `docs/DATABASE_GUIDE.md` — database security, roles, TLS, backups.
- `docs/SECURITY_CONTROL_MATRIX.md` — control mapping (mappings, not
  certifications).
- `SECURITY.md` — reporting, severity, and response targets.
- `docs/SECURITY_SECRET_REMEDIATION.md` — secret history remediation.
