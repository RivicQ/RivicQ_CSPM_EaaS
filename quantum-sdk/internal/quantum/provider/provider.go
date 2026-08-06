// Package provider defines the Quantum Provider SDK: the plugin contract every
// quantum provider plugin implements (IBM Quantum, OQS/liboqs, NIST PQC, AWS
// Braket, Azure Quantum, Google Quantum AI, Quantinuum, IQM, IonQ, Rigetti,
// Pasqal, Xanadu, D-Wave, QuEra, Classiq, ...).
//
// Open-Core split:
//   - OSS ships the SDK surface, the provider registry, the plugin loader and
//     the dependency-free local providers (local-pqc, oqs-engine, nist-pqc).
//   - Enterprise adds opt-in cloud providers (ibm-quantum and future plugins)
//     plus the plugin marketplace, signing service and managed telemetry.
//
// IBM Quantum is a strategic integration, not a mandatory dependency: the
// registry resolves providers by name and the platform stays vendor-neutral.
package provider

import (
	"context"
	"time"

	"github.com/RivicQ/RivicQ_CSPM_EaaS/quantum-sdk/internal/quantum"
)

// Capability identifies a discrete capability a provider exposes. The set of
// capabilities drives feature-gating, RBAC scopes and the UI surface.
type Capability string

const (
	CapAttest         Capability = "attest"          // quantum-safety attestation of crypto assets
	CapRiskAssessment Capability = "risk_assessment" // PQC risk scoring of assets/estates
	CapMigration      Capability = "migration"       // classical -> PQC migration path planning
	CapKeyGeneration  Capability = "key_generation"  // post-quantum key pair generation
	CapSigning        Capability = "signing"         // PQC record / SBOM signing
	CapValidation     Capability = "validation"      // algorithm quantum-safety validation
	CapNetworkInfo    Capability = "network_info"    // quantum network metadata (qubits, fidelity)
	CapInventory      Capability = "inventory"       // cryptographic asset inventory
	CapCompliance     Capability = "compliance"      // NIST / BSI / DORA / eIDAS mapping
	CapPolicy         Capability = "policy"          // policy evaluation against crypto estate
)

// ProviderInfo is immutable metadata describing a provider plugin.
type ProviderInfo struct {
	Name          string         `json:"name"`
	Version       string         `json:"version"`
	Vendor        string         `json:"vendor"`
	Kind          string         `json:"kind"` // quantum_computing | pqc_engine | attestation | validation | hybrid
	Description   string         `json:"description"`
	Capabilities  []Capability   `json:"capabilities"`
	OptIn         bool           `json:"opt_in"` // requires explicit config/credentials
	ConfigSchema  map[string]any `json:"config_schema,omitempty"`
	Documentation string         `json:"documentation,omitempty"`
}

// ProviderStatus is the live health of a provider at a point in time.
type ProviderStatus struct {
	State     string             `json:"state"` // available | degraded | unavailable
	Message   string             `json:"message,omitempty"`
	LatencyMS int64              `json:"latency_ms"`
	Version   string             `json:"version"`
	CheckedAt time.Time          `json:"checked_at"`
	Metrics   map[string]float64 `json:"metrics,omitempty"`
}

// QuantumProvider is the contract every provider plugin implements. The SDK core
// only depends on this interface, so any provider (builtin or external) is
// interchangeable and can be loaded through the registry.
type QuantumProvider interface {
	// Info returns immutable provider metadata.
	Info() ProviderInfo
	// Status reports live health; implementations must never block on network
	// calls for longer than their configured timeout.
	Status(ctx context.Context) ProviderStatus
	// Attest evaluates the quantum safety of a cryptographic asset and returns a
	// time-bound attestation result.
	Attest(ctx context.Context, req quantum.AttestationRequest) (*quantum.AttestationResult, error)
	// Assess returns a full NIST/BSI-aligned quantum risk report for an asset.
	Assess(ctx context.Context, asset quantum.CryptoAsset) (*quantum.QuantumRiskReport, error)
	// MigrationPath returns candidate post-quantum algorithms for a classical
	// source algorithm.
	MigrationPath(ctx context.Context, fromAlgorithm string) ([]quantum.PostQuantumAlgorithm, error)
	// Validate determines whether a given algorithm/key size is quantum-safe.
	Validate(ctx context.Context, algorithm string, keySize int) (*quantum.QuantumAttestationResponse, error)
	// Close releases provider-held resources. Called on registry shutdown.
	Close() error
}

// Factory constructs a configured provider instance. Factories are the
// registration unit of the SDK: registering a factory advertises the plugin
// module without instantiating it.
type Factory func(ctx context.Context, cfg map[string]any) (QuantumProvider, error)
