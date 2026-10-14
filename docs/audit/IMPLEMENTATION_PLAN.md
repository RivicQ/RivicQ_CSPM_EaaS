# Implementation plan (this branch)

Branch: `cursor/cspm-enterprise-readiness-72c9`
Base: `main` @ `1cc1c652f9ca8444b2a2480a26889c7f8215bab0`

This file is the live checkpoint. It records what was completed in this
session, what was verified, and the next work. It does **not** claim every
audit phase is finished.

## Completed in this session

| Phase | Status | What landed |
|---|---|---|
| 0 Baseline | Done | Fresh commands on this checkout; see `BASELINE.md`, `TEST_RESULTS.md` |
| 1 Architecture / data model | Partial | Evidence fields on `intelligence.Finding`; docs updated. No persistence-schema migration (findings JSON already carries the fields). |
| 2 CBOM / discovery | Done (engine) | Inventory vs usage, ECDH/X25519/FF-DH/SSH/X.509/AES/SHA-256/TLS 1.2–1.3 rules, CycloneDX `bom-ref` + deterministic serial, golden fixtures, 12/12 datasets |
| 3 BOM intelligence | Docs | Maturity stated per BOM type; no second scanner |
| 4 PQC / risk | Partial | Exploitability vs quantum class stamped on findings; taxonomy unchanged (`rivicq-pqc-taxonomy/1.0.0`) |
| 5 NEXUS / Fabric | Docs | Inspected: `fabric/` is a **labeled synthetic graph demo**, not live scan data |
| 6 G+D | Tests + docs | Identity fixtures executed; `internal/identity/partner_fixtures_test.go` |
| 7 Infineon | Tests + docs | Firmware fixtures executed; `internal/firmware/partner_fixtures_test.go` |
| 8 Frontend | Partial | Route matrix + tests; no browser session in this environment |
| 9 Archify / REA | Docs | Archify = static diagram site in `archify/`. REA is **not a module in this repo** |
| 10 API / CLI / DevSecOps | Partial | `--fail-on` / `--format` now exit 2 on typos; BLOCK still fails CI |
| 11 AppSec / tenancy | Audit only | Existing tenant tests still pass; no new SSO E2E |
| 12 Persistence / connectors | Audit only | Connectors remain credential-dependent |
| 13 Production ops | Docs | Not production-ready |
| 14 Docs honesty | In progress | This tree of audit/release docs |
| 15 Acceptance | Partial | Three separate readiness decisions recorded in `docs/release/FINAL_AUDIT.md` |

## Next five implementation priorities

1. Persist evidence fields (`presence_kind`, `detection_method`, `exploitability`) in Postgres `findings` / `crypto_assets` with a real migration and tenant-scoped tests.
2. Parse X.509 inside `rivicq scan` (today PEM is inventoried; algorithm/OID extraction lives in `rivicq identity`).
3. Graph provenance from live `intelligence.Report` into `fabric/` (today the UI is a synthetic Northbridge fixture).
4. Frontend e2e for login → scan → findings → CBOM export against a local API (Playwright/Cypress is not in this tree).
5. Tighten self-scan noise (119 findings / WARN): most are PQC identifier mentions in engine/docs, not production usage.

## Unresolved issues

- Aikido SAST blocked on interactive MCP sign-in; no scan results claimed.
- `golangci-lint` is **not installed** in this environment; not re-run.
- No browser/UI verification (no computer-use session).
- Cloud connectors (AWS/Azure/GCP/IBM) have **no tests** and were not live-called.
- SSO/SAML ACS handshake is not implemented as an E2E IdP flow.
- Self-scan still WARNs (generic secret patterns + PQC string hits in non-fixture source).
- Dataset harness uses substring `must_match` over JSON, not structural CBOM schema validation against the official CycloneDX JSON Schema (we validate a local contract in `ValidateCycloneDX`).

## Commands to continue

```bash
go test -count=1 ./...
go build -o bin/rivicq ./cmd/rivicq
python3 scripts/analyze-datasets.py
( cd web && npm run type-check && npm run lint && CI=true npm test -- --watchAll=false )
./bin/rivicq scan . --fail-on BLOCK
```
