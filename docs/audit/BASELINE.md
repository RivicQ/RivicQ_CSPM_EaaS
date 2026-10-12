# RivicQ CSPM — Baseline Audit (Phase 1)

Status: **first pass, evidence-based**. Every result below was produced by running a
command against the working tree, not copied from documentation.

- Repository: `RivicQ/RivicQ_CSPM_EaaS`
- Go module path: `github.com/rivic-q/cryptobom-saas`
- Branch: `cursor/cspm-enterprise-boms-86cc`
- Commit: `1fa09106f5439798b96d2858c8db9ca147b6f95b`
- Default branch: `main` (tip `75d6245`; an ancestor of the audited commit)
- Date of run: 2026-10-12

## Toolchain (as observed)

| Tool | Version |
|------|---------|
| go | 1.26.9 |
| node | 26.7.0 |
| npm | 11.19.0 |
| golangci-lint | 2.12.2 |
| python3 | 3.9.6 |

`gh` CLI is **not installed** and the stored GitHub credential is expired
(API returns `401 Bad credentials`), so no workflow dispatch / PR / branch
protection action was possible during this audit.

## Repository shape

- Tracked files: 861 (pack size 32.92 MiB).
- Backend: Go, Gin router, `internal/*` domain packages, `cmd/*` binaries.
- Frontend: CRA + TypeScript under `web/`.
- Static surfaces: `docs/`, `marketing/`, `fabric/` (RivicQ Graph), `archify/`.
- Persistence: PostgreSQL optional; in-memory demo mode when unset.
- Editions: OSS (`:8080`) and Enterprise (`:9090`, license-gated via `CRYPTOBOM_LICENSE_KEY`).

## Build / test / lint results

| Check | Command | Result | Notes |
|-------|---------|--------|-------|
| Go build | `go build ./...` | **PASS** (after fix) | Failed initially on `integrations/stripe/server/stripe.go` (unused vars). Fixed in this audit. |
| Go vet | `go vet ./...` | **PASS** | |
| Go tests | `go test ./...` | **PASS** | All packages `ok`; several test-packages otherwise (see TEST_RESULTS.md). |
| golangci-lint | `golangci-lint run ./...` | **FAIL: 19 issues** | All pre-existing; see below. |
| Web type-check | `npm run type-check` (web/) | **PASS** | `tsc --noEmit` clean. |
| Web lint | `npm run lint` (web/) | **PASS** | `eslint src --ext .ts,.tsx` clean. |
| Web tests | `CI=true npm test` (web/) | **PASS** | 11 suites / 27 tests. |
| CLI scan | `bin/rivicq scan <dir>` | **PASS** | Exit 0 clean, 1 on gate block. |

### Lint issues (pre-existing, 19)

| Linter | Count | Location |
|--------|-------|----------|
| errcheck | 15 | `internal/firmware/{analyze_test.go,helpers_test.go,format.go}` |
| ineffassign | 1 | `internal/identity/identity.go:137` |
| staticcheck | 2 | `internal/firmware/format.go:71` (empty branch), `:347` (`tar.TypeRegA` deprecated) |
| unused | 1 | `internal/api/shared/auth_compat.go:18` (`toUserResponse`) |

None of these are in security-critical paths; all predate this audit. Recommended
fix: a small hygiene PR (see SECURITY_FINDINGS.md for severity).

## Defects found during baseline (and disposition)

1. **P0 — build-breaking scaffold.** `integrations/stripe/server/stripe.go`
   declared `successURL` / `cancelURL` but only referenced them inside comments,
   so `go build ./...` failed. **Fixed** in this audit (values now surfaced in the
   not-implemented response).
2. **P2 — lint debt (19).** Described above. Not fixed here (out of the smallest-
   high-value-fix budget; tracked for a hygiene PR).
3. **P3 — CLI flag-value validation.** `--fail-on BOGUS` and `--format bogus`
   return exit 0 (silently fall back) rather than a usage error. Exit code `2` is
   only produced for missing/unknown commands. Documented inconsistency.

## Reproduce

```sh
go build ./... && go vet ./... && go test ./...
golangci-lint run ./...
( cd web && npm ci && npm run type-check && npm run lint && CI=true npm test -- --watchAll=false )
go build -o /tmp/rivicq ./cmd/rivicq && /tmp/rivicq scan . --format json
```
