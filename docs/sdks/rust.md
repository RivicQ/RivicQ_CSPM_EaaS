# Rust SDK (Design)

Mirrors `internal/quantum/provider` for Rust-based providers and edge scanners.

## Core types

```rust
#[derive(Clone, Debug, Serialize)]
pub struct ProviderInfo {
    pub name: String,
    pub version: String,
    pub vendor: String,
    pub kind: ProviderKind,        // QuantumComputing | PqcEngine | Attestation | Validation | Hybrid
    pub description: String,
    pub capabilities: Vec<Capability>,
    pub opt_in: bool,
    pub documentation: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct ProviderStatus {
    pub state: ProviderState,      // Available | Degraded | Unavailable
    pub message: Option<String>,
    pub latency_ms: i64,
    pub version: String,
    pub checked_at: DateTime<Utc>,
    pub metrics: HashMap<String, f64>,
}

#[async_trait]
pub trait QuantumProvider: Send + Sync {
    fn info(&self) -> ProviderInfo;
    async fn status(&self, ctx: &Context) -> ProviderStatus;
    async fn attest(&self, ctx: &Context, req: AttestationRequest) -> Result<AttestationResult>;
    async fn assess(&self, ctx: &Context, asset: CryptoAsset) -> Result<QuantumRiskReport>;
    async fn migration_path(&self, ctx: &Context, from: &str) -> Result<Vec<PostQuantumAlgorithm>>;
    async fn validate(&self, ctx: &Context, algorithm: &str, key_size: u32) -> Result<QuantumAttestationResponse>;
    fn close(&mut self);
}
```

## Registry

`Registry` holds a `HashMap<String, Arc<dyn QuantumProvider>>` plus factory
registrations. `init` is non-fatal: failures push to `Vec<String>` errors and
emit `provider.degraded` on the event channel (`tokio::sync::mpsc`).

## Manifest

`PluginManifest { schema_version, id, name, version, kind, provider, entry_point,
capabilities, rbac_scopes, requires, signature }` signed with `ed25519-dalek`.
Canonical payload: `serde_json::to_vec` of the struct with `signature` cleared.

## Crate layout (suggested)

```
crates/quantum-sdk-core   # traits, registry, manifest, ed25519
crates/quantum-providers  # local-pqc, nist-pqc, oqs-engine (via liboqs-sys)
```

## CLI (suggested)

`quantumctl validate --algorithm ML-KEM-768` and
`quantumctl migrate --from RSA-2048 --to ML-KEM-768+ML-DSA-65` for edge use.
