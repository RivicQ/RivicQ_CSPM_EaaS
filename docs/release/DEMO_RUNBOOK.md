# Demo runbook (this branch)

## Community scan / policy gate

```bash
git clone https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
cd RivicQ_CSPM_EaaS
go build -o bin/rivicq ./cmd/rivicq
./bin/rivicq scan fixtures/crypto-test --include-fixtures --format json --fail-on BLOCK   # exit 1
./bin/rivicq scan fixtures/golden/rsa2048 --include-fixtures --fail-on BLOCK              # exit 0
python3 scripts/analyze-datasets.py
```

## Partner synthetic

```bash
./bin/rivicq identity scan fixtures/partners/gd/certificate/device-ecdsa-p256.pem --profile identity/gd --fail-on NONE --format json
./bin/rivicq firmware scan fixtures/partners/infineon/classical-mcu/firmware.bin --profile embedded/infineon --fail-on NONE --format json
./bin/rivicq firmware compare fixtures/partners/infineon/firmware-diff/v1.bin fixtures/partners/infineon/firmware-diff/v2.bin
```

## UI (local)

```bash
cp .env.example .env
make dev-backend    # API
make dev-frontend   # http://localhost:3000/platform
```

GitHub Pages is static and has **no** production API. Use labeled demo or point `REACT_APP_API_URL` at a real engine.

Do not present this runbook as a certification or partner-lab result.
