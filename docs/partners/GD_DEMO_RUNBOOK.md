# G+D demo runbook (synthetic)

**Not an endorsement.** G+D is used as an identity / PKI / eSIM *profile name* and a directory of synthetic fixtures. There is no G+D partner API in this repository.

## Workflow A — IT infra (certs → CBOM → risk → PQC → report)

```bash
go build -o bin/rivicq ./cmd/rivicq

# Parsed X.509 (public metadata only)
./bin/rivicq identity scan fixtures/partners/gd/certificate/device-ecdsa-p256.pem \
  --profile identity/gd --format json --fail-on NONE

./bin/rivicq identity scan fixtures/partners/gd/certificate/device-rsa2048.pem \
  --profile identity/gd --format json --fail-on NONE

./bin/rivicq identity cbom fixtures/partners/gd/certificate/device-ecdsa-p256.pem --format json
./bin/rivicq identity pqc  fixtures/partners/gd/certificate/device-ecdsa-p256.pem --format json
```

This session: both identity scans exited **0** with `--fail-on NONE`. Default `--fail-on BLOCK` may exit 1 when the profile classifies classical public-key algorithms as `migration_required`.

## Workflow B — repo / CI (deps → SBOM/CBOM → policy gate)

```bash
./bin/rivicq scan fixtures/crypto-test --include-fixtures --format json --fail-on BLOCK
# exit 1, gate BLOCK — this is the intended CI failure

./bin/rivicq scan fixtures/golden/rsa2048 --include-fixtures --fail-on BLOCK
# exit 0 — RSA-2048 classified, not blocked
```

GitHub Action: `.github/actions/rivicq-scan` (fail-on BLOCK).

## Fixtures

See `fixtures/partners/gd/` and `docs/partners/GD_VALIDATION.md`. Certificates are synthetic. **No private keys, SIM/SE secrets, or subscriber data.**
