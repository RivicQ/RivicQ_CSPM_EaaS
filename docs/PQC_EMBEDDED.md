# PQC migration — embedded devices

RivicQ derives a per-asset post-quantum migration plan from firmware evidence.
This is planning intelligence, **not** a validation or certification.

## How a plan is built

`cryptoart.BuildPQCPlan(asset, deviceLifetime, algorithms)`:

1. Skip algorithms already `quantum_safe` (ML-KEM, ML-DSA, SLH-DSA).
2. Phase mapping: `broken_classical → phase-0`, `migration_required → phase-1`,
   `migration_recommended → phase-2`, else `phase-3`.
3. Priority: `broken_classical → P0`, `migration_required → P1`, else `P2`.
4. **Device-lifetime escalation**: if any affected algorithm is `quantum_risk=HIGH`
   and the device lifetime is `5-10 years` or `10+ years`, the plan escalates to `P0`.

Long-lived embedded devices have the hardest migration path (field replacement),
so lifetime is a first-class input.

## Readiness

- `ready` — no quantum-vulnerable public-key crypto detected.
- `partial` — some vulnerable crypto; hybrid/PQC migration required.
- `not_ready` — reserved for stronger signals (e.g. broken classical + long life).

## Example

```bash
rivicq firmware pqc firmware.bin --profile embedded/infineon --device-lifetime 10y+
```

Output lists affected algorithms with `replacement`, `phase`, `priority`, and a
`rationale` drawn from the taxonomy.

## Replacements (taxonomy)

| Classical | Replacement |
|---|---|
| RSA | ML-KEM (KEM) / hybrid; ML-DSA (signatures) |
| ECDH | ML-KEM / hybrid X25519+ML-KEM |
| ECDSA | ML-DSA / SLH-DSA (hybrid during transition) |
| Ed25519 / X25519 | ML-DSA / X25519+ML-KEM hybrid |
| SHA-1 | SHA-256/384 |
| 3DES / DES / RC4 | AES-256 / ChaCha20 |

> Not a NIST CAVP validation. Classifications come from a local, deterministic
> taxonomy (`qiskitprofile`), not from IBM Quantum hardware.
