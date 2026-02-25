# CryptoBOM SaaS – Quick Commands

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Go   | 1.25 |
| Docker + Compose | v2 |
| Node.js | 18+ (for frontend only) |
| make | any |

---

## Full Stack (recommended – Docker Compose)

```bash
# Clone and enter the repo
git clone https://github.com/rivic-q/cryptobom-saas.git
cd cryptobom-saas

# Copy env template (edit JWT_SECRET before production use)
cp .env.example .env

# Start: PostgreSQL, run migrations, backend API, React frontend
make dev          # runs docker compose up --build

# Health check
curl http://localhost:8080/healthz
```

Open the dashboard: http://localhost:3000

---

## Backend Only (Go binary, no database)

```bash
# Build and start the OSS server in demo mode (in-memory, no DB)
make dev-backend
```

Server runs at http://localhost:8080

---

## Frontend Only (requires backend running on :8080)

```bash
make dev-frontend
# or
cd web && npm install && npm run dev
```

Dashboard runs at http://localhost:3000

---

## Build Binaries

```bash
make build             # builds bin/cryptobom-oss and bin/cryptobom-enterprise
make build-oss         # OSS binary only
make build-enterprise  # Enterprise binary only
```

---

## Database Migrations

```bash
# Apply migrations against DATABASE_URL set in .env
make migrate

# or manually
psql "$DATABASE_URL" -f deploy/migrations/001_initial_schema.sql
```

---

## Tests & Linting

```bash
make test        # go test -race ./...
make test-unit   # short/fast unit tests only
make vet         # go vet
make lint        # golangci-lint (must be installed)
```

---

## Docker Compose Helpers

```bash
make docker-up    # start all services (detached)
make docker-down  # stop all services
make docker-logs  # tail logs
```

---

## Endpoints

| URL | Description |
|-----|-------------|
| http://localhost:8080/healthz | Backend health check |
| http://localhost:8080/api/v1/assets | Cryptographic asset list |
| http://localhost:8080/api/v1/dashboard/demo | Demo CBOM data |
| http://localhost:3000 | React dashboard |
| http://localhost:5432 | PostgreSQL (dev only) |