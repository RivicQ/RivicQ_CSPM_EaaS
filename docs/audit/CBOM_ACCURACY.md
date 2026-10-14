# CBOM accuracy

Goal: the cryptographic BOM is **correct on a golden corpus**, not merely present.

Harness: `scripts/analyze-datasets.py` (compares `rivicq scan … --format json` to `datasets/**/expected.json`).

Result this session: **12/12 PASS**.

## Golden corpus

| Dataset | Source | Expectation | Result |
|---|---|---|---|
| crypto-go-weak | `fixtures/crypto-test` | md5/rsa; gate BLOCK | PASS (6 findings, BLOCK) |
| crypto-ec-weak | `fixtures/crypto-test-ec` | ecdsa + PQC; now also ECDH/X25519 | PASS (4 findings, ALLOW) |
| golden-rsa2048 | `fixtures/golden/rsa2048` | RSA present, **must not BLOCK** | PASS (1 finding, ALLOW) |
| golden-ecdh | `fixtures/golden/ecdh` | ECDH + X25519 library presence | PASS (2, ALLOW) |
| golden-aes-sha | `fixtures/golden/aes-sha` | AES + SHA-256 inventory, not BLOCK | PASS (2, ALLOW) |
| golden-ssh-rsa | `fixtures/golden/ssh-rsa` | HostKeyAlgorithms ssh-rsa → BLOCK | PASS (1, BLOCK) |
| golden-ambiguous-docs | `fixtures/golden/ambiguous` | README naming banned algos → 0 findings | PASS |
| terraform-weak | `fixtures/terraform-test` | placeholder/open CIDR | PASS |
| container-dockerfile | `fixtures/vulnerable-container` | container signals | PASS |
| vulnerable-node | `fixtures/vulnerable-node` | lodash SCA | PASS |
| malformed-binary | `fixtures/malformed` | no crash, no BLOCK | PASS |
| this-repo-self-scan | `.` (fixtures excluded) | must not BLOCK | PASS (WARN) |

Additional on-disk fixtures (exercised by unit tests / CLI, not the Python harness): `fixtures/golden/{ffdh,tls13,pqc,library-ref}`, `fixtures/partners/**`.

## Distinctions the engine now stamps

On `intelligence.Finding` (JSON):

| Field | Meaning |
|---|---|
| `presence_kind` | `library_presence` \| `confirmed_usage` \| `inventory` \| `declared` \| `detected` |
| `evidence_kind` | `observation` \| `inference` |
| `detection_method` | `regex-sast` \| `protocol-handshake` \| `x509-parse` \| `string-marker` \| `sbom-manifest` |
| `current_exploitability` | `current` \| `quantum_exposure` \| `current_and_quantum` \| `none` |
| `risk_rationale` | Why the PQC class was assigned |
| `limitations` | Honesty bound for that detector |

Policy **ignores** `presence_kind=inventory`, so AES/SHA-256/TLS 1.3/X.509 PEM rows appear in the CBOM without failing CI.

RSA-2048 is **classified** (`migration_required`, `quantum_exposure`) and does **not** trip `crypto-rsa-min-2048`.

## CycloneDX

`internal/intelligence/cyclonedx.go`:

- `bomFormat=CycloneDX`, `specVersion=1.6`
- `serialNumber` is UUID v5 (deterministic for the same component set)
- every component has `type=cryptographic-asset`, `name`, `bom-ref`
- properties carry presence/detection/exploitability
- `ValidateCycloneDX` is a **local contract check**, not the official CycloneDX JSON Schema download

Verified on `fixtures/crypto-test`: 5 components (MD5, RSA, SHA-1, TLS 1.0, 3DES). Artifact: `/opt/cursor/artifacts/cyclonedx_excerpt.json`.

## Remaining accuracy gaps (honest)

- `rivicq scan` does not parse X.509 OIDs; that is `rivicq identity`.
- TLS/SSH **handshake** scanners exist (`internal/discovery`) and are unit-tested; the golden corpus above is **file content**, not a live handshake.
- Dataset `must_match` is a lowercase JSON substring check.
- Firmware detection is printable-string / section evidence. It is not disassembly.
