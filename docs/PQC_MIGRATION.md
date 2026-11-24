# Post-quantum cryptography migration

Operator guide for shifting classical crypto to NIST PQC (FIPS 203/204/205).
This is a **planning map**, not a key-rotation product and not a certification.

Companion: [BOM_FRAMEWORK.md](BOM_FRAMEWORK.md) · [QISKIT_PIPELINE.md](QISKIT_PIPELINE.md) · [CLIENT_ARCHITECTURE.md](CLIENT_ARCHITECTURE.md)

## What ships today

1. **Discover** — CBOM + SBOM from website, host, IP, server, declared pod, and local path.
2. **Score** — local `qiskitprofile` taxonomy (Shor / Grover / PQC). IBM Quantum Runtime is **not** invoked.
3. **Map** — Shor-class → ML-KEM / ML-DSA (hybrid recommended); Grover-class → AES-256 / SHA-384+; PQC → keep parameter set.
4. **Report** — intelligence `pqc_readiness` plus `/migration` in the console. Community is JSON. Enterprise adds the DORA pack flag.

The engine **does not rotate production keys**. Hybrid classical + PQC is the recommended cut-over.

## Workbook layers → QBOM

PQC Readiness Assessment layers:

`SBOM / CBOM / HBOM / AIBOM` → synthesized **QBOM**

| Input | Community | Enterprise |
|---|---|---|
| SBOM | Lockfiles / local path | Same + optional Syft/Trivy |
| CBOM | Shared engine | Same |
| HBOM | Declared HSM/TPM/QSIC catalog | Persistable inventory; PKCS#11 when a module path exists |
| AIBOM | Locked | Declared model registry |
| QBOM | Local taxonomy | Same + optional runtime / migration partner key |

CRQC dates in third-party roadmaps are **not executed** here.

## Shift phases

| Phase | Community | Enterprise |
|---|---|---|
| Inventory | `rivicq scan .` / website TLS | Same + live kube attach / cloud connectors |
| Classify | Attack class + replacement | Same |
| Plan | JSON migration list | Same + GRC pack / partner confirmation |
| Cut-over | Operator-owned | Optional HSM connector stores PQC keys you generate |
| Verify | Re-scan CBOM | Continuous monitoring (pipeline stage 7) |

## Connectors (empty without credentials)

- `CRYPTONEXT_API_KEY` — optional PQC PKI confirmation
- `PKCS11_MODULE` / `CRYPTO4A_API_KEY` — optional HSM
- `IBMQ_API_KEY` — optional quantum runtime (never required for scores)
- Cloud HSM IAM — optional

FIPS 140-3 claims belong to the **customer module**, not RivicQ.

## APIs

```
GET /api/v1/scans/:id/intelligence   # pqc_readiness + client_architecture
GET /api/v1/scans/:id/qiskit         # local estate score
GET /api/v1/bom/unified
GET /api/v1/quantum/status
GET /api/v1/hsm/status
```
