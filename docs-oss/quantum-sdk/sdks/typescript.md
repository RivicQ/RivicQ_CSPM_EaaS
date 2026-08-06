# TypeScript SDK (Design)

Mirrors `quantum-sdk/internal/quantum/provider` for the VS Code extension, browser provider
catalog and Node tooling.

## Core types

```ts
export type ProviderKind =
  | "quantum_computing" | "pqc_engine" | "attestation" | "validation" | "hybrid";

export type ProviderState = "available" | "degraded" | "unavailable";

export type Capability =
  | "attest" | "risk_assessment" | "migration" | "key_generation"
  | "signing" | "validation" | "network_info" | "inventory"
  | "compliance" | "policy";

export interface ProviderInfo {
  name: string;
  version: string;
  vendor: string;
  kind: ProviderKind;
  description: string;
  capabilities: Capability[];
  optIn: boolean;
  documentation?: string;
}

export interface ProviderStatus {
  state: ProviderState;
  message?: string;
  latencyMs: number;
  version: string;
  checkedAt: string; // ISO-8601
  metrics?: Record<string, number>;
}

export interface QuantumProvider {
  info(): ProviderInfo;
  status(ctx: Context): Promise<ProviderStatus>;
  attest(ctx: Context, req: AttestationRequest): Promise<AttestationResult>;
  assess(ctx: Context, asset: CryptoAsset): Promise<QuantumRiskReport>;
  migrationPath(ctx: Context, fromAlgorithm: string): Promise<PostQuantumAlgorithm[]>;
  validate(ctx: Context, algorithm: string, keySize: number): Promise<QuantumAttestationResponse>;
  close(): void;
}
```

## Registry

`Registry` with `register(name, factory)`, `init(configs)` (non-fatal),
`get/list/statuses`, `close()`, and a `EventEmitter`-style event stream
(`provider.registered`, `provider.initialized`, `provider.degraded`,
`provider.closed`, `plugin.loaded`).

## Manifest

`PluginManifest` interface; `sign`/`verify` with Node `crypto` ed25519 over the
canonical JSON payload. The browser build uses `@noble/ed25519` for a
dependency-light footprint.

## Packages (suggested)

```
packages/quantum-sdk-core       # types, registry, manifest (framework-agnostic)
packages/quantum-sdk-node       # Node crypto integration, FS loader
packages/quantum-sdk-web        # browser build (WASM provider bindings)
```

Consumed by `extensions/quantum-sdk` (VS Code) for the provider inventory tree,
algorithm validation and migration planning views.
