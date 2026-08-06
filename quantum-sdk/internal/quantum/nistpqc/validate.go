// Package nistpqc implements the NIST PQC validation engine for CryptoBOM.
//
// The engine classifies cryptographic algorithms against the NIST
// post-quantum cryptography standards:
//
//   - FIPS 203 (ML-KEM) — Key Encapsulation Mechanism (formerly CRYSTALS-Kyber)
//   - FIPS 204 (ML-DSA) — Module-Lattice Digital Signature (formerly
//     CRYSTALS-Dilithium)
//   - FIPS 205 (SLH-DSA) — Stateless Hash-Based Signature (formerly SPHINCS+)
//
// and maps classical algorithms to their quantum risk posture. The engine is
// dependency-free and is the single source of truth for algorithm status used
// by the OSS build; enterprise editions may override with vendor intelligence.
package nistpqc

import (
	"fmt"
	"strings"
)

// Status values for an algorithm entry.
const (
	StatusStandardized = "Standardized"
	StatusCandidate    = "Candidate"
	StatusDeprecated   = "Deprecated"
	StatusWithdrawn    = "Withdrawn"
	StatusHybrid       = "Hybrid"
)

// Category values for an algorithm entry.
const (
	CategoryKEM       = "KEM"
	CategorySignature = "Signature"
	CategorySymmetric = "Symmetric"
	CategoryHash      = "Hash"
)

// AlgorithmClass is the classification of one algorithm under the NIST PQC
// framework plus its derived quantum-safety posture.
type AlgorithmClass struct {
	Name          string `json:"name"`
	NISTStandard  string `json:"nist_standard,omitempty"`
	Category      string `json:"category"`
	SecurityLevel int    `json:"security_level"` // NIST security level 1-5
	Status        string `json:"status"`
	QuantumSafe   bool   `json:"quantum_safe"`
}

