# Risk model

Scoring: `internal/intelligence/risk.go` (`ScoreCrypto`). Policy: `internal/intelligence/policy.go`.

## Two axes (do not collapse them)

1. **Current exploitability** — classical breaks and policy floors (MD5, SHA-1, RSA-1024, TLS 1.0, ssh-rsa host keys, 3DES/RC4, CISA KEV when present).
2. **Quantum exposure** — Shor/Grover classification (`pqc_class`). Used for migration planning, not as an automatic BLOCK for RSA-2048.

## Gate

Default CI gate is **BLOCK** (exit 1). WARN does not fail `--fail-on BLOCK`. Inventory observations never hit the gate.

Risk scores are a **local composite**, not ISO/SOC/NIST certification of RivicQ.
