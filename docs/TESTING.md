# Testing Strategy and Test Writing Rules

How we verify the engine, API, frontend, and datasets, and the rules reviewers enforce so evidence is real. Quick answers live in `tests/README.md`; this document is the strategy and the definitions behind `make test`.

## 1. Test layers

| Layer | Where | Runs with |
|---|---|---|
| Unit (pure engine) | `*_test.go` colocated with `internal/...` | `go test ./...` |
| Go unit + race | `internal/auth`, `internal/api/shared`, `internal/intelligence`, `internal/api/enterprise`, `tests/` | `go test -count=1 -short` (+ `-race`) |
| Integration (Postgres) | `tests/integration/integration_test.go`, `tests/enterprise/...` | `go test -tags integration` with `RIVICQ_TEST_DATABASE_URL` (Postgres 15 service in CI) |
| Full server smoke | live fixture checks against running OSS/Enterprise | `scripts/run-edition.sh`, `RIVICQ_SMOKE_URLS` in `ci-cd.yml` |
| Dataset harness | `tests/dataset_harness_test.go` + `datasets/**/expected.json` | `make analyze-datasets` |
| Benchmarks | `tests/bench/` (`BenchmarkAPICalls`, `BenchmarkDatasetGeneration`) | `go test -bench=.`; regression gate <= 20% vs `tests/benchmark-baseline.json` |
| Scanner accuracy regression | harness on `fixtures/` + datasets | `docs/RIVICQ_SCANNER_ACCURACY.md` |
| Frontend | `web/src/**/*.test.*` | `cd web && CI=true npm test -- --watchAll=false` |
| Self-scan of the repo | `.github/actions/rivicq-scan` | `rivicq scan . --fail-on BLOCK` (workflow `rivicq-security.yml`) |
| Security | CodeQL, Snyk, Trivy, ZAP DAST, webhook-signature tests | see `docs/DEVSECOPS.md` |

## 2. Key suites and what they assert

| Suite | File | Asserts |
|---|---|---|
| API | `tests/api_test.go` | Edition endpoints, openAPI generation, tenant public id, auth filter, CORS defaults, scan/report flow |
| Scanner flow | `tests/scanner_flow_test.go` | `POST /scans` 202 -> result -> report summary/findings; error codes |
| Tenant isolation | `tests/scan_tenant_isolation_test.go` | a JWT tenant can never read another tenant's scans/findings (404), enterprise admin boundaries |
| Webhook security | `internal/api/shared/github_webhook_security_test.go` | signature verify, replay rejection (`duplicate_delivery`), format validation, zero-bytes, HMAC constants |
| Dataset harness | `tests/dataset_harness_test.go` | every dataset's `expected.json` `must_match` items present, `must_not_match` absent, `sensitive == false`, maxima respected |
| Auth/identity | `tests/unit/full_test.go`, `internal/authn/*_test.go` | password policy (12–72, 3-of-4 classes, deny-list), JWT expiry, inline auth vs explicit pass |
| Firmware/identity | `internal/firmware`, `internal/identity` | fixture parsing, size limits, RBAC `cbom:read`/`scans:start` on `/api/v1/firmware/*`, `/api/v1/identity/*` (`docs/FIRMWARE_IDENTITY_API.md`) |
| Enterprise startup | `tests/enterprise/enterprise_test.go`, `main_test.go`, `hardened_bootstrap_test.go` | enterprise routes, license-key bootstrap, hardened flags |
| Stress/ISLA | `tests/enterprise/stress_test.go` | concurrency baseline + custom ISLA (isolation) plan |
| Frontend | `web/src` tests | auth gating renders, forms validate, theme toggle, query wiring |

## 3. Running the suite

```bash
make test                                  # go vet + unit tests (short)
make test-all                              # full unit + datasets + analysis
go test -race ./...                        # race detector
go test -tags integration ./...            # needs RIVICQ_TEST_DATABASE_URL
cd web && CI=true npm test -- --watchAll=false
npm run lint && npm run type-check         # web lint + tsc
golangci-lint run ./...                    # per .golangci.yml (v2)
make analyze-datasets                      # dataset harness + update cache
```

`scripts/analyze-datasets.py` drives dataset expectations; CI also runs `scripts/production-readiness.sh --strict` (`production-validation` job in `ci-cd.yml`).

## 4. Dataset harness contract

Each dataset dir (`datasets/known-bad/{crypto-go,node-sca,terraform}`, `datasets/known-good/self-scan`, `datasets/containers/openssl-sample`) has `expected.json`:

```json
{
  "id": "openssl-sample",
  "license": "Apache-2.0",
  "sensitive": false,
  "source": "synthetic",
  "must_match": ["openssl"],
  "min_findings": 1,
  "max_block": 0
}
```

Rules: values come from **real detector output** (`must_match` copied from actual findings), never invented; `sensitive` must be `false` for every committed fixture; `fixtures/` and `testdata/` are excluded from repo scans (`defaultExcludes`) so the self-scan stays green.

## 5. Accuracy and benchmark discipline

- Scanner accuracy regression is maintained in `docs/RIVICQ_SCANNER_ACCURACY.md` and enforced by the fixture harness (evergreen tests) — PRs that change detection must update expected output, never skip the harness.
- Benchmark regressions are computed in `tests/bench/` + `scripts/compare_benchmarks.py`; `ci-cd.yml` `performance-tests` fails at > 20% regression. Refresh the baseline only via `update-benchmark-baseline.yml` after intentional engine changes.
- Timing-dependent tests use generous thresholds and are excluded from `-short` when they need the DB.

## 6. What a PR needs (contribution rule)

1. Test evidence: the new or changed behavior has a colocated test AND (for detection changes) an updated dataset/expected.json row.
2. No skipped tests degrading gates; `t.Skip` requires an issue link.
3. `rivicq scan .` self-scan remains FIND_OK on the branch.
4. Race + lint green locally, mirroring `.github/workflows/ci-oss.yml`.

## 7. Known boundaries in testing

- Fixture-based firmware/identity tests cover static syntax, not real silicon (per `docs/KNOWN_LIMITATIONS.md`).
- Cloud/IBM/quantum paths are tested with mock clients and mocked Qiskit runs; real-connector tests require customer credentials out of CI.
- DAST (staging) and Snyk run in CI only when their tokens/external service is available; a skipped security workflow never blocks a PR unless its gate is configured as required.