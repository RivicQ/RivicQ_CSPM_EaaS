# RivicQ CSPM — Baseline audit

Status: **evidence-based, this checkout**. Commands were run in this session.

- Repository: `RivicQ/RivicQ_CSPM_EaaS` (module `github.com/rivic-q/cryptobom-saas`)
- Branch: `cursor/cspm-enterprise-readiness-72c9` (created from `main`)
- Base SHA: `1cc1c652f9ca8444b2a2480a26889c7f8215bab0` (`fix(web): drop unused import breaking CI eslint build`)
- Date: 2026-10-14

## Toolchain (as observed)

| Tool | Version |
|------|---------|
| go | 1.26.9 |
| node | 22.14.0 |
| npm | 10.9.9 |
| python3 | 3.12.3 |
| golangci-lint | **not installed** |
| docker / helm | not on PATH |

`/tmp/cursor/start-user/start-user.status` exited **127** (start script failed). No Compose/Helm stack was assumed up.

## Repository shape (discovered, not assumed)

Present: `cmd/`, `internal/`, `web/`, `sdk/`, `tests/`, `fixtures/`, `datasets/`, `deploy/`, `.github/`, `docs/`, `fabric/`, `archify/`, `integrations/`, `Makefile`, `go.mod`.

No separate `api/` Go package except `api/v1alpha1`. OpenAPI lives at `docs/openapi.yaml`.

## Commands and observed results

| Check | Command | Result |
|-------|---------|--------|
| Go build | `go build ./...` | **PASS** |
| Go vet | `go vet ./...` | **PASS** |
| Go tests | `go test -count=1 ./...` | **PASS** (packages `ok`; several have no test files) |
| Datasets | `python3 scripts/analyze-datasets.py` | **PASS 12/12** after this branch's CBOM/CLI fixes |
| Web type-check | `cd web && npm run type-check` | **PASS** |
| Web lint | `cd web && npm run lint` | **PASS** |
| Web tests | `cd web && CI=true npm test -- --watchAll=false` | **PASS** 12 suites / 31 tests |
| CLI usage | `./bin/rivicq` | exit **2** |
| CLI invalid gate | `./bin/rivicq scan . --fail-on BOGUS` | exit **2** (was silently 0 on `main`) |
| CLI invalid format | `./bin/rivicq scan . --format yaml` | exit **2** |
| Weak fixture | `./bin/rivicq scan fixtures/crypto-test --include-fixtures --fail-on BLOCK` | exit **1**, gate BLOCK |
| RSA-2048 golden | `./bin/rivicq scan fixtures/golden/rsa2048 --include-fixtures --fail-on BLOCK` | exit **0** |
| Self-scan | `./bin/rivicq scan . --fail-on BLOCK` | exit **0**, gate WARN |

`golangci-lint` was **not run** (binary missing). Do not treat lint as passing.

## Defects found on `main` and disposition

1. **CLI `--fail-on` / `--format` typos exited 0** by falling back to BLOCK/table. **Fixed** (usage error, exit 2).
2. **CycloneDX serial numbers were random UUIDs** and components lacked `bom-ref`. **Fixed** (UUID v5 + `bom-ref`).
3. **CBOM inventoried weak algorithms only** — AES, SHA-256, TLS 1.2/1.3, X.509 PEM, ECDH, X25519, FF-DH, ssh-rsa host keys were missing or incomplete. **Fixed** with tests/fixtures.
4. **Partner fixtures had no Go tests** referencing `fixtures/partners/**`. **Added**.
5. **Self-scan BLOCK** after the first ssh-rsa rule (matched `policy.go` source). **Fixed** by requiring SSH config context + matching on `rule_id`.

## Reproduce

```sh
go build ./... && go vet ./... && go test -count=1 ./...
go build -o bin/rivicq ./cmd/rivicq
python3 scripts/analyze-datasets.py
( cd web && npm ci && npm run type-check && npm run lint && CI=true npm test -- --watchAll=false )
./bin/rivicq scan fixtures/crypto-test --include-fixtures --fail-on BLOCK
./bin/rivicq scan . --fail-on BOGUS ; echo $?   # expect 2
```
