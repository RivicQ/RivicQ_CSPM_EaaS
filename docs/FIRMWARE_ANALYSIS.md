# Firmware static analysis

`internal/firmware` and `internal/cryptoscan` turn an embedded artifact into a
Cryptographic BOM (CBOM) using **static, evidence-based** inspection only.

> Honesty invariant: analysis never executes, flashes, emulates, or reverse
> engineers silicon. It reads bytes. It emits metadata, not keys.

## What it accepts

| Format | Detection | Extraction |
|---|---|---|
| ELF | `0x7F ELF` magic | arch, class, endianness, sections, symbols, per-section strings |
| Raw binary | default | printable strings |
| Intel HEX | record syntax | checksum-validated data records → image → strings |
| Motorola S-record | record syntax | checksum-validated data records → image → strings |
| ZIP / TAR | magic / headers | safe extraction, then recursive analysis |
| GZIP | `1F 8B` | bounded decompression, then recursive analysis |
| PEM certificate | content | parsed by `internal/certeng` (metadata only) |

Embedded PEM certificates are extracted even when NUL-padded inside a binary
image (`certeng.ParsePEM` scans for `BEGIN`/`END CERTIFICATE` pairs).

## What it detects

- **Libraries** (present markers): mbedTLS, wolfSSL, OpenSSL, BoringSSL, BearSSL,
  libsodium, TinyCrypt, TrustedFirmware-M — see `internal/profile`.
- **Algorithms** (referenced): RSA, ECDSA, ECDH, Ed25519, X25519, DH, DSA, ML-KEM,
  ML-DSA, SLH-DSA, AES, 3DES, DES, RC4, ChaCha20, SHA-1/256/512, SHA3, MD5, HMAC, Poly1305.
- **Crypto APIs**: PSA Crypto, TF-M, PKCS#11, Mbed TLS SSL.
- **Protocols**: TLS, DTLS, MQTT, CoAP, LoRaWAN, Zigbee/BLE (stack markers).
- **Silicon / identity markers**: secure boot, root of trust, device identity, attestation.
- **Certificates**: X.509 metadata + classical/quantum/expiry risk.

Library presence is intentionally distinct from algorithm reference: a linked
library is reported as `pqc_status=library_present` and never guessed as "using"
a specific algorithm.

### Token-aware matching

Algorithm markers are matched at token boundaries. This prevents cross-algorithm
false positives such as `DSA` inside `ecdsa` or `DH` inside `ecdh`, while still
matching `mbedtls_ecdsa_sign`.

## Safety limits (`firmware.Limits`)

Untrusted artifacts are bounded at every step:

- `MaxFileBytes` (default 64 MiB) — larger files are rejected before reading.
- `MaxDecompressedBytes` (256 MiB) — decompression/zip-bomb cap.
- `MaxArchiveEntries` (2048), `MaxArchiveDepth` (4).
- `Timeout` (30 s) via `context`.
- Path traversal (`../`, absolute) and symlink entries are skipped with warnings.

## Commands

```bash
rivicq firmware scan  <file-or-dir> [--profile embedded/infineon] [--format json]
rivicq firmware cbom  <file-or-dir>
rivicq firmware pqc   <file-or-dir> [--device-lifetime 10y+]
rivicq firmware compare <from> <to>
```

`--fail-on BLOCK|WARN|NONE` gates CI on migration-required / broken classical
crypto. Exit code 1 when the threshold is met.

## Output shape

`firmware.Report` carries format, arch, sections, symbol/string counts,
libraries, algorithms, APIs, protocols, rules, certificates, CBOM, a PQC plan,
and a `cryptoart.Graph` of artifacts and relations. The graph is the single
source consumed by NEXUS — no second graph engine is created.
