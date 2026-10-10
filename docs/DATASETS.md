# Dataset analysis & contribution

RivicQ ships **synthetic, licensed fixtures** so the CBOM engine can be measured without customer data.

Live customer estates must never be committed here.

## Layout

```
datasets/
  known-bad/          Intentional weak crypto / IaC (must be detected)
  known-good/         Repository self-scan (must not BLOCK)
  containers/         Dockerfile / image samples
  tls-ssh/            Optional TLS/SSH captures (add only public, non-secret samples)
  edge-cases/         Future: truncated keys, comments, generated code
```

Each dataset is a folder with `expected.json`:

| Field | Meaning |
|-------|---------|
| `id` | Stable identifier |
| `license` | SPDX license of the sample |
| `sensitive` | Must be `false` |
| `source` | Path relative to repo root that `rivicq scan` should run against |
| `include_fixtures` | Set true for paths under `fixtures/` |
| `must_match` | Substrings that must appear in the JSON report |
| `must_not_match` | Substrings that must not appear (live secrets, customer names) |
| `min_findings` | Minimum normalized findings |
| `max_block` | If true, a BLOCK policy gate fails the dataset (known-good) |

The actual weak-crypto files live in `fixtures/` so Go `embed` and the CLI skip rules stay consistent. Datasets **point at** those fixtures; do not copy a second Go module into `datasets/`.

## Analyze

```bash
make analyze-datasets
```

This builds `./bin/rivicq` and compares each `expected.json` to a JSON scan (`--fail-on NONE`, `--include-fixtures` when required).

## Add a dataset

1. Place only public, dummy material. No production keys, tokens, PII, or customer hostnames.
2. Prefer adding a fixture under `fixtures/<name>/` plus a `datasets/.../expected.json` that sets `"source": "fixtures/<name>"`.
3. Run `make analyze-datasets` and update `must_match` from **actual** scanner output — do not invent CVEs.
4. Open a PR. CI should stay green for known-good self-scan (`rivicq scan . --fail-on BLOCK`).

## Licenses

Fixtures in this repository are Apache-2.0 unless a nested LICENSE says otherwise. Third-party samples need an explicit license file in the dataset folder.
