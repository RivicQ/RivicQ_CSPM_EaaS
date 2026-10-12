# Infineon validation profile

Synthetic-only validation of the Infineon (MCU firmware / secure element)
vertical slice. **No real device images, firmware, keys, or customer data are
used. Analysis is static/string-based only; nothing is executed, flashed, or
extracted.**

## Scope

Static analysis of firmware artifacts and device identity:

- MCU firmware (bin/hex/srec) — mbedTLS, AES/ECDSA/ECDH/SHA-256, RoT, secure
  boot, embedded certificate
- PQC-era firmware — ML-KEM / ML-DSA / SLH-DSA
- PSA Crypto API markers
- TrustedFirmware-M / secure storage
- Secure boot / root-of-trust / attestation markers
- Device X.509 certificate
- Firmware upgrade diff (before/after)

## Fixtures

`fixtures/partners/infineon/`

| Path | Represents |
|---|---|
| `classical-mcu/firmware.bin` `.hex` `.srec` | mbedTLS firmware, classical crypto, secure boot, RoT |
| `pqc-mcu/firmware.bin` | PQC-era firmware (ML-KEM/ML-DSA/SLH-DSA) |
| `psa-crypto/firmware.bin` | PSA Crypto API surface |
| `tfm/firmware.bin` | TF-M / secure storage |
| `secure-boot/firmware.bin` | RoT / attestation |
| `device-identity/device-cert-ecdsa.pem` | device X.509 certificate |
| `firmware-diff/v1.bin`, `v2.bin` | before/after upgrade |

## Runbook

```bash
go build -o bin/rivicq ./cmd/rivicq

# Static firmware scan against the Infineon profile
bin/rivicq firmware scan fixtures/partners/infineon/classical-mcu/firmware.bin \
    --profile embedded/infineon --device-lifetime 10y+ --format json

# Firmware CBOM
bin/rivicq firmware cbom fixtures/partners/infineon/classical-mcu/firmware.bin --format json

# PQC readiness
bin/rivicq firmware pqc  fixtures/partners/infineon/classical-mcu/firmware.bin --format json

# Upgrade diff (v1 -> v2)
bin/rivicq firmware compare \
    fixtures/partners/infineon/firmware-diff/v1.bin \
    fixtures/partners/infineon/firmware-diff/v2.bin
```

## Expected output (observed, commit `1fa0910`)

`firmware scan … classical-mcu/firmware.bin`:

```
file:   firmware.bin   format: bin
sha256: 3987ea7b3a11…
libs:   [Infineon crypto firmware, mbedTLS]
algs:   [AES, ECDH, ECDSA, SHA-256, X25519]
keys:   id, path, file_name, size_bytes, sha256, format, profile_id,
        symbol_count, string_count, crypto_libraries, algorithms, crypto_apis,
        protocols, rules, certificates, cbom, pqc, graph,
        expected_device_lifetime, scanned_at, duration_ms
```

`firmware cbom …` → 1 outer entry with 10 algorithm/asset entries
(AES, ECDH, ECDSA, SHA-256, X25519, embedded cert subject, mbedTLS, DTLS, …).

`firmware compare v1.bin v2.bin`:

```
libraries:  +[wolfSSL] -[]
algorithms: +[ML-KEM] -[SHA-1]
pqc-status changed
```

Evidence is string/marker based, e.g. `string-evidence: AES, aes_, AES_` with
`source: firmware-static`. Default gate exit is `1` (BLOCK) for weak primitives;
`--fail-on NONE` prints without failing.

## How to read the output (do not over-claim)

- **Declared vs detected:** firmware is scanned statically; strings/symbols are
  *detected*, hardware capabilities assumed by a profile are *declared*.
- **Presence vs use:** a marker (e.g. `mbedtls_aes`) is *presence*, not proof the
  routine executes on-device.
- **Direct vs inferred:** algorithm strings are direct; "secure boot" / "RoT"
  conclusions are inferred from markers and must be vendor-confirmed.
- **Supported vs unsupported:** only bin/hex/srec and recognized containers are
  parsed. Anything else yields no assertion.

## Honesty invariants (enforced by tests)

- No firmware execution (`TestAnalyzeNeverExecutes`).
- No private-key extraction (`TestAnalyzeDoesNotLeakPrivateKeyMaterial`).
- No SIM/SE secret emission.
- Archive safety: zip/tar traversal and symlink escape rejected
  (`TestExtractZipSkipsTraversal`, `TestTarSkipsSymlink`); entry/depth caps;
  checksum validation.
- No claim of Infineon silicon validation, secure-element analysis, or
  certification.

## Coverage & limitations

- Covered: static crypto-library/algorithm/API/protocol discovery, embedded-cert
  extraction, PQC detection, upgrade diff, RoT/secure-boot markers.
- Not covered: on-device execution, JTAG/debug, secure-element key extraction,
  silicon/RE analysis, signing/attestation verification against a live root, or
  any Infineon proprietary tooling.
