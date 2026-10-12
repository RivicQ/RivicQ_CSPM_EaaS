# API Guide

Conventions for the RivicQ CSPM / CryptoBOM EaaS REST API, shared by the OSS and
Enterprise editions. The machine-readable source of truth is
`docs/openapi.yaml`; where this guide and the spec disagree, the spec wins.

## Contents

- [Base URLs and ports](#base-urls-and-ports)
- [Versioning](#versioning)
- [Authentication headers](#authentication-headers)
- [Pagination](#pagination)
- [Error envelope and status codes](#error-envelope-and-status-codes)
- [Rate limiting headers](#rate-limiting-headers)
- [Idempotency](#idempotency)
- [OpenAPI document and ReDoc](#openapi-document-and-redoc)
- [Request/response example](#requestresponse-example)

## Base URLs and ports

| Edition | Default port | Base URL | Notes |
|---------|--------------|----------|-------|
| OSS / Community | `8080` | `http://localhost:8080` | API prefix `/api/v1` |
| Enterprise | `9090` | `http://localhost:9090` | API prefix `/api/v1` |

The port is chosen by edition (`internal/server/server.go`: Enterprise defaults to
`9090`, otherwise `8080`) and can be overridden with `CRYPTOBOM_PORT`. The API is
mounted at `/api/v1` in both editions.

Hosted endpoints declared in `docs/openapi.yaml`:
`https://api.rivicq.oss.rivicq.com` and
`https://api.rivicq.enterprise.rivicq.com`.

Operational endpoints (not under `/api/v1`):

| Endpoint | Purpose |
|----------|---------|
| `GET /healthz` | Liveness; never fails on a dependency |
| `GET /readyz` | Readiness; `503` when the database is down or demo mode is on |
| `GET /edition` | Edition and feature flags |
| `GET /openapi.json` | Runtime OpenAPI summary generated in `internal/server/server.go` |

The frontend resolves the base URL from `REACT_APP_API_URL`, then `localStorage`,
then the `/api/v1` prefix; see `web/src/config/editions.ts`.

## Versioning

The API is versioned in the path: `/api/v1/...`. Breaking contract changes go
into a new major prefix; additive changes stay within `v1`. The spec version is
declared in `docs/openapi.yaml` (`info.version`). Do not introduce an unversioned
public endpoint.

## Authentication headers

Protected routes require a bearer credential. The authentication gate is
`internal/authn/enforce.go`; the allow-list of unauthenticated routes is
`internal/auth/public_routes.go`.

| Method | Header | Scope |
|--------|--------|-------|
| JWT (default) | `Authorization: Bearer <jwt>` | OSS and Enterprise |
| JWT (streaming fallback) | `?access_token=<jwt>` | Used by the auth middleware for SSE-style contexts |
| API key | `Authorization: Bearer cb_<hex>` | Enterprise (`internal/api/enterprise/apikeys.go`) |

JWT access tokens are short-lived HS256 tokens issued by `internal/authn`; the
claims carry `user_id`, `tenant_id`, `role`, `edition`, and `permissions`.
Enterprise API keys begin with the `cb_` prefix, are stored hashed, and bind the
same context keys. The server derives the tenant and user from the verified
credential, never from a client-supplied header or body field
(`docs/MASTER_RULES.md` rule 5).

Unauthenticated routes are limited to the self-service authentication endpoints,
the public product surface, and provider webhooks (which authenticate with a
provider signature, not a session token). See `internal/auth/public_routes.go`
for the current list.

## Pagination

Collection endpoints support pagination. `docs/openapi.yaml` documents `page`
(default `1`) and `limit` (default `50`) query parameters. Some handlers use
explicit `limit` / `offset` (for example the inventory handler defaults to
`limit=100`, `offset=0`). The exact parameters are per endpoint; check the spec
and the handler:

- Spec: `docs/openapi.yaml`.
- Tenant-scoped list query with `LIMIT`/`OFFSET`:
  `internal/database/queries.go` (`ListCBOMReports`).

Always bound `limit` server-side; never accept an unbounded page size.

## Error envelope and status codes

Errors are JSON. Authentication and authorization failures use the stable
envelope:

```json
{
  "error": "insufficient_permissions",
  "message": "Your role does not grant this operation.",
  "request_id": "b7f2c1e0-..."
}
```

Not every handler includes `message` and `request_id`; simple failures may return
only `{"error": "..."}`. `X-Request-ID` is echoed on every response
(`internal/middleware/requestid.go`) and the same id appears in the audit log.

| Status | Meaning | Example `error` |
|--------|---------|-----------------|
| `200` | Success | — |
| `201` | Created | — |
| `202` | Accepted (async scan started) | — |
| `204` | No content (CORS preflight) | — |
| `400` | Invalid request / validation | `Invalid JSON`, `role is required` |
| `401` | Missing or invalid credential | `authentication_required`, `invalid_token`, `unauthorized` |
| `403` | Authenticated but not permitted | `insufficient_permissions`, `insufficient_role`, `permission_not_defined` |
| `404` | Not found within the caller's tenant | `User not found` |
| `413` | Payload too large | firmware/identity artifact exceeds limit |
| `429` | Rate limited | `rate limit exceeded, try again in 1 minute` |
| `500` | Server error (detail redacted) | `Failed to ...` |
| `503` | Not ready / dependency down | readiness failure |

Handlers translate sentinel errors to status codes in
`internal/authn/handlers.go` (`statusForError`, `messageForError`). Do not return
raw internal errors for 5xx responses (`docs/SECURITY_GUIDE.md`, error
redaction).

## Rate limiting headers

`internal/middleware/ratelimit.go` applies a per-IP fixed window and, when the
limit is exceeded, returns `429` with:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

Every response also carries `X-Request-ID` and `X-CryptoBOM-Edition`
(`internal/middleware/middleware.go`). `Retry-After` is exposed to browsers via
CORS (`internal/middleware/cors.go`).

`Recommended (not yet implemented)`: `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
and `X-RateLimit-Reset` response headers, and a stricter dedicated bucket for
`/auth/login` and `/auth/register`.

## Idempotency

`Idempotency-Key` is accepted as a CORS-allowed request header
(`internal/middleware/cors.go`), but the server does **not** currently enforce
idempotency semantics.

`Recommended (not yet implemented)`: deduplicate mutating requests by
`Idempotency-Key` (store the key with the response for a bounded TTL and replay
the stored response for a repeated key).

Until then, treat POST endpoints as non-idempotent. Scan creation returns `202`
with an id; poll the scan resource rather than resubmitting.

## OpenAPI document and ReDoc

- **Spec (source of truth):** `docs/openapi.yaml` (OpenAPI 3.0.3).
- **Runtime summary:** `GET /openapi.json`, generated in
  `internal/server/server.go` (`registerOpenAPISpec`).
- **ReDoc:** the GitHub Pages workflow builds the spec into a static ReDoc page
  at `/api/` — `.github/workflows/pages.yml` runs
  `npx redoc-cli bundle docs/openapi.yaml -o web/build/api/index.html`, and
  `docs/index.html` links to it as `../api/index.html`.

When you change a route, update `docs/openapi.yaml` in the same pull request, and
update the runtime summary if you added a top-level endpoint.

## Request/response example

Create a CBOM report (authenticated, tenant derived from the token):

```http
POST /api/v1/cbom HTTP/1.1
Host: localhost:8080
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
X-Request-ID: 6f1c2b7a-...

{
  "name": "Q4 inventory",
  "version": "1.0.0",
  "status": "pending"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Request-ID: 6f1c2b7a-...
X-CryptoBOM-Edition: oss

{
  "id": "8b1e...-cbom",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "name": "Q4 inventory",
  "version": "1.0.0",
  "status": "pending",
  "created_at": "2026-01-01T12:00:00Z",
  "updated_at": "2026-01-01T12:00:00Z"
}
```

A rejected request (viewer attempting a mutation, or a missing token):

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "insufficient_permissions",
  "required": "cbom:write",
  "message": "Your role does not grant this operation.",
  "request_id": "6f1c2b7a-...",
  "authenticated_role": "viewer"
}
```

Start a scan (asynchronous):

```http
POST /api/v1/scans HTTP/1.1
Authorization: Bearer <jwt>
Content-Type: application/json
```

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
```

Scan progress streams over Server-Sent Events at
`GET /api/v1/scans/{id}/stream` (`internal/server/server.go`).

## Conventions to keep

- Always send `Authorization: Bearer <jwt>` for private routes.
- Always send and log `X-Request-ID` when calling from a service.
- Never pass a user or tenant id in the body and expect it to be honored; the
  server derives identity from the credential.
- Use `docs/openapi.yaml` for exact parameters, request bodies, and status codes.
- Return the stable error envelope; do not invent new error shapes.

## Related documents

- `docs/MASTER_RULES.md` — canonical rules (rules 3, 4, 5, 11, 16).
- `docs/SECURITY_GUIDE.md` — authentication and error redaction details.
- `docs/DATABASE_GUIDE.md` — the data layer behind these endpoints.
- `docs/openapi.yaml` — the OpenAPI 3.0.3 specification.
