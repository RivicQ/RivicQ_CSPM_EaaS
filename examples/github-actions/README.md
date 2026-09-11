# RivicQ GitHub Action — CBOM policy gate

Copy this workflow into a consumer repository. It builds nothing from this tree
except the public `rivicq` CLI pattern: **scan → CBOM/intelligence JSON → PASS/FAIL**.

```yaml
name: RivicQ scan

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  rivicq:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.26.x'
      - name: Install RivicQ CLI
        run: go install github.com/rivic-q/cryptobom-saas/cmd/rivicq@latest
      - name: Scan (fail on high)
        run: |
          rivicq scan . --format json --fail-on high | tee rivicq-report.json
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: rivicq-cbom-report
          path: rivicq-report.json
```

## Fail-on

| Flag | Exit 1 when |
|---|---|
| `--fail-on block` (default) | Policy gate BLOCK |
| `--fail-on warn` | BLOCK or WARN |
| `--fail-on critical` | Any CRITICAL finding |
| `--fail-on high` | CRITICAL or HIGH |
| `--fail-on medium` | CRITICAL, HIGH, or MEDIUM |
| `--fail-on none` | Never (report only) |

Exit `0` pass, `1` threshold met, `2` usage error.

This action does **not** call a hosted RivicQ API. GitHub Pages has no live API.
The in-repo workflow `.github/workflows/rivicq-security.yml` self-scans this repository with `--fail-on BLOCK`.
