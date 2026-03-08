// Package quantum provides the PQC (Post-Quantum Cryptography) service for CryptoBOM SaaS.
// Implements NIST-standardised algorithms:
//   - ML-KEM-768  (FIPS 203) — Key Encapsulation Mechanism (formerly Kyber)
//   - ML-DSA-65   (FIPS 204) — Digital Signature Algorithm (formerly Dilithium)
//   - SLH-DSA     (FIPS 205) — Stateless Hash-Based Signature (formerly SPHINCS+)
// 
// Real key generation uses github.com/cloudflare/circl for ML-KEM-768 and ML-DSA-65.
// SLH-DSA uses crypto/rand placeholder pending circl FIPS-205 stable release.
// 
// Compliance: NIST PQC Standards, BSI TR-02102-1 Sec. 3.6, DORA Article 9
package quantum

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	circlkyber "github.com/cloudflare/circl/kem/kyber/kyber768"
	circldilithium "github.com/cloudflare/circl/sign/dilithium/mode3"
	"github.com/sirupsen/logrus"
)

// PQCAlgorithm identifies a post-quantum algorithm.
type PQCAlgorithm string

const (
	AlgoMLKEM768   PQCAlgorithm = "ML-KEM-768"               // FIPS 203
	AlgoMLDSA65    PQCAlgorithm = "ML-DSA-65"                // FIPS 204
	AlgoSLHDSASHA2 PQCAlgorithm = "SLH-DSA-SHA2-128s"        // FIPS 205
	AlgoHybridKEM  PQCAlgorithm = "HYBRID-ECDH-P256-MLKEM768" // Hybrid classical+PQC
)

// QuantumRiskLevel indicates the vulnerability level of a cryptographic asset.
type QuantumRiskLevel string

const (
	RiskLevelCritical QuantumRiskLevel = "CRITICAL" // Harvest-now-decrypt-later threat
	RiskLevelHigh     QuantumRiskLevel = "HIGH"      // Vulnerable within 10 years
	RiskLevelMedium   QuantumRiskLevel = "MEDIUM"    // Vulnerable 10-20 years
	RiskLevelLow      QuantumRiskLevel = "LOW"        // PQC-ready or symmetric >= 256-bit
	RiskLevelSafe     QuantumRiskLevel = "SAFE"       // Already quantum-safe
)

// CryptoAsset represents a discovered cryptographic primitive in a codebase/system.
type CryptoAsset struct {
	ID            string           `json:"id"`
	TenantID      string           `json:"tenant_id"`
	Name          string           `json:"name"`
	Algorithm     string           `json:"algorithm"`
	KeySize       int              `json:"key_size"`
	Location      string           `json:"location"`
	LineNumber    int              `json:"line_number,omitempty"`
	Usage         string           `json:"usage"`
	QuantumRisk   QuantumRiskLevel `json:"quantum_risk"`
	HarvestRisk   bool             `json:"harvest_risk"`
	MigrationPath string           `json:"migration_path,omitempty"`
	DiscoveredAt  time.Time        `json:"discovered_at"`
	LastSeenAt    time.Time        `json:"last_seen_at"`
}

// PQCKeyPair represents a generated post-quantum key pair.
type PQCKeyPair struct {
	KeyID      string       `json:"key_id"`
	Algorithm  PQCAlgorithm `json:"algorithm"`
	PublicKey  string       `json:"public_key_hex"`
	PrivateKey string       `json:"private_key_hex"` // NEVER log this field
	TenantID   string       `json:"tenant_id"`
	CreatedAt  time.Time    `json:"created_at"`
	NISTLevel  int          `json:"nist_level"`
	Standard   string       `json:"nist_standard"`
	Note       string       `json:"note,omitempty"`
}

// MarshalJSON prevents private key from being accidentally serialised.
func (kp PQCKeyPair) MarshalJSON() ([]byte, error) {
	type safe PQCKeyPair
	s := safe(kp)
	s.PrivateKey = "[REDACTED]"
	return json.Marshal(s)
}

