# EaaS API

Reference for the standalone EaaS router in `internal/eaas/http.go`, the service behaviour in `internal/eaas/service.go`, and the crypto catalogue in `internal/eaas/crypto.go`. Paths, status codes and response keys below are taken from those files. The API is versioned under `/api/eaas/v1` and `/api/beta/v1`; it is independent of the legacy CSPM router.

Companions: [Product status](EAAS_PRODUCT_STATUS.md) · [Deployment](EAAS_DEPLOYMENT.md) · [Security & privacy](EAAS_SECURITY_PRIVACY.md) · [Limitations](EAAS_LIMITATIONS.md) · [Testing & CI](EAAS_TESTING_CI.md) · [Freemium & metering](EAAS_FREEMIUM_AND_METERING.md)

## Transport and error shape

- `GET /healthz` returns `{"status":"healthy","service":"RivicQ EaaS","environment":<EAAS_ENV>}`.
- JSON request bodies are capped at 2 MiB by `bindJSON` (`internal/eaas/http.go:108-115`).
- Errors are returned as `{"error":{"code":"...","message":"...","request_id":"..."}}` (`internal/eaas/http.go:104-106`). The `request_id` field is populated from the Gin context; no request-ID middleware is present in the EaaS files.
- Observed error codes include `E_INVALID_REQUEST`, `E_UNAUTHORIZED`, `E_FORBIDDEN`, `E_NOT_FOUND`, `E_ACCOUNT_EXISTS`, `E_CODE_INVALID`, `E_CODE_EXPIRED`, `E_VERIFICATION_REQUIRED`, `E_PLAN_RESTRICTION`, `E_DOWNGRADE_BLOCKED`, `E_REGISTRATION_EXISTS`, `E_OPERATION_UNAVAILABLE`, `E_QUOTA_EXCEEDED`, `E_RATE_LIMITED`, `E_KEY_NOT_FOUND`, `E_DECRYPT_FAILED`, `E_MAC_INVALID`, `E_SIGNATURE_INVALID`, `E_DECAPSULATE_FAILED`, `E_INTERNAL` (`internal/eaas/service.go`, `internal/eaas/crypto.go`).
- Security headers on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` (`internal/eaas/http.go:70-78`).
- CORS: a configured origin receives `Access-Control-Allow-Origin`, `Vary: Origin`, `Access-Control-Allow-Credentials: true`, allowed headers `Authorization, Content-Type, X-Request-ID`, methods `GET, POST, DELETE, OPTIONS`. Unconfigured origins get no allow-origin header. `OPTIONS` is answered `204` (`internal/eaas/http.go:80-102`).

## Routes

### Public

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/eaas/v1/plans` | — | `plans` (four plans), `currency: "EUR"`, `billing_integration: "manual_not_configured"` |
| GET | `/api/eaas/v1/operations` | — | `operations` catalogue, note on maturity: PQC experimental, classical Go standard-library crypto |
| POST | `/api/eaas/v1/auth/register` | `name` (2–120), `email` (valid), `password` (12–128) | `201`: `user_id`, `email`, `verified: false`, `session_token`, `session_expires_at`; in non-production `dev_verification_code` and `dev_notice` |
| POST | `/api/eaas/v1/auth/login` | `email`, `password` | `200`: same session fields; a new session token, API keys unchanged |
| POST | `/api/beta/v1/registrations` | `name`, `work_email`, `organisation`, `role`, `use_case` (10–2000), `edition_interest[]`, `deployments[]`, `integrations[]`, `consent: true` | `201`: `id`, `status: "received_pending_review"`, message stating this is not an invitation or approval |
| GET | `/api/beta/v1/registrations` | header `X-Admin-Token` must equal `EAAS_ADMIN_TOKEN` | `200`: `registrations` (id, name, work_email, organisation, role, status, created_at, edition_interest, deployments, integrations); `403` when token missing/invalid or admin token unconfigured |

Enumerated beta values are validated (`internal/eaas/service.go:874-904`): `edition_interest` ∈ `community, enterprise, eaas_api, open_source_cloud`; `deployments` ∈ `saas, self_hosted, private_cloud, on_premises`; `integrations` ∈ `ai, quantum, hardware_hsm, wireless, cloud_cspm`. Selecting an interest is not an implementation of that capability. Duplicate work emails return `409 E_REGISTRATION_EXISTS`.

