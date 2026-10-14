# PQC coverage

Taxonomy: `rivicq-pqc-taxonomy/1.0.0` in `internal/intelligence/pqc_class.go`.

| Class | Meaning | Example |
|-------|---------|---------|
| `legacy` | Broken classically | MD5, SHA-1, 3DES, TLS 1.0 |
| `high_risk` | Below policy now | RSA < 2048 |
| `migration_required` | Fine today, Shor-broken later | RSA-2048, ECDSA, ECDH, X25519 |
| `hybrid_ready` | Hybrid or Grover-resistant size | X25519+ML-KEM, AES-256 |
| `pqc_ready` | NIST FIPS 203/204/205 family names | ML-KEM, ML-DSA, SLH-DSA |
| `unknown` | Insufficient evidence | empty algorithm |

Sources recorded in code comments / `SupportedNISTPQC`: FIPS 203/204/205 names as **inventory labels**, not CAVP validation.

`current_exploitability` is separate from `pqc_class`. RSA-2048 is quantum-exposed and **not** currently blocked.

This engine does **not** rotate production keys, flash devices, or negotiate PQC TLS on the operator's estate.
