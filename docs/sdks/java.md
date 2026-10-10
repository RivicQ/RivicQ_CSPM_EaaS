# Java SDK (Design)

Mirrors `internal/quantum/provider` for JVM estates and enterprise middleware.

## Core types

```java
public enum ProviderState { AVAILABLE, DEGRADED, UNAVAILABLE }

public enum Capability {
    ATTEST, RISK_ASSESSMENT, MIGRATION, KEY_GENERATION,
    SIGNING, VALIDATION, NETWORK_INFO, INVENTORY, COMPLIANCE, POLICY
}

public record ProviderInfo(
    String name, String version, String vendor, String kind,
    String description, Set<Capability> capabilities,
    boolean optIn, Map<String, Object> configSchema, String documentation
) {}

public record ProviderStatus(
    ProviderState state, String message, long latencyMs,
    String version, Instant checkedAt, Map<String, Double> metrics
) {}

public interface QuantumProvider extends AutoCloseable {
    ProviderInfo info();
    ProviderStatus status(Context ctx);
    AttestationResult attest(Context ctx, AttestationRequest req);
    QuantumRiskReport assess(Context ctx, CryptoAsset asset);
    List<PostQuantumAlgorithm> migrationPath(Context ctx, String fromAlgorithm);
    QuantumAttestationResponse validate(Context ctx, String algorithm, int keySize);
    @Override void close() throws Exception;
}

@FunctionalInterface
public interface Factory {
    QuantumProvider create(Context ctx, Map<String, Object> config) throws Exception;
}
```

## Registry

`Registry` (thread-safe via `ConcurrentHashMap` + `ReadWriteLock`), `register`,
`init` (non-fatal, returns `List<Throwable>`), `get/list/statuses`, `close()`,
and a blocking-bounded event queue (`ArrayBlockingQueue<Runnable>` style or an
`Executor`-based event bus) for lifecycle events.

## Manifest

`PluginManifest` POJO; `sign`/`verify` with `java.security` Ed25519 (`JEP 339`)
over the canonical JSON payload — Jackson with `JsonNode` re-serialised with
sorted field names so signatures interoperate with the Go/other bindings.

## Artifacts (suggested)

```
com.rivicq:quantum-sdk-core        # API + registry
com.rivicq:quantum-sdk-providers   # local-pqc, nist-pqc, oqs-engine (via BouncyCastle/BCPQC)
com.rivicq:quantum-sdk-manifest    # ed25519 manifest signing/verification
```

Integration point: Spring Boot starter that builds the registry on startup and
exposes the same `/quantum/providers` shape.
