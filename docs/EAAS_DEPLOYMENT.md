# EaaS deployment

How the standalone EaaS binary is configured and what its persistence boundary is today. Evidence: `cmd/eaas/main.go`, `internal/eaas/http.go`, `internal/eaas/store.go`, `internal/eaas/service.go`, `deploy/migrations/004_eaas_schema.sql`, `.github/workflows/eaas-ci.yml`, `web/eaas/index.html`.

Companions: [Product status](EAAS_PRODUCT_STATUS.md) · [API](EAAS_API.md) · [Security & privacy](EAAS_SECURITY_PRIVACY.md) · [Limitations](EAAS_LIMITATIONS.md) · [Testing & CI](EAAS_TESTING_CI.md)

## Run the standalone service

```
go run ./cmd/eaas
```

`cmd/eaas/main.go:14-53` reads flags with environment-variable defaults, builds the router, mounts the optional static portal, and starts an `http.Server` on the configured address. The default listen address is `:9091`, separate from the legacy CSPM ports described in `docs/PRD.md`. Routes served are `/healthz`, `/api/eaas/v1/*`, `/api/beta/v1/*`, plus `/` and `/portal` when a static directory is configured (`internal/eaas/http.go:12-68`; `cmd/eaas/main.go:34-37`).

## Configuration

| Environment variable | Flag | Default | Effect |
|---|---|---|---|
| `EAAS_ADDR` | `-addr` | `:9091` | Listen address |
| `EAAS_DATA_FILE` | `-data` | `./data/eaas-store.json` | Sandbox state file; required to be non-empty by `NewStore` |
| `EAAS_ENV` | `-env` | `development` | Environment name; `production` suppresses the dev verification code and is the label reported by `/healthz` |
| `EAAS_STATIC_DIR` | `-static` | `./web/eaas` | Directory for `/portal` and `/` (`index.html`); an empty value disables both portal routes |
| `EAAS_ADMIN_TOKEN` | `-admin-token` | empty | Enables `GET /api/beta/v1/registrations`; without it the admin listing returns `403` |
| `EAAS_ALLOWED_ORIGINS` | `-allowed-origins` | empty | Comma-separated **exact** CORS origin allowlist; unlisted origins receive no `Access-Control-Allow-Origin` |

`EAAS_ADDR`, `EAAS_DATA_FILE`, `EAAS_ENV` and `EAAS_STATIC_DIR` use `envDefault`: a non-empty trimmed environment value wins over the default (`cmd/eaas/main.go:55-60`). `EAAS_ADMIN_TOKEN` and `EAAS_ALLOWED_ORIGINS` are read directly from the environment unless a flag overrides them; the origin list is comma-split and trimmed (`cmd/eaas/main.go:19-20,62-74`). Configure the allowlist explicitly for every deployment that uses a browser client; the portal itself calls the same-origin `/api/...` paths (`web/eaas/index.html:166`).

Server timeouts in `cmd/eaas/main.go:39-47`: `ReadHeaderTimeout` 5 s, `ReadTimeout` 15 s, `WriteTimeout` 15 s, `IdleTimeout` 60 s, `MaxHeaderBytes` 1 MiB.

## Persistence boundary

- The implemented store is an atomic JSON file for **local sandbox use only** (`internal/eaas/store.go:12-18`). `NewStore` creates the parent directory with mode `0700`; each successful `Update` writes `<data file>.tmp` with mode `0600` and renames it over the state file (`internal/eaas/store.go:139-163,195-222`). Concurrency safety is a process-local `sync.RWMutex`; no multi-process coordination is present in these files.
- State includes users, sessions, projects, API keys, server-held crypto keys, subscriptions, beta registrations, usage events and rate windows (`internal/eaas/store.go:21-32`).
- Server-held private key bytes are persisted base64 in this file. The portal disclosure states they require filesystem protection (`web/eaas/index.html:163`; `internal/eaas/store.go:79-89`).
- `deploy/migrations/004_eaas_schema.sql` is a **target PostgreSQL 15+ schema** to be applied after `003_add_auth_columns.sql`. It defines the same model with `account_id` foreign keys and tenant-isolation guidance, but the evidence scope contains no repository, connection config, or migration runner. `BLOCKED` for runtime use: do not describe the service as Postgres-backed. The schema comment also states that production key columns must be backed by an HSM/KMS reference rather than bytes (`deploy/migrations/004_eaas_schema.sql:47-48`).

## Deployment maturity

| Area | Status | Notes |
|---|---|---|
| Single-process local/sandbox service | LIMITED | Atomic file store; no shared-state support evidenced |
| Portal serving from `EAAS_STATIC_DIR` | VERIFIED | `/` maps to `<dir>/index.html`, `/portal` to the directory |
| Production Postgres deployment | BLOCKED | Target schema only; no repository or host in evidence scope |
| Hosted deployment / SaaS | NOT_IMPLEMENTED | No hosted deployment in evidence scope; portal calls this a "hosted deployments require PostgreSQL" boundary |
| `EAAS_ENV=production` | PARTIALLY_IMPLEMENTED | Changes verification-code disclosure and environment label; does not add Postgres, email, HSM, payments, or hardened key custody |
| Per-deploy CORS and admin token | VERIFIED | Configure `EAAS_ALLOWED_ORIGINS` and `EAAS_ADMIN_TOKEN` explicitly |
| CI deploy gate | NOT_IMPLEMENTED | `.github/workflows/eaas-ci.yml:38-47` runs gofmt, go vet, go build and go test only |

`EAAS_ENV=production` also affects entitlements: production projects and production API keys are rejected on the free plan (`internal/eaas/service.go:341-347,403-405`). See [Freemium & metering](EAAS_FREEMIUM_AND_METERING.md).
