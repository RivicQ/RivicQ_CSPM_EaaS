package intelligence

import (
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/quantum/qiskitprofile"
)

// PQC taxonomy v1.0.0.
//
// A single versioned six-class vocabulary shared by the API, the scanner and
// every report, so a stored classification can be interpreted without guessing.
//
// These are inventory classes derived from declared algorithm and key length.
// They are not CAVP validation, not a hardware attestation, and not a claim
// that an implementation resists attack on real hardware.
const (
	// TaxonomyVersion identifies the vocabulary. Bump it whenever a class is
	// added, removed, or its definition changes.
	TaxonomyVersion = "rivicq-pqc-taxonomy/1.0.0"

	// ClassPQCLegacy covers primitives that are already broken classically:
	// MD5, RC4, DES/3DES, SHA-1, TLS 1.0/1.1, and short RSA keys. These need
	// no quantum adversary to be a problem.
	ClassPQCLegacy = "legacy"

	// ClassPQCHighRisk covers symmetric primitives that resist Grover only at
	// inadequate sizes, and RSA keys below 2048.
	ClassPQCHighRisk = "high_risk"

	// ClassPQCMigrationRequired covers classical public-key primitives that are
	// within policy today but are broken by a cryptographically relevant
	// quantum computer (Shor).
	ClassPQCMigrationRequired = "migration_required"

	// ClassPQCHybridReady covers hybrid classical+PQC combinations, and
	// symmetric primitives at Grover-resistant sizes.
	ClassPQCHybridReady = "hybrid_ready"

	// ClassPQCReady covers standards-track NIST PQC primitives: ML-KEM
	// (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205).
	ClassPQCReady = "pqc_ready"

	// ClassPQCUnknown is used when the evidence is insufficient. It is a
	// first-class result, not an error, and must be reported as a coverage gap.
	ClassPQCUnknown = "unknown"
)

// SupportedNISTPQC is the local primitive list this engine maps to. It is a
// declared inventory, not a CAVP-validated list.
var SupportedNISTPQC = []string{
	"ML-KEM-768 (FIPS 203)",
	"ML-DSA-65 (FIPS 204)",
	"SLH-DSA (FIPS 205)",
}

// PQCClasses lists every class in the taxonomy, ordered most to least urgent.
var PQCClasses = []string{
	ClassPQCLegacy,
	ClassPQCHighRisk,
	ClassPQCMigrationRequired,
	ClassPQCHybridReady,
	ClassPQCReady,
	ClassPQCUnknown,
}

// IsValidPQCClass reports whether a string is a member of the taxonomy.
func IsValidPQCClass(class string) bool {
	for _, c := range PQCClasses {
		if c == class {
			return true
		}
	}
	return false
}

// PQCClassReason explains why a class was assigned, so a reviewer can check the
// classification instead of trusting it.
type PQCClassReason struct {
	Class   string `json:"class"`
	Version string `json:"taxonomy_version"`
	Reason  string `json:"reason"`
	Action  string `json:"recommended_action"`
	// AttackClass is the qiskitprofile attack surface that drove the decision,
	// or empty when the decision came from a rule rather than the model.
	AttackClass string `json:"attack_class,omitempty"`
}

