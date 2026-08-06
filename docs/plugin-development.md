# Plugin Development Guide

How to author, sign and ship a Quantum provider plugin for CryptoBOM. A plugin
implements the provider SDK contract, declares itself in a signed manifest, and
is resolved by name at runtime — so swapping vendors never requires code changes
in the platform.

This guide walks the **open-source** path (builtin Go providers, dev mode) and
the **enterprise** path (signed manifests, trust-root verification, marketplace).

---

## 1. The contract in one screen

Every provider implements `provider.QuantumProvider`:

```go
type QuantumProvider interface {
    Info() provider.ProviderInfo          // immutable metadata
    Status(ctx) provider.ProviderStatus   // live health
    Attest(ctx, quantum.AttestationRequest) (*quantum.AttestationResult, error)
    Assess(ctx, quantum.CryptoAsset) (*quantum.QuantumRiskReport, error)
    MigrationPath(ctx, fromAlgorithm) ([]quantum.PostQuantumAlgorithm, error)
    Validate(ctx, algorithm, keySize) (*quantum.QuantumAttestationResponse, error)
    Close() error                         // release resources on shutdown
}
```

Capabilities you can declare (`provider.Capability`):

`attest` · `risk_assessment` · `migration` · `key_generation` · `signing` ·
`validation` · `network_info` · `inventory` · `compliance` · `policy`

RBAC scopes you can request:

`quantum:read` · `quantum:write` · `quantum:admin` · `plugin:install` ·
`plugin:manage`

## 2. Minimal provider in ~40 lines

```go
package myprovider

import (
	"context"
	"time"

	"github.com/RivicQ/RivicQ_CSPM_EaaS/internal/quantum"
	"github.com/RivicQ/RivicQ_CSPM_EaaS/internal/quantum/provider"
)

type Provider struct{}

func New() *Provider { return &Provider{} }

func (p *Provider) Info() provider.ProviderInfo {
	return provider.ProviderInfo{
		Name:         "my-provider",
		Version:      "1.0.0",
		Vendor:       "ACME Quantum",
		Kind:         "quantum_computing",
		Description:  "ACME quantum network attestation",
		Capabilities: []provider.Capability{provider.CapAttest, provider.CapNetworkInfo},
		Documentation: "https://docs.acme-quantum.example/",
	}
}

func (p *Provider) Status(ctx context.Context) provider.ProviderStatus {
	return provider.ProviderStatus{
		State: "available", Version: p.Info().Version, CheckedAt: time.Now().UTC(),
	}
}

func (p *Provider) Attest(ctx context.Context, req quantum.AttestationRequest) (*quantum.AttestationResult, error) {
	// ... call your quantum service, then map the response ...
}

func (p *Provider) Assess(ctx context.Context, asset quantum.CryptoAsset) (*quantum.QuantumRiskReport, error) {
	// ... return a NIST-aligned risk report ...
}

func (p *Provider) MigrationPath(ctx context.Context, from string) ([]quantum.PostQuantumAlgorithm, error) {
	// ... recommend PQC targets for a classical algorithm ...
}

func (p *Provider) Validate(ctx context.Context, algorithm string, keySize int) (*quantum.QuantumAttestationResponse, error) {
	// ... validate quantum-safety of an algorithm ...
}

func (p *Provider) Close() error { return nil }
```

## 3. Register the factory

The **factory** is the registration unit. The SDK only instantiates a provider
when configured, so an opt-in plugin is advertised without being constructed:

```go
reg := provider.NewRegistry()

reg.Register("my-provider", func(ctx context.Context, cfg map[string]any) (provider.QuantumProvider, error) {
	apiKey, _ := cfg["api_key"].(string)
	if apiKey == "" {
		// Never hard-fail: return an unconfigured provider that reports
		// itself unavailable in Status().
		return &Provider{configured: false}, nil
	}
	return &Provider{client: acme.NewClient(apiKey), configured: true}, nil
})

if errs := reg.Init(ctx, map[string]map[string]any{
	"my-provider": {"api_key": os.Getenv("ACME_API_KEY")},
}); len(errs) > 0 {
	log.Printf("skipped providers: %v", errs)
}
```

## 4. Opt-in cloud provider pattern (enterprise)

Follow the `ibm-quantum` reference in `internal/quantum/ibmquantum/provider.go`:

1. `New(cfg, logger)` must **not** error on a missing API key — create the
   provider in the "not configured" state.
2. `Status()` returns `State: "unavailable"` with a clear message until
   configured, and `degraded` when the network is unreachable.
3. Operation methods return `ErrNotConfigured` when there is no client.
4. `Info().OptIn = true` so the UI hides it until credentials exist.

## 5. Manifest & signing

The manifest is the unit of distribution. It is a JSON document signed with
ed25519 over the canonical payload (the manifest with `signature` stripped).

```json
{
  "schema_version": "1.0",
  "id": "com.acme.quantum",
  "name": "my-provider",
  "version": "1.0.0",
  "kind": "quantum_computing",
  "provider": "ACME Quantum",
  "entry_point": "my-provider-factory",
  "capabilities": ["attest", "network_info"],
  "rbac_scopes": ["quantum:read", "quantum:write"],
  "signature": "base64(ed25519)"
}
```

Sign it in Go:

```go
priv, pub := loadOrCreateEd25519Key()   // keep priv private
m := provider.PluginManifest{ /* ... */ }
if _, err := m.Sign(priv); err != nil { log.Fatal(err) }

// Publish the public key as your plugin's trust root:
saveTrustRoot(pub)
```

Verify + load a directory of plugins:

```go
trustRoot := loadTrustRoot()                    // ed25519.PublicKey
loader := provider.NewManifestLoader(trustRoot, true) // verify + require signatures
loaded, err := loader.Load(ctx, "/var/cryptobom/plugins", reg)
```

Modes:

| `trustRoot` | `requireSignature` | Behaviour |
|---|---|---|
| `nil` | `false` | development: accept unsigned manifests |
| `nil` | `true` | require a signature, but don't verify it against a key |
| set | `true` | full trust-root verification (production) |

## 6. Plugin lifecycle & events

The registry emits lifecycle events on a buffered channel (`Events()`):

`provider.registered` · `provider.initialized` · `provider.degraded` ·
`provider.closed` · `plugin.loaded`

```go
go func() {
	for ev := range reg.Events() {
		log.Printf("event: type=%s provider=%s msg=%s", ev.Type, ev.Provider, ev.Message)
	}
}()
```

## 7. Testing a plugin

Reference tests live next to the SDK core:

- `internal/quantum/provider/registry_test.go`
- `internal/quantum/provider/plugin_test.go`
- `internal/quantum/nistpqc/validate_test.go`

Run them:

```sh
go test ./internal/quantum/... -race
```

## 8. OSS → enterprise checklist

| Concern | OSS | Enterprise |
|---|---|---|
| Registration | `builtin.Register` / manual | signed manifests via `ManifestLoader` |
| Trust root | none (dev mode) | ed25519 public key, rotation supported |
| Cloud credentials | not required | API-key opt-in, stored per tenant |
| RBAC enforcement | local | scopes enforced per tenant |
| Telemetry | event stream in-process | forwarded to managed telemetry/audit |
| Distribution | in-tree (builtin) | plugin marketplace |

## 9. Going further

- SDK architecture & provider matrix: [docs/quantum-sdk.md](quantum-sdk.md)
- Enterprise extension guide: [docs/enterprise-sdk.md](enterprise-sdk.md)
- Multi-language bindings: [docs/sdks/README.md](sdks/README.md)
