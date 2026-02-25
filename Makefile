# CryptoBOM SaaS – Developer Makefile
# Usage:
#   make dev          – start the full local stack (db + migrations + backend + frontend)
#   make dev-backend  – start only the Go backend (demo mode, no DB required)
#   make dev-frontend – start only the React frontend
#   make build        – build all Go binaries
#   make test         – run unit tests
#   make lint         – run Go linter
#   make migrate      – apply database migrations
#   make docker-up    – start all services with Docker Compose
#   make docker-down  – stop all Docker Compose services
#   make clean        – remove build artifacts

.PHONY: all dev dev-backend dev-frontend build build-oss build-enterprise \
        test lint migrate seed docker-up docker-down clean help

GO        ?= go
GOFLAGS   ?=
BIN_DIR   := bin
ENV_FILE  := .env

# ── Ensure .env exists ──────────────────────────────────────────────────────
$(ENV_FILE):
	cp .env.example $@
	@echo "Created $@ from .env.example. Edit it before running in production."

# ── Primary dev target ──────────────────────────────────────────────────────
## Start the full local stack (db, migrations, backend, frontend) via Docker Compose
dev: $(ENV_FILE)
	docker compose up --build

## Start the Go backend in demo mode (no database required)
dev-backend: $(ENV_FILE) build-oss
	CRYPTOBOM_PORT=8080 ./$(BIN_DIR)/cryptobom-oss

## Start the React frontend (requires backend running on :8080)
dev-frontend:
	cd web && npm install --silent && npm run dev

# ── Build ───────────────────────────────────────────────────────────────────
## Build all binaries
build: build-oss build-enterprise

build-oss:
	@mkdir -p $(BIN_DIR)
	$(GO) build $(GOFLAGS) -o $(BIN_DIR)/cryptobom-oss ./cmd/server/oss/...

build-enterprise:
	@mkdir -p $(BIN_DIR)
	$(GO) build $(GOFLAGS) -o $(BIN_DIR)/cryptobom-enterprise ./cmd/server/enterprise/...

# ── Tests ───────────────────────────────────────────────────────────────────
## Run Go unit tests with race detector
test:
	$(GO) test -race -count=1 ./...

## Run only fast unit tests (no integration tag)
test-unit:
	$(GO) test -race -count=1 -short ./...

# ── Linting ──────────────────────────────────────────────────────────────────
## Run golangci-lint (requires golangci-lint to be installed)
lint:
	golangci-lint run ./...

## Run go vet
vet:
	$(GO) vet ./...

# ── Database ─────────────────────────────────────────────────────────────────
## Apply database migrations (requires DATABASE_URL in environment or .env)
migrate: $(ENV_FILE)
	@set -a && . ./$(ENV_FILE) && set +a; \
	if [ -z "$$DATABASE_URL" ]; then \
		echo "DATABASE_URL is not set – skipping migration."; \
	else \
		for f in $$(ls deploy/migrations/*.sql | sort); do \
			echo "Applying $$f ..."; \
			psql "$$DATABASE_URL" -f "$$f" || exit 1; \
		done; \
	fi

## Load demo seed data (development only)
seed: $(ENV_FILE)
	@set -a && . ./$(ENV_FILE) && set +a; \
	if [ -f deploy/migrations/seed.sql ]; then \
		psql "$$DATABASE_URL" -f deploy/migrations/seed.sql; \
	else \
		echo "No seed file found – skipping."; \
	fi

# ── Docker Compose ───────────────────────────────────────────────────────────
## Start all services via Docker Compose (detached)
docker-up: $(ENV_FILE)
	docker compose up -d

## Stop all Docker Compose services
docker-down:
	docker compose down

## Show Docker Compose service logs
docker-logs:
	docker compose logs -f

# ── Clean ─────────────────────────────────────────────────────────────────────
## Remove build artifacts
clean:
	rm -rf $(BIN_DIR)
	cd web && rm -rf build node_modules/.cache

# ── Help ──────────────────────────────────────────────────────────────────────
## Print this help
help:
	@grep -E '^## ' Makefile | sed 's/^## //'
