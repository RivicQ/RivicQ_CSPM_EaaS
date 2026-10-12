# Deplying the real API to Render

The static GitHub Pages site ships an in-browser **demo mode** so login and
scanning work with no backend at all. For **real** login, real scans, live
quantum scores, and persisted tenants, run the RivicQ OSS API somewhere public
and point the app at it via the `REACT_APP_API_URL` secret.

This repo already contains everything Render needs:

| File | Purpose |
| --- | --- |
| `render.yaml` | Render Blueprint: one Web Service + one free Postgres |
| `deploy/docker/Dockerfile.render` | Self-contained OSS image (runs migrations in-process) |
| `internal/server/server.go` | Honors the 12-factor `$PORT` Render injects |

## 1. Import the blueprint

1. Sign in to [render.com](https://render.com) → **New +** → **Blueprint**.
2. Pick `RivicQ/RivicQ_CSPM_EaaS`.
3. Review the two resources:
   - `rivicq-api` (Web Service, `deploy/docker/Dockerfile.render`)
   - `rivicq-db` (Postgres)
4. Click **Apply**. `JWT_SECRET` and `AUTH_BOOTSTRAP_PASSWORD` are generated
   automatically; `DATABASE_URL` is wired to the Postgres connection string.
5. Wait for the deploy. The health check hits `/readyz`, which turns 200 only
   after migrations have applied against the database.

> If you deploy manually instead (Web Service → Docker), set the same env vars:
> `JWT_SECRET` (≥ 32 bytes), `AUTH_BOOTSTRAP_EMAIL`, `AUTH_BOOTSTRAP_PASSWORD`,
> `DATABASE_URL`, `CORS_ORIGINS` optional. Do **not** set `CRYPTOBOM_PORT` or
> `PORT` — Render supplies `PORT` automatically.

## 2. Verify the API

```bash
# Health + readiness
curl https://<your-app>.onrender.com/readyz
curl https://<your-app>.onrender.com/healthz

# Auth smoke test (community edition accepts the bootstrap account)
curl -X POST https://<your-app>.onrender.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.rivicq.local","password":"<generated AUTH_BOOTSTRAP_PASSWORD>"}'
```

## 3. Point the GitHub Pages app at it

GitHub Pages builds the React app (`web/`) with the `REACT_APP_API_URL` secret:

1. Repo → **Settings → Secrets and variables → Actions**.
2. Add repository secret:
   - Name: `REACT_APP_API_URL`
   - Value: `https://<your-app>.onrender.com/api/v1`
3. Re-run the `Deploy GitHub Pages` workflow (or push).
4. The deployed app now calls the live API for login and scanning. The
   in-browser demo responder only activates when this secret is **not** set,
   so production traffic always goes to the real backend.

> CORS already permits `https://rivicq.github.io` by default
> (`internal/middleware/cors.go`); add other origins via the `CORS_ORIGINS`
> env var on the service.

## 4. Running locally (no hosting needed)

```bash
# Start Postgres + the OSS server
docker compose up -d db
make run            # or: DATABASE_URL=... go run ./cmd/server/oss/main.go

# Serve the app against the local API
cd web
REACT_APP_API_URL=http://localhost:8080/api/v1 npm start
```

Login with the bootstrap account, or use the app’s client-side demo mode.