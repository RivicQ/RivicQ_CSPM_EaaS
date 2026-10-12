# RivicQ CSPM — DevSecOps Verification (Phase 3)

Commit `1fa0910` + Phase 2 fixes. Everything below was executed locally.

## CLI pipeline

`rivicq` (built from `cmd/rivicq`) supports:
`scan | sbom | cbom | vuln | secrets | iac | compliance | policy`, plus
`firmware …` and `identity …`.

```
rivicq scan . --format json --fail-on BLOCK
```

Output is a single JSON `Report` containing `findings`, `gate`, `summary`,
`pqc_readiness`, `audit_score`, and an embedded CycloneDX `cyclonedx` document.

## Policy gate + exit codes (verified)

| Condition | Command | Exit |
|---|---|---|
| Known-good (clean dir) | `scan <clean>` | **0** |
| Weak fixture (default BLOCK) | `scan fixtures/crypto-test --include-fixtures` | **1** |
| Gate disabled | `… --fail-on NONE` | **0** |
| Severity gate (no CRITICAL present) | `scan fixtures/vulnerable-go --fail-on critical` | **0** |
| Usage error (no args / unknown cmd) | `rivicq` / `rivicq boguscmd` | **2** |

Gate semantics observed on the weak fixture:
`decision = BLOCK`, `blocked = 6` (MD5, SHA-1, RSA<2048, TLS 1.0, 3DES ×2),
`warned = 1` (generic secret). **BLOCK fails the run (exit 1)**, so a CI step
using the default gate fails the pipeline on real regressions.

KNOWN/Accepted: BLOCK, WARN, ALLOW decisions are produced by
`internal/intelligence/policy.go` + `failon.go`. `--fail-on WARN` escalates
warnings to a failing exit.

## GitHub Action

`.github/actions/rivicq-scan/action.yml` (composite): builds the CLI with the
repo's Go version, then runs
`rivicq scan <path> --format json --fail-on <BLOCK|WARN> | tee rivicq-report.json`.
Defaults: `path=.`, `fail-on=BLOCK`, `format=json`. This makes the gate a
drop-in CI step for any repository.

## Golden corpus in CI (added)

`make analyze-datasets` (→ `scripts/analyze-datasets.py`) was runnable but **not
enforced in CI**. A new `datasets` job in `.github/workflows/ci.yml` now builds
`bin/rivicq` and runs the harness, failing on any `must_match` / `must_not_match`
/ `min_findings` / `max_block` regression. Known-good datasets must **not**
BLOCK; known-bad must match expectations.

## Known-good vs known-bad vs malformed

- **Known-good**: `datasets/known-good/self-scan` — repo self-scan must not BLOCK
  (observed WARN). On clean input, 0 findings / exit 0.
- **Known-bad**: `fixtures/crypto-test` (BLOCK), `fixtures/vulnerable-go`,
  `fixtures/vulnerable-node` (SCA), `fixtures/terraform-test`.
- **Malformed / negative**: `fixtures/malformed` (arbitrary binary) → 0 findings,
  ALLOW, no crash.
- **Missing-dependency**: SCA advisory data is adapter-dependent
  (`internal/intelligence/adapters_external.go`); offline runs do not fetch
  advisory feeds, so "missing dep" behaviour is limited to local manifests. Not
  over-claimed here.

## Gaps / caveats

- There is no dedicated `--format cyclonedx` (or `-o file`): the CycloneDX CBOM
  is available **inside** the scan JSON `cyclonedx` field. A first-class export
  flag would help CI consumers; noted, not implemented (scope).
- `--fail-on BOGUS` / `--format bogus` silently fall back (exit 0) instead of a
  usage error — see SECURITY_FINDINGS F-4.
- Container/IaC/SCA depth depends on optional external tooling; only the
  built-in analyzers were exercised here.
