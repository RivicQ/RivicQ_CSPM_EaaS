# Infineon readiness

RivicQ's embedded security vertical slice as it applies to an Infineon-class
MCU/SoC/SE portfolio. Infineon is one **domain profile**, not a fork.

> Everything here is vendor-neutral machinery driven by the
> `embedded/infineon` data profile (public/standards-based markers only). No
> proprietary Infineon API is hardcoded, and nothing executes or flashes silicon.

## Capability mapping

| Requirement | Where it lives | Status |
|---|---|---|
| Firmware ingest (ELF/BIN/HEX/SREC/zip/tar/gz) | `internal/firmware` | ✅ |
| Architecture detection (ARM/ARM64/RISC-V/AVR…) | `firmware` (`debug/elf`) | ✅ |
| Crypto library detection in binary | `firmware` + `cryptoscan` | ✅ |
| Algorithm reference detection | `cryptoscan` | ✅ |
| PSA Crypto / TF-M API detection | `cryptoscan` + profile | ✅ |
| Secure boot / RoT / device identity markers | `cryptoscan` rules | ✅ |
| Embedded X.509 extraction + risk | `firmware` + `certeng` | ✅ |
| CBOM for firmware | `firmware.buildCBOM` → `cryptoart` | ✅ |
| PQC plan for firmware | `cryptoart.BuildPQCPlan` | ✅ |
| Firmware version diff | `firmware compare` | ✅ |
| CLI `rivicq firmware *` | `cmd/rivicq/firmware.go` | ✅ |
| API `/api/v1/firmware/*` | `internal/api/*` | ⏳ P1 |
| Firmware-source connector | `internal/connectors` | ⏳ P2 (`CONNECTOR REQUIRED`) |

## CLI

```bash
rivicq firmware scan firmware.bin  --profile embedded/infineon --device-lifetime 10y+
rivicq firmware cbom firmware.bin  --format json
rivicq firmware pqc  firmware.bin  --device-lifetime 10y+
rivicq firmware compare v1.bin v2.bin
```

## Fixtures

`fixtures/partners/infineon/` — synthetic only:
`classical-mcu`, `pqc-mcu`, `psa-crypto`, `tfm`, `secure-boot`,
`device-identity`, `firmware-diff`.

## Readiness score

| Area | Score | Note |
|---|---|---|
| Firmware static ingest | 9/10 | ELF/HEX/SREC/archives; no live dump from silicon |
| Crypto detection | 8/10 | evidence-based strings/sections; not disassembly |
| PQC planning | 8/10 | taxonomy-based; no CAVP claim |
| API surface | 3/10 | P1 pending |
| Live device/flashing | 0/10 | **out of scope by design** |

Honest ceiling: RivicQ reads **artifacts and descriptors**. It does not talk to a
chip, read fuses, or attest hardware.
