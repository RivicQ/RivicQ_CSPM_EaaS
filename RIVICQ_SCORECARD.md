# RivicQ Scorecard

Baseline 58/100 (`RIVICQ_BASELINE.md`, commit `82a6785`).

Every score below is justified by a file, a test, or a command output. Where a
score moved because of a fix that only one test covers, that is stated. Scores are
my assessment against the original rubric, not a measurement.

---

## Verdict

**Baseline 58/100 → Pilot Ready, approximately 78/100 against the stated 80+
Production target.**

The 80+ target is not reached, and the shortfall is not spread evenly. The two
categories that moved furthest are the two that were worst; the categories that
remain lowest are the ones requiring either an external party or an operational
procedure that cannot be validated by a test.

**Production Ready: not claimed.** Three medium-severity pre-existing defects
remain open and are listed in §9.

---

## Category scores

| Category | Baseline | Target | Now | Movement | Basis |
|---|---:|---:|---:|---|---|
| Architecture | 68 | 80+ | **82** | +14 | Two bootstraps unified behind `internal/server`; migrations extracted from inline SQL into a versioned runner; HTTP timeouts and graceful drain on both editions. Held back by the inert config layer. |
| CBOM | 74 | 85+ | **86** | +12 | Every CBOM read was failing on a NULL `metadata` scan — fixed with `COALESCE`. Legacy schemas now upgrade to a readable shape. Deterministic fingerprints and stable ordering. |
| Multi-tenancy | 74 | 90+ | **88** | +14 | Cross-tenant ownership was not enforced by the database; composite FKs now prevent it. Thirteen write handlers defaulted to a shared tenant; fixed and AST-enforced. **Not 90+** — webhook scans still all land in `PublicTenantID`. |
| PQC taxonomy | 70 | 85+ | **85** | +15 | Versioned `rivicq-pqc-taxonomy/1.0.0`, six classes, reasons, actions, readiness propagation. Registry concurrency tested. |
| Authentication | 64 | 85+ | **84** | +20 | The public-route allow-list never matched and authorization was wired to nothing — the two largest defects in the codebase. Both fixed. **Not 85+** — no MFA enforcement policy and no independent pen test. |
| Scanner accuracy | 58 | 80+ | **74** | +16 | Was **unmeasured**; now 17 labelled cases with precision 1.000 / recall 1.000, and the corpus found 4 real false negatives on primary detections. **Capped at 74** because the corpus is self-authored — it proves regression safety, not real-world accuracy. |
| Production readiness | 40 | 75+ | **62** | +22 | Migrations versioned, timeouts, truthful readiness, real shutdown, fail-closed dependencies, CI gates. **Capped at 62** by rate-limit bypass, permissive CORS, OAuth codes in the audit log, no backup/restore, no metrics. |
| **Overall** | **58** | **80+** | **~78** | **+20** | Weighted toward the categories carrying the most risk. |

## What moved the most

Three findings account for most of the improvement, and none of them were
visible to the existing test suite:

1. **Authorization was never enforced.** `RequirePermission` existed, was
   documented as the authorization boundary, and was called from no production
   path. Any authenticated account had full administrative access within its
   tenant, and registration is open. This is why Authentication moved +20.

2. **Every CBOM report read failed.** 13 nullable columns scanned into non-pointer
   fields, with `metadata` having no default. The failure required a real
   PostgreSQL instance to surface.

3. **The database did not enforce tenant ownership.** Independent foreign keys
   let tenant-b attach an asset to tenant-a's report — invisible to both
   tenants' queries, but persisted.

## Why not 80+

I am not scoring the remaining 2 points as a rounding error, and I would rather
state the shortfall than inflate a category to hit a number.

**The three gaps that block Production Ready**, all pre-existing and none
introduced by this work:

| Gap | Impact |
|---|---|
| `SetTrustedProxies` never called | Gin trusts the entire `X-Forwarded-For` chain, so the rate limiter can be bypassed with a fresh bucket per request. The limiter does not work. |
| CORS defaults to `"*"` with `Allow-Credentials: true` and reflects any origin | Any website gets a credentialed cross-origin channel from the user's browser. Reduced by Bearer auth, not eliminated. |
| Audit log persists `URL.RawQuery` | OAuth authorization codes are written to `audit_events.path` in the clear. |

**Plus three gaps that need an operator, not a patch:**

- No backup/restore has been performed or verified. For a product holding
  customer supply-chain inventories this is the most consequential gap, and no
  test can substitute for restoring a backup.
- No rollback procedure. Migrations have no down-migration.
- No third-party dependency audit (`govulncheck`) and no penetration test.

The remaining 2 points are in Scanner accuracy and are structural: the corpus
labels were written by whoever wrote the rules. Closing that requires an
independently labelled corpus over real repositories. Until then, 74 is an
honest ceiling for that category regardless of the measured 1.000/1.000.

## Verification

```
go build ./... && go build -tags enterprise ./...          pass
go vet ./...   && go vet -tags enterprise ./...            pass
go test ./...  && go test -tags enterprise ./...           pass (20 / 21 packages)
go test -tags integration ./tests/integration/             10 pass, 1 skip
339 distinct Test* functions
```

Statement coverage: **26.6%** — reported as measured. `internal/database` is at
0% and `internal/api/enterprise` at 0.3% under the default build; both are
covered by the integration suite and the `-tags enterprise` tests, which the
percentage does not reflect.

## Recommendation

Proceed to a **pilot**: named users, known network, operator present, single
replica.

Before production: fix the rate-limit bypass and the CORS default (both are
small, both are security-relevant under internet exposure), stop persisting OAuth
codes in the audit log, then perform and **verify** a backup restore, write and
rehearse a rollback, run `govulncheck`, and resolve the webhook replay and
tenant-mapping gaps before adding a second replica.

**Enterprise Ready: not claimed.** That requires an external penetration test,
an independent scanner accuracy corpus, and demonstrated multi-tenant scale
testing. None exist.

## Reports

| Document | Contents |
|---|---|
| `RIVICQ_BASELINE.md` | Original 58/100 assessment; the source of every gap tracked here |
| `RIVICQ_HARDENING_REPORT.md` | Every change, the bug it fixes, and what it does not fix |
| `RIVICQ_SECURITY_REPORT.md` | Findings by severity, with residual risks and a recommended order of work |
| `RIVICQ_SCANNER_ACCURACY.md` | Measured precision/recall, the 5 defects the corpus found, and the limits of the method |
| `RIVICQ_TEST_REPORT.md` | Suites, commands, integration results, coverage, and weaknesses in the tests themselves |
| `RIVICQ_PRODUCTION_READINESS.md` | Per-capability fixed/verified/open status; pilot entry criteria |
| `RIVICQ_SCORECARD.md` | This document |