# RivicQ Test Report

All results below were produced by running the commands shown, against commit
`82a6785` plus the changes in `RIVICQ_HARDENING_REPORT.md`.

---

## Summary

| Suite | Result |
|---|---|
| `go build ./...` | pass |
| `go build -tags enterprise ./...` | pass |
| `go vet ./...` | pass |
| `go vet -tags enterprise ./...` | pass |
| `go test ./...` | pass — 20 packages |
| `go test -tags enterprise ./...` | pass — 21 packages |
| `go test -tags integration ./tests/integration/` | pass — 10 pass, 1 skip (no DSN) |

339 distinct `Test*` functions across the repository.

## Integration suite

Requires a PostgreSQL instance. The suite drops and recreates every table it
touches: **point it at a throwaway database.**

```
RIVICQ_TEST_DATABASE_URL='postgres://user@localhost/rivicq_audit?sslmode=disable' \
  go test -tags integration ./tests/integration/ -v
```

| Test | Covers |
|---|---|
| `TestMigrationsApplyToEmptyDatabase` | All 7 migrations apply from empty |
| `TestMigrationsAreIdempotent` | Re-running is a no-op |
| `TestMigrationChecksumDriftIsRejected` | Editing an applied migration is a startup failure |
| `TestMigrationRollbackOnFailure` | A failing migration leaves no partial schema |
| `TestLegacySchemaUpgradeBackfillsTenantOwnership` | Legacy tables gain `tenant_id`, orphans are deleted, `key_length` backfills to `key_size` |
| `TestTenantIsolationOnQueries` | Cross-tenant read, update, and delete are refused; a refused write leaves the row unchanged |
| `TestCryptoAssetOwnershipIsEnforcedByTheDatabase` | An asset whose tenant differs from its report's owner is rejected |
| `TestForeignKeyRejectsUnknownTenant` | Rows referencing a nonexistent tenant are rejected |
| `TestHealthCheckReportsRealState` | Health reflects actual DB state |
| `TestDatabaseConnectivity` | DSN is reachable (skipped without one) |
| `TestServersHealthy` | Live OSS + Enterprise servers respond (skipped unless `RIVICQ_SMOKE_URLS` is set) |

Each test resets the schema first. Without that isolation one test's legacy
fixture leaks into the next, which is how the suite first reported
`column "version" does not exist` as if it were a product bug.

### Why this suite matters

Every defect it found was invisible to unit tests:

- `column "version" does not exist` on a legacy schema
- `converting NULL to string is unsupported` on every CBOM report read
- a cross-tenant asset accepted by the database
- a legacy `key_length`/`key_size` mismatch that made the table unreadable

None of these are reachable without a real PostgreSQL instance. A green unit
suite was never evidence that the persistence layer worked.

## Coverage

```
go test ./internal/... -coverprofile=coverage.out
go tool cover -func=coverage.out | tail -1
```

**Total: 26.6% of statements.**

| Package | Coverage |
|---|---|
| `internal/quantum/nistpqc` | 96.7% |
| `internal/quantum/provider` | 96.6% |
| `internal/tenant` | 88.9% |
| `internal/hardware` | 86.2% |
| `internal/intelligence` | 68.9% |
| `internal/auth` | 61.1% |
| `internal/discovery` | 56.5% |
| `internal/platform` | 58.7% |
| `internal/edition` | 42.9% |
| `internal/api/shared` | 27.7% |
| `internal/server` | 19.7% |
| `internal/middleware` | 18.8% |
| `internal/quantum` | 13.1% |
| `internal/api/enterprise` | 0.3% |
| `internal/database` | 0.0% |

**Read this honestly.** 26.6% is low. The two lowest rows are the two most
consequential areas: the database layer and the enterprise handlers are covered
by the integration suite and the `-tags enterprise` tests rather than by unit
tests, which the percentage cannot see. The number is reported as measured.

## Security-focused tests added

| Area | File | Property asserted |
|---|---|---|
| Auth boundary | `internal/auth/enforce_router_test.go` | Real `/api/v1` routes require a token; public routes do not |
| Route surface | `internal/server/route_audit_test.go` | Allow-list matches the real route table; no mutating route is unmapped |
| Authorization | `internal/auth/route_permissions_test.go` | Viewer refused mutations; viewer allowed reads; admin/operator/analyst matrix; unmapped mutations fail closed; missing permissions fail closed |
| Tenancy | `internal/api/enterprise/tenant_audit_test.go` | No write handler resolves its tenant through a non-failing helper (AST-enforced) |
| SSRF | `internal/discovery/safe_dial_test.go` | Rebinding to loopback and to metadata refused; mixed answers refused; literal blocked IPs refused; host allow-list enforced; redirect to internal blocked; operator opt-in still works |
| Webhooks | `internal/api/shared/github_webhook_security_test.go` | Replay refused; oversized body refused; forged and mismatched signatures refused |
| Replay cache | `internal/api/shared/delivery_cache_test.go` | TTL expiry; hard cap; FIFO eviction; 200 concurrent identical deliveries yield exactly one acceptance; zero TTL cannot disable protection |
| Scanner | `internal/api/shared/scanner_corpus_test.go` | 17 labelled cases; precision and recall pinned; corpus composition guarded |

## Known weaknesses in the test suite itself

1. **`TestViewerCannotMutateState` inspects the policy table, not HTTP
   responses.** It asserts no viewer-held permission maps to a mutating route.
   The companion `TestRoleMutationMatrix` does assert on status codes, so the gap
   is covered, but the name of the first test overstates what it checks.

2. **The scanner corpus is self-authored.** See
   `RIVICQ_SCANNER_ACCURACY.md`. It is a regression harness, not validation.

3. **`TestDeliveryCacheEvictsOldestUnderPressure` initially asserted the
   inverse of what it meant.** It passed only after the implementation was made
   deterministic (FIFO by sequence rather than by wall clock, which ties under
   fast inserts). Recorded because it is the kind of mistake that makes a test
   suite look stronger than it is.

4. **No end-to-end test drives the permission model through the real router
   with real tokens.** The route audit covers mapping completeness and the unit
   tests cover enforcement, but nothing asserts a viewer receives 403 from an
   actual running server. This is the highest-value missing test.

5. **CI had been running the integration suite against a variable the suite did
   not read**, so it skipped silently. Fixed by setting both names. A silently
   skipped suite is indistinguishable from a passing one in a build log, and this
   one had been that way.

## Performance

```
BenchmarkScannerCorpus-8    200    1237032 ns/op
```

~1.24 ms for 17 files. A micro-corpus; no large-repository benchmark has been
run. No load, throughput, or latency testing exists for the HTTP surface.