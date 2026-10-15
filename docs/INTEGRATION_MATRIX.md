# Integration matrix

| Integration | Location | State | Tests |
|-------------|----------|-------|-------|
| GitHub content scan | `internal/api/shared/github_scanning.go` | Implemented; `GITHUB_TOKEN` or `DEMO_MODE` | yes |
| GitHub Action | `.github/actions/rivicq-scan` | Builds CLI, `--fail-on` default BLOCK | action YAML only |
| Optional PATH tools (Syft, Trivy, Grype, Gitleaks, OSV, Checkov, Cosign) | `internal/intelligence/adapters.go` | Used when on PATH; skipped otherwise | probe tests |
| AWS / Azure / GCP / IBM cloud | `internal/{aws,azure,gcp,ibm}cloud` | Code present | **none** — connector-dependent |
| Stripe / Convex / PostHog / Better Auth / n8n / R2 | `integrations/*` | Scaffolds; **not wired** into `cmd/server` | n/a |
| Supabase (frontend) | `web/src/services/supabase.ts` | Optional Pages auth | not E2E |
| IBM Quantum | `internal/quantum/ibmquantum` | Optional; local taxonomy always | provider tests, no live IBMQ |
| Archify | `archify/` | Static site | none |
| Fabric / Graph | `fabric/` | Synthetic demo | frontend app own tests if any |

No partner SaaS is claimed live without credentials and a passing test.
