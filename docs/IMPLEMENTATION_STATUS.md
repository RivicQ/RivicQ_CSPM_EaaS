# Implementation status

Evidence-based snapshot refreshed 2026-11-19 on `feat/prism-design-system`. The Pages pilot gate and composite build verification were added on 2026-11-14. Classification:

> Current status: PARTIALLY IMPLEMENTED — controlled pilot ready for static cryptographic inventory; production Enterprise remains BLOCKED BY EXTERNAL CONFIGURATION. Next: validate the buyer, trigger, and authorized source tree with five security-leader interviews by 2026-11-24, then ship the workflow, console, scanner, evidence, security, accessibility, and release-readiness roadmap.

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
| Pages pilot gate + capability manifest | VERIFIED | `docs/PILOT_READINESS.md`, `docs/PILOT_ONBOARDING.md`, `docs/CAPABILITIES.yaml`, `/pilot/` | Keep the manifest aligned with every phase |
| Composite Pages build verification | VERIFIED | `scripts/build-pages.sh` calls `scripts/verify-pages-build.sh`; both Pages workflows run it | Treat a failed verification as a failed deploy |
| Cloud connectors | BLOCKED | Need customer credentials | Empty state when missing |
| SSO ACS handshake | NOT_IMPLEMENTED | Config store only | Operator IdP task |
| Live Infineon MCU / HSM key inspection | NOT_IMPLEMENTED | Out of scope | Interface docs only |
| Integrations Convex/Stripe/Better Auth | NOT_IMPLEMENTED | Scaffolds in `integrations/` | Do not wire as live |

Qiskit scores are a **local taxonomy**, not IBM Quantum jobs.
