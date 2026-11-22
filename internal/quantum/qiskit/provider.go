package qiskit

import (
	"context"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/quantum"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/provider"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/qiskitprofile"
)

type Provider struct{}

func New() *Provider { return &Provider{} }

var _ provider.QuantumProvider = (*Provider)(nil)

func (p *Provider) Info() provider.ProviderInfo {
	return provider.ProviderInfo{
		Name:        "qiskit-profile",
		Version:     "1.0.0",
		Vendor:      "RivicQ",
		Kind:        "validation",
		Description: "Qiskit-aligned Shor/Grover/NIST PQC scoring profile; local classical, no IBM Quantum Runtime",
		Capabilities: []provider.Capability{
			provider.CapAttest,
			provider.CapRiskAssessment,
			provider.CapMigration,
			provider.CapValidation,
		},
		Documentation: "docs/QISKIT_PIPELINE.md",
	}
}

func (p *Provider) Status(context.Context) provider.ProviderStatus {
	return provider.ProviderStatus{
		State:     "available",
		Message:   "local Qiskit-aligned scoring ready",
		Version:   p.Info().Version,
		CheckedAt: time.Now().UTC(),
		Metrics:   map[string]float64{"qiskit_runtime_invocations": 0},
	}
}

func (p *Provider) Attest(_ context.Context, req quantum.AttestationRequest) (*quantum.AttestationResult, error) {
	classified := qiskitprofile.Classify(req.Algorithm, req.KeySize)
	scanner := &quantum.QuantumScanner{}
	report, err := scanner.AssessAsset(req.AssetID, req.AssetID, []string{req.Algorithm})
	if err != nil {
		return nil, err
	}
	risk := float64(report.RiskScore) / 100.0
	if classified.QuantumSafe && risk > 0.1 {
		risk = 0.1
	}
	recommendations := append([]string{}, report.RecommendedActions...)
	if classified.Migration != "" {
		recommendations = append(recommendations, classified.Migration)
	}
	now := time.Now().UTC()
	return &quantum.AttestationResult{
		AssetID:         req.AssetID,
		AttestationID:   "qiskit-profile-" + now.Format("20060102150405"),
		ProviderName:    p.Info().Name,
		QuantumSafe:     classified.QuantumSafe,
		RiskScore:       risk,
		Recommendations: recommendations,
		Analysis: map[string]interface{}{
			"engine":                   qiskitprofile.Engine,
			"backend":                  qiskitprofile.BackendLocal,
			"method":                   qiskitprofile.Method,
			"attack_class":             string(classified.AttackClass),
			"qiskit_family":            classified.QiskitFamily,
			"note":                     classified.Note,
			"ibm_quantum_runtime":      false,
			"estimated_logical_qubits": classified.EstimatedQubits,
		},
		AttestedAt: now,
		ExpiresAt:  now.Add(24 * time.Hour),
	}, nil
}

func (p *Provider) Assess(_ context.Context, asset quantum.CryptoAsset) (*quantum.QuantumRiskReport, error) {
	scanner := &quantum.QuantumScanner{}
	return scanner.AssessAsset(asset.ID, asset.Name, []string{asset.Algorithm})
}

func (p *Provider) MigrationPath(_ context.Context, fromAlgorithm string) ([]quantum.PostQuantumAlgorithm, error) {
	classified := qiskitprofile.Classify(fromAlgorithm, 0)
	if classified.AttackClass != qiskitprofile.AttackPQC && classified.Migration == "" {
		return []quantum.PostQuantumAlgorithm{}, nil
	}
	return []quantum.PostQuantumAlgorithm{{
		Name:        classified.Migration,
		Type:        "hybrid",
		QuantumSafe: true,
		Recommended: true,
	}}, nil
}

func (p *Provider) Validate(_ context.Context, algorithm string, keySize int) (*quantum.QuantumAttestationResponse, error) {
	classified := qiskitprofile.Classify(algorithm, keySize)
	now := time.Now().UTC()
	return &quantum.QuantumAttestationResponse{
		ID:          "qiskit-profile-" + now.Format("20060102150405"),
		Status:      "completed",
		QuantumSafe: classified.QuantumSafe,
		Score:       map[bool]float64{true: 1.0, false: 0.2}[classified.QuantumSafe],
		Confidence:  1.0,
		Analysis: map[string]interface{}{
			"algorithm":                classified.Algorithm,
			"attack_class":             string(classified.AttackClass),
			"qiskit_family":            classified.QiskitFamily,
			"engine":                   qiskitprofile.Engine,
			"backend":                  qiskitprofile.BackendLocal,
			"ibm_quantum_runtime":      false,
			"estimated_logical_qubits": classified.EstimatedQubits,
		},
		Recommendations: []string{classified.Migration},
		AttestedAt:      now,
		ExpiresAt:       now.Add(24 * time.Hour),
	}, nil
}

func (p *Provider) Close() error { return nil }
