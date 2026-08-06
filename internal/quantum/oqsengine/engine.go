// Package oqsengine provides the Open Quantum Safe (OQS) engine provider.
//
// The engine exposes NIST-standardised post-quantum primitives (ML-KEM,
// ML-DSA, SLH-DSA) through the provider SDK contract.
//
// Backends:
//
//   - software (default): dependency-free implementation backed by the
//     CryptoBOM PQC service. Suitable for OSS and CI; NOT for production keys.
//   - liboqs (build tag "oqs", cgo): native liboqs primitives from
//     https://github.com/open-quantum-safe/liboqs via OQS-Provider/OpenSSL.
//     Wire by implementing the AlgorithmBackend interface below.
package oqsengine

import (
	"context"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/quantum"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/nistpqc"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/provider"
	"github.com/sirupsen/logrus"
)

// Backend identifies the algorithm backend the engine uses.
type Backend string

const (
	// BackendSoftware uses the dependency-free software PQC implementation.
	BackendSoftware Backend = "software"
	// BackendLiboqs uses native liboqs primitives (cgo; build tag "oqs").
	BackendLiboqs Backend = "liboqs"
)

// AlgorithmBackend abstracts the primitive operations so liboqs (or an HSM
// backed module) can be dropped in without touching the provider contract.
type AlgorithmBackend interface {
	// Generate derives a post-quantum key pair for algo.
	Generate(ctx context.Context, algo quantum.PQCAlgorithm) (*quantum.PQCKeyPair, error)
	// Sign signs record bytes with the given private key material.
	Sign(ctx context.Context, algo quantum.PQCAlgorithm, privateKeyHex string, record []byte) (*quantum.PQCSignature, error)
}

// Options configures the OQS engine provider.
type Options struct {
	Logger   *logrus.Logger
	Backend  Backend
	HSMSeed  bool
	HSM      *quantum.AWSHSMClient
}

// Engine is the OQS engine provider.
type Engine struct {
	logger *logrus.Logger
	svc    *quantum.PQCService
	backend AlgorithmBackend
	nist   *nistpqc.Engine
}

// New creates the OQS engine provider. When backend is BackendLiboqs and no
// custom AlgorithmBackend is supplied, New returns ErrBackendUnavailable.
func New(opts Options) (*Engine, error) {
	logger := opts.Logger
	if logger == nil {
		logger = logrus.New()
	}

	backend := opts.Backend
	if backend == "" {
		backend = BackendSoftware
	}

	var ab AlgorithmBackend
	switch backend {
	case BackendLiboqs:
		return nil, ErrBackendUnavailable
	default:
		ab = softwareBackend{}
	}

	svc := quantum.NewPQCService(logger, opts.HSM, nil)
	return &Engine{
		logger:  logger,
		svc:     svc,
		backend: ab,
		nist:    nistpqc.New(),
	}, nil
}

// ErrBackendUnavailable indicates the requested backend is not compiled in.
var ErrBackendUnavailable = &BackendError{message: "liboqs backend is not available in this build (compile with -tags oqs)"}

// BackendError is a sentinel error for backend problems.
type BackendError struct{ message string }

func (e *BackendError) Error() string { return e.message }

// Info implements provider.QuantumProvider.
func (e *Engine) Info() provider.ProviderInfo {
	return provider.ProviderInfo{
		Name:         "oqs-engine",
		Version:      "1.0.0",
		Vendor:       "CryptoBOM / OQS",
		Kind:         "pqc_engine",
		Description:  "Open Quantum Safe engine (ML-KEM FIPS 203, ML-DSA FIPS 204, SLH-DSA FIPS 205)",
		Capabilities: []provider.Capability{provider.CapKeyGeneration, provider.CapSigning, provider.CapRiskAssessment, provider.CapValidation, provider.CapMigration},
		ConfigSchema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"backend": map[string]any{"type": "string", "enum": []string{"software", "liboqs"}},
				"hsm_seed": map[string]any{"type": "boolean"},
			},
		},
		Documentation: "https://openquantumsafe.org/",
	}
}

// Status implements provider.QuantumProvider.
func (e *Engine) Status(ctx context.Context) provider.ProviderStatus {
	return provider.ProviderStatus{
		State:     "available",
		Message:   "oqs engine ready (software backend)",
		Version:   "1.0.0",
		CheckedAt: time.Now().UTC(),
		Metrics:   map[string]float64{"algorithms_tracked": float64(len(e.nist.Table()))},
	}
}

