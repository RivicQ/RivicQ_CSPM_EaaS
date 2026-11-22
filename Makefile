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

.PHONY: all dev dev-core dev-backend dev-enterprise dev-frontend build build-core build-oss build-enterprise \
        build-rivicq rivicq-scan build-pages verify-pages verify-beta security-tools-check security-sast \
        security-sca security-secrets-iac security-iac security-all verify-security quantum-setup quantum-setup-full \
        quantum-analyse quantum-test test lint migrate seed docker-up docker-down clean help

GO        ?= go
GOFLAGS   ?=
BIN_DIR   := bin
ENV_FILE  := .env
REPORT_DIR ?= reports/security
PYTHON    ?= python3
QUANTUM_REPORT ?= -
export REPORT_DIR

# ── Ensure .env exists ──────────────────────────────────────────────────────
$(ENV_FILE):
	cp .env.example $@
	@echo "Created $@ from .env.example. Edit it before running in production."

# ── Primary dev target ──────────────────────────────────────────────────────
## Start the full local stack (db, migrations, backend, frontend) via Docker Compose
dev: $(ENV_FILE)
	docker compose up --build

## Start the unified core backend (edition auto-detected from CRYPTOBOM_LICENSE_KEY)
dev-core: $(ENV_FILE) build-core
	@set -a && . ./$(ENV_FILE) && set +a && ./$(BIN_DIR)/cryptobom-core

## Start the Go backend in demo mode (no database required)
dev-backend: $(ENV_FILE) build-oss
	@set -a && . ./$(ENV_FILE) && set +a && CRYPTOBOM_PORT=9090 ./$(BIN_DIR)/cryptobom-oss

## Start the Enterprise backend on :9090 (demo mode without DB, or with DATABASE_URL)
dev-enterprise: $(ENV_FILE) build-enterprise
	@set -a && . ./$(ENV_FILE) && set +a; \
	if [ -z "$$CRYPTOBOM_LICENSE_KEY" ] || [ -z "$$CRYPTOBOM_LICENSE_SIGNING_KEY" ]; then \
		echo "Set CRYPTOBOM_LICENSE_KEY and CRYPTOBOM_LICENSE_SIGNING_KEY in .env (see docs/ENTERPRISE.md)."; exit 1; \
	fi; \
	CRYPTOBOM_PORT=9090 ./$(BIN_DIR)/cryptobom-enterprise

## Start the React frontend (requires backend running on :8080 or :9090)
dev-frontend:
	cd web && npm install --silent && npm run dev

# ── Build ───────────────────────────────────────────────────────────────────
## Build all binaries
build: build-core build-oss build-enterprise build-rivicq

build-core:
	@mkdir -p $(BIN_DIR)
	$(GO) build $(GOFLAGS) -o $(BIN_DIR)/cryptobom-core ./cmd/server/

build-oss:
	@mkdir -p $(BIN_DIR)
	$(GO) build $(GOFLAGS) -o $(BIN_DIR)/cryptobom-oss ./cmd/server/oss/

build-enterprise:
	@mkdir -p $(BIN_DIR)
	$(GO) build $(GOFLAGS) -tags enterprise -o $(BIN_DIR)/cryptobom-enterprise ./cmd/server/enterprise/

## Build the RivicQ community CLI (`rivicq scan`)
build-rivicq:
	@mkdir -p $(BIN_DIR)
	$(GO) build $(GOFLAGS) -o $(BIN_DIR)/rivicq ./cmd/rivicq

## Run a repository scan with the community CLI (fixtures/testdata excluded)
rivicq-scan: build-rivicq
	./$(BIN_DIR)/rivicq scan . --fail-on BLOCK

## Run dataset analysis (CBOM accuracy vs expected.json)
analyze-datasets: build-rivicq
	python3 scripts/analyze-datasets.py

## Install the Python Qiskit companion (base install, no simulator)
quantum-setup:
	$(PYTHON) -m pip install -e sdk/python

## Install Qiskit Aer for educational quantum circuits
quantum-setup-full:
	$(PYTHON) -m pip install -e "sdk/python[quantum]"

## Analyse a RivicQ JSON report with the Qiskit-aligned profile
quantum-analyse:
	PYTHONPATH=sdk/python $(PYTHON) -m rivicq_qiskit.analyse "$(QUANTUM_REPORT)"

## Run Go and Python quantum SDK tests
quantum-test:
	$(GO) test -count=1 ./internal/quantum/...
	PYTHONPATH=sdk/python $(PYTHON) -m unittest discover -s sdk/python -p 'test_*.py'

# ── GitHub Pages / Cloudflare Pages ─────────────────────────────────────────
## Build the full composite static site into web/build
build-pages:
	bash scripts/build-pages.sh

## Verify the composite site is complete and safe to publish
verify-pages:
	bash scripts/verify-pages-build.sh

## Run the realistic beta readiness gate
verify-beta:
	bash scripts/verify-beta-readiness.sh

.PHONY: analyze-datasets
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

## Check which open-source security tools are installed
security-tools-check:
	@bash scripts/security-tools.sh check

## Run SAST tools (gosec, govulncheck, semgrep)
security-sast:
	@bash scripts/security-tools.sh sast

## Run SCA tools (syft, grype, trivy, osv-scanner)
security-sca:
	@bash scripts/security-tools.sh sca

## Run secret and IaC scanning (gitleaks, checkov)
security-secrets-iac:
	@bash scripts/security-tools.sh secrets
	@bash scripts/security-tools.sh iac

## Validate Terraform, Helm, and Kubernetes manifests
security-iac:
	@bash scripts/security-tools.sh iac

## Run every integrated security tool (advisory unless SECURITY_TOOLS_STRICT=1)
security-all verify-security:
	@bash scripts/security-tools.sh all

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

## Demo targets
.PHONY: demo demo-lab demo-scan demo-stop demo-clean build-scanner

demo: ## Start demo scan + open UI
	@echo "🚀 Starting CryptoBOM Infrastructure Discovery Demo..."
	@sleep 2
	@$(MAKE) demo-scan
	@echo "✅ Demo ready! Open http://localhost:3000/platform/infrastructure"

demo-lab: ## Archived: demo lab fixtures were removed in v1.1.0
	@echo "ℹ️  The demo lab (demo/lab) was archived in v1.1.0. See docs/ARCHIVE_DEMO.md."
	@echo "   Use 'make demo' or 'make demo-scan' for the current demo experience."

demo-scan: ## Run the infrastructure discovery scanner against the demo lab
	@echo "🔍 Running CryptoBOM weak crypto discovery scan..."
	go run ./cmd/demo-scanner/... --output cbom-findings.json --format table
	@echo "📄 Full findings written to cbom-findings.json"

demo-stop: ## Archived: demo lab is not running (fixtures removed in v1.1.0)
	@echo "ℹ️  The demo lab was archived in v1.1.0. See docs/ARCHIVE_DEMO.md."

demo-clean: ## Archived: no demo lab volumes to clean
	@echo "ℹ️  The demo lab was archived in v1.1.0. See docs/ARCHIVE_DEMO.md."
	rm -f cbom-findings.json

build-scanner: ## Build the demo scanner binary
	@mkdir -p $(BIN_DIR)
	go build -o $(BIN_DIR)/cryptobom-scanner ./cmd/demo-scanner/...

# ── Help ──────────────────────────────────────────────────────────────────────
## Print this help
help:
	@grep -E '^## ' Makefile | sed 's/^## //'
