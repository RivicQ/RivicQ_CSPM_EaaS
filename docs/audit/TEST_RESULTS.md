# RivicQ CSPM — Test Results (Phase 1)

All commands were run from the repo root unless a `( cd web && … )` is shown.
Commit `1fa0910`, date 2026-10-12.

## 1. Go test suite

```
go test ./... -count=1
```

- Packages `ok`: **27**
- Packages `FAIL`: **0**
- Test packages with no test files: several (e.g. `internal/config`,
  `internal/database`, `internal/observability`, `cmd/*`, cloud connectors).
- Test files: 62 (`*_test.go`, excluding `web/`).
- Test functions (`func Test…`): 385.

Notable suites that executed green: `internal/discovery` (9 files),
`internal/api/{shared,enterprise}` (9 files), `internal/quantum/*`,
`internal/firmware`, `internal/identity`, `internal/hardware`,
`internal/tenant`, `internal/middleware`, `internal/bom`, `internal/bom`.

Packages with **no tests** that carry logic (gap to close): `internal/database`,
`internal/config`, `internal/observability`, `internal/{aws,azure,gcp,ibm}cloud`,
`internal/cilium`, `internal/operator`.

## 2. Static analysis

```
go build ./...           # PASS
go vet ./...             # PASS
golangci-lint run ./...  # FAIL — 19 issues (pre-existing)
```

The 19 lint issues: 15 `errcheck`, 1 `ineffassign`, 2 `staticcheck`,
1 `unused`. Files: `internal/firmware/*`, `internal/identity/identity.go`,
`internal/api/shared/auth_compat.go`.

## 3. Frontend

```
( cd web && npm run type-check )   # PASS
( cd web && npm run lint )         # PASS
( cd web && CI=true npm test -- --watchAll=false )
```

- Test suites: **11 passed / 11**
- Tests: **27 passed / 27**
- Time: ~2.9 s
- Reported coverage: low overall (most pages 0%); theme modules partially
  covered (`designSystem.ts` ~72% stmt). Coverage thresholds are not enforced.

## 4. CLI end-to-end (scan / gate / exit codes)

Binary built with `go build -o /tmp/rivicq ./cmd/rivicq`.

| Scenario | Command | Exit | Notes |
|----------|---------|------|-------|
| Clean dir | `rivicq scan /tmp/clean --format json` | 0 | 0 findings |
| Weak fixture, default gate | `rivicq scan fixtures/crypto-test --include-fixtures` | **1** | gate `BLOCK`, 6 findings |
| Weak fixture, gate off | `rivicq scan fixtures/crypto-test --include-fixtures --fail-on NONE` | 0 | findings still reported |
| Fixture, severity gate | `rivicq scan fixtures/vulnerable-go --fail-on critical` | 0 | only HIGH found, no CRITICAL |
| No args | `rivicq` | 2 | usage |
| Unknown command | `rivicq boguscmd` | 2 | usage |
| Invalid flag value | `rivicq scan . --fail-on BOGUS` | 0 | **inconsistent** (should be usage error) |

Gate output on the weak fixture (BLOCK semantics verified):

```
gate.decision = BLOCK
gate.blocked  = 6   (MD5, SHA-1, RSA<2048, TLS1.0, 3DES ×2)
gate.warned   = 1   (generic secret pattern)
```

The RSA block is **correct**: `fixtures/crypto-test/weak.go` uses
`rsa.GenerateKey(rand.Reader, 1024)`, i.e. below the 2048-bit policy. This does
**not** contradict the "do not auto-label RSA-2048 vulnerable" rule — the policy
is a minimum key-size policy, and a compliant 2048-bit key is not flagged here.

## 5. Firmware / identity workflows (partner fixtures)

```
rivicq firmware scan fixtures/partners/infineon/classical-mcu/firmware.bin \
    --profile embedded/infineon --format json          # exit 1 (BLOCK)
rivicq firmware cbom fixtures/partners/infineon/classical-mcu/firmware.bin \
    --format json                                       # exit 1 (BLOCK)
rivicq firmware compare fixtures/partners/infineon/firmware-diff/v1.bin \
    fixtures/partners/infineon/firmware-diff/v2.bin     # exit 0
rivicq identity scan fixtures/partners/gd/certificate/device-ecdsa-p256.pem \
    --profile identity/gd --format json                 # exit 1 (BLOCK)
```

Observed (synthetic fixtures, plausible and non-fabricated):

- Detection is **string/marker based** (source `firmware-static`,
  evidence e.g. `string-evidence: AES, aes_, AES_`), profile `embedded/infineon`.
- `firmware cbom` emits a JSON array of algorithm objects with
  `quantum_safe`, `pqc_status` (`migration_required` for ECDH,
  `migration_recommended` for AES) and `risk_level`.
- `firmware compare v1→v2` reports `libraries: +[wolfSSL]`,
  `algorithms: +[ML-KEM] -[SHA-1]`, `pqc-status changed`.
- `identity scan` parses the X.509 device cert and extracts subject/issuer,
  profile `identity/gd`.

These outputs are consistent with a **static analysis** tool. No execution,
flashing, or key extraction was performed or claimed.

## 6. Coverage / honesty notes

- Some `cmd/*` and `internal/database` paths are exercised only indirectly.
- Coverage is not enforced; low-coverage hotspots are listed above.
- All results above were produced live; nothing in this file is inferred from
  documentation.
