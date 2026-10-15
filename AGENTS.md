# AGENTS.md

## Cursor Cloud specific instructions

This repo is the **RivicQ CryptoBOM SaaS** — a Go backend (two editions of the same
codebase) plus a React (CRA) frontend in `web/`. Standard dev commands live in the
`Makefile` and `scripts/dev-stack.sh`; the notes below only cover non-obvious caveats.

### Services

| Service | Dev command | Port | Notes |
|---------|-------------|------|-------|
| OSS backend | `make dev-backend` | 8080 | Go server, community edition |
| Enterprise backend | `make dev-enterprise` | 9090 | Same code, built with `-tags enterprise`; enables IBMQ/SSO/multi-cloud stubs |
| React frontend | `make dev-frontend` (or `cd web && npm run dev`) | 3000 | CRA dev server; served under basename `/platform` |

Full stack in one command: `./scripts/dev-stack.sh` (OSS) or `./scripts/dev-stack.sh enterprise`.
Open the UI at `http://localhost:3000/platform/`.

### Non-obvious caveats

- **No database is required for development or testing.** With `DATABASE_URL` /
  `CRYPTOBOM_DB_*` unset, both backends run in "demo mode" (in-memory auth + demo
  data) and all API/UI flows work, including CBOM scans. Postgres is only needed to
  exercise persistence. Do not treat a missing DB as a blocker.
- **`JWT_SECRET` must be set** for auth endpoints (`/api/v1/auth/*`). `scripts/dev-stack.sh`
  sets a dev default; if running a binary directly, export `JWT_SECRET` yourself.
- **Bootstrap admin login:** the bootstrap user is created from `AUTH_BOOTSTRAP_EMAIL`/
  `AUTH_BOOTSTRAP_PASSWORD` on startup. `scripts/dev-stack.sh` uses
  `admin@rivicq.local` / `DemoPass123!`. The `.env.example` default password is
  `change-me`, so set these env vars if you need to log in via the UI.
- **Frontend → backend wiring:** the UI calls the API via `REACT_APP_API_URL`
  (e.g. `http://localhost:9090/api/v1` for enterprise). `dev-stack.sh` sets this; if you
  start `npm run dev` manually, export `REACT_APP_API_URL` and `PUBLIC_URL=/platform`.
- **Enterprise binary needs the build tag:** `go build -tags enterprise ./cmd/server/enterprise/`
  (already handled by `make build-enterprise`). Plain `go run ./cmd/server/enterprise/main.go`
  without the tag will not compile the enterprise features.
- **Node:** `web/package.json` implies Node 18 (via `@types/node ^18` and the Docker
  image), but the app builds and runs fine on the Node 22 present in this environment.

### Lint / test

- **Go lint uses golangci-lint v2** (`.golangci.yml` is `version: "2"`); a v1 binary will
  not parse the config. `make lint` currently reports ~8 **pre-existing** code findings
  (errcheck/govet/staticcheck/unused) — these are not environment problems.
- **Go tests:** `make test` (race detector). CI excludes `/tests/enterprise`
  (`go test $(go list ./... | grep -v /tests/enterprise)`).
- **Web tests:** there are currently **no** frontend test files, so `npm test` exits
  non-zero with "No tests found"; use `--passWithNoTests` or rely on `npm run type-check`
  and `npm run lint` (lint passes with warnings only).
- **Docker is not installed** in this environment; run services natively rather than via
  `docker compose` / `make dev`.