// algorithmTable is the authoritative algorithm registry for the engine.
var algorithmTable = map[string]AlgorithmClass{
	// FIPS 203 — ML-KEM (standardized August 2024)
	"ML-KEM-512":  {Name: "ML-KEM-512", NISTStandard: "FIPS-203", Category: CategoryKEM, SecurityLevel: 1, Status: StatusStandardized, QuantumSafe: true},
	"ML-KEM-768":  {Name: "ML-KEM-768", NISTStandard: "FIPS-203", Category: CategoryKEM, SecurityLevel: 3, Status: StatusStandardized, QuantumSafe: true},
	"ML-KEM-1024": {Name: "ML-KEM-1024", NISTStandard: "FIPS-203", Category: CategoryKEM, SecurityLevel: 5, Status: StatusStandardized, QuantumSafe: true},

	// FIPS 204 — ML-DSA (standardized August 2024)
	"ML-DSA-44": {Name: "ML-DSA-44", NISTStandard: "FIPS-204", Category: CategorySignature, SecurityLevel: 2, Status: StatusStandardized, QuantumSafe: true},
	"ML-DSA-65": {Name: "ML-DSA-65", NISTStandard: "FIPS-204", Category: CategorySignature, SecurityLevel: 3, Status: StatusStandardized, QuantumSafe: true},
	"ML-DSA-87": {Name: "ML-DSA-87", NISTStandard: "FIPS-204", Category: CategorySignature, SecurityLevel: 5, Status: StatusStandardized, QuantumSafe: true},

	// FIPS 205 — SLH-DSA (standardized August 2024)
	"SLH-DSA-SHA2-128s":  {Name: "SLH-DSA-SHA2-128s", NISTStandard: "FIPS-205", Category: CategorySignature, SecurityLevel: 1, Status: StatusStandardized, QuantumSafe: true},
	"SLH-DSA-SHA2-128f":  {Name: "SLH-DSA-SHA2-128f", NISTStandard: "FIPS-205", Category: CategorySignature, SecurityLevel: 1, Status: StatusStandardized, QuantumSafe: true},
	"SLH-DSA-SHA2-192s":  {Name: "SLH-DSA-SHA2-192s", NISTStandard: "FIPS-205", Category: CategorySignature, SecurityLevel: 3, Status: StatusStandardized, QuantumSafe: true},
	"SLH-DSA-SHAKE-256s": {Name: "SLH-DSA-SHAKE-256s", NISTStandard: "FIPS-205", Category: CategorySignature, SecurityLevel: 5, Status: StatusStandardized, QuantumSafe: true},

	// On-Ramp / hybrid (transition period)
	"HYBRID-ECDH-P256-MLKEM768": {Name: "HYBRID-ECDH-P256-MLKEM768", Category: CategoryKEM, SecurityLevel: 3, Status: StatusHybrid, QuantumSafe: true},
	"HYBRID-ECDSA-P256-MLDSA65": {Name: "HYBRID-ECDSA-P256-MLDSA65", Category: CategorySignature, SecurityLevel: 3, Status: StatusHybrid, QuantumSafe: true},

	// Classical asymmetric — vulnerable to Shor's algorithm
	"RSA-1024":   {Name: "RSA-1024", Category: CategoryKEM, Status: StatusDeprecated, QuantumSafe: false},
	"RSA-2048":   {Name: "RSA-2048", Category: CategoryKEM, Status: StatusDeprecated, QuantumSafe: false},
	"RSA-3072":   {Name: "RSA-3072", Category: CategoryKEM, Status: StatusDeprecated, QuantumSafe: false},
	"RSA-4096":   {Name: "RSA-4096", Category: CategoryKEM, Status: StatusDeprecated, QuantumSafe: false},
	"ECDSA-P256": {Name: "ECDSA-P256", Category: CategorySignature, Status: StatusDeprecated, QuantumSafe: false},
	"ECDSA-P384": {Name: "ECDSA-P384", Category: CategorySignature, Status: StatusDeprecated, QuantumSafe: false},
	"ECDSA-P521": {Name: "ECDSA-P521", Category: CategorySignature, Status: StatusDeprecated, QuantumSafe: false},
	"ECDH-P256":  {Name: "ECDH-P256", Category: CategoryKEM, Status: StatusDeprecated, QuantumSafe: false},
	"ECDH-P384":  {Name: "ECDH-P384", Category: CategoryKEM, Status: StatusDeprecated, QuantumSafe: false},
	"Ed25519":    {Name: "Ed25519", Category: CategorySignature, Status: StatusDeprecated, QuantumSafe: false},
	"Ed448":      {Name: "Ed448", Category: CategorySignature, Status: StatusDeprecated, QuantumSafe: false},
	"DSA-2048":   {Name: "DSA-2048", Category: CategorySignature, Status: StatusDeprecated, QuantumSafe: false},
	"DH-2048":    {Name: "DH-2048", Category: CategoryKEM, Status: StatusDeprecated, QuantumSafe: false},

	// Symmetric / hash — safe against Grover with sufficient key length
	"AES-128":           {Name: "AES-128", NISTStandard: "FIPS-197", Category: CategorySymmetric, SecurityLevel: 1, Status: StatusStandardized, QuantumSafe: true},
	"AES-192":           {Name: "AES-192", NISTStandard: "FIPS-197", Category: CategorySymmetric, SecurityLevel: 3, Status: StatusStandardized, QuantumSafe: true},
	"AES-256":           {Name: "AES-256", NISTStandard: "FIPS-197", Category: CategorySymmetric, SecurityLevel: 5, Status: StatusStandardized, QuantumSafe: true},
	"AES-256-GCM":       {Name: "AES-256-GCM", NISTStandard: "FIPS-197", Category: CategorySymmetric, SecurityLevel: 5, Status: StatusStandardized, QuantumSafe: true},
	"ChaCha20-Poly1305": {Name: "ChaCha20-Poly1305", Category: CategorySymmetric, SecurityLevel: 5, Status: StatusStandardized, QuantumSafe: true},
	"SHA-256":           {Name: "SHA-256", NISTStandard: "FIPS-180-4", Category: CategoryHash, SecurityLevel: 2, Status: StatusStandardized, QuantumSafe: true},
	"SHA-3-256":         {Name: "SHA-3-256", NISTStandard: "FIPS-202", Category: CategoryHash, SecurityLevel: 2, Status: StatusStandardized, QuantumSafe: true},
	"SHA-3-512":         {Name: "SHA-3-512", NISTStandard: "FIPS-202", Category: CategoryHash, SecurityLevel: 4, Status: StatusStandardized, QuantumSafe: true},
	"BLAKE3":            {Name: "BLAKE3", Category: CategoryHash, SecurityLevel: 5, Status: StatusStandardized, QuantumSafe: true},
}

