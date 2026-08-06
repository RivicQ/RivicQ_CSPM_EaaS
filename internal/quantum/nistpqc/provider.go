package nistpqc

import (
	"context"
	"strings"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/quantum"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/provider"
)

// Provider is the NIST PQC validation provider. It exposes the validation
// engine through the provider SDK contract so it appears in the provider
// registry like any other plugin.
type Provider struct {
	engine *Engine
}

// NewProvider returns a NIST PQC provider backed by a fresh validation engine.
func NewProvider() *Provider {
	return &Provider{engine: New()}
}

// Engine exposes the underlying validation engine for direct use.
func (p *Provider) Engine() *Engine { return p.engine }

// Info implements provider.QuantumProvider.
func (p *Provider) Info() provider.ProviderInfo {
	return provider.ProviderInfo{
		Name:          "nist-pqc",
		Version:       "1.0.0",
		Vendor:        "CryptoBOM",
		Kind:          "validation",
		Description:   "NIST FIPS 203/204/205 validation engine (ML-KEM, ML-DSA, SLH-DSA)",
		Capabilities:  []provider.Capability{provider.CapValidation, provider.CapCompliance, provider.CapRiskAssessment, provider.CapMigration},
		Documentation: "https://csrc.nist.gov/projects/post-quantum-cryptography",
	}
}

// Status implements provider.QuantumProvider.
func (p *Provider) Status(ctx context.Context) provider.ProviderStatus {
	return provider.ProviderStatus{
		State:     "available",
		Message:   "validation engine ready",
		Version:   "1.0.0",
		CheckedAt: time.Now().UTC(),
		Metrics:   map[string]float64{"algorithms_tracked": float64(len(p.engine.Table()))},
	}
}

// Attest implements provider.QuantumProvider.
func (p *Provider) Attest(ctx context.Context, req quantum.AttestationRequest) (*quantum.AttestationResult, error) {
	scanner := &quantum.QuantumScanner{}
	report, err := scanner.AssessAsset(req.AssetID, req.AssetID, []string{req.Algorithm})
	if err != nil {
		return nil, err
	}
	riskScore := float64(report.RiskScore) / 100.0
	now := time.Now().UTC()
	return &quantum.AttestationResult{
		AssetID:         req.AssetID,
		AttestationID:   "nist-pqc-" + now.Format("20060102150405"),
		ProviderName:    p.Info().Name,
		QuantumSafe:     riskScore < 0.3,
		RiskScore:       riskScore,
		Recommendations: report.RecommendedActions,
		Analysis: map[string]interface{}{
			"algorithm":         req.Algorithm,
			"risk_level":        report.RiskLevel,
			"migration_urgency": report.MigrationUrgency,
			"nist_framework":    "FIPS 203/204/205",
		},
		AttestedAt: now,
		ExpiresAt:  now.Add(24 * time.Hour),
	}, nil
}

// Assess implements provider.QuantumProvider.
func (p *Provider) Assess(ctx context.Context, asset quantum.CryptoAsset) (*quantum.QuantumRiskReport, error) {
	scanner := &quantum.QuantumScanner{}
	return scanner.AssessAsset(asset.ID, asset.Name, []string{asset.Algorithm})
}

// MigrationPath implements provider.QuantumProvider.
func (p *Provider) MigrationPath(ctx context.Context, fromAlgorithm string) ([]quantum.PostQuantumAlgorithm, error) {
	target := p.engine.MigrationTarget(fromAlgorithm)
	if target == "" {
		return []quantum.PostQuantumAlgorithm{}, nil
	}
	var out []quantum.PostQuantumAlgorithm
	for _, part := range strings.Split(target, "+") {
		cls, err := p.engine.Classify(strings.TrimSpace(part), 0)
		if err != nil {
			return nil, err
		}
		out = append(out, quantum.PostQuantumAlgorithm{
			Name:          cls.Name,
			Type:          cls.Category,
			SecurityLevel: cls.SecurityLevel,
			QuantumSafe:   true,
			Recommended:   true,
		})
	}
	return out, nil
}

// Validate implements provider.QuantumProvider.
func (p *Provider) Validate(ctx context.Context, algorithm string, keySize int) (*quantum.QuantumAttestationResponse, error) {
	cls, err := p.engine.Classify(algorithm, keySize)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	return &quantum.QuantumAttestationResponse{
		ID:          "nist-pqc-" + now.Format("20060102150405"),
		Status:      "completed",
		QuantumSafe: cls.QuantumSafe,
		Score:       map[bool]float64{true: 1.0, false: 0.2}[cls.QuantumSafe],
		Confidence:  1.0,
		Analysis: map[string]interface{}{
			"algorithm":      cls.Name,
			"nist_standard":  cls.NISTStandard,
			"category":       cls.Category,
			"security_level": cls.SecurityLevel,
			"status":         cls.Status,
		},
		Recommendations: []string{
			"ML-KEM-768 (FIPS 203) for key encapsulation",
			"ML-DSA-65 (FIPS 204) for digital signatures",
		},
		AttestedAt: now,
		ExpiresAt:  now.Add(24 * time.Hour),
	}, nil
}

// Close implements provider.QuantumProvider.
func (p *Provider) Close() error { return nil }