// ClassifyPQCWithReason returns the taxonomy class and a human-readable reason.
//
// This is the authoritative classifier. ClassifyPQC is a thin wrapper for
// callers that only need the class string.
func ClassifyPQCWithReason(f Finding) PQCClassReason {
	if f.PQCClass != "" {
		return PQCClassReason{
			Class:   f.PQCClass,
			Version: TaxonomyVersion,
			Reason:  "carried from the scanner record",
			Action:  PQCRecommendedAction(f.PQCClass),
		}
	}

	blob := strings.ToUpper(f.Algorithm + " " + f.Evidence + " " + f.Title)
	cl := qiskitprofile.Classify(f.Algorithm, f.KeyLength)
	if cl.AttackClass == qiskitprofile.AttackNone && f.Algorithm == "" {
		cl = qiskitprofile.Classify(blob, f.KeyLength)
	}

	result := func(class, reason string) PQCClassReason {
		return PQCClassReason{
			Class:       class,
			Version:     TaxonomyVersion,
			Reason:      reason,
			Action:      PQCRecommendedAction(class),
			AttackClass: string(cl.AttackClass),
		}
	}

	// Legacy first: these are already broken without a quantum adversary, so
	// they must not be classified as merely "at risk".
	switch {
	case containsAny(blob, "MD5"):
		return result(ClassPQCLegacy, "MD5 is collision-broken; no quantum adversary required")
	case containsAny(blob, "RC4"):
		return result(ClassPQCLegacy, "RC4 is a broken stream cipher")
	case containsAny(blob, "3DES", "DES-EDE", " TRIPLE DES", "TRIPLEDES"):
		return result(ClassPQCLegacy, "3DES has a 64-bit block and Sweet32 exposure")
	case containsAny(blob, "SHA-1", "SHA1"):
		return result(ClassPQCLegacy, "SHA-1 is collision-broken")
	case containsAny(blob, "TLS 1.0", "TLS1.0", "TLS 1.1", "TLS1.1", "SSL 3.0", "SSL3.0"):
		return result(ClassPQCLegacy, "obsolete TLS/SSL protocol version")
	case strings.Contains(blob, "RSA") && f.KeyLength > 0 && f.KeyLength < 2048:
		return result(ClassPQCHighRisk, "RSA key below 2048 bits is below policy")
	}

	// Standards-track NIST PQC primitives.
	if containsAny(blob, "ML-KEM", "ML-KSA", "ML_DSA", "ML-DSA", "SLH-DSA", "FALCON", "DILITHIUM", "SPHINCS") {
		if isHybridEvidence(blob) {
			return result(ClassPQCHybridReady, "PQC primitive combined with a classical primitive (hybrid)")
		}
		return result(ClassPQCReady, "NIST-standardised post-quantum primitive (FIPS 203/204/205 family)")
	}

	switch cl.AttackClass {
	case qiskitprofile.AttackShor:
		return result(ClassPQCMigrationRequired,
			"classical public-key primitive, broken by a cryptographically relevant quantum computer")
	case qiskitprofile.AttackGrover:
		if f.KeyLength > 0 && f.KeyLength >= 256 {
			return result(ClassPQCHybridReady,
				"symmetric/hash primitive at a Grover-resistant key size")
		}
		return result(ClassPQCHighRisk,
			"symmetric/hash primitive below Grover-resistant key size")
	}

	return result(ClassPQCUnknown, "insufficient evidence to classify from the available fields")
}

func containsAny(blob string, needles ...string) bool {
	for _, n := range needles {
		if strings.Contains(blob, n) {
			return true
		}
	}
	return false
}

func isHybridEvidence(blob string) bool {
	return containsAny(blob, "HYBRID", "X25519", " + ML-", "-ML-KEM", "KEM OR", "COMBINED")
}

// ClassifyPQC returns the taxonomy class for a finding.
func ClassifyPQC(f Finding) string {
	return ClassifyPQCWithReason(f).Class
}

// PQCRecommendedAction is the operator guidance for a class.
func PQCRecommendedAction(class string) string {
	switch class {
	case ClassPQCReady:
		return "Keep the NIST PQC primitive and track parameter-set updates. This is a taxonomy class, not CAVP validation."
	case ClassPQCHybridReady:
		return "Prefer the hybrid combination during migration; symmetric and hash sizes are already Grover-resistant."
	case ClassPQCMigrationRequired:
		return "Plan migration to ML-KEM / ML-DSA / SLH-DSA (FIPS 203/204/205). The primitive is acceptable today and is classified, not yet broken."
	case ClassPQCHighRisk:
		return "Replace now. The primitive is below policy and does not need a quantum computer to justify removal."
	case ClassPQCLegacy:
		return "Remove immediately. The primitive is already broken classically; a quantum adversary only shortens the timeline."
	default:
		return "Insufficient evidence to classify. Re-scan with a supported detector and treat this as a coverage gap."
	}
}

// pqcClassificationCounts counts findings per taxonomy class, seeding every class
// so a report shows zero-valued classes rather than omitting them.
func pqcClassificationCounts(findings []Finding) map[string]int {
	out := make(map[string]int, len(PQCClasses))
	for _, c := range PQCClasses {
		out[c] = 0
	}
	for _, f := range findings {
		out[ClassifyPQC(f)]++
	}
	return out
}
