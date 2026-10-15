# Demo runbook

Honest path to demonstrate Community CBOM scanning. GitHub Pages has **no live engine**.

## Start locally

```bash
cp .env.example .env   # if missing
make build-rivicq
./bin/rivicq scan fixtures/crypto-test --include-fixtures --fail-on BLOCK --format json
```

Expected: findings for weak crypto (e.g. MD5, SHA-1, RSA-1024). Exit **1** on BLOCK. RSA-2048 in a clean target is **classified**, not auto-BLOCK.

Invalid flags (must fail usage, exit 2):

```bash
./bin/rivicq scan . --fail-on BOGUS
./bin/rivicq scan . --format yaml
```

API + console (in-memory demo, not production data):

```bash
make dev-backend    # OSS API, typically :9090 in Makefile / :8080 default
make dev-frontend   # React on :3000
```

Set `REACT_APP_API_URL` to that API. Interactive demo on static Pages uses **labeled sample data** (`web/src/demo/`), not customer telemetry.

## Environment

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | Production / `/readyz` 200 | Production env refuses start without DB |
| `JWT_SECRET` | Auth | ≥32 bytes |
| `CORS_ORIGINS` | Hosted console | Comma-separated; default includes GitHub Pages |
| `CRYPTOBOM_ENV=production` | Prod | Disables localhost CORS; requires DB |
| `RIVICQ_ALLOW_DEMO_MODE=1` | Labeled demo without DB | Never on a customer LB |
| `DEMO_MODE` | `/api/v1/auth/demo` | Labeled identities only |
| `CRYPTOBOM_LICENSE_KEY` | Enterprise binary | QBOM/HBOM/AIBOM/IBOM; OSS returns 403 |

## Supported input

- Source directories / repos (`rivicq scan`)
- Website/TLS/SSH targets via API when the engine is running
- Static firmware/identity **files** (`rivicq firmware|identity`) — metadata only

Not supported as a live scan: Infineon MCU attach, secret extraction, IBM Quantum jobs from Qiskit scores.

## Fallback

If the API is down, demonstrate the CLI JSON + Archify maps at `archify/site/index.html#diagrams`. Do not present Pages demo findings as a live estate.
