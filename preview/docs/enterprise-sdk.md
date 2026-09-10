# Enterprise SDK & Plugin Extension Guide

This document explains how the **open-source** Quantum SDK core grows into the
**enterprise** plugin ecosystem without forking the OSS code. Every enterprise
capability is additive: the OSS SDK keeps working untouched, enterprise editions
layer on cloud providers, signed distribution, RBAC enforcement, telemetry and a
marketplace.

---

## 1. The open-core boundary

| Layer | OSS (ships in every binary) | Enterprise (opt-in / additive) |
|---|---|---|
| Provider contract, capabilities | ✅ `provider.go` | — |
| Registry + event stream | ✅ `registry.go` | — |
| Manifest schema + signing + loader | ✅ `plugin.go` | — |
| `local-pqc`, `oqs-engine`, `nist-pqc` | ✅ builtin | — |
| `ibm-quantum` | — | ✅ `ibmquantum/provider.go` |
| Cloud provider plugins (Braket, Azure, ...) | — | roadmap |
| Plugin marketplace + signing service | — | roadmap |
| Managed telemetry / audit | — | roadmap |
| VS Code extension | — | roadmap |

Build tags keep enterprise code out of the OSS binary: enterprise-only packages
carry `//go:build enterprise` and are compiled with `go build -tags enterprise`.

## 2. Adding an enterprise cloud provider

Each cloud provider ships as a plugin with an opt-in pattern identical to
`ibm-quantum`:

```
internal/quantum/ibmquantum/provider.go   # reference implementation
```

Steps:

1. Implement `provider.QuantumProvider` in a new package
   (`internal/quantum/<provider>/`).
2. Set `OptIn: true` in `Info()` and expose a `ConfigSchema`.
3. `New(cfg, logger)` returns an unconfigured provider when no API key exists;
   `Status()` reports `unavailable` until configured.
4. Register the factory in `internal/quantum/builtin/builtin.go` behind an
   enterprise flag, or distribute it as a signed plugin manifest.
5. Add the provider row to the built-in matrix in
   [docs/quantum-sdk.md](quantum-sdk.md).

Reference implementations already in-tree:

- `internal/quantum/ibmquantum/provider.go` — IBM Quantum (wraps
  `quantum.IBMQuantumClient`).
- `internal/quantum/oqsengine/engine.go` — Open Quantum Safe (software + liboqs
  backends). `BackendLiboqs` returns `ErrBackendUnavailable` without cgo; supply
  a custom `AlgorithmBackend` to enable hardware/liboqs key generation.
- `internal/quantum/nistpqc/provider.go` — dependency-free FIPS 203/204/205
  validation engine.

## 3. Signed distribution & trust root

Production plugin loading requires a trust root:

```go
// Operator configures the plugin dir + trust root once per tenant cluster.
loader := provider.NewManifestLoader(trustRoot, true)
manifests, err := loader.Load(ctx, "/etc/cryptobom/plugins", registry)
if err != nil { /* reject the whole set: an unsigned plugin is a supply-chain risk */ }
```

- Every manifest is verified with ed25519 over the canonical payload.
- Version pins and `requires` sibling dependencies are validated by the
  marketplace before install.
- `plugin:install` / `plugin:manage` RBAC scopes gate who can add plugins.

## 4. RBAC model

Scopes declared in a plugin manifest are enforced per tenant by the platform's
RBAC layer:

| Scope | Allows |
|---|---|
| `quantum:read` | list providers, view status, read attestations |
| `quantum:write` | create/refresh attestations, trigger scans |
| `quantum:admin` | manage provider configuration, change defaults |
| `plugin:install` | install/verify signed plugins |
| `plugin:manage` | enable/disable/remove plugins, rotate trust roots |

## 5. Telemetry & audit

Consume the registry event stream and emit structured audit records:

```
event source=sdk type=provider.initialized provider=ibm-quantum tenant=<id> ts=<iso>
event source=sdk type=plugin.loaded provider=my-provider version=1.0.0 tenant=<id> ts=<iso>
```

Each record carries tenant + timestamp so SOC/audit pipelines can reconstruct
who enabled what, and which provider answered which attestation.

## 6. Plugin marketplace (design)

- Registry of signed plugin manifests with semantic-version metadata.
- Install pipeline: fetch manifest → verify trust root → check `requires` →
  write to plugin dir → emit `plugin.loaded`.
- Trust-root rotation and revocation lists.
- Usage metrics (telemetry) without leaking cryptographic material.

## 7. Roadmap: cloud providers

Each becomes a standard plugin: AWS Braket · Azure Quantum · Google Quantum AI ·
Quantinuum · IQM · IonQ · Rigetti · Pasqal · Xanadu · D-Wave · QuEra · Classiq.

## 8. API surface for enterprise

Live enterprise routes (gin, under `/api/v1/quantum`):

```
GET  /attestations            list
POST /attestations            create
GET  /attestations/:id        detail
POST /attestations/:id/verify verify
POST /attestations/:id/refresh
GET  /networks                quantum networks
GET  /providers               live registry providers (edition-aware)
GET  /providers/:name/status  live provider status (404 if unknown)
GET  /readiness               estate readiness
GET  /migration               migration plan
GET  /algorithms              PQC algorithm catalog
POST /algorithms/migrate      migrate an algorithm
```

The registry is built in `internal/api/enterprise/handlers.go::SetupRoutes`:

```go
quantumRegistry := provider.NewRegistry()
builtin.Register(ctx, quantumRegistry, builtin.Options{
    Logger:   logger,
    IBM:      quantum.IBMQuantumConfig{APIKey: cfg.IBMQ.APIKey, ...},
    EnableIBM: cfg.IBMQ.Enabled,
})
quantumRegistry.Init(ctx, nil)          // non-fatal per provider
NewQuantumAttestationHandler(db, logger, quantumRegistry)
```

## 9. Verification

```sh
go build ./... && go build -tags enterprise ./...
go test ./... && go test -tags enterprise ./...
```

## 10. Related docs

- [docs/quantum-sdk.md](quantum-sdk.md) — SDK architecture & provider matrix
- [docs/plugin-development.md](plugin-development.md) — authoring a plugin
- [docs/sdks/README.md](sdks/README.md) — multi-language bindings
