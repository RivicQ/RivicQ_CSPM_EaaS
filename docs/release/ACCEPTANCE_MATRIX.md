# Acceptance matrix

| ID | Criterion | Result | Evidence |
|----|-----------|--------|----------|
| A1 | `go test ./...` passes | PASS | `/opt/cursor/artifacts/go_test.log` |
| A2 | CLI BLOCK fails | PASS | crypto-test exit 1 |
| A3 | CLI usage errors are exit 2 | PASS | `--fail-on BOGUS` |
| A4 | Dataset harness | PASS | 12/12 |
| A5 | RSA-2048 not auto-BLOCK | PASS | golden-rsa2048 |
| A6 | Inventory ≠ policy fail | PASS | golden-aes-sha |
| A7 | Partner fixtures analyzed | PASS | firmware/identity tests + CLI |
| A8 | Frontend unit tests | PASS | 31/31 |
| A9 | Browser e2e | **NOT RUN** | no GUI session |
| A10 | golangci-lint | **NOT RUN** | binary missing |
| A11 | Live IdP SSO | **NOT RUN** | no IdP |
| A12 | Live cloud inventory | **NOT RUN** | no credentials |
| A13 | Production deploy | **NOT RUN** | docker/helm missing |
