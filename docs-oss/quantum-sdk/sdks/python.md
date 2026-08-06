# Python SDK (Design)

Mirrors `quantum-sdk/internal/quantum/provider` for Python plugin authoring and CLI tooling.

## Core types

```python
from enum import Enum
from typing import Any, Protocol

class ProviderState(Enum):
    AVAILABLE = "available"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"

class Capability(str, Enum):
    ATTEST = "attest"
    RISK_ASSESSMENT = "risk_assessment"
    MIGRATION = "migration"
    KEY_GENERATION = "key_generation"
    SIGNING = "signing"
    VALIDATION = "validation"
    NETWORK_INFO = "network_info"
    INVENTORY = "inventory"
    COMPLIANCE = "compliance"
    POLICY = "policy"

@dataclass
class ProviderInfo:
    name: str
    version: str
    vendor: str
    kind: str
    description: str
    capabilities: list[Capability]
    opt_in: bool = False
    documentation: str | None = None

class QuantumProvider(Protocol):
    def info(self) -> ProviderInfo: ...
    def status(self, ctx: Context) -> ProviderStatus: ...
    def attest(self, ctx: Context, req: AttestationRequest) -> AttestationResult: ...
    def assess(self, ctx: Context, asset: CryptoAsset) -> QuantumRiskReport: ...
    def migration_path(self, ctx: Context, from_algorithm: str) -> list[PostQuantumAlgorithm]: ...
    def validate(self, ctx: Context, algorithm: str, key_size: int) -> QuantumAttestationResponse: ...
    def close(self) -> None: ...
```

## Registry

`Registry.register(name, factory)`, `Registry.init(configs)` (non-fatal,
returns list of failures, emits `provider.degraded`), `get/list/statuses`,
`close()`. Events via `queue.Queue(maxsize=128)`; emit never blocks.

## Manifest

`PluginManifest` dataclass + `sign(priv: Ed25519PrivateKey)` /
`verify(pub)` over the canonical JSON payload (signature cleared, sorted keys).
`ManifestLoader(dir, trust_root)` mirrors the Go loader.

## CLI (suggested)

```
pip install cryptobom-quantum-sdk
quantum validate --algorithm RSA-2048 --key-size 2048
quantum migrate --from RSA-2048
quantum providers list
quantum providers status nist-pqc
```

## Packaging

`cryptobom-quantum-sdk` (core) and `cryptobom-quantum-providers` (local-pqc,
nist-pqc, oqs-engine via `oqs` PyPI). Type-checked with `pyright`; `>=3.10`.
