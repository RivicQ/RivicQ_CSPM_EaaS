// Package ibmquantum provides the IBM Quantum provider for the Quantum SDK.
//
// IBM Quantum is a strategic integration for CryptoBOM, but it is not a
// mandatory dependency: the provider is opt-in and only instantiates its HTTP
// client when an API key is configured. Without configuration the provider
// reports itself as unavailable and the platform falls back to local providers.
package ibmquantum

import (
	"context"
	"fmt"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/quantum"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/provider"
	"github.com/sirupsen/logrus"
)

// Provider is the IBM Quantum provider plugin.
type Provider struct {
	cfg    quantum.IBMQuantumConfig
	client *quantum.IBMQuantumClient
	logger *logrus.Logger
}

// New creates the IBM Quantum provider. A missing API key does not error: the
// provider is created in the "not configured" state and reports itself
// unavailable until configured. Errors are reserved for malformed input.
func New(cfg quantum.IBMQuantumConfig, logger *logrus.Logger) (*Provider, error) {
	if logger == nil {
		logger = logrus.New()
	}
	p := &Provider{cfg: cfg, logger: logger}
	if cfg.APIKey != "" {
		client, err := quantum.NewIBMQuantumClient(cfg)
		if err != nil {
			return nil, fmt.Errorf("ibmquantum: %w", err)
		}
		p.client = client
	}
	return p, nil
}

// Configured reports whether the provider has credentials to reach IBM Quantum.
func (p *Provider) Configured() bool { return p.client != nil }

// Info implements provider.QuantumProvider.
func (p *Provider) Info() provider.ProviderInfo {
	return provider.ProviderInfo{
		Name:        "ibm-quantum",
		Version:     "1.0.0",
		Vendor:      "IBM",
		Kind:        "quantum_computing",
		Description: "IBM Quantum Network attestation and Qiskit Runtime integration",
		Capabilities: []provider.Capability{
			provider.CapAttest, provider.CapNetworkInfo, provider.CapValidation, provider.CapMigration,
		},
		OptIn: true,
		ConfigSchema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"api_key":  map[string]any{"type": "string"},
				"base_url": map[string]any{"type": "string"},
				"network":  map[string]any{"type": "string"},
				"timeout":  map[string]any{"type": "integer"},
			},
		},
		Documentation: "https://docs.quantum.ibm.com/",
	}
}

// Status implements provider.QuantumProvider.
func (p *Provider) Status(ctx context.Context) provider.ProviderStatus {
	start := time.Now()
	if p.client == nil {
		return provider.ProviderStatus{
			State:     "unavailable",
			Message:   "not configured: set an IBM Quantum API key to enable",
			Version:   p.Info().Version,
			CheckedAt: time.Now().UTC(),
		}
	}
	network, err := p.client.GetNetworkInfo(ctx)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return provider.ProviderStatus{
			State:     "degraded",
			Message:   fmt.Sprintf("ibm quantum network unreachable: %v", err),
			LatencyMS: latency,
			Version:   p.Info().Version,
			CheckedAt: time.Now().UTC(),
		}
	}
	status := provider.ProviderStatus{
		State:     "available",
		Message:   fmt.Sprintf("network %s: %d qubits, %.3f fidelity", network.Name, network.Qubits, network.Fidelity),
		LatencyMS: latency,
		Version:   p.Info().Version,
		CheckedAt: time.Now().UTC(),
		Metrics: map[string]float64{
			"qubits":   float64(network.Qubits),
			"fidelity": network.Fidelity,
			"nodes":    float64(network.Nodes),
		},
	}
	if network.Status != "online" {
		status.State = "degraded"
	}
	return status
}

// Attest implements provider.QuantumProvider.
func (p *Provider) Attest(ctx context.Context, req quantum.AttestationRequest) (*quantum.AttestationResult, error) {
	if p.client == nil {
		return nil, ErrNotConfigured
	}
	resp, err := p.client.AttestAlgorithm(ctx, quantum.QuantumAttestationRequest{
		Algorithm:       req.Algorithm,
		KeySize:         req.KeySize,
		Usage:           req.Usage,
		Metadata:        map[string]interface{}{"asset_id": req.AssetID},
		Timestamp:       time.Now(),
		AttestationType: "quantum_safety_validation",
	})
	if err != nil {
		return nil, fmt.Errorf("ibmquantum: attest: %w", err)
	}
	return &quantum.AttestationResult{
		AssetID:         req.AssetID,
		AttestationID:   resp.ID,
		ProviderName:    p.Info().Name,
		QuantumSafe:     resp.QuantumSafe,
		RiskScore:       1.0 - resp.Score,
		Recommendations: resp.Recommendations,
		Analysis:        resp.Analysis,
		AttestedAt:      resp.AttestedAt,
		ExpiresAt:       resp.ExpiresAt,
	}, nil
}

// Assess implements provider.QuantumProvider.
func (p *Provider) Assess(ctx context.Context, asset quantum.CryptoAsset) (*quantum.QuantumRiskReport, error) {
	scanner := &quantum.QuantumScanner{}
	return scanner.AssessAsset(asset.ID, asset.Name, []string{asset.Algorithm})
}

// MigrationPath implements provider.QuantumProvider.
func (p *Provider) MigrationPath(ctx context.Context, fromAlgorithm string) ([]quantum.PostQuantumAlgorithm, error) {
	if p.client == nil {
		return nil, ErrNotConfigured
	}
	path, err := p.client.GetMigrationPath(ctx, fromAlgorithm)
	if err != nil {
		return nil, fmt.Errorf("ibmquantum: migration path: %w", err)
	}
	return path, nil
}

// Validate implements provider.QuantumProvider.
func (p *Provider) Validate(ctx context.Context, algorithm string, keySize int) (*quantum.QuantumAttestationResponse, error) {
	if p.client == nil {
		return nil, ErrNotConfigured
	}
	resp, err := p.client.ValidateQuantumSafety(ctx, algorithm, keySize)
	if err != nil {
		return nil, fmt.Errorf("ibmquantum: validate: %w", err)
	}
	return resp, nil
}

// Close implements provider.QuantumProvider.
func (p *Provider) Close() error { return nil }

// ErrNotConfigured is returned by operations that require an IBM Quantum API
// key when none is configured.
var ErrNotConfigured = fmt.Errorf("ibmquantum: provider is not configured")
