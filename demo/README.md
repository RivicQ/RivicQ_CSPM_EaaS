This small Flask server served demo fixtures from `demo/fixtures/` so the
frontend could be run against seeded data. Demo fixtures have been archived
to `docs/archive/demo-fixtures/`. Runtime demo endpoints are disabled in
live builds. See `docs/ARCHIVE_DEMO.md` for usage notes.

# 3. Start the backend API (served in legacy demo mode only)
make dev-backend
# CryptoBOM Infrastructure Discovery Demo

A complete, self-contained demo of **real-time weak cryptography detection** across a controlled local environment.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Demo Lab Targets                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │NGINX     │ │NGINX     │ │SSH Weak  │ │MD5 API   │  │
│  │TLS 1.0   │ │TLS 1.2   │ │KEX+DSA   │ │Port 5001 │  │
│  │Port 4431 │ │Port 4432 │ │Port 2222 │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│          Discovery Scanner (Go)                          │
│  TLSScanner + SSHScanner + HTTPScanner → ScanResult     │
│  cmd/demo-scanner/ + internal/discovery/                 │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│          REST API (Gin)                                  │
│  GET /api/v1/demo/scan                                   │
│  GET /api/v1/demo/findings                               │
│  GET /api/v1/demo/targets                                │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│          React UI (TypeScript + MUI)                     │
│  http://localhost:3000/demo/infrastructure               │
│  • Scan Summary Bar  • Target Status Grid               │
│  • Filterable Findings Table  • Run Live Scan button    │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Docker** + **Docker Compose** v2
- **Go** 1.22+
- **make**
- (Optional) **Node.js 18+** for the React UI

## Quick Start

```bash
# Start the vulnerable lab + run scan + open UI
make demo
```

Or step-by-step:

```bash
# 1. Generate TLS certs and start lab services
make demo-lab

# 2. Run the scanner (produces cbom-findings.json + table output)
make demo-scan

# 3. Start the backend API (serves /api/v1/demo/*)
make dev-backend

# 4. Start the frontend
make dev-frontend
# Open http://localhost:3000/demo/infrastructure
```

## Scanner CLI Output Example

```
SEVERITY     TARGET                                PROTOCOL  FINDING                             REMEDIATION
--------     ------                                --------  -------                             -----------
🔴 CRITICAL  NGINX TLS 1.0 (RC4, RSA-1024, SHA-1) tls       TLS 1.0 Detected                    Upgrade to TLS 1.2...
🔴 CRITICAL  NGINX TLS 1.0 (RC4, RSA-1024, SHA-1) tls       RC4 Cipher Suite Detected           Disable RC4 cipher...
🔴 CRITICAL  SSH Weak KEX + DSA Host Key           ssh       DSA Host Key Detected               Replace DSA host keys...
🟠 HIGH      NGINX TLS 1.0 (RC4, RSA-1024, SHA-1) tls       SHA-1 Certificate Signature         Re-issue with SHA-256...
🟠 HIGH      NGINX TLS 1.2 (No Forward Secrecy)   tls       TLS 1.2 Without Forward Secrecy     Require ECDHE...
🟡 MEDIUM    NGINX TLS 1.2 (No Forward Secrecy)   tls       RSA-2048 Key (Upgrade Recommended)  Migrate to RSA-3072...

📊 Scanned 6 targets, found 12 findings (CRITICAL: 4, HIGH: 3, MEDIUM: 3, LOW: 2)
⚛  Quantum-unsafe assets: 12
📄 Full findings written to cbom-findings.json
```

## Example Finding (JSON)

```json
{
  "id": "f-001",
  "target_id": "tls-1",
  "target_label": "NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)",
  "host": "localhost",
  "port": 4431,
  "protocol": "tls",
  "finding_type": "WEAK_TLS_VERSION",
  "title": "TLS 1.0 Detected",
  "description": "TLS 1.0 is deprecated and contains known vulnerabilities (BEAST, POODLE).",
  "evidence": "TLS version: TLS 1.0 (0x0301)",
  "severity": "CRITICAL",
  "algorithm": "TLS 1.0",
  "remediation": "Upgrade to TLS 1.2 (minimum) or TLS 1.3.",
  "bsi_ref": "BSI TR-02102-2, Section 3.2",
  "dora_ref": "DORA Art. 9(2) – ICT risk management",
  "eidas_ref": "eIDAS 2.0 ETSI TS 119 312",
  "quantum_safe": false,
  "scanned_at": "2026-02-26T01:00:01Z"
}
```

## Compliance Mapping

| Weakness | BSI TR-02102 | DORA | eIDAS 2.0 |
|----------|-------------|------|-----------|
| TLS 1.0 / 1.1 | TR-02102-2 §3.2 | Art. 9(2) | ETSI TS 119 312 |
| RC4 / 3DES cipher | TR-02102-2 §3.3.1 | Art. 9(2) | ETSI TS 119 312 |
| RSA < 2048 | TR-02102-1 §3.5 | Art. 9(4)(b) | Annex IV |
| SHA-1 signatures | TR-02102-1 §3.3 | Art. 9(2) | ETSI TS 119 312 |
| No forward secrecy | TR-02102-2 §3.3 | Art. 9(2) | ETSI TS 119 312 |
| DSA host key | TR-02102-4 §3.4 | Art. 9(2) | ETSI TS 119 312 |
| Weak SSH KEX | TR-02102-4 §3.2 | Art. 9(2) | ETSI TS 119 312 |
| MD5 hash | TR-02102-1 §3.3 | Art. 9(2) | ETSI TS 119 312 |

## Stop the Lab

```bash
make demo-stop    # stop containers
make demo-clean   # stop + remove volumes and generated certs
```

## Open the UI

```
http://localhost:3000/demo/infrastructure
```

The page shows seeded findings on load (no backend required). Click **Run Live Scan** to trigger a real scan against the running lab services.
