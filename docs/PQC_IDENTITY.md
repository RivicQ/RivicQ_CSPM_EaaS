# PQC migration — identity, certificates & connectivity

Identity and connectivity cryptography has its own post-quantum risk profile:
long-lived device certificates, eUICC PKI hierarchies, and always-on TLS.

## Certificate quantum risk (`certeng.Assess`)

- `quantum_vulnerable` — RSA, ECC, EdDSA, DH public keys/signatures (Shor's algorithm).
- `quantum_safe` — ML-KEM / ML-DSA / SLH-DSA.
- Expiry status is assessed independently (`expired`, `expiring_soon`, `valid`).

Migration priority combines quantum risk, classical risk, expiry and device
lifetime. A long-lived ECDSA device certificate on a 10-year device is a `P0`.

## Planning

`identity` feeds certificate public-key and signature algorithms into the same
`cryptoart.BuildPQCPlan` used by firmware, so a device identity produces a
migration plan covering both its certificate chain and its TLS/connectivity stack.

```bash
rivicq identity pqc device.pem --profile identity/gd --device-lifetime 10y+
```

## What migrates

| Surface | Quantum-affected | Path |
|---|---|---|
| Device leaf certificate | ECDSA/RSA signature + key | hybrid ECDSA+ML-DSA, then ML-DSA |
| CA / PKI hierarchy | RSA/ECDSA signing | ML-DSA / SLH-DSA root and intermediates |
| eUICC identity provisioning | key agreement | ML-KEM / hybrid |
| TLS to cloud | (EC)DHE key agreement | X25519+ML-KEM hybrid |
| Signature over-the-air | ECDSA | ML-DSA hybrid |

> Certificate lifecycle and PQ migration are reported as intelligence, not as a
> certification of any PKI product.
