package intelligence

import (
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/quantum/qiskitprofile"
)

// PQC classification for a cryptographic asset. These are inventory classes,
// not a claim that the implementation is quantum-safe on hardware.
const (
	PQCReady        = "pqc-ready"
	PQCHybridReady  = "hybrid-ready"
	PQCMigrationReq = "migration-required"
	PQCHighRisk     = "high-risk"
	PQCUnknown      = "unknown"
)

// SupportedNISTPQC is the local taxonomy this engine maps to. Not CAVP validated.
var SupportedNISTPQC = []string{
	"ML-KEM-768 (FIPS 203)",
	"ML-DSA-65 (FIPS 204)",
	"SLH-DSA (FIPS 205)",
}

func ClassifyPQC(f Finding) string {
	if f.PQCClass != "" {
		return f.PQCClass
	}
	blob := strings.ToUpper(f.Algorithm + " " + f.Evidence + " " + f.Title)
	cl := qiskitprofile.Classify(f.Algorithm, f.KeyLength)
	if cl.AttackClass == qiskitprofile.AttackNone && f.Algorithm == "" {
		cl = qiskitprofile.Classify(blob, f.KeyLength)
	}
	switch {
	case strings.Contains(blob, "MD5") || strings.Contains(blob, "RC4") ||
		strings.Contains(blob, "3DES") || strings.Contains(blob, "SHA-1") || strings.Contains(blob, "SHA1") ||
		strings.Contains(blob, "TLS 1.0") || strings.Contains(blob, "TLS1.0") ||
		strings.Contains(blob, "TLS 1.1") || (strings.Contains(blob, "RSA") && f.KeyLength > 0 && f.KeyLength < 2048):
		return PQCHighRisk
	case cl.AttackClass == qiskitprofile.AttackPQC || strings.Contains(blob, "ML-KEM") ||
		strings.Contains(blob, "ML-DSA") || strings.Contains(blob, "SLH-DSA"):
		return PQCReady
	case strings.Contains(blob, "HYBRID") || (cl.AttackClass == qiskitprofile.AttackGrover && f.KeyLength >= 256):
		return PQCHybridReady
	case cl.AttackClass == qiskitprofile.AttackShor:
		return PQCMigrationReq
	case cl.AttackClass == qiskitprofile.AttackGrover:
		return PQCHybridReady
	default:
		return PQCUnknown
	}
}

func pqcRecommendedAction(class string) string {
	switch class {
	case PQCReady:
		return "Keep the NIST PQC primitive; track parameter-set updates. This is a taxonomy class, not CAVP validation."
	case PQCHybridReady:
		return "Prefer hybrid classical+PQC during migration; increase symmetric/hash sizes where Grover applies."
	case PQCHighRisk:
		return "Replace immediately. Broken or below-policy classically — do not wait for a quantum computer."
	case PQCMigrationReq:
		return "Plan migration to ML-KEM / ML-DSA / SLH-DSA (FIPS 203/204/205). RSA-2048 is classified, not auto-vulnerable."
	default:
		return "Insufficient evidence to classify. Re-scan with a supported detector."
	}
}

func pqcClassificationCounts(findings []Finding) map[string]int {
	out := map[string]int{
		PQCReady:        0,
		PQCHybridReady:  0,
		PQCMigrationReq: 0,
		PQCHighRisk:     0,
		PQCUnknown:      0,
	}
	for _, f := range findings {
		out[ClassifyPQC(f)]++
	}
	return out
}