### Session-authenticated (`Authorization: Bearer <session_token>`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/eaas/v1/auth/verify` | `code` (6 digits); `200 {"verified":true}`. Five failed attempts or 24 h expiry end the attempt window (`internal/eaas/service.go:189-223`) |
| POST | `/api/eaas/v1/auth/logout` | Deletes the current session |
| GET | `/api/eaas/v1/auth/me` | `user_id`, `email`, `name`, `verified`, `plan` |
| GET | `/api/eaas/v1/projects` | `projects` owned by the session user |
| POST | `/api/eaas/v1/projects` | `name` (2–80), `environment: sandbox\|production` (default `sandbox`); production requires Startup or above; 201 with `id`, `name`, `environment`, `created_at` |
| GET | `/api/eaas/v1/projects/:id/keys` | `api_keys`: id, prefix, environment, created_at, last_used_at, revoked |
| POST | `/api/eaas/v1/projects/:id/keys` | Issues one API key; 201 with `id`, `key`, `prefix`, `environment`, `created_at`, `shown_once: true` |
| POST | `/api/eaas/v1/projects/:id/crypto-keys` | `algorithm` ∈ `aes-256-gcm, hmac-sha-256, mlkem-768, mldsa-65`; 201 with `key_id`, `algorithm`, `created_at` and `public_key` when applicable; private bytes never returned |
| DELETE | `/api/eaas/v1/keys/:id` | Revoke; `200 {"status":"revoked"}` |
| POST | `/api/eaas/v1/keys/:id/rotate` | Revoke and issue a replacement in one update; returns the new key shown once |
| GET | `/api/eaas/v1/usage/summary` | Current UTC-month usage and quota (see [Freemium & metering](EAAS_FREEMIUM_AND_METERING.md)) |
| GET | `/api/eaas/v1/usage/events` | `events`, up to 50 most recent for the user; metadata only |
| GET | `/api/eaas/v1/subscription` | `plan`, `billing_status`, `status: "active"` |
| POST | `/api/eaas/v1/subscription` | `plan: free\|startup\|professional\|enterprise`; changes entitlements immediately, returns notice that payment collection is not implemented |

Projects and credentials require a verified account (`E_VERIFICATION_REQUIRED`). Cross-tenant project IDs return `404`; key lookup for operations requires matching user, project and algorithm (`internal/eaas/service.go:382-390,720-741`). API keys are prefixed `eaas_sb_` for sandbox and `eaas_live_` for production (`internal/eaas/service.go:406-415`).

### API-key-authenticated operations (`Authorization: Bearer <api_key>`)

`POST /api/eaas/v1/operations/<id>` for each id below (`internal/eaas/http.go:52-59`). Binary fields are base64 strings. Decoded input limits (`internal/eaas/service.go:566-718`): `message` 1 MiB, `aad` 64 KiB, `ciphertext` 1 MiB, `nonce` 64 bytes, `signature` 16 KiB, `public_key` 16 KiB, `bytes` integer 1–1024 for `random`. Every successful response adds `operation` and `maturity` (`internal/eaas/service.go:748-749`).

| Operation | Maturity | Required input | Key requirement | Output fields |
|---|---|---|---|---|
| `encrypt` | Beta implemented | `message` (≤1 MiB), optional `aad` | `key_id` (aes-256-gcm) | `ciphertext`, `nonce` |
| `decrypt` | Beta implemented | `ciphertext`, `nonce`, optional `aad` | `key_id` (aes-256-gcm) | `plaintext`; tampering → `E_DECRYPT_FAILED` |
| `mac_sign` | Beta implemented | `message` | `key_id` (hmac-sha-256) | `mac` — a MAC, not a digital signature |
| `mac_verify` | Beta implemented | `message`, `signature` | `key_id` (hmac-sha-256) | `valid: true`; mismatch → `E_MAC_INVALID` |
| `digest` | Beta implemented | `message` | none | `digest` (SHA-256) |
| `random` | Beta implemented | `bytes` (1–1024) | none | `bytes` |
| `mlkem768_keygen` | Experimental | none | generated server-side | `key_id`, `public_key` |
| `mlkem768_encapsulate` | Experimental | `public_key` | none | `ciphertext`, `shared_secret` |
| `mlkem768_decapsulate` | Experimental | `ciphertext`, `key_id` | `key_id` (mlkem-768) | `shared_secret` |
| `mldsa65_keygen` | Experimental | none | generated server-side | `key_id`, `public_key` |
| `mldsa65_sign` | Experimental | `message`, `key_id` | `key_id` (mldsa-65) | `signature` |
| `mldsa65_verify` | Experimental | `public_key`, `message`, `signature` | none | `valid: true`; mismatch → `E_SIGNATURE_INVALID` |

Only the public key is returned from key generation; private material is stored server-side. `mlkem768_keygen` and `mldsa65_keygen` create and persist a key on each call (`internal/eaas/service.go:679-694`). The API catalogue is the authoritative list of 12 operations; SLH-DSA is not in it (`internal/eaas/crypto.go:29-42`).

## Minimal flow

1. `POST /api/eaas/v1/auth/register` → store `session_token`; in development, read `dev_verification_code`.
2. `POST /api/eaas/v1/auth/verify` with the code.
3. `POST /api/eaas/v1/projects` with `{"name":"my-sandbox","environment":"sandbox"}`.
4. `POST /api/eaas/v1/projects/<id>/keys` → save `key` immediately; it is shown once.
5. `POST /api/eaas/v1/projects/<id>/crypto-keys` with `{"algorithm":"aes-256-gcm"}` → save `key_id`.
6. `POST /api/eaas/v1/operations/encrypt` with base64 `message`, optional base64 `aad`, and `key_id` using the API key as bearer credential.
7. `GET /api/eaas/v1/usage/summary` and `/usage/events` using the session token.

The portal at `/portal` performs this same flow in the browser (`web/eaas/index.html:184-276`). Quota and RPM checks run before crypto execution (`internal/eaas/service.go:659-677`).
