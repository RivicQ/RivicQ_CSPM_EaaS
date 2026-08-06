# Quantum SDK & Plugin Ecosystem

> Status: **implemented** (Go SDK core) · Design stage for multi-language SDKs,
> VS Code extension and plugin marketplace.
>
> Reference implementation: `internal/quantum/provider`, `internal/quantum/builtin`
> wired into the enterprise `/quantum` API routes.
>
> Companion docs: [Plugin development guide](plugin-development.md) ·
> [Enterprise SDK & plugin extension guide](enterprise-sdk.md) ·
> [Multi-language SDK specs](sdks/README.md)

## 1. Purpose

The Quantum SDK gives CryptoBOM a **vendor-neutral plugin ecosystem** for
post-quantum cryptography (PQC). Any quantum provider — IBM Quantum, OQS/liboqs,
a NIST FIPS 203/204/205 validation engine, or a future cloud provider (AWS
Braket, Azure Quantum, Google Quantum AI, Quantinuum, IQM, IonQ, Rigetti, Pasqal,
Xanadu, D-Wave, QuEra, Classiq) — implements one small Go interface, gets
registered by name, and is instantly available across the platform's
attestation, risk assessment and migration workflows.

The SDK core is **open source**. IBM Quantum is a strategic integration, **not a
mandatory dependency**: the provider reports itself unavailable without an API
key, and the registry resolves providers by name so the platform stays
vendor-neutral.

## 2. Open-Core Split

| Capability | Edition | Where |
|---|---|---|
| Provider contract + capabilities | OSS | `internal/quantum/provider/provider.go` |
| Registry + lifecycle + event stream | OSS | `internal/quantum/provider/registry.go` |
| Plugin manifest + ed25519 signing + loader | OSS | `internal/quantum/provider/plugin.go` |
| `local-pqc` — dependency-free local attestation | OSS | `internal/quantum/builtin` |
| `oqs-engine` — Open Quantum Safe (software backend) | OSS | `internal/quantum/oqsengine` |
| `nist-pqc` — FIPS 203/204/205 validation engine | OSS | `internal/quantum/nistpqc` |
| `ibm-quantum` — opt-in cloud provider | Enterprise | `internal/quantum/ibmquantum` |
| Plugin marketplace + signing service | Enterprise | (design) |
| Managed telemetry / audit hooks | Enterprise | (design) |
| VS Code extension | OSS/Enterprise | (design) `extensions/quantum-sdk` |

## 3. Architecture

```
                         ┌─────────────────────────────────────────────┐
                         │               Application layer              │
                         │  /quantum/attestations · /providers · ...    │
                         └──────────────────────┬──────────────────────┘
                                                │ uses
                         ┌──────────────────────▼──────────────────────┐
                         │        Quantum SDK core (Go)                │
                         │  ┌───────────┐  ┌──────────┐  ┌──────────┐  │
                         │  │ Quantum   │  │ Registry │  │ Manifest │  │
                         │  │ Provider  │  │ +Events  │  │ Loader   │  │
                         │  └─────┬─────┘  └────┬─────┘  └────┬─────┘  │
                         │        │             │             │        │
                         │  ┌─────▼─────────────▼─────────────▼─────┐  │
                         │  │          Builtin providers            │  │
                         │  │  local-pqc · oqs-engine · nist-pqc    │  │
                         │  │  ibm-quantum (opt-in)                 │  │
                         │  └──────────────────┬────────────────────┘  │
                         └─────────────────────┼───────────────────────┘
                                               │ implements
              ┌────────────────────────────────┼──────────────────────────────┐
              │  External plugins (future)     │   Cloud backends (opt-in)     │
              │  drop-in .so / process via     │   IBM Quantum · Braket · ...   │
              │  manifest + factory            │   Quantum Network APIs         │
              └────────────────────────────────┴──────────────────────────────┘
```

**Design rules**

1. The SDK core depends only on the `QuantumProvider` interface — providers are
   interchangeable by name.
2. Initialisation is **non-fatal**: a failing provider is skipped and marked
   `degraded`; the rest of the platform keeps working.
3. Opt-in providers are created unconfigured and self-report `unavailable` until
   credentials exist.
4. All lifecycle changes are emitted on the registry event stream for telemetry
   and audit.

## 4. Package Layout

