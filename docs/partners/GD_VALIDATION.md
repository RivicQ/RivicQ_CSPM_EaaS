# G+D validation profile

Synthetic-only validation of the G+D (identity / eSIM / PKI / TLS) vertical
slice. **No subscriber secrets, SIM/SE material, customer data, or private keys
are used anywhere in this profile.**

## Scope

Infrastructure + identity workflow over declared/static artifacts:

- X.509 device certificates (ECDSA P-256, RSA-2048)
- PKI configuration (CA, SCEP/OCSP markers)
- Device identity (certificate-bound)
- eUICC/eSIM config markers (SGP.22)
- TLS and MQTT/IoT stack config
- PQC-era PKI config

## Fixtures

`fixtures/partners/gd/`

| Path | Represents |
|---|---|
| `certificate/device-ecdsa-p256.pem` | ECDSA P-256 device cert |
| `certificate/device-rsa2048.pem` | RSA-2048 device cert |
| `pki/ca-ecdsa.pem`, `pki/pki-config.yaml` | CA + PKI config (SCEP/OCSP) |
| `device-identity/identity.json` | certificate-bound device identity |
| `esim/esim-config.txt` | eUICC/eSIM config (SGP.22 markers) |
| `tls/tls-config.yaml` | TLS stack config |
| `iot/device-config.json` | MQTT/IoT config |
| `pqc/pqc-config.json` | PQC-era PKI config |

## Runbook

```bash
go build -o bin/rivicq ./cmd/rivicq

# Identity (certificate) scan
bin/rivicq identity scan fixtures/partners/gd/certificate/device-ecdsa-p256.pem \
    --profile identity/gd --format json

# CBOM for the certificate
bin/rivicq identity cbom fixtures/partners/gd/certificate/device-ecdsa-p256.pem --format json

# PQC readiness for the identity artifacts
bin/rivicq identity pqc  fixtures/partners/gd/certificate/device-ecdsa-p256.pem --format json
```

## Expected output (observed, commit `1fa0910`)

`identity scan … device-ecdsa-p256.pem`:

```
format:  certificate
sha256:  af01ce9e70ef…
certs:   1
subject: CN=device-ecdsa-p256.rivicq.test,O=RivicQ Test Fixture

top-level keys: id, path, file_name, size_bytes, sha256, format, profile_id,
                certificates, identities, pki, crypto_libraries, algorithms,
                crypto_apis, protocols, rules, cbom, pqc, graph,
                expected_device_lifetime, scanned_at, duration_ms
```

Exit code with the default gate is `1` (BLOCK) when the profile flags a
non-PQC / weak primitive; use `--fail-on NONE` to inspect without failing.

## How to read the output (do not over-claim)

- **Declared vs detected:** config/identity JSON and cert fields are *declared*;
  PEM structure and algorithm OIDs are *detected* from the artifact bytes.
- **Presence vs use:** a library or API marker means *presence*; it does not
  prove the algorithm is exercised at runtime.
- **Direct vs inferred:** certificate public-key/signature algorithms are direct;
  higher-level "protocol" conclusions are inferred from markers.
- **Supported vs unsupported:** only parsed formats are reported. Unparsed
  formats yield no assertion — never a guess.

## Honesty invariants

- No private keys are read, decoded, or emitted (certificates/config only).
- No eSIM/SIM subscriber secret is emitted.
- Certificates are synthetic (`*.rivicq.test`); the CA is self-signed test-only.
- No claim of G+D interoperability, certification, or device validation.

## Coverage & limitations

- Covered: certificate parsing, identity/PKI/eSIM/TLS/IoT config markers,
  cert-derived algorithms, PQC classification.
- Not covered: live eUICC/SM-DP+ interaction, remote provisioning, live OCSP/SCEP
  handshakes, hardware key attestation, or any G+D proprietary interface.
