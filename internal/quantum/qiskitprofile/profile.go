// Package qiskitprofile implements a Qiskit-aligned classical scoring profile
// for cryptographic algorithms. It does not execute IBM Quantum hardware.
//
// Attack classes follow the same taxonomy Qiskit / IBM Quantum documentation
// uses for algorithm families:
//
//   - shor   — integer-factor / discrete-log primitives (RSA, ECDSA, DH, ECDH)
//   - grover — symmetric and hash primitives (security halved in the query model)
//   - pqc    — NIST FIPS 203/204/205 (ML-KEM, ML-DSA, SLH-DSA) and hybrids
//   - none   — unclassified or non-crypto
//
// Optional Python Qiskit Aer circuits live in sdk/python/rivicq_qiskit and are
// educational; this Go profile is the production pipeline wired into intelligence.
package qiskitprofile

import (
	"strings"
)

const Engine = "rivicq-qiskit-profile"
const BackendLocal = "local-classical"
const Method = "Qiskit-aligned attack-class scoring (Shor / Grover / NIST PQC). Not a hardware quantum measurement."

type AttackClass string

const (
	AttackShor   AttackClass = "shor"
	AttackGrover AttackClass = "grover"
	AttackPQC    AttackClass = "pqc"
	AttackNone   AttackClass = "none"
)

type AlgorithmScore struct {
	Algorithm       string      `json:"algorithm"`
	AttackClass     AttackClass `json:"attack_class"`
	QiskitFamily    string      `json:"qiskit_family"`
	QuantumSafe     bool        `json:"quantum_safe"`
	Migration       string      `json:"migration,omitempty"`
	EstimatedQubits string      `json:"estimated_logical_qubits,omitempty"`
	Note            string      `json:"note,omitempty"`
}

type PipelineResult struct {
	Engine         string           `json:"engine"`
	Backend        string           `json:"backend"`
	Method         string           `json:"method"`
	EstateScore    int              `json:"estate_score"`
	ShorVulnerable int              `json:"shor_vulnerable"`
	GroverAffected int              `json:"grover_affected"`
	PQCReady       int              `json:"pqc_ready"`
	Unclassified   int              `json:"unclassified"`
	Algorithms     []AlgorithmScore `json:"algorithms"`
	Resources      map[string]bool  `json:"resources"`
	Note           string           `json:"note"`
}

type FindingInput struct {
	Algorithm   string
	KeyLength   int
	QuantumSafe bool
	Scanner     string
}

