# Tests

Go tests for the Community engine and Enterprise packages. They do **not** certify ISO/SOC/TÜV; they check software behaviour.

```bash
go test -count=1 -short ./internal/auth/ ./internal/api/shared/ ./internal/intelligence/ ./internal/api/enterprise/ ./tests/
```

Frontend: `cd web && CI=true npm test -- --watchAll=false`

Dataset harness: `make analyze-datasets`

Do not commit live credentials into testdata. See [CONTRIBUTING.md](../CONTRIBUTING.md) and [DATASETS.md](../DATASETS.md).