```
internal/quantum/
├── attestation_provider.go     # OSS QuantumAttestationProvider + local impl (pre-existing)
├── attestation.go              # QuantumRiskReport, PQCAlgorithmInfo types (pre-existing)
├── pqc_service.go              # PQC service consts: AlgoMLKEM768, risk levels (pre-existing)
├── ibm_quantum.go              # IBMQuantumClient + config + request/response types (pre-existing)
├── provider/                   # ── SDK core (OSS) ──
│   ├── provider.go             #   QuantumProvider contract, ProviderInfo/Status, Capability, Factory
│   ├── registry.go             #   Registry: Register/Init/Get/List/Statuses/Close + event stream
│   └── plugin.go               #   PluginManifest v1.0, ed25519 Sign/Verify, ManifestLoader, RBAC scopes
├── nistpqc/                    # FIPS 203/204/205 validation engine + provider
│   ├── validate.go             #   authoritative algorithm table, Classify/MigrationTarget
│   └── provider.go             #   nist-pqc QuantumProvider
├── oqsengine/                  # Open Quantum Safe engine provider
│   └── engine.go               #   oqs-engine, software/liboqs backends, keygen/sign
├── ibmquantum/                 # IBM Quantum provider (enterprise, opt-in)
│   └── provider.go             #   wraps quantum.IBMQuantumClient
└── builtin/                    # wires all builtin factories
    └── builtin.go              #   Register(ctx, reg, Options{...})

docs/
├── quantum-sdk.md              # this document
└── sdks/                       # multi-language interface specs (design)
    ├── README.md
    ├── rust.md · python.md · typescript.md · java.md · dotnet.md

extensions/quantum-sdk/         # VS Code extension (design)
```

## 5. Provider Contract

```go
type QuantumProvider interface {
    Info() provider.ProviderInfo                  // immutable metadata
    Status(ctx) provider.ProviderStatus           // live health, never blocks > timeout
    Attest(ctx, quantum.AttestationRequest) (*quantum.AttestationResult, error)
    Assess(ctx, quantum.CryptoAsset) (*quantum.QuantumRiskReport, error)
    MigrationPath(ctx, fromAlgorithm) ([]quantum.PostQuantumAlgorithm, error)
    Validate(ctx, algorithm, keySize) (*quantum.QuantumAttestationResponse, error)
    Close() error                                 // release resources on shutdown
}
```

**Capabilities** (`Capability`) drive feature-gating, RBAC and the UI surface:

`attest` · `risk_assessment` · `migration` · `key_generation` · `signing` ·
`validation` · `network_info` · `inventory` · `compliance` · `policy`

**`ProviderInfo`** carries `Name`, `Version`, `Vendor`, `Kind`
(`quantum_computing | pqc_engine | attestation | validation | hybrid`),
`Capabilities`, `OptIn`, `ConfigSchema` and `Documentation`.

**`ProviderStatus`** carries `State` (`available | degraded | unavailable`),
`Message`, `LatencyMS`, `Version`, `CheckedAt` and `Metrics`.

## 6. Registry & Lifecycle

A zero-value `Registry` is usable; `NewRegistry()` pre-allocates the event
channel. Lifecycle:

1. `Register(name, factory)` — advertise a plugin module (does not instantiate).
   Re-registering replaces the factory; live instances are untouched.
2. `Init(ctx, configs)` — instantiate every registered factory. Non-fatal; one
   error per failing provider, each emitted as `provider.degraded`.
3. `Get`/`List`/`Statuses`/`SortedProviderNames` — runtime access.
4. `Close()` — idempotent shutdown; provider errors are aggregated.

**Events** (buffered 128, never closed; `emit` never blocks):

| Event | Meaning |
|---|---|
| `provider.registered` | factory registered |
| `provider.initialized` | instance created |
| `provider.degraded` | factory init failed |
| `provider.closed` | instance shut down |
| `plugin.loaded` | manifest verified + factory attached |

## 7. Plugin Manifest (v1.0) & Signing

Plugins are distributed as signed JSON manifests + a factory. The manifest is
the unit of distribution.

```json
{
  "schema_version": "1.0",
  "id": "org.ibm.quantum",
  "name": "ibm-quantum",
  "version": "1.4.0",
  "kind": "quantum_computing",
  "provider": "IBM",
  "entry_point": "ibm-quantum-factory",
  "capabilities": ["attest", "network_info", "validation", "migration"],
  "rbac_scopes": ["quantum:read", "quantum:write", "quantum:admin"],
  "requires": ["oqs-engine"],
  "lifecycle": { "on_start": "Start", "on_stop": "Stop", "on_config": "Reconfigure" },
  "signature": "base64(ed25519 over canonical payload)"
}
```

- The signature is over the **canonical JSON payload with `signature` stripped**,
  so signing is deterministic and tamper-evident.
- `ManifestLoader.Load(dir, reg)` verifies every `*.json` in `dir` against an
  ed25519 **trust root**, then attaches each plugin's factory under its
  `entry_point`.
- Modes: `trustRoot != nil` → verify all; `requireSignature` → reject unsigned;
  both nil → development mode (accept unsigned).

### RBAC scopes

`quantum:read` · `quantum:write` · `quantum:admin` · `plugin:install` ·
`plugin:manage` — declared per plugin, enforced per tenant by the RBAC layer.

## 8. Built-in Provider Matrix

| Provider | Kind | Capabilities | Default | Notes |
|---|---|---|---|---|
| `local-pqc` | attestation | attest, risk_assessment, validation | on (OSS) | dependency-free, uses NIST guidance tables |
| `oqs-engine` | pqc_engine | key_generation, signing, risk, validation, migration | on (OSS) | software backend ships; liboqs needs cgo/backend |
| `nist-pqc` | validation | validation, compliance, risk, migration | on (OSS) | authoritative FIPS 203/204/205 table |
| `ibm-quantum` | quantum_computing | attest, network_info, validation, migration | opt-in | enterprise; unavailable without API key |

## 9. Cloud Provider Roadmap (design)

Each becomes a plugin: `id`/`name`, factory, capabilities, manifest, API-key
opt-in config. OSS core stays untouched.

AWS Braket · Azure Quantum · Google Quantum AI · Quantinuum · IQM · IonQ ·
Rigetti · Pasqal · Xanadu · D-Wave · QuEra · Classiq.

## 10. Multi-Language SDKs (design)

The Go SDK is primary. Interface specs for other languages live in
`docs/sdks/` (`rust.md`, `python.md`, `typescript.md`, `java.md`, `dotnet.md`).
Each language binds the same contract: `Provider` trait/interface, `Registry`,
`Manifest` verification, and the same capabilities/status model.

## 11. VS Code Extension (design)

Surface in `extensions/quantum-sdk`: provider inventory tree, algorithm
validation, migration planning for selected assets, RBAC-aware actions.

## 12. Plugin Marketplace (design)

Enterprise: signed plugin registry, version pins, trust-root management,
automatic `plugin.loaded`/install events, audit trail.

## 13. Telemetry & Audit (design)

Consume the registry event stream; emit structured `provider.*` and
`plugin.loaded` records with tenant + timestamp for SOC/audit integration.

## 14. Enterprise API Integration

`handlers.go::SetupRoutes` builds the registry, calls
`builtin.Register(ctx, reg, builtin.Options{IBM: cfg.IBMQ, EnableIBM: cfg.IBMQ.Enabled})`,
then `reg.Init(ctx, nil)`, and passes it to `NewQuantumAttestationHandler`. Live
routes (gin, under `/quantum`):

```
GET    /attestations                 list
POST   /attestations                 create
GET    /attestations/:id             detail
POST   /attestations/:id/verify      verify
POST   /attestations/:id/refresh     refresh
GET    /networks                     quantum networks
GET    /providers                    live registry providers
GET    /providers/:name/status       live provider status (404 if unknown)
GET    /readiness                    estate readiness
GET    /migration                    migration plan
GET    /algorithms                   PQC algorithm catalog
POST   /algorithms/migrate           migrate an algorithm
```

## 15. Getting Started

```go
reg := provider.NewRegistry()
builtin.Register(ctx, reg, builtin.Options{})   // local-pqc, oqs-engine, nist-pqc
if errs := reg.Init(ctx, nil); len(errs) > 0 {
    log.Printf("skipped providers: %v", errs)
}

p, ok := reg.Get("nist-pqc")
if !ok { log.Fatal("nist-pqc not available") }

safe, err := p.Validate(ctx, "ML-KEM-768", 0)   // quantum-safe == true
path, err := p.MigrationPath(ctx, "RSA-2048")   // ML-KEM-768 + ML-DSA-65
```

## 16. Verification

```sh
go build ./... && go build -tags enterprise ./...
go vet ./...
go test ./... && go test -tags enterprise ./...
```