// Classify maps an algorithm string to a Qiskit attack class.
func Classify(algorithm string, keyLength int) AlgorithmScore {
	a := strings.ToUpper(strings.TrimSpace(algorithm))
	s := AlgorithmScore{Algorithm: algorithm}
	switch {
	case a == "" || a == "UNKNOWN":
		s.AttackClass = AttackNone
		s.QiskitFamily = "unclassified"
		return s
	case strings.Contains(a, "ML-KEM") || strings.Contains(a, "KYBER") ||
		strings.Contains(a, "ML-DSA") || strings.Contains(a, "DILITHIUM") ||
		strings.Contains(a, "SLH-DSA") || strings.Contains(a, "SPHINCS") ||
		strings.Contains(a, "FALCON") || strings.Contains(a, "HYBRID"):
		s.AttackClass = AttackPQC
		s.QiskitFamily = "nist_pqc"
		s.QuantumSafe = true
		s.Migration = "Already on a NIST PQC (or hybrid) primitive"
		s.Note = "FIPS 203/204/205 class — not Shor-vulnerable"
		return s
	case strings.Contains(a, "RSA") || strings.Contains(a, "DSA") && !strings.Contains(a, "ECDSA") && !strings.Contains(a, "ML-DSA") ||
		strings.Contains(a, "DH") || strings.Contains(a, "ECDH") || strings.Contains(a, "ECDSA") ||
		strings.Contains(a, "ECDHE") || strings.Contains(a, "P-256") || strings.Contains(a, "P-384") ||
		strings.Contains(a, "SECP") || strings.Contains(a, "X25519") && strings.Contains(a, "CLASSICAL"):
		s.AttackClass = AttackShor
		s.QiskitFamily = "shor"
		s.QuantumSafe = false
		s.Migration = "Hybrid classical + ML-KEM (KEM) and/or ML-DSA (signatures); SLH-DSA where stateless hash signatures are required"
		s.EstimatedQubits = "order-of-magnitude public estimates only (not a device run)"
		s.Note = "Shor's algorithm — public-key integer-factor / discrete-log family"
		return s
	case strings.Contains(a, "AES") || strings.Contains(a, "SHA") || strings.Contains(a, "HMAC") ||
		strings.Contains(a, "CHACHA") || strings.Contains(a, "POLY1305"):
		s.AttackClass = AttackGrover
		s.QiskitFamily = "grover"
		s.QuantumSafe = keyLength >= 256 || strings.Contains(a, "SHA-384") || strings.Contains(a, "SHA-512") || strings.Contains(a, "SHA3-256") || strings.Contains(a, "SHA3-512")
		s.Migration = "Use AES-256 / SHA-384+ so Grover still leaves classical-equivalent security"
		s.Note = "Grover's algorithm reduces symmetric/hash security roughly in half (query model)"
		return s
	case strings.Contains(a, "MD5") || strings.Contains(a, "SHA-1") || strings.Contains(a, "SHA1") ||
		strings.Contains(a, "RC4") || strings.Contains(a, "3DES") || strings.Contains(a, "DES"):
		s.AttackClass = AttackGrover
		s.QiskitFamily = "broken_classical"
		s.QuantumSafe = false
		s.Migration = "Replace immediately (broken classically); do not wait for PQC"
		s.Note = "Broken or legacy even without a quantum computer"
		return s
	case strings.Contains(a, "ED25519") || strings.Contains(a, "EDDSA") || strings.Contains(a, "CURVE25519") || strings.Contains(a, "X25519"):
		s.AttackClass = AttackShor
		s.QiskitFamily = "shor"
		s.QuantumSafe = false
		s.Migration = "Plan ML-DSA / hybrid signatures; X-Wing or ML-KEM hybrid for KEM"
		s.EstimatedQubits = "order-of-magnitude public estimates only (not a device run)"
		s.Note = "Elliptic-curve / Edwards primitives are Shor-vulnerable"
		return s
	default:
		s.AttackClass = AttackNone
		s.QiskitFamily = "unclassified"
		s.QuantumSafe = false
		s.Note = "Not mapped to a Qiskit attack class"
		return s
	}
}

// ScoreFindings builds the estate-level Qiskit pipeline result.
func ScoreFindings(in []FindingInput) PipelineResult {
	seen := map[string]AlgorithmScore{}
	res := PipelineResult{
		Engine:    Engine,
		Backend:   BackendLocal,
		Method:    Method,
		Resources: map[string]bool{"tls": false, "http": false, "https": false, "ssh": false, "sbom": false, "github": false},
		Note:      "Local classical profile aligned to Qiskit's Shor/Grover/PQC taxonomy. IBM Quantum Runtime is not invoked. Optional Aer circuits: sdk/python/rivicq_qiskit.",
	}
	for _, f := range in {
		if f.Scanner != "" {
			res.Resources[strings.ToLower(f.Scanner)] = true
		}
		key := strings.ToUpper(strings.TrimSpace(f.Algorithm))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		cl := Classify(f.Algorithm, f.KeyLength)
		if f.QuantumSafe && cl.AttackClass != AttackPQC {
			// Discovery may already flag PQC libraries.
			cl.QuantumSafe = f.QuantumSafe
		}
		seen[key] = cl
		res.Algorithms = append(res.Algorithms, cl)
		switch cl.AttackClass {
		case AttackShor:
			res.ShorVulnerable++
		case AttackGrover:
			res.GroverAffected++
		case AttackPQC:
			res.PQCReady++
		default:
			res.Unclassified++
		}
	}
	// Estate score: start 100, subtract Shor heavily, Grover moderately, reward PQC.
	score := 100 - res.ShorVulnerable*12 - res.GroverAffected*4 + res.PQCReady*6
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}
	res.EstateScore = score
	return res
}
