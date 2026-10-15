# CLI (`rivicq`)

Binary: `cmd/rivicq`. Build: `make build-rivicq` or `go build -o bin/rivicq ./cmd/rivicq`.

## Commands

```
rivicq scan|sbom|cbom|vuln|secrets|iac|compliance|policy <path>
rivicq firmware scan|cbom|pqc|compare <file-or-dir>
rivicq identity scan|cbom|pqc <file-or-dir>
rivicq version
```

## Flags

| Flag | Values | Default | Invalid input |
|------|--------|---------|---------------|
| `--format` | `table` \| `json` | `table` | exit **2** |
| `--fail-on` | `BLOCK` \| `WARN` \| `NONE` \| `critical` \| `high` \| `medium` | `BLOCK` | exit **2** |
| `--include-fixtures` | bool | off | n/a |
| `--json` | shortcut for `--format json` | | |

Firmware/identity `--fail-on` accepts only `BLOCK|WARN|NONE` (severity aliases are a usage error).

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | pass |
| 1 | fail-on threshold met (`intelligence.ExitFailOn`) |
| 2 | usage error (missing command, unknown command, bad flag value) |

`BLOCK` fails CI. That is the GitHub Action default (`.github/actions/rivicq-scan`).

## Verified this session

See `docs/audit/TEST_RESULTS.md`. Invalid `--fail-on BOGUS` prints:

```
rivicq: invalid --fail-on "BOGUS" (want BLOCK|WARN|NONE|critical|high|medium)
```

and exits 2.

## Honesty

- Default `rivicq scan .` skips `fixtures/`, `testdata/`, `datasets/`, and several detector source files so the engine does not fail its own self-scan.
- Firmware/identity analysis never executes artifacts or extracts private keys.
