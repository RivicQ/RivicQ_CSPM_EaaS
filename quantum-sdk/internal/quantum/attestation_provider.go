// Package quantum provides post-quantum cryptography attestation for CryptoBOM SaaS.
package quantum

import (
	"context"
	"fmt"
	"time"
)

// AttestationRequest is the input to a QuantumAttestationProvider.Attest call.
type AttestationRequest struct {
	AssetID   string
	Algorithm string
	KeySize   int
	Usage     string
}

// AttestationResult is the output of a QuantumAttestationProvider.Attest call.
type AttestationResult struct {
	AssetID         string                 `json:"asset_id"`
	AttestationID   string                 `json:"attestation_id"`
	ProviderName    string                 `json:"provider_name"`
	QuantumSafe     bool                   `json:"quantum_safe"`
	RiskScore       float64                `json:"risk_score"` // 0.0 (safe) – 1.0 (critical)
	Recommendations []string               `json:"recommendations"`
	Analysis        map[string]interface{} `json:"analysis"`
	AttestedAt      time.Time              `json:"attested_at"`
	ExpiresAt       time.Time              `json:"expires_at"`
}

// QuantumAttestationProvider is the OSS-safe interface for quantum attestation.
// Enterprise editions implement this with real IBM Quantum Runtime calls.
// The OSS build ships LocalAttestationProvider which uses local PQC evaluation only.
type QuantumAttestationProvider interface {
	// Attest evaluates the quantum safety of the given cryptographic asset.
	Attest(ctx context.Context, req AttestationRequest) (*AttestationResult, error)
	// Name returns the name of the attestation provider.
	Name() string
	// IsAvailable reports whether the provider is currently reachable.
	IsAvailable() bool
}

// LocalAttestationProvider performs local PQC risk scoring without any external API calls.
// It uses the same knownVulnerable / knownSafe algorithm tables as QuantumScanner and is
// the default implementation in the OSS build.
//
// Enterprise editions replace this with a provider backed by IBM Quantum Runtime or another
// real quantum attestation service by implementing the QuantumAttestationProvider interface.
type LocalAttestationProvider struct{}

// NewLocalAttestationProvider returns a new LocalAttestationProvider.
func NewLocalAttestationProvider() *LocalAttestationProvider {
	return &LocalAttestationProvider{}
}

// Name returns the provider name.
func (p *LocalAttestationProvider) Name() string {
	return "local-pqc"
}

// IsAvailable always returns true because the local provider needs no external service.
func (p *LocalAttestationProvider) IsAvailable() bool {
	return true
}

// Attest performs a local PQC risk assessment using the built-in algorithm tables.
// No network calls are made; the result is derived solely from NIST PQC guidance.
// The context is accepted as part of the QuantumAttestationProvider interface contract
// to allow enterprise implementations to use deadlines and cancellation; the local
// provider does not need it.
func (p *LocalAttestationProvider) Attest(_ context.Context, req AttestationRequest) (*AttestationResult, error) {
	if req.AssetID == "" {
		return nil, fmt.Errorf("attestation request: AssetID must not be empty")
	}
	if req.Algorithm == "" {
		return nil, fmt.Errorf("attestation request: Algorithm must not be empty")
	}

	scanner := &QuantumScanner{}
	report, err := scanner.AssessAsset(req.AssetID, req.AssetID, []string{req.Algorithm})
	if err != nil {
		return nil, fmt.Errorf("local attestation: assess asset: %w", err)
	}

	// Normalize the 0-100 integer risk score to 0.0-1.0.
	riskScore := float64(report.RiskScore) / 100.0
	quantumSafe := riskScore < 0.3

	analysis := map[string]interface{}{
		"algorithm":         req.Algorithm,
		"key_size":          req.KeySize,
		"usage":             req.Usage,
		"risk_level":        report.RiskLevel,
		"migration_urgency": report.MigrationUrgency,
	}

	now := time.Now().UTC()
	return &AttestationResult{
		AssetID:         req.AssetID,
		AttestationID:   fmt.Sprintf("local-%d", now.UnixNano()),
		ProviderName:    p.Name(),
		QuantumSafe:     quantumSafe,
		RiskScore:       riskScore,
		Recommendations: report.RecommendedActions,
		Analysis:        analysis,
		AttestedAt:      now,
		ExpiresAt:       now.Add(24 * time.Hour),
	}, nil
}
