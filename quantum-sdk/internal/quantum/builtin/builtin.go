// Package builtin wires the OSS-default providers into the Quantum SDK
// provider registry.
//
// Registered builtins:
//
//   - local-pqc   — dependency-free local attestation (default in OSS builds)
//   - oqs-engine  — Open Quantum Safe engine (software backend)
//   - nist-pqc    — NIST FIPS 203/204/205 validation engine
//   - ibm-quantum — opt-in IBM Quantum Network integration (requires API key)
package builtin

import (
	"context"
	"time"

	"github.com/RivicQ/RivicQ_CSPM_EaaS/quantum-sdk/internal/quantum"
	"github.com/RivicQ/RivicQ_CSPM_EaaS/quantum-sdk/internal/quantum/ibmquantum"
	"github.com/RivicQ/RivicQ_CSPM_EaaS/quantum-sdk/internal/quantum/nistpqc"
	"github.com/RivicQ/RivicQ_CSPM_EaaS/quantum-sdk/internal/quantum/oqsengine"
	"github.com/RivicQ/RivicQ_CSPM_EaaS/quantum-sdk/internal/quantum/provider"
	"github.com/sirupsen/logrus"
)

// Options configures the builtin provider set.
type Options struct {
	Logger *logrus.Logger
	// IBM enables the opt-in IBM Quantum provider. Only used to seed config;
	// the provider reports itself unavailable when no API key is present.
	IBM      quantum.IBMQuantumConfig
	EnableIBM bool
	// OQS options for the oqs-engine provider (backend, HSM seed).
	OQS oqsengine.Options
}

// Register adds every builtin provider factory to the registry. It does not
// instantiate anything; call Registry.Init afterwards with configs.
func Register(ctx context.Context, reg *provider.Registry, opts Options) error {
	if reg == nil {
		reg = provider.NewRegistry()
	}
	logger := opts.Logger
	if logger == nil {
		logger = logrus.New()
	}

	reg.Register("local-pqc", func(ctx context.Context, cfg map[string]any) (provider.QuantumProvider, error) {
		return &localProvider{logger: logger}, nil
	})
	reg.Register("oqs-engine", func(ctx context.Context, cfg map[string]any) (provider.QuantumProvider, error) {
		o := opts.OQS
		if o.Logger == nil {
			o.Logger = logger
		}
		return oqsengine.New(o)
	})
	reg.Register("nist-pqc", func(ctx context.Context, cfg map[string]any) (provider.QuantumProvider, error) {
		return nistpqc.NewProvider(), nil
	})
	reg.Register("ibm-quantum", func(ctx context.Context, cfg map[string]any) (provider.QuantumProvider, error) {
		if !opts.EnableIBM {
			cfg = map[string]any{}
		}
		ibmCfg := opts.IBM
		if v, ok := cfg["api_key"].(string); ok && v != "" {
			ibmCfg.APIKey = v
		}
		return ibmquantum.New(ibmCfg, logger)
	})
	return nil
}

// localProvider adapts the OSS LocalAttestationProvider to the QuantumProvider
// contract so it participates in the registry like every other provider.
type localProvider struct {
	logger *logrus.Logger
	inner  *quantum.LocalAttestationProvider
}

func (p *localProvider) Info() provider.ProviderInfo {
	return provider.ProviderInfo{
		Name:         "local-pqc",
		Version:      "1.0.0",
		Vendor:       "CryptoBOM",
		Kind:         "attestation",
		Description:  "Local post-quantum attestation using NIST PQC guidance tables",
		Capabilities: []provider.Capability{provider.CapAttest, provider.CapRiskAssessment, provider.CapValidation},
	}
}

func (p *localProvider) Status(ctx context.Context) provider.ProviderStatus {
	return provider.ProviderStatus{
		State:     "available",
		Message:   "local attestation ready",
		Version:   p.Info().Version,
		CheckedAt: time.Now().UTC(),
	}
}

func (p *localProvider) Attest(ctx context.Context, req quantum.AttestationRequest) (*quantum.AttestationResult, error) {
	if p.inner == nil {
		p.inner = quantum.NewLocalAttestationProvider()
	}
	return p.inner.Attest(ctx, req)
}

func (p *localProvider) Assess(ctx context.Context, asset quantum.CryptoAsset) (*quantum.QuantumRiskReport, error) {
	scanner := &quantum.QuantumScanner{}
	return scanner.AssessAsset(asset.ID, asset.Name, []string{asset.Algorithm})
}

func (p *localProvider) MigrationPath(ctx context.Context, fromAlgorithm string) ([]quantum.PostQuantumAlgorithm, error) {
	target := nistpqc.New().MigrationTarget(fromAlgorithm)
	if target == "" {
		return []quantum.PostQuantumAlgorithm{}, nil
	}
	return []quantum.PostQuantumAlgorithm{
		{Name: target, Type: "KEM", QuantumSafe: true, Recommended: true},
	}, nil
}

func (p *localProvider) Validate(ctx context.Context, algorithm string, keySize int) (*quantum.QuantumAttestationResponse, error) {
	cls, err := nistpqc.New().Classify(algorithm, keySize)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	return &quantum.QuantumAttestationResponse{
		ID:          "local-pqc-" + now.Format("20060102150405"),
		Status:      "completed",
		QuantumSafe: cls.QuantumSafe,
		Score:       map[bool]float64{true: 1.0, false: 0.2}[cls.QuantumSafe],
		Confidence:  1.0,
		Analysis: map[string]interface{}{
			"algorithm": cls.Name, "nist_standard": cls.NISTStandard,
			"category": cls.Category, "security_level": cls.SecurityLevel, "status": cls.Status,
		},
		AttestedAt: now,
		ExpiresAt:  now.Add(24 * time.Hour),
	}, nil
}

func (p *localProvider) Close() error { return nil }
