# .NET SDK (Design)

Mirrors `internal/quantum/provider` for Windows/enterprise estates and
.NET-based platform tooling.

## Core types

```csharp
public enum ProviderState { Available, Degraded, Unavailable }

public enum Capability {
    Attest, RiskAssessment, Migration, KeyGeneration,
    Signing, Validation, NetworkInfo, Inventory, Compliance, Policy
}

public sealed record ProviderInfo(
    string Name, string Version, string Vendor, string Kind,
    string Description, IReadOnlySet<Capability> Capabilities,
    bool OptIn, IReadOnlyDictionary<string, object?>? ConfigSchema,
    string? Documentation);

public sealed record ProviderStatus(
    ProviderState State, string? Message, long LatencyMs,
    string Version, DateTimeOffset CheckedAt,
    IReadOnlyDictionary<string, double>? Metrics);

public interface IQuantumProvider : IDisposable {
    ProviderInfo Info();
    ProviderStatus Status(CancellationToken ct);
    Task<AttestationResult> AttestAsync(AttestationRequest req, CancellationToken ct);
    Task<QuantumRiskReport> AssessAsync(CryptoAsset asset, CancellationToken ct);
    Task<IReadOnlyList<PostQuantumAlgorithm>> MigrationPathAsync(string fromAlgorithm, CancellationToken ct);
    Task<QuantumAttestationResponse> ValidateAsync(string algorithm, int keySize, CancellationToken ct);
}

public delegate IQuantumProvider Factory(CancellationToken ct, IReadOnlyDictionary<string, object?> config);
```

## Registry

`QuantumRegistry` (thread-safe), `Register`, `InitAsync` (non-fatal, returns
`IReadOnlyList<Exception>`), `Get/List/Statuses`, `CloseAsync`, and a
`Channel<T>`-based (`System.Threading.Channels`) event stream.

## Manifest

`PluginManifest` record; `Sign`/`Verify` with `System.Security.Cryptography`
Ed25519 (`.NET 7+`), canonical payload serialised with
`JsonSerializerOptions { PropertyNamingPolicy = SnakeCaseLower, ... }` and sorted
properties to interoperate with the other language bindings.

## Packages (suggested)

```
RivicQ.QuantumSdk.Core          # contracts, registry, manifest
RivicQ.QuantumSdk.Providers     # local-pqc, nist-pqc, oqs-engine
RivicQ.QuantumSdk.AspNet        # middleware exposing /quantum/providers
```

Target framework: `net8.0`. Integration: ASP.NET Core middleware that builds the
registry at startup and reports the same provider/status JSON shape as the Go
enterprise API.
