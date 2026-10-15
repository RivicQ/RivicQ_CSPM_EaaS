# Implementation status

Evidence-based snapshot of HEAD on `cursor/archify-site-system-86cc` after the 2026-10-15 engineering pass. Classification:

- `VERIFIED` — implementation exists, workflow works, tests ran in this pass
- `PARTIALLY_IMPLEMENTED` — code exists; coverage, connectors, or honesty bounds remain
- `NOT_IMPLEMENTED` — do not claim it
- `BLOCKED` — needs credentials, a running Postgres, or an operator task

Companion: [PRODUCT_STATUS.md](PRODUCT_STATUS.md), [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md), [ARCHITECTURE.md](ARCHITECTURE.md), [audit/FEATURE_MATRIX.md](audit/FEATURE_MATRIX.md).

| Feature | Class | Evidence | Next |
|---|---|---|---|
| CLI `rivicq scan` / CBOM+SBOM / policy gate | VERIFIED | `cmd/rivicq`, `internal/intelligence`; `go test ./internal/intelligence ./cmd/rivicq` | Keep golden datasets in CI |
| Invalid `--fail-on` / `--format` as usage (exit 2) | VERIFIED | `ParseFailOn`, `ParseOutputFormat`; was silent BLOCK fallback | — |
| RSA-2048 classified, not auto-BLOCK | VERIFIED | `TestEvaluatePolicyAllowsRSA2048WithoutBlock` | — |
| CycloneDX CBOM export | VERIFIED | `internal/intelligence/cyclonedx.go` + tests | — |
| Tenant isolation on scan report | VERIFIED | `tests/scan_tenant_isolation_test.go` | SQL-layer tests still thin |
| JWT tenant_id; `X-Tenant-ID` ignored | VERIFIED | `internal/tenant/context.go` | — |
| CORS allow-list; localhost off in production env | VERIFIED | `internal/middleware/cors.go` + tests | Set `CORS_ORIGINS` per deploy |
| Production refuse start without DB | VERIFIED | `internal/server/server.go` unless `RIVICQ_ALLOW_DEMO_MODE=1` | — |
| Firmware / identity **static** analysis | PARTIALLY_IMPLEMENTED | CLI + API; no execution, no Infineon MCU, no private-key extract | Documented as static-only |
| GitHub Pages public scan | BLOCKED | Static SPA; no production API | Deploy API or use CLI |
| Cloud connectors | BLOCKED | Need customer credentials | Empty state when missing |
| SSO ACS handshake | NOT_IMPLEMENTED | Config store only | Operator IdP task |
| Live Infineon MCU / HSM key inspection | NOT_IMPLEMENTED | Out of scope | Interface docs only |
| Integrations Convex/Stripe/Better Auth | NOT_IMPLEMENTED | Scaffolds in `integrations/` | Do not wire as live |

Qiskit scores are a **local taxonomy**, not IBM Quantum jobs.
