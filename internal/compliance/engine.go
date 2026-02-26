// Package compliance provides a compliance policy engine for CryptoBOM SaaS.
package compliance

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// CryptoAsset describes a cryptographic asset to be evaluated.
type CryptoAsset struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Algorithm string `json:"algorithm"`
	KeySize   int    `json:"key_size"`
	Usage     string `json:"usage"`
}

// PolicyViolation describes a single compliance violation.
type PolicyViolation struct {
	Framework   string `json:"framework"`
	Article     string `json:"article"`
	Description string `json:"description"`
	Severity    string `json:"severity"` // CRITICAL, HIGH, MEDIUM, LOW
	Remediation string `json:"remediation"`
}

// ComplianceReport is the result of evaluating a CryptoAsset.
type ComplianceReport struct {
	AssetID    string            `json:"asset_id"`
	AssetName  string            `json:"asset_name"`
	Violations []PolicyViolation `json:"violations"`
	Frameworks []string          `json:"frameworks_checked"`
	Compliant  bool              `json:"compliant"`
	EvaluatedAt time.Time        `json:"evaluated_at"`
}

// ComplianceEngine evaluates a CryptoAsset against one or more compliance frameworks.
type ComplianceEngine interface {
	// Evaluate checks the asset against all supported frameworks and returns a report.
	Evaluate(ctx context.Context, asset *CryptoAsset) (*ComplianceReport, error)
	// Frameworks returns the list of compliance framework identifiers supported.
	Frameworks() []string
}

// vulnerableAlgorithms is the set of classical algorithm prefixes that are
// considered quantum-vulnerable and trigger DORA / NIS2 / NIST violations.
var vulnerableAlgorithms = []string{
	"RSA", "ECDSA", "ECDH", "DH", "DSA", "ELGAMAL",
}

func isQuantumVulnerable(algorithm string) bool {
	upper := strings.ToUpper(algorithm)
	for _, v := range vulnerableAlgorithms {
		if strings.HasPrefix(upper, v) {
			return true
		}
	}
	return false
}

// OSSComplianceEngine is the built-in compliance engine for the OSS build.
// It performs local rule evaluation covering DORA, NIS2, NIST CSF, CRA, and ENISA
// using the NIST PQC migration guidelines (SP 800-208) and BSI TR-02102-1.
//
// Enterprise builds may extend or replace this with a premium engine that queries
// external governance databases and produces audit-ready PDF reports.
type OSSComplianceEngine struct{}

// NewOSSComplianceEngine returns a new OSSComplianceEngine.
func NewOSSComplianceEngine() *OSSComplianceEngine {
	return &OSSComplianceEngine{}
}

// Frameworks returns the compliance frameworks supported by the OSS engine.
func (e *OSSComplianceEngine) Frameworks() []string {
	return []string{"DORA", "NIS2", "NIST-CSF", "CRA", "ENISA"}
}

// Evaluate checks the asset against each supported framework and returns a report.
// The context is accepted as part of the ComplianceEngine interface contract to allow
// enterprise implementations to use deadlines and cancellation; the OSS engine performs
// local rule evaluation that does not require cancellation support.
func (e *OSSComplianceEngine) Evaluate(_ context.Context, asset *CryptoAsset) (*ComplianceReport, error) {
	if asset == nil {
		return nil, fmt.Errorf("compliance evaluation: asset must not be nil")
	}

	var violations []PolicyViolation
	vuln := isQuantumVulnerable(asset.Algorithm)

	if vuln {
		violations = append(violations, doraViolation(asset))
		violations = append(violations, nis2Violation(asset))
		violations = append(violations, nistCSFViolation(asset))
		violations = append(violations, craViolation(asset))
		violations = append(violations, enisaViolation(asset))
	}

	return &ComplianceReport{
		AssetID:    asset.ID,
		AssetName:  asset.Name,
		Violations: violations,
		Frameworks: e.Frameworks(),
		Compliant:  len(violations) == 0,
		EvaluatedAt: time.Now().UTC(),
	}, nil
}

// --- per-framework violation constructors ---

func doraViolation(asset *CryptoAsset) PolicyViolation {
	return PolicyViolation{
		Framework: "DORA",
		Article:   "Art.9",
		Description: fmt.Sprintf(
			"Algorithm %s (key size %d) is vulnerable to Shor's algorithm and does not "+
				"meet the cryptographic resilience requirements of DORA Article 9.",
			asset.Algorithm, asset.KeySize),
		Severity: "HIGH",
		Remediation: "Migrate to a NIST-standardised post-quantum algorithm " +
			"(ML-KEM-768 / FIPS 203 for key exchange, ML-DSA-65 / FIPS 204 for signatures).",
	}
}

func nis2Violation(asset *CryptoAsset) PolicyViolation {
	return PolicyViolation{
		Framework: "NIS2",
		Article:   "Art.21",
		Description: fmt.Sprintf(
			"Algorithm %s is quantum-vulnerable. NIS2 Article 21 requires appropriate "+
				"technical measures to manage risks to the security of network and information systems.",
			asset.Algorithm),
		Severity: "HIGH",
		Remediation: "Adopt hybrid PQC+classical key exchange and plan full migration " +
			"to NIST FIPS 203/204/205 algorithms before the EU quantum-readiness deadline.",
	}
}

func nistCSFViolation(asset *CryptoAsset) PolicyViolation {
	return PolicyViolation{
		Framework: "NIST-CSF",
		Article:   "PR.DS-2",
		Description: fmt.Sprintf(
			"Algorithm %s used for %s does not provide adequate protection against "+
				"cryptographically relevant quantum computers per NIST CSF PR.DS-2.",
			asset.Algorithm, asset.Usage),
		Severity: "MEDIUM",
		Remediation: "Follow NIST SP 800-208 migration guidance; prioritise assets " +
			"with long-lived data or key exchange functions.",
	}
}

func craViolation(asset *CryptoAsset) PolicyViolation {
	return PolicyViolation{
		Framework: "CRA",
		Article:   "Annex I §1(2)",
		Description: fmt.Sprintf(
			"Product using %s must be updated to maintain adequate cryptographic strength "+
				"throughout its supported lifetime per EU Cyber Resilience Act Annex I §1(2).",
			asset.Algorithm),
		Severity: "MEDIUM",
		Remediation: "Include a cryptographic agility mechanism and publish a " +
			"PQC migration timeline in the product's security advisory.",
	}
}

func enisaViolation(asset *CryptoAsset) PolicyViolation {
	return PolicyViolation{
		Framework: "ENISA",
		Article:   "PQC Guidelines §4",
		Description: fmt.Sprintf(
			"Algorithm %s is classified as a quantum-risky algorithm by ENISA Post-Quantum "+
				"Cryptography guidelines §4. Continued use increases harvest-now-decrypt-later risk.",
			asset.Algorithm),
		Severity: "HIGH",
		Remediation: "Consult the ENISA PQC migration roadmap and begin inventory of " +
			"all assets using quantum-vulnerable algorithms.",
	}
}
