# Qiskit scoring pipeline

RivicQ uses a **Qiskit-aligned attack-class taxonomy** on every completed CBOM / website scan. That is not the same thing as running IBM Quantum hardware.

```
Discovery (TLS, HTTPS, SSH, SBOM, GitHub)
        ↓
Intelligence findings (algorithm, key length, scanner)
        ↓
Go qiskitprofile.ScoreFindings   ← production path (this repo)
        ↓
estate_score + audit_score + labels.qiskit_attack_class
        ↓
GET /api/v1/scans/:id/intelligence
GET /api/v1/scans/:id/qiskit
Scanner + Home report UI
```

Optional Python: `sdk/python/rivicq_qiskit` (same classes; Qiskit Aer only if installed).

Optional Enterprise: `internal/quantum/ibmquantum` — reports **unavailable** without an API key. Website scans never wait on it.

## Three layers (do not conflate)

| Layer | Package | Invokes IBM Quantum? | Used in website/CBOM scores? |
|---|---|---|---|
| **Production profile** | `internal/quantum/qiskitprofile` | No | Yes |
| **Educational Aer** | `sdk/python/rivicq_qiskit` | No | No (companion) |
| **IBM Quantum Runtime** | `internal/quantum/ibmquantum` | Only with customer key | No |

## Attack classes

| Class | Algorithms | Product guidance |
|---|---|---|
| `shor` | RSA, DSA, DH, ECDH, ECDSA, Ed25519, X25519 | Plan hybrid ML-KEM / ML-DSA |
| `grover` | AES, SHA-2/3, HMAC, ChaCha | Prefer AES-256 / SHA-384+ |
| `pqc` | ML-KEM, ML-DSA, SLH-DSA, hybrids | Already on NIST FIPS 203/204/205 class |
| `none` | Unmapped | No invented CVE |

Estate score: start at 100, subtract for Shor and Grover findings, add for PQC. Bound to 0–100. **Order-of-magnitude public estimates only** — not a device run and not a cryptographic break.

Audit score: estate minus a penalty when the policy gate FAILs (or WARNs). Mappings, not ISO/SOC/NIST certification.

## Wire-up

- `intelligence.BuildReport` attaches `qiskit` + `audit_score` and labels each finding.
- Discovery `resources` (`tls` / `https` / `http` / `ssh` / `sbom`) are copied onto the Qiskit result so the client can show **enabled scanners**.
- `GET /scans/:id/report` remains `discovery.ScanResult` (unchanged contract).

## Python (optional)

```bash
python3 -m unittest sdk.python.rivicq_qiskit.test_pipeline
python3 sdk/python/rivicq_qiskit/pipeline.py
# optional: pip install qiskit qiskit-aer
```

See [sdk/python/rivicq_qiskit/README.md](../sdk/python/rivicq_qiskit/README.md).

IBM, Qiskit, and IBM Quantum are trademarks of IBM. RivicQ is not an IBM product.
