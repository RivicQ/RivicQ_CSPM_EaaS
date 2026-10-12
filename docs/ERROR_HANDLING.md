# Error Handling and Failure Semantics

How RivicQ surfaces, stores, retries, and hides failures across the API, engine, middleware, and UI. Error payloads are JSON, machine-readable, and never contain secret material or raw third-party content.

## 1. Error model

The API responds with a structured object in the HTTP body on `4xx`/`5xx`:

```json
{
  "error": "scan failed",
  "message": "the target could not be read",
  "details": "socket: connection reset by peer"
}
```

- `error` — stable short code (`internal/api/shared/errors.go`, `ErrorResponse` type).
- `message` — human-readable summary safe for UI display.
- `details` — diagnostic detail; may include hostname/scan id, never tokens or body content.

Handlers return `c.JSON(status, ErrorResponse{...})`; panics inside a scan flow become a `500` after the middleware recovers and audit-log the panic without leaking stack values (`internal/middleware/middleware.go` recovery-logging in Setup).

## 2. HTTP status usage

| Status | Meaning | Examples |
|---|---|---|
| `400` | Invalid request body/params | bad JSON, invalid target string, unsupported media |
| `401` | Unauthenticated / bad token | expired JWT, missing/invalid bearer, invalid credentials |
| `403` | Authenticated but not permitted | role `RequireRole`, webhook signature mismatch, rate-limited |
| `404` | Unknown route or resource | unscoped/unknown scan id — deliberately used to hide cross-tenant existence |
| `409` | Conflict not expected | user email already used, duplicate webhook delivery (601) expected for GitHub pushes is `delivered` not error |
| `413` | Too large | 8 MiB webhook body cap |
| `422` | Semantics invalid | policy gate `BLOCK` on scan (client can retry after review) |
| `429` | Rate limited | per-IP window, `Retry-After: 60` |
| `500` | Unhandled internal failure | database down, external connector error |

`/healthz` never fails on dependencies; `/readyz` returns `503` without a database or in demo mode (readiness, not liveness).

## 3. Layer-by-layer handling

| Layer | Contract |
|---|---|
| Middleware | `RequestID` propagates `X-Request-ID`; SecurityHeaders set `no-store`; Audit records request+response status; RateLimit returns `429`; CORS preflight errors are `403` with `Access-Control-Allow-Origin` absent; recovery logs panic and returns generic 500 (`internal/middleware/*`) |
| Auth | `internal/authn` returns typed errors (`ErrInvalidToken`, `ErrExpired`, `ErrInvalidCredentials`, `ErrPasswordTooWeak`); handlers map them to 401/403 without echoing the attempted identity where policy requires (`internal/api/shared/standard_auth.go`) |
| Tenant | Unscoped lookups resolve to 404; `internal/tenant/context.go` errors (`ErrNoTenant`) are internal and never surfaced raw |
| Engine | `internal/discovery` wraps target validation (`ErrBlockedTarget`), dial, and read errors into scan-level findings/report state rather than aborting a whole multi-target scan; `internal/intelligence` normalizes per-detector errors to `Finding` status |
| Database | `internal/database` maps connection failure to a bounded retry (auth/health vs state-dependence); migration checksum mismatch aborts startup loudly (`migrate.go`) |
| External tools | `internal/intelligence/adapters_external.go` skips an optional tool (Syft/Trivy/Grype/Gitleaks/OSV) when it is not installed rather than failing the scan, and records a `tool_skipped` note |
| Connectors | Cloud/HSM/IBM presence requires credentials; empty/missing config yields an honest empty-state response, never a fabricated estate |

## 4. Retries and idempotency

- Client: TanStack Query retries `GET`s (default 3 attempts, 1s backoff, double); `POST` mutations are never auto-retried (`web/src/services/api.ts`).
- Server: webhook deliveries are retried by the webhook worker (delivery cache, `delivery_cache.go`) with backoff; replay of the same `delivery-id` is detected and returns `duplicate_delivery` in tests (`github_webhook_security_test.go`).
- SSE: `events.go` keeps the scan stream best-effort — on client disconnect the scan continues, and the client recovers state by polling `GET /api/v1/scans/:id`; stream reconnects with an `X-Request-ID` re-armed from polling.
- Graceful shutdown drains for 20s; in-flight scans complete, new requests get a bounded 503 while draining (`internal/server/server.go`).

## 5. Never leak

- Never include the secret value of anything (tokens, keys, cloud credentials, MFA secrets) in an error message, audit field, or log. Gitleaks findings are metadata-only.
- Never echo raw webhook bodies (`cmd/rivicq`, scan result views keep evidence truncated/hashed where the policy says so).
- Never surface internal package paths by default in user-facing errors; details are for operators and gated behind log level.
- Panics are logged with stack at server log level but returned to clients as a generic 500 (`App: panic recovered` message body).
- `/.env.example` and `dotenv` loaders keep placeholder values; `docs/SECURITY_SECRET_REMEDIATION.md` records the enforcement process.

## 6. UI error surface

| Condition | UI |
|---|---|
| Network / query failure | MUI inline alert + `toast.error` with message from JSON `message` field; retry action on alert |
| 401 during flow | `AuthProvider` marks session expired -> redirect `/login?returnTo=...` |
| 403 | `RequireRole` shows "You don't have permission" panel, CTA to role owner |
| 404 on detail | `EmptyState` "No result to show" rather than raw JSON |
| Scan completed with BLOCK findings | Success toast plus banner on report page listing gate violations (`BLOCK`/`WARN`) and a "Review findings" CTA |
| Rate limited | `toast.error` including `Retry-After` window and a "Try again in a moment" disabled state on the target field |

## 7. Related

- `docs/DEVSECOPS.md` for CI failure gates and SCA/DAST artifacts.
- `docs/TESTING.md` covers error-path tests (isolation, webhook security, scanner flow).
- `docs/OPS_RUNBOOK.md` for operational alerting on repeated 5xx.