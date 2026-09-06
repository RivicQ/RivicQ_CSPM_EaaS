# Multi-Language Quantum SDKs (Design)

The Go SDK core (`internal/quantum/provider`) is the reference implementation.
Production CBOM/website scores use `internal/quantum/qiskitprofile` (local taxonomy).
An educational Python companion lives at [`sdk/python/rivicq_qiskit`](../../sdk/python/rivicq_qiskit/README.md).

## Contract (language-agnostic)

Every language binding must expose:

1. **Provider** — trait/interface with `info()`, `status(ctx)`,
   `attest(req)`, `assess(asset)`, `migration_path(from)`,
   `validate(algorithm, key_size)`, `close()`.
2. **Capabilities** — the same enum of discrete capabilities
   (`attest`, `risk_assessment`, `migration`, `key_generation`, `signing`,
   `validation`, `network_info`, `inventory`, `compliance`, `policy`).
3. **Registry** — `register(name, factory)`, `init(configs)`,
   `get/list/statuses`, `close()`, lifecycle events.
4. **Manifest** — schema v1.0, canonical-payload ed25519 `sign`/`verify`,
   trust-root loader, RBAC scope constants.
5. **Status model** — `available | degraded | unavailable` with latency,
   version, checked-at and metrics.

## Language priorities

| Language | Priority | Primary use |
|---|---|---|
| Go | 1 (shipped) | SDK core, in-process providers |
| Python | 2 | CLI tooling, plugin authoring for data teams |
| TypeScript | 3 | VS Code extension, browser-based provider catalog |
| Rust | 4 | high-performance in-process plugins, edge scanners |
| Java | 5 | enterprise middleware, JVM estates |
| .NET | 6 | Windows/enterprise estates |

## Specs

- [Rust](rust.md)
- [Python](python.md)
- [TypeScript](typescript.md)
- [Java](java.md)
- [.NET](dotnet.md)

## Shared design decisions

- **Name resolution** is identical everywhere: providers are resolved by a
  string `name`, never by import — enabling drop-in vendor swaps.
- **Opt-in providers** self-report `unavailable` until configured; no language
  binding may hard-fail platform startup on a missing credential.
- **Init is non-fatal**: failures degrade a single provider, not the fleet.
- **Canonical manifest payload**: `manifest` with `signature` removed,
  serialised deterministically (sorted keys, no whitespace) so signatures are
  portable across languages.
