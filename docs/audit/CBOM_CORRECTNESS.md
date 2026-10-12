# RivicQ CSPM — CBOM Correctness (Phase 2)

Commit `1fa0910` (+ Phase 2 fixes on this branch). Goal: verify the CBOM is
correct on a golden corpus, not merely present.

## Golden corpus (enforced)

Harness: `scripts/analyze-datasets.py` (compares `rivicq scan … --format json`
against `datasets/**/expected.json`). Invoked via `make analyze-datasets`.

Result after Phase 2 additions: **7/7 datasets pass**.

| Dataset | Source | Expectation | Result |
|---|---|---|---|
| crypto-go-weak | `fixtures/crypto-test` | must match md5/rsa; gate BLOCK | PASS (6 findings, BLOCK) |
| crypto-ec-weak **(new)** | `fixtures/crypto-test-ec` | must match ecdsa/pqc | PASS (ECDSA migration_required, PQC) |
| terraform-weak | `fixtures/terraform-test` | placeholder AKIA not treated as live | PASS (2 findings, ALLOW) |
| container-dockerfile | `fixtures/vulnerable-container` | detect container signals | PASS (2 findings, ALLOW) |
| vulnerable-node | `fixtures/vulnerable-node` | SCA lodash flagged | PASS (1 finding, ALLOW) |
| malformed-binary **(new)** | `fixtures/malformed` | non-text bytes: no crash, no BLOCK | PASS (0 findings, ALLOW) |
| this-repo-self-scan | `.` (fixtures excluded) | must NOT BLOCK | PASS (57 findings, WARN) |

The malformed case is a **negative/robustness** fixture (1024 bytes of arbitrary
binary): the scanner completes, reports no findings, and does not BLOCK.

## Dedup correctness

`rivicq scan fixtures/crypto-test` yields 6 findings with **6 unique
fingerprints** (0 collisions). The two RSA findings are **distinct**, not
duplicates:

| rule_id | line | meaning |
|---|---|---|
| `crypto.import.rsa` | 6 | library **presence** (the `crypto/rsa` import) |
| `crypto.rsa.keysize.insufficient` | 15 | confirmed **usage** with weak key size |

This satisfies the audit rule to *distinguish library presence from confirmed
usage* — they are separate rules with separate evidence.

## Quantum vs exploitability guardrail

The RSA policy is "RSA modulus ≥ 2048". The fixture uses
`rsa.GenerateKey(rand.Reader, 1024)`, so BLOCK is a **key-size** decision, not a
blanket "RSA is vulnerable" label. A compliant RSA-2048 key is not flagged.
Quantum exposure and current exploitability are carried in separate fields
(`quantum_safe`, `pqc_class`, `pqc_status`) — not conflated with the gate.

## CycloneDX CBOM — bug found and fixed

**Finding (High for evaluations):** the CycloneDX document embedded in scan
output had **0 components** even with crypto findings, because
`internal/intelligence/cyclonedx.go` accepted a `findings` argument it never
used and the content-scan path supplies no `discovery.CBOMComponent` values.
It also emitted a constant, non-UUID `serialNumber` and a placeholder tool
version (`enterprise-sim-orchestrator`).

**Fix (this branch):**
- Findings that name an algorithm are now folded into `components`
  (`type: cryptographic-asset`), deduped by `algorithm|location`.
- Findings without an algorithm (e.g. `secret.generic-assignment`) are excluded,
  so the BOM stays a *cryptographic-asset* BOM.
- `serialNumber` is now a real `urn:uuid:<v4>`; tool version is `ScannerVersion`.
- Regression test: `internal/intelligence/cyclonedx_test.go`.

**Verified:** `components` for `fixtures/crypto-test` went **0 → 5**
(MD5, RSA-1024, SHA-1, TLS 1.0, 3DES); `specVersion 1.6`, valid UUID serial.
Existing `TestCycloneDXCryptoBOM` (components path) still passes.

## ScanResult contract

`ScanResult` / `Report` fields are unchanged in shape; the fix only populates an
existing `cyclonedx.components` array that was empty. No contract migration.

## Remaining gaps (honest)

- Explicit detection rules are thin for **ECDH/X25519, FFDH, SSH key-exchange
  families, and X.509 chain construction** (ECDSA and PQC identifiers are
  covered). These rely on import/marker heuristics today.
- The corpus is synthetic; no real customer repos/device images were scanned.
- `min_findings`/`must_match` are substring checks over the JSON, not structural
  assertions — sufficient for regression but not a formal spec conformance test.
