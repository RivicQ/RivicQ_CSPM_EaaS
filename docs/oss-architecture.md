# CryptoBOM OSS Architecture

This document describes the module structure of the CryptoBOM Open Source Edition and
the abstractions introduced to cleanly separate OSS-safe code from the proprietary
enterprise edition.

## Build Tags

| Tag | Meaning |
|---|---|
| _(none)_ | OSS code – compiles by default with `go build` or `go test ./...` |
| `enterprise` | Enterprise-only code – compiled with `go build -tags enterprise` |

Files tagged `//go:build enterprise` at the top are **not reachable** from the OSS binary.

## Module Structure

```
internal/
  api/
    oss/          OSS HTTP handlers (CBOM CRUD, assets, security events, Cilium)
    shared/       Handlers shared between OSS and Enterprise editions
  auth/           JWT authentication + RBAC; no hardcoded credentials
  cilium/         eBPF / Cilium crypto network scanner
  compliance/     NEW: OSS compliance engine (DORA, NIS2, NIST CSF, CRA, ENISA)
  config/         Configuration loader; enterprise-specific fields in oss.go
  database/       OSS DB layer (enterprise_database.go gated with //go:build enterprise)
  discovery/      TLS, SSH, and HTTP protocol scanners
  observability/  OpenTelemetry structured audit logging
  quantum/
    attestation.go           Local PQC scan + attestation report generation
    attestation_provider.go  NEW: QuantumAttestationProvider interface + LocalAttestationProvider
    aws_hsm.go               AWS CloudHSM entropy client (kept for OSS entropy source)
    ibm_quantum.go           IBM Quantum client (//go:build enterprise – not in OSS)
    pqc_service.go           PQC key generation service (uses QuantumAttestationProvider)
  tenant/
    context.go  NEW: TenantResolver interface + DefaultTenantResolver (OSS single-user mode)
cmd/
  server/
    main.go            OSS entrypoint (no enterprise imports)
    oss/main.go        OSS-specific entrypoint
    enterprise/main.go Enterprise entrypoint (//go:build enterprise)
```

## Key Abstractions

### QuantumAttestationProvider (`internal/quantum/attestation_provider.go`)

```go
// QuantumAttestationProvider is the OSS-safe interface for quantum attestation.
// Enterprise editions implement this with real IBM Quantum Runtime calls.
// The OSS build ships LocalAttestationProvider which uses local PQC evaluation only.
type QuantumAttestationProvider interface {
    Attest(ctx context.Context, req AttestationRequest) (*AttestationResult, error)
    Name() string
    IsAvailable() bool
}
```

The OSS build uses `LocalAttestationProvider`, which performs NIST PQC risk scoring
locally using the algorithm tables in `attestation.go`. No external API calls are made.

Enterprise builds replace this with a provider backed by IBM Quantum Runtime by
implementing the same interface.

### TenantResolver (`internal/tenant/context.go`)

```go
// TenantResolver resolves the tenant for a request.
// OSS: always returns "default". Enterprise: resolves from JWT + DB.
type TenantResolver interface {
    Resolve(c *gin.Context) (string, error)
}
```

`DefaultTenantResolver` always returns `"default"`, making CryptoBOM OSS operate in
single-user/single-tenant mode. The `X-Tenant-ID` header is intentionally ignored to
prevent header-spoofing attacks in the OSS build.

### ComplianceEngine (`internal/compliance/engine.go`)

```go
type ComplianceEngine interface {
    Evaluate(ctx context.Context, asset *CryptoAsset) (*ComplianceReport, error)
    Frameworks() []string
}
```

`OSSComplianceEngine` implements local rule evaluation for five frameworks:

| Framework | Coverage |
|---|---|
| DORA | Art. 9 – cryptographic resilience |
| NIS2 | Art. 21 – technical risk management measures |
| NIST CSF | PR.DS-2 – data in transit protection |
| CRA | Annex I §1(2) – cryptographic agility requirement |
| ENISA | PQC Guidelines §4 – quantum-risky algorithm classification |

### Auth Bootstrap (`internal/auth/store.go`)

`NewMockUserStore()` requires the `CRYPTOBOM_BOOTSTRAP_PASSWORD` environment variable.
If the variable is not set, the function returns an error and refuses to create a store.
This prevents accidental use of hardcoded credentials in any deployment.

## Security Properties

- **No hardcoded passwords** – `CRYPTOBOM_BOOTSTRAP_PASSWORD` required at runtime
- **TLS always enforced** – `InsecureSkipVerify` is unconditionally `false`
- **No X-Tenant-ID spoofing** – OSS `TenantResolver` ignores all tenant headers
- **Gosec runs in blocking mode** – CI pipeline fails on Gosec findings (no `-no-fail`)
- **sslmode=require** – all CI database connections enforce TLS
