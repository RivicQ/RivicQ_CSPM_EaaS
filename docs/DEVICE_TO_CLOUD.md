# Device-to-cloud cryptography path

A device (Infineon-class MCU/SoC) and an identity (G+D-class eSIM/eUICC) meet at
the **device-to-cloud** path. RivicQ models that path as one graph so a partner
sees a single cryptographic dependency chain rather than per-team silos.

## The chain

```
device / secure element
  contains  firmware (image, secure boot, RoT)
    uses    crypto library (mbedTLS / PSA Crypto / TF-M)
    implements  algorithms (ECDSA, ECDH, AES, ML-KEM, ...)
  serves    identity (device / subscriber / euicc)
    belongs_to  PKI (CA chain)
    issues    certificate (leaf, intermediates)
    connects_to  cloud service (TLS/DTLS, MQTT, CoAP)
```

Each node is a `cryptoart.Object`; each edge is a `cryptoart.Relation`
(`uses | implements | issued_by | belongs_to | contains | connects_to | serves`).
The whole chain lives in **one** `cryptoart.Graph` — NEXUS renders embedded,
identity, device-to-cloud and PQC views as **filters**, not new engines.

## Partner views

- **Embedded view** — filter to `firmware`, `hardware`, crypto libraries, algorithms.
- **Identity view** — filter to `identity`, `sim`, `secure_element`, certificates, PKI.
- **Device-to-cloud view** — the full chain, showing where TLS terminates and
  which algorithms protect the wire.
- **PQC impact view** — filter to quantum-vulnerable objects and their replacements.

## Why one graph

The required deliverable is a single platform. A device-to-cloud finding must be
queryable end to end: the same ECDSA key that signs a boot image also anchors a
device certificate and negotiates TLS to the cloud. Fragmenting that into
separate tools hides cross-layer risk (e.g. a quantum-vulnerable root CA that
invalidates every downstream migration).
