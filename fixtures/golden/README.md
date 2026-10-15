# Golden fixtures

Synthetic inputs for CBOM / policy regression. **No production keys.**

| Path | Intent |
|------|--------|
| `rsa2048/` | RSA-2048 classified, not BLOCK |
| `ecdh/` | ECDH + X25519 library presence |
| `ffdh/` | Finite-field DH in SSH config |
| `aes-sha/` | AES / SHA-256 inventory |
| `tls13/` | TLS 1.3 inventory |
| `pqc/` | Declared FIPS 203/204/205 names |
| `library-ref/` | Import-only RSA |
| `ambiguous/` | Docs naming banned algorithms (negative) |
| `ssh-rsa/` | HostKeyAlgorithms ssh-rsa → BLOCK |

Run via `python3 scripts/analyze-datasets.py` (datasets that point here) or `rivicq scan <path> --include-fixtures`.
