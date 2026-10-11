# Identity, certificate & connectivity analysis

`internal/identity` models device/subscriber/eUICC identities, X.509
certificates, PKI relationships, and TLS/IoT connectivity — using the shared
`internal/certeng` and `internal/cryptoscan` engines.

> Honesty invariant: **metadata only**. No subscriber keys (Ki/OPc), no SIM/SE
> secret material, no private keys are ever read, stored, or emitted. Identity
> *references* are non-secret labels.

## Formats

| Input | `Format` | Notes |
|---|---|---|
| PEM/DER certificate | `certificate` | via `certeng` |
| Multiple certs (bundle) | `certificate_bundle` | chain positions tracked |
| JSON/YAML/CONF/TXT config | `identity_config` | string-evidence scan |

## Models

- **`IdentityRef`**: `type` ∈ {device, subscriber, euicc, secure_element}, a
  non-secret `name`, marker evidence, source, note.
- **`CertificateFinding`**: `certeng.Metadata` + `certeng.RiskReport` + bundle/chain info.
- **`PKIRef`**: certificates grouped by issuer, with self-signed flag.

## Relations (into the shared graph)

`identity → certificate → pki`, `identity → secure_element`, `device → crypto_library`.
These edges are `cryptoart` relations, so they render in the same NEXUS graph as
firmware and source findings.

## eSIM / eUICC / SIM detection

The `identity/gd` profile recognises standards-based markers only (GSMA SGP.22,
ISD-R, ISD-P, MNO-SD, SM-DP+/SM-SR, GlobalPlatform, JavaCard). It never attempts
to read a profile, token, or credential.

## Certificates

`internal/certeng` extracts subject, issuer, serial, validity, public-key
algorithm, key size, curve, signature algorithm, SANs, key usage, SHA-256
fingerprint, CA and self-signed flags — and computes classical, quantum and
expiry risk plus a migration priority. Private-key PEM blocks are ignored.

## Commands

```bash
rivicq identity scan <file-or-dir> [--profile identity/gd] [--format json]
rivicq identity cbom <file-or-dir>
rivicq identity pqc  <file-or-dir> [--device-lifetime 10y+]
```

## Connectivity

TLS/DTLS, MQTT, CoAP and cellular/wireless stack markers are mapped from config
and artifact evidence using the same protocol rules as firmware analysis. This is
static evidence, not a live connection.
