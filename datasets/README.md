# Datasets

This directory holds `expected.json` **pointers** for the accuracy harness. Weak-crypto files live in `../fixtures/` so the Go module and CLI skip rules stay consistent.

- **License:** Apache-2.0 unless a nested LICENSE says otherwise.
- **Sensitive:** every `expected.json` must set `"sensitive": false`.
- **Never commit** production keys, tokens, PII, or customer hostnames.

How to add and validate samples: **[DATASETS.md](../DATASETS.md)** at the repository root.

```bash
make analyze-datasets
```

Community and Enterprise use the **same** scanner. Datasets measure the engine, not an edition flag.
