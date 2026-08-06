# Quantum Provider SDK

Open-source post-quantum cryptography provider SDK for the CSPM platform.

The SDK is a small, dependency-light Go module (only `logrus`) that defines a
provider contract for post-quantum cryptographic attestation, validation, and
migration, plus a registry with lifecycle events and a signed plugin system.

## Modules

| Package | Purpose |
| --- | --- |
| `internal/quantum` | Core types: `QuantumProvider` contract, risk/attestation types |
| `internal/quantum/provider` | `Registry`, `ProviderInfo/Status`, `Factory`, `PluginManifest` v1.0, ed25519 signing + `ManifestLoader` |
| `internal/quantum/nistpqc` | FIPS 203/204/205 algorithm validation engine + `nist-pqc` provider |
| `internal/quantum/oqsengine` | Open Quantum Safe engine provider (`oqs-engine`, software/liboqs backends) |
| `internal/quantum/ibmquantum` | Opt-in enterprise IBM Quantum provider |
| `internal/quantum/builtin` | Registers the built-in provider factories |

## Build & test

```sh
go build ./...
go test ./... -race
go vet ./...
```

## Docs

- [SDK architecture](../../docs-oss/quantum-sdk/quantum-sdk.md)
- [Writing a provider plugin](../../docs-oss/quantum-sdk/plugin-development.md)
- [Enterprise provider extensions](../../docs-oss/quantum-sdk/enterprise-sdk.md)
- [Language bindings](../../docs-oss/quantum-sdk/sdks/README.md)