// Attest implements provider.QuantumProvider.
func (e *Engine) Attest(ctx context.Context, req quantum.AttestationRequest) (*quantum.AttestationResult, error) {
	scanner := &quantum.QuantumScanner{}
	report, err := scanner.AssessAsset(req.AssetID, req.AssetID, []string{req.Algorithm})
	if err != nil {
		return nil, err
	}
	riskScore := float64(report.RiskScore) / 100.0
	now := time.Now().UTC()
	return &quantum.AttestationResult{
		AssetID:         req.AssetID,
		AttestationID:   "oqs-engine-" + now.Format("20060102150405"),
		ProviderName:    e.Info().Name,
		QuantumSafe:     riskScore < 0.3,
		RiskScore:       riskScore,
		Recommendations: report.RecommendedActions,
		Analysis: map[string]interface{}{
			"algorithm":         req.Algorithm,
			"risk_level":        report.RiskLevel,
			"migration_urgency": report.MigrationUrgency,
		},
		AttestedAt: now,
		ExpiresAt:  now.Add(24 * time.Hour),
	}, nil
}

// Assess implements provider.QuantumProvider.
func (e *Engine) Assess(ctx context.Context, asset quantum.CryptoAsset) (*quantum.QuantumRiskReport, error) {
	scanner := &quantum.QuantumScanner{}
	return scanner.AssessAsset(asset.ID, asset.Name, []string{asset.Algorithm})
}

// MigrationPath implements provider.QuantumProvider.
func (e *Engine) MigrationPath(ctx context.Context, fromAlgorithm string) ([]quantum.PostQuantumAlgorithm, error) {
	target := e.nist.MigrationTarget(fromAlgorithm)
	if target == "" {
		return []quantum.PostQuantumAlgorithm{}, nil
	}
	var out []quantum.PostQuantumAlgorithm
	for _, part := range splitMigrationTarget(target) {
		cls, err := e.nist.Classify(part, 0)
		if err != nil {
			continue
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
func (e *Engine) Validate(ctx context.Context, algorithm string, keySize int) (*quantum.QuantumAttestationResponse, error) {
	cls, err := e.nist.Classify(algorithm, keySize)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	return &quantum.QuantumAttestationResponse{
		ID:          "oqs-engine-" + now.Format("20060102150405"),
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

// GenerateKeyPair generates a post-quantum key pair using the configured
// backend.
func (e *Engine) GenerateKeyPair(ctx context.Context, algo quantum.PQCAlgorithm) (*quantum.PQCKeyPair, error) {
	return e.backend.Generate(ctx, algo)
}

// SignRecord signs a CryptoBOM record using the configured backend.
func (e *Engine) SignRecord(ctx context.Context, algo quantum.PQCAlgorithm, privateKeyHex string, record []byte) (*quantum.PQCSignature, error) {
	return e.backend.Sign(ctx, algo, privateKeyHex, record)
}

// Close implements provider.QuantumProvider.
func (e *Engine) Close() error { return nil }

// softwareBackend is the default dependency-free backend backed by the
// CryptoBOM PQC service.
type softwareBackend struct{}

func (b softwareBackend) Generate(ctx context.Context, algo quantum.PQCAlgorithm) (*quantum.PQCKeyPair, error) {
	svc := quantum.NewPQCService(logrus.New(), nil, nil)
	return svc.GenerateKeyPair(ctx, algo, false)
}

func (b softwareBackend) Sign(ctx context.Context, algo quantum.PQCAlgorithm, privateKeyHex string, record []byte) (*quantum.PQCSignature, error) {
	svc := quantum.NewPQCService(logrus.New(), nil, nil)
	return svc.SignRecord(ctx, algo, privateKeyHex, record)
}

// splitMigrationTarget splits a "A + B" migration target into its parts.
func splitMigrationTarget(target string) []string {
	var out []string
	start := 0
	for i := 0; i < len(target); i++ {
		if target[i] == '+' {
			out = append(out, trimSpace(target[start:i]))
			start = i + 1
		}
	}
	out = append(out, trimSpace(target[start:]))
	return out
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && s[start] == ' ' {
		start++
	}
	for end > start && s[end-1] == ' ' {
		end--
	}
	return s[start:end]
}
