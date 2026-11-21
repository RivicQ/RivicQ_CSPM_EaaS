# Pilot acceptance criteria (Infineon / G+D style controlled pilot)

This is a **controlled-pilot candidate** for static cryptographic inventory, not a silicon or production-MSP certification.

## Authorized inputs

- Synthetic fixtures under `fixtures/` and `datasets/` (no customer secrets).
- Partner **synthetic** artifacts in `fixtures/partners/` (see `docs/partners/INFINEON_VALIDATION.md`, `GD_VALIDATION.md`).
- Customer source trees or firmware **images as files** only if the customer authorizes the copy. No live-device flashing.

## Measurable tests

| ID | Test | Pass |
|---|---|---|
| P1 | `rivicq scan fixtures/crypto-test --include-fixtures --fail-on BLOCK` | Exit 1, BLOCK findings, evidence paths present |
| P2 | RSA-2048 sample | Classified, not BLOCK (`TestEvaluatePolicyAllowsRSA2048WithoutBlock`) |
| P3 | `--fail-on BOGUS` | Exit 2 |
| P4 | Cross-tenant scan id | 404 (`TestScanReportIsTenantScoped`) |
| P5 | Firmware scan of a fixture | Static report; **no** claim of MCU integration |
| P6 | Production env without `DATABASE_URL` | Process refuses to start unless demo flag set |

## Limitations the pilot must state

- GitHub Pages is not the scan engine.
- Qiskit scores are local taxonomy.
- Control mappings are not ISO/SOC/DORA certifications.
- Firmware path does not extract protected keys or attest Infineon hardware.

## Rollback

Stop the API process; CLI scans are local and leave JSON on stdout. Database rollback: [ROLLBACK_RUNBOOK.md](ROLLBACK_RUNBOOK.md) if Helm was used. Pages is static — revert the GitHub Pages deploy.
