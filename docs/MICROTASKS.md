# Microtasks: Small, Mergeable Work Units

A catalog of small, well-scoped tasks an engineer can pick up in a single sitting. Each microtask links to the code it touches and states the test/dataset evidence reviewers will require. Sequencing guidance lives in `docs/ROADMAP.md`; evidence rules in `docs/TESTING.md`.

## 1. How microtasks work

- One microtask = one PR, small diff, differentiable review.
- Every task must keep the repo's invariants green (`make test`, race, lint, `rivicq scan .` self-scan, benchmark <= 20% — see `docs/DEVSECOPS.md`).
- Public behavior changes must update `docs/` and, if detection changes, a dataset `expected.json`.
- Never invent CVE/scoring numbers; copy values from the actual detector. No secrets in code or fixtures (`docs/MASTER_RULES.md`).

## 2. Engine and scanner

| Microtask | Files | Evidence |
|---|---|---|
| Add one library to the `cryptoLibraries` profile map (name -> algorithm, PQC status, BSI ref) | `internal/discovery/sbom_scanner.go` + dataset | new row in a known-bad dataset `must_match` or a fresh unit test |
| Tighten TLS minimum version for a probe type | `internal/discovery/tls_scanner.go`, policy | `internal/intelligence` unit + TLS fixture |
| Add a security-header check to the HTTP scanner | `internal/discovery/http_scanner.go` | unit test with a stub HTTP server reading headers |
| Add an allowed-port / policy exception behind a flag | `internal/discovery/target_policy.go` | policy short-circuit tests |
| Emit a new `finding` type from an existing detector | `internal/intelligence/finding.go` + detector | `Finding` normalisation test with fixture evidence |
| Add a `WARN`/`INFORM` policy for a PQC transition | `internal/intelligence/policy.go` | policy gate test asserting action |
| Sort/limit a report field consumers rely on | `internal/discovery`, `internal/api/shared` | API test on `GET /scans/:id/report` |

## 3. API and auth

| Microtask | Files | Evidence |
|---|---|---|
| Add `validate` input for a new scan target kind | `internal/api/shared/validators.go` + handler | parameterised validator test |
| Version an OpenAPI spec for a new endpoint | `docs/openapi.yaml` + handler | ReDoc build + API test |
| Improve a 4xx message without leaking internals | handler + `ErrorResponse` | error-shape unit test (`docs/ERROR_HANDLING.md`) |
| Add an RBAC role check to a page action | `web/src/pages/...`, `RequireRole` | frontend + API role-test |
| Add an auditable event type | `internal/middleware/audit.go` + vocab | audit event line in enterprise test |
| Add a TOTP/MFA UI to a settings tab | `web/src/pages/Settings*`, `internal/api/shared/mfa.go` | frontend test + TOTP flow integration test |

## 4. Frontend

| Microtask | Files | Evidence |
|---|---|---|
| Add an empty-state CTA for a page | `web/src/components/EmptyState.tsx`, page | frontend component test |
| Fix a staleQuery leak on a report page | `web/src/pages`, `web/src/context/QueryContext.tsx` | frontend test asserting no refetch storm |
| Add severity/status chip semantics | `web/src/components/StatusChip.tsx` | RTL render test |
| Improve form validation message | `web/src/components/ScanControls.tsx` | validation unit test |
| Add a theme-safety guard (reduced-motion) | `web/src/theme/dashboardDesign.ts` | design-system doc + test of hook |
| Wire an API field to a chart axis | `web/src/components/PieChartCard.tsx` | chart render test with fixed data |

## 5. Data and datasets

| Microtask | Files | Evidence |
|---|---|---|
| Add a fixture for a new detector | `fixtures/...` + `datasets/**/expected.json` | `make analyze-datasets` green |
| Document one dataset's provenance | dataset README + `DATASETS.md` | editorial pass; no behavior |
| Sync benchmark baseline after intended perf change | `tests/benchmark-baseline.json` | `scripts/compare_benchmarks.py` ok; baseline PR |
| Add a compliance mapping row | `internal/compliance/*` + `docs/SECURITY_CONTROL_MATRIX.md` | mapping unit test (mapping, not certification) |

## 6. CI and releases

| Microtask | Files | Evidence |
|---|---|---|
| Add a workflow that pins a step permission | `.github/workflows/*.yml` | actionlint / re-run of that workflow in this PR |
| Rotate a documented non-secret env var in workflows | workflow + `.env.example` | workflow run green |
| Add a Helm value with default + override test | `deploy/helm/cryptobom-enterprise/templates/*` + values | `helm lint` + template assertions |
| Update ReDoc/Swagger UI pin | `docs/` ReDoc build | docs-build job green |

## 7. Documentation

| Microtask | Files | Evidence |
|---|---|---|
| Refresh a guide after an API change | target doc | diff shows only the changed contract |
| Add a missing `decision` (how/why an option was chosen) | `docs/adr/` new ADR or `docs/DECISIONS.md` | editorial pass; references real code paths |
| Update `KNOWN_LIMITATIONS.md` when a limit lifts | `docs/KNOWN_LIMITATIONS.md` | PR closes the matching issue |
| Fix a rendered Mermaid/table in a doc | the doc | pages/ReDoc output visual check |

## 8. Pull/module conventions

- Mind the level labels (in-repo level L0/L1) used by bots like Kodiak to auto-label work; small tasks are level L0.
- Use `cli/openai`-style short scope prefixes only if the repo already uses them; otherwise plain titles.
- Every microtask branches off `main`, and the PR description states the invariants run locally (`docs/TESTING.md` §6).