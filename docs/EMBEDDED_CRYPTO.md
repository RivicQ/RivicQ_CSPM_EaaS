# Embedded cryptography detection model

RivicQ detects embedded cryptography **without hardcoding vendor logic**. Domain
and vendor knowledge lives in data-driven profiles (`internal/profile`), and the
detection engine (`internal/cryptoscan`) is vendor-neutral.

## Profiles (data, not code)

| Profile | Domain | Purpose |
|---|---|---|
| `embedded/generic` | embedded | vendor-neutral defaults for firmware |
| `embedded/infineon` | embedded | Infineon-oriented markers (public/standards only) |
| `identity/generic` | identity | vendor-neutral identity defaults |
| `identity/gd` | identity | G+D / eSIM / eUICC markers (standards only) |

Profiles are JSON-loadable (`Registry.LoadFile`) so a field engagement can add
markers without a code change. Partner profiles contain **only public,
standards-based markers** — never proprietary vendor APIs.

## Rule types

- `libraries` — library markers + the algorithms they typically provide.
- `crypto_apis` — PSA Crypto, TF-M, PKCS#11, Mbed TLS SSL.
- `protocols` — TLS/DTLS, MQTT, CoAP, LoRaWAN, Zigbee/BLE.
- `rules` — secure boot, root of trust, device identity, attestation,
  fOTA/update, provisioning.

## Evidence discipline

1. Every finding carries `evidence` (`string-evidence: <markers>` or a certificate hint).
2. `confidence` scales with the number of matched markers.
3. Library *presence* (`library_present`) is never conflated with algorithm *use*.
4. Certificate-derived algorithms are labelled `certificate <fp> (<alg>)`.

## Algorithm taxonomy

Algorithm classification reuses `internal/quantum/qiskitprofile`
(Shor / Grover / PQC attack classes) so embedded findings, source findings, and
estate scores all speak the same post-quantum taxonomy.
