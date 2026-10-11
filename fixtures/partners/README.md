# Partner fixtures

Synthetic fixtures for the Infineon + G+D vertical slice (P0). **No real device
images, customer data, subscriber secrets, or private keys.**

## Infineon (`infineon/`)

| Path | Represents |
|---|---|
| `classical-mcu/firmware.bin`, `.hex`, `.srec` | mbedTLS firmware, AES/ECDSA/ECDH/SHA-256, secure boot, RoT, embedded cert |
| `pqc-mcu/firmware.bin` | PQC-era firmware (ML-KEM, ML-DSA, SLH-DSA) |
| `psa-crypto/firmware.bin` | PSA Crypto API surface |
| `tfm/firmware.bin` | TrustedFirmware-M / secure storage |
| `secure-boot/firmware.bin` | secure boot / root of trust / attestation |
| `device-identity/device-cert-ecdsa.pem` | device X.509 certificate |
| `firmware-diff/v1.bin`, `v2.bin` | before/after upgrade |

## G+D (`gd/`)

| Path | Represents |
|---|---|
| `certificate/device-ecdsa-p256.pem`, `device-rsa2048.pem` | device certs |
| `pki/ca-ecdsa.pem`, `pki-config.yaml` | CA + PKI config (SCEP/OCSP) |
| `device-identity/identity.json` | certificate-bound device identity |
| `esim/esim-config.txt` | eUICC/eSIM config (SGP.22 markers) |
| `tls/tls-config.yaml` | TLS stack config |
| `iot/device-config.json` | MQTT/IoT config |
| `pqc/pqc-config.json` | PQC-era PKI config |

## Usage

```bash
bin/rivicq firmware scan fixtures/partners/infineon/classical-mcu/firmware.bin --profile embedded/infineon
bin/rivicq firmware compare fixtures/partners/infineon/firmware-diff/v1.bin fixtures/partners/infineon/firmware-diff/v2.bin
bin/rivicq identity scan fixtures/partners/gd/certificate/device-ecdsa-p256.pem --profile identity/gd
```

See `docs/PARTNER_VALIDATION.md`.
