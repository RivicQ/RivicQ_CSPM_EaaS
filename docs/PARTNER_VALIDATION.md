# Partner validation

How the Infineon + G+D vertical slice is verified. Everything is synthetic — no
customer data, no real device images, no private keys.

## Reproduce

```bash
go build ./...
go test ./internal/firmware/... ./internal/identity/... \
        ./internal/certeng/... ./internal/cryptoscan/... \
        ./internal/profile/... ./internal/cryptoart/...
go build -o bin/rivicq ./cmd/rivicq
```

## Fixture corpus

`fixtures/partners/infineon/`
- `classical-mcu/firmware.bin` (+ `.hex`, `.srec`) — mbedTLS, AES/ECDSA/ECDH/SHA-256, RoT, secure boot, embedded cert.
- `pqc-mcu/firmware.bin` — ML-KEM/ML-DSA/SLH-DSA present.
- `psa-crypto/firmware.bin` — PSA Crypto API markers.
- `tfm/firmware.bin` — TF-M / secure storage markers.
- `secure-boot/firmware.bin` — RoT / attestation markers.
- `device-identity/device-cert-ecdsa.pem` — X.509 device certificate.
- `firmware-diff/v1.bin`, `v2.bin` — upgrade adds wolfSSL + ML-KEM, removes SHA-1.

`fixtures/partners/gd/`
- `certificate/` — ECDSA P-256 and RSA-2048 device certs.
- `pki/` — self-signed CA + PKI config (SCEP/OCSP).
- `device-identity/`, `esim/`, `tls/`, `iot/`, `pqc/` — config/identity fixtures.

All private keys used to generate fixtures were deleted; committed material is
certificates and configs only.

## Test matrix

| Category | Test | Asserts |
|---|---|---|
| Golden | `TestAnalyzeDetectsCrypto` | library + algorithms + rules + PQC + graph |
| Golden | `TestAnalyzeEmbeddedCertificate` | cert extraction + cert-derived algorithms |
| Golden | `TestAnalyzeIntelHexRoundTrip` / `SRECRoundTrip` | record decoding recovers content |
| Golden | `TestCompareReportsChanges` | added/removed libs+algs, PQC status change |
| Golden | `TestAnalyzeESIMConfig` | eUICC identity + libs + algorithms |
| Golden | `TestAnalyzeCertBundle` | bundle format, chain positions, PKI |
| Detection | `TestDetectNoDSAFalsePositiveFromECDSA` | token boundary correctness |
| Detection | `TestDetectNoDHFalsePositiveFromECDH` | token boundary correctness |
| Detection | `TestAlgorithmsFromCertMapping` | pub/sig → canonical algorithms |
| Security | `TestAnalyzeRejectsOversizedFile` | size limit |
| Security | `TestAnalyzeArchiveDepthLimit` | decompression depth cap |
| Security | `TestExtractZipSkipsTraversal` / `TarSkipsSymlink` | traversal + symlink |
| Security | `TestExtractZipEntryCap` | entry cap |
| Security | `TestParseIntelHexBadChecksum` / `SRECBadChecksum` | checksum validation |
| Security | `TestAnalyzeNeverExecutes` | no code execution |
| Secret safety | `TestAnalyzeDoesNotLeakPrivateKeyMaterial` | private keys never parsed/emitted |
| Secret safety | `TestNoSubscriberSecretsExposed` | eSIM secrets never emitted |
| Secret safety | `TestParsePEMIgnoresPrivateKeys` | key PEM blocks ignored |
| Limits | `TestAnalyzeRejectsDirectory` | non-file input rejected |

## Honesty invariants (asserted by tests)

- No private-key extraction (`certeng` + identity tests).
- No SIM/SE secret emission (identity test).
- No firmware execution (firmware test).
- No certification/validation claim (docs + PQC plan note).

## Exit-code checks

```bash
bin/rivicq firmware scan fixtures/partners/infineon/classical-mcu/firmware.bin --fail-on BLOCK; echo $?  # 1
bin/rivicq firmware scan fixtures/partners/infineon/classical-mcu/firmware.bin --fail-on NONE;  echo $?  # 0
```
