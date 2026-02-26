# Demo Lab — Intentionally Misconfigured Services

This directory contains a Docker Compose environment with **intentionally misconfigured** services designed to serve as scan targets for the CryptoBOM Infrastructure Discovery Scanner.

> ⚠️ **Security Warning:** These services contain deliberate cryptographic weaknesses. Run them only in an isolated local environment. Never expose them on a public network.

## Services

| Service | Port | Weakness | Severity |
|---------|------|----------|----------|
| `nginx-tls10` | 4431 | TLS 1.0, RC4 cipher, RSA-1024, SHA-1 cert | 🔴 CRITICAL |
| `nginx-tls12-weak` | 4432 | TLS 1.2 without forward secrecy (no ECDHE) | 🟠 HIGH |
| `nginx-good` | 4433 | TLS 1.3, ECDHE, AES-256-GCM, RSA-4096 | 🟢 Reference |
| `ssh-weak` | 2222 | DSA host key, weak KEX (group1-sha1) | 🔴 CRITICAL |
| `openssl-md5-api` | 5001 | MD5 hash computation endpoint | 🔴 CRITICAL |
| `java-legacy` | 8443 | RSA-512 key, MD5withRSA signature | 🔴 CRITICAL |

## Quick Start

```bash
# From the demo/lab directory:
bash certs/gen-certs.sh
docker compose up -d
```

Or use the Makefile target from the project root:

```bash
make demo-lab
```

## What Each Service Demonstrates

### `nginx-tls10` (port 4431)
- **TLS 1.0** — deprecated, vulnerable to BEAST and POODLE attacks
- **RC4 cipher** — broken stream cipher, prohibited by RFC 7465
- **RSA-1024 key** — below minimum 2048-bit requirement (BSI TR-02102-1)
- **SHA-1 signature** — deprecated, practical collision attacks (SHAttered)
- **Violates:** BSI TR-02102-2 §3.2, §3.3; eIDAS 2.0 ETSI TS 119 312; DORA Art. 9(2)

### `nginx-tls12-weak` (port 4432)
- **TLS 1.2 without forward secrecy** — no ECDHE, session keys not ephemeral
- **RSA-2048 key** — meets minimum but BSI recommends ≥3072 post-2025
- **Violates:** BSI TR-02102-2 §3.3; DORA Art. 9(2)

### `nginx-good` (port 4433)
- TLS 1.3, ECDHE, AES-256-GCM, RSA-4096/SHA-256 — **reference configuration**
- Includes HSTS, X-Content-Type-Options, X-Frame-Options headers

### `ssh-weak` (port 2222)
- **DSA host key** — 1024-bit, deprecated in OpenSSH 7.0+
- **diffie-hellman-group1-sha1** — 768-bit DH (Oakley Group 1), broken by Logjam
- **Violates:** BSI TR-02102-4 §3.2, §3.4; DORA Art. 9(2)

### `openssl-md5-api` (port 5001)
- **MD5 hash API** — computes MD5 of `?data=` query param
- Simulates a FIPS-violating legacy hash endpoint
- **Violates:** BSI TR-02102-1 §3.3; DORA Art. 9(2)

### `java-legacy` (port 8443)
- **RSA-512 key** — trivially factorable, far below minimum
- **MD5withRSA signature** — broken, forged certificates demonstrated
- **Violates:** BSI TR-02102-1 §3.3, §3.5; eIDAS 2.0 Annex IV; DORA Art. 9(4)(b)

## Stopping the Lab

```bash
docker compose down
# Or:
make demo-stop
```