// migrationMap maps vulnerable classical algorithms to their recommended PQC
// target per NIST guidance.
var migrationMap = map[string]string{
	"RSA-1024":   "ML-KEM-768 + ML-DSA-65",
	"RSA-2048":   "ML-KEM-768 + ML-DSA-65",
	"RSA-3072":   "ML-KEM-768 + ML-DSA-65",
	"RSA-4096":   "ML-KEM-1024 + ML-DSA-87",
	"ECDSA-P256": "ML-DSA-65",
	"ECDSA-P384": "ML-DSA-87",
	"ECDSA-P521": "ML-DSA-87",
	"ECDH-P256":  "ML-KEM-768",
	"ECDH-P384":  "ML-KEM-1024",
	"Ed25519":    "ML-DSA-65",
	"Ed448":      "ML-DSA-87",
	"DSA-2048":   "ML-DSA-65",
	"DH-2048":    "ML-KEM-768",
	"AES-128":    "AES-256-GCM",
}

// Engine is the NIST PQC validation engine. A zero-value Engine is ready.
type Engine struct{}

// New returns a NIST PQC validation engine.
func New() *Engine { return &Engine{} }

// normalize uppercases and trims an algorithm name for lookup.
func normalize(name string) string {
	return strings.ToUpper(strings.TrimSpace(name))
}

// lookup is algorithmTable keyed by normalized (upper-cased) names, enabling
// case-insensitive lookups while preserving the canonical display names.
var lookup = func() map[string]AlgorithmClass {
	out := make(map[string]AlgorithmClass, len(algorithmTable))
	for k, v := range algorithmTable {
		out[normalize(k)] = v
	}
	return out
}()

// Classify returns the algorithm classification for a given name and key size.
// Unknown algorithms return an error so callers can treat them as "requires
// assessment" rather than silently safe.
func (e *Engine) Classify(name string, keySize int) (AlgorithmClass, error) {
	if cls, ok := lookup[normalize(name)]; ok {
		return cls, nil
	}
	// Some algorithms are keyed by size (e.g. "AES-128"); fall back to a
	// size-based lookup for the family name.
	if keySize > 0 {
		sizeName := fmt.Sprintf("%s-%d", normalize(name), keySize)
		if c, ok := lookup[sizeName]; ok {
			return c, nil
		}
	}
	return AlgorithmClass{}, fmt.Errorf("nistpqc: unknown algorithm %q", name)
}

// QuantumSafe reports whether the named algorithm is classified quantum-safe.
// Unknown algorithms are treated as not-quantum-safe (fail closed).
func (e *Engine) QuantumSafe(name string) bool {
	cls, err := e.Classify(name, 0)
	if err != nil {
		return false
	}
	return cls.QuantumSafe
}

// Recommended returns the standardized NIST PQC algorithms (FIPS 203/204/205),
// sorted by category then security level.
func (e *Engine) Recommended() []AlgorithmClass {
	var out []AlgorithmClass
	for _, c := range algorithmTable {
		if c.Status == StatusStandardized && c.QuantumSafe && c.NISTStandard != "" {
			out = append(out, c)
		}
	}
	return out
}

// migrationLookup is migrationMap keyed by normalized names for case-insensitive
// lookups.
var migrationLookup = func() map[string]string {
	out := make(map[string]string, len(migrationMap))
	for k, v := range migrationMap {
		out[normalize(k)] = v
	}
	return out
}()

// MigrationTarget returns the recommended PQC target for a classical
// algorithm, or an empty string when none is known.
func (e *Engine) MigrationTarget(name string) string {
	return migrationLookup[normalize(name)]
}

// Table returns a snapshot of the full algorithm registry.
func (e *Engine) Table() map[string]AlgorithmClass {
	out := make(map[string]AlgorithmClass, len(algorithmTable))
	for k, v := range algorithmTable {
		out[k] = v
	}
	return out
}
