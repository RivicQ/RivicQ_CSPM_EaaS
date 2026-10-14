# Test results (this session)

All commands from the repository root unless noted. Nothing here is inferred from older audit docs.

Branch `cursor/cspm-enterprise-readiness-72c9`. Base `1cc1c65`.

## 1. Go

```
go build ./...          # PASS
go vet ./...            # PASS
go test -count=1 ./...  # PASS (logged in /opt/cursor/artifacts/go_test.log)
```

Notable packages that executed `ok`: `internal/intelligence`, `internal/api/shared`, `internal/discovery`, `internal/firmware`, `internal/identity`, `internal/auth`, `internal/authn`, `internal/tenant`, `internal/server`, `internal/api/enterprise`, `cmd/rivicq`, `tests`.

Packages with **no test files** (unchanged gap): `internal/database`, `internal/config`, `internal/observability`, `internal/{aws,azure,gcp,ibm}cloud`, `internal/cilium`, `internal/operator`, most `cmd/server*`.

New tests added this session:

- `internal/intelligence/failon_test.go`
- `internal/intelligence/evidence_test.go`
- `internal/intelligence/cyclonedx_test.go` (expanded)
- `cmd/rivicq/cli_validate_test.go`
- `internal/identity/partner_fixtures_test.go`
- `internal/firmware/partner_fixtures_test.go`
- corpus cases in `internal/api/shared/scanner_corpus_test.go`

## 2. Frontend

```
( cd web && npm run type-check )                         # PASS
( cd web && npm run lint )                               # PASS
( cd web && CI=true npm test -- --watchAll=false )       # PASS
```

- Test suites: **12 passed / 12**
- Tests: **31 passed / 31** (was 27 on `main`; +4 route-matrix assertions)
- Coverage is **not** a gate. Most pages remain 0% statement coverage. `web/src/ops/routeMatrix.ts` is 100% in this run.

Browser e2e was **not** run.

## 3. CLI exit codes (built `bin/rivicq`)

| Scenario | Command | Exit | Gate |
|----------|---------|------|------|
| No args | `rivicq` | 2 | n/a |
| Unknown command | `rivicq boguscmd` | 2 | n/a |
| Invalid fail-on | `rivicq scan . --fail-on BOGUS` | **2** | n/a (usage) |
| Invalid format | `rivicq scan . --format yaml` | **2** | n/a (usage) |
| Empty-ish dir | `rivicq scan /tmp --fail-on NONE --format json` | 0 | ALLOW |
| Weak crypto fixture | `rivicq scan fixtures/crypto-test --include-fixtures --fail-on BLOCK` | **1** | BLOCK |
| Weak crypto, gate off | same `--fail-on NONE --format json` | 0 | BLOCK reported, process passes |
| RSA-2048 golden | `fixtures/golden/rsa2048 --fail-on BLOCK` | 0 | ALLOW |
| AES/SHA inventory | `fixtures/golden/aes-sha --fail-on BLOCK` | 0 | ALLOW |
| ssh-rsa host key | `fixtures/golden/ssh-rsa --fail-on BLOCK` | **1** | BLOCK |
| Docs-only ambiguous | `fixtures/golden/ambiguous --fail-on BLOCK` | 0 | ALLOW |
| Repo self-scan | `rivicq scan . --fail-on BLOCK` | 0 | WARN |
| Firmware (Infineon fixture) | `rivicq firmware scan … --fail-on NONE --format json` | 0 | n/a |
| Identity (G+D ECDSA PEM) | `rivicq identity scan … --fail-on NONE --format json` | 0 | n/a |
| Firmware compare v1/v2 | `rivicq firmware compare …` | 0 | n/a |

## 4. Dataset harness

```
python3 scripts/analyze-datasets.py
```

**12/12 PASS** (log: `/opt/cursor/artifacts/dataset_analysis.log`).

An earlier run in this session failed `this-repo-self-scan` (gate BLOCK) because the first ssh-rsa rule matched `internal/intelligence/policy.go`. That regression was fixed before this file was written. The passing run is the recorded result.

## 5. Not run / blocked

| Check | Why |
|-------|-----|
| `golangci-lint run ./...` | binary not installed |
| `make lint` | same |
| Helm/kube dry-run | helm not on PATH |
| Docker compose | docker not on PATH; start script exit 127 |
| Live TLS/SSH handshake against the public internet | not required; unit tests cover scanners with fixtures |
| Live cloud connectors | no customer credentials |
| Browser UI walkthrough | no GUI executor used |
| Aikido SAST (`aikido_full_scan`) | **blocked**: MCP requires interactive sign-in; not completed. See F-9 in `SECURITY_FINDINGS.md` |
| Snyk package health | not applicable; no new third-party dependencies added |
| Official CycloneDX JSON Schema draft (network schema) | local contract `ValidateCycloneDX` only |