// MigrationStep describes one step in a PQC migration plan.
type MigrationStep struct {
	Priority     int       `json:"priority"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Target       string    `json:"target_algorithm"`
	NISTStandard string    `json:"nist_standard,omitempty"`
	Deadline     time.Time `json:"deadline"`
	Effort       string    `json:"effort"`
	Status       string    `json:"status"`
}

// MigrationRecommendation maps a current algorithm to its recommended replacement.
type MigrationRecommendation struct {
	AssetID     string `json:"asset_id"`
	CurrentAlgo string `json:"current_algorithm"`
	TargetAlgo  string `json:"target_algorithm"`
	Rationale   string `json:"rationale"`
	Effort      string `json:"effort"`
	Deadline    string `json:"deadline"`
}

// AWSHSMClient is a placeholder interface for AWS CloudHSM integration.
type AWSHSMClient struct{}

// QuantumAttestationProvider is implemented by IBM Q and local providers.
type QuantumAttestationProvider interface {
	Attest(ctx context.Context, req interface{}) (interface{}, error)
	Name() string
	IsAvailable() bool
}

// PQCService provides post-quantum cryptographic operations for CryptoBOM.
type PQCService struct {
	logger         *logrus.Logger
	hsmClient      *AWSHSMClient
	attestProvider QuantumAttestationProvider
}

// NewPQCService creates a PQC service instance.
// attestProvider may be nil; if nil, attestation calls are skipped.
func NewPQCService(logger *logrus.Logger, hsm *AWSHSMClient, attestProvider QuantumAttestationProvider) *PQCService {
	return &PQCService{
		logger:         logger,
		hsmClient:      hsm,
		attestProvider: attestProvider,
	}
}

// GenerateKeyPair generates a real post-quantum key pair using cloudflare/circl.
// 
// Supported algorithms:
//   - ML-KEM-768  (FIPS 203) — real key generation via circl/kem/kyber/kyber768
//   - ML-DSA-65   (FIPS 204) — real key generation via circl/sign/dilithium/mode3
//   - HYBRID-ECDH-P256-MLKEM768 — ML-KEM-768 key pair (hybrid noted in metadata)
//   - SLH-DSA-SHA2-128s (FIPS 205) — crypto/rand placeholder pending circl FIPS-205 release
func (s *PQCService) GenerateKeyPair(ctx context.Context, algo PQCAlgorithm, tenantID string) (*PQCKeyPair, error) {
	s.logger.WithFields(logrus.Fields{
		"algorithm": algo,
		"tenant_id": tenantID,
	}).Info("Generating post-quantum key pair via cloudflare/circl")
	
	switch algo {
	case AlgoMLKEM768, AlgoHybridKEM:
		return s.generateKyber768KeyPair(algo, tenantID)
	case AlgoMLDSA65:
		return s.generateDilithiumMode3KeyPair(tenantID)
	case AlgoSLHDSASHA2:
		return s.generateSLHDSAKeyPair(tenantID)
	default:
		return nil, fmt.Errorf("unsupported PQC algorithm: %s", algo)
	}
}

// generateKyber768KeyPair generates a real ML-KEM-768 key pair via circl.
func (s *PQCService) generateKyber768KeyPair(algo PQCAlgorithm, tenantID string) (*PQCKeyPair, error) {
	scheme := circlkyber.Scheme()
	pub, priv, err := scheme.GenerateKeyPair()
	if err != nil {
		return nil, fmt.Errorf("ML-KEM-768 key generation failed: %w", err)
	}

	pubBytes, err := pub.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("ML-KEM-768 public key marshal failed: %w", err)
	}
	privBytes, err := priv.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("ML-KEM-768 private key marshal failed: %w", err)
	}

	keyID := generateKeyID()
	note := ""
	if algo == AlgoHybridKEM {
		note = "Hybrid mode: ML-KEM-768 component generated; pair with ECDH-P256 for full hybrid KEM"
	}
	return &PQCKeyPair{
		KeyID:     keyID,
		Algorithm: algo,
		PublicKey: hex.EncodeToString(pubBytes),
		PrivateKey: hex.EncodeToString(privBytes),
		TenantID:  tenantID,
		CreatedAt: time.Now().UTC(),
		NISTLevel: 3,
		Standard:  "FIPS-203",
		Note:      note,
	}, nil
}

// generateDilithiumMode3KeyPair generates a real ML-DSA-65 key pair via circl.
func (s *PQCService) generateDilithiumMode3KeyPair(tenantID string) (*PQCKeyPair, error) {
	pub, priv, err := circldilithium.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("ML-DSA-65 (Dilithium mode3) key generation failed: %w", err)
	}

	pubBytes, err := pub.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("ML-DSA-65 public key marshal failed: %w", err)
	}
	privBytes, err := priv.MarshalBinary()
	if err != nil {
		return nil, fmt.Errorf("ML-DSA-65 private key marshal failed: %w", err)
	}

	keyID := generateKeyID()
	return &PQCKeyPair{
		KeyID:     keyID,
		Algorithm: AlgoMLDSA65,
		PublicKey: hex.EncodeToString(pubBytes),
		PrivateKey: hex.EncodeToString(privBytes),
		TenantID:  tenantID,
		CreatedAt: time.Now().UTC(),
		NISTLevel: 3,
		Standard:  "FIPS-204",
	}, nil
}

// generateSLHDSAKeyPair generates a SLH-DSA key pair.
// NOTE: circl does not yet have a stable FIPS-205 SLH-DSA implementation.
// This uses crypto/rand to produce placeholder key material. Replace when
// github.com/cloudflare/circl adds circl/sign/sphincs or circl/sign/slhdsa.
func (s *PQCService) generateSLHDSAKeyPair(tenantID string) (*PQCKeyPair, error) {
	privBytes := make([]byte, 64)
	if _, err := rand.Read(privBytes); err != nil {
		return nil, fmt.Errorf("SLH-DSA private key generation failed: %w", err)
	}
	pubBytes := make([]byte, 32)
	if _, err := rand.Read(pubBytes); err != nil {
		return nil, fmt.Errorf("SLH-DSA public key generation failed: %w", err)
	}

	keyID := generateKeyID()
	return &PQCKeyPair{
		KeyID:     keyID,
		Algorithm: AlgoSLHDSASHA2,
		PublicKey: hex.EncodeToString(pubBytes),
		PrivateKey: hex.EncodeToString(privBytes),
		TenantID:  tenantID,
		CreatedAt: time.Now().UTC(),
		NISTLevel: 1,
		Standard:  "FIPS-205",
		Note:      "SLH-DSA: placeholder pending circl FIPS-205 stable release (github.com/cloudflare/circl)",
	}, nil
}

// SignMessage signs a message using ML-DSA-65 (FIPS 204) via cloudflare/circl Dilithium mode3.
// privKeyHex must be the hex-encoded private key produced by GenerateKeyPair.
func (s *PQCService) SignMessage(privKeyHex string, message []byte) ([]byte, error) {
	privBytes, err := hex.DecodeString(privKeyHex)
	if err != nil {
		return nil, fmt.Errorf("invalid ML-DSA-65 private key hex: %w", err)
	}

	var priv circldilithium.PrivateKey
	if err := priv.UnmarshalBinary(privBytes); err != nil {
		return nil, fmt.Errorf("failed to unmarshal ML-DSA-65 private key: %w", err)
	}

	sig := circldilithium.Sign(&priv, message)
	return sig, nil
}

// VerifySignature verifies an ML-DSA-65 (FIPS 204) signature via cloudflare/circl.
// pubKeyHex must be the hex-encoded public key produced by GenerateKeyPair.
func (s *PQCService) VerifySignature(pubKeyHex string, message, signature []byte) (bool, error) {
	pubBytes, err := hex.DecodeString(pubKeyHex)
	if err != nil {
		return false, fmt.Errorf("invalid ML-DSA-65 public key hex: %w", err)
	}

	var pub circldilithium.PublicKey
	if err := pub.UnmarshalBinary(pubBytes); err != nil {
		return false, fmt.Errorf("failed to unmarshal ML-DSA-65 public key: %w", err)
	}

	return circldilithium.Verify(&pub, message, signature), nil
}

// AssessMigrationReadiness evaluates the quantum risk of a crypto asset.
func (s *PQCService) AssessMigrationReadiness(ctx context.Context, asset *CryptoAsset) (QuantumRiskLevel, string, error) {
	if asset == nil {
		return "", "", fmt.Errorf("asset must not be nil")
	}

	vulnerable := map[string]bool{
		"RSA-1024": true, "RSA-2048": true, "RSA-3072": true, "RSA-4096": true,
		"ECDSA-P256": true, "ECDSA-P384": true, "ECDSA-P521": true,
		"ECDH-P256": true, "ECDH-P384": true,
		"DSA-1024": true, "DSA-2048": true,
		"DH-1024": true, "DH-2048": true, "DH-3072": true,
		"Ed25519": true, "Ed448": true,
	}

	pqcSafe := map[string]bool{
		"ML-KEM-768": true, "ML-KEM-1024": true,
		"ML-DSA-65": true, "ML-DSA-87": true,
		"SLH-DSA-SHA2-128s": true,
		"AES-256": true, "AES-256-GCM": true,
		"SHA-256": true, "SHA-384": true, "SHA-512": true,
		"SHA3-256": true, "SHA3-512": true,
	}

	algo := asset.Algorithm
	if pqcSafe[algo] {
		return RiskLevelSafe, "Algorithm is quantum-safe per NIST PQC standards.", nil
	}
	if vulnerable[algo] {
		risk := RiskLevelCritical
		if asset.KeySize >= 4096 {
			risk = RiskLevelHigh
		}
		return risk, riskRationale(risk), nil
	}
	return RiskLevelMedium, "Algorithm quantum-safety is uncertain; evaluate against BSI TR-02102-1.", nil
}

// BuildMigrationPlan returns a prioritised migration roadmap for a tenant.
func (s *PQCService) BuildMigrationPlan(ctx context.Context, tenantID string) ([]MigrationStep, error) {
	now := time.Now().UTC()
	return []MigrationStep{
		{
			Priority:     1,
			Title:        "Inventory Quantum-Vulnerable Assets",
			Description:  "Scan all services and identify RSA/ECDSA/ECDH keys and certificates.",
			Target:       "Asset Inventory",
			Deadline:     now.AddDate(0, 3, 0),
			Effort:       "Medium",
			Status:       "Pending",
		},
		{
			Priority:     2,
			Title:        "Migrate TLS/HTTPS to Hybrid KEM",
			Description:  "Replace RSA key exchange with HYBRID-ECDH-P256-MLKEM768 at ingress.",
			Target:       "HYBRID-ECDH-P256-MLKEM768",
			NISTStandard: "FIPS-203 (hybrid profile)",
			Deadline:     now.AddDate(0, 6, 0),
			Effort:       "High",
			Status:       "Pending",
		},
		{
			Priority:     3,
			Title:        "Migrate Code Signing to ML-DSA-65",
			Description:  "Replace ECDSA/RSA signatures on CBOM records with ML-DSA-65.",
			Target:       "ML-DSA-65",
			NISTStandard: "FIPS-204",
			Deadline:     now.AddDate(1, 0, 0),
			Effort:       "Medium",
			Status:       "Pending",
		},
		{
			Priority:     4,
			Title:        "Re-encrypt Archived Data",
			Description:  "Re-encrypt archived data protected by RSA/ECDH with AES-256 + ML-KEM.",
			Target:       "AES-256 + ML-KEM-768",
			NISTStandard: "FIPS-197 / FIPS-203",
			Deadline:     now.AddDate(1, 6, 0),
			Effort:       "High",
			Status:       "Pending",
		},
		{
			Priority:     5,
			Title:        "Compliance Validation",
			Description:  "Obtain BSI TR-02102-1 and FIPS 140-3 certifications for PQC components.",
			Target:       "BSI / FIPS Certification",
			Deadline:     now.AddDate(2, 0, 0),
			Effort:       "Medium",
			Status:       "Pending",
		},
	}, nil
}

func riskRationale(risk QuantumRiskLevel) string {
	switch risk {
	case RiskLevelCritical:
		return "HARVEST-NOW-DECRYPT-LATER attack possible. Immediate migration required per BSI TR-02102-1."
	case RiskLevelHigh:
		return "Vulnerable within estimated 10-year horizon. Migrate before DORA deadline."
	default:
		return "Migration recommended to achieve full quantum-safe posture."
	}
}

// generateKeyID generates a random 16-byte hex key identifier.
func generateKeyID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("key-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}