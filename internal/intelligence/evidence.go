package intelligence

import "strings"

// Evidence vocabulary for the unified finding / CBOM contract.
//
// These labels distinguish what the scanner actually observed from what it
// inferred. They are inventory metadata, not a claim of runtime proof.
const (
	PresenceLibrary    = "library_presence"
	PresenceUsage      = "confirmed_usage"
	PresenceDeclared   = "declared"
	PresenceDetected   = "detected"
	PresenceInventory  = "inventory"
	PresenceUnknown    = "unknown"

	EvidenceObservation = "observation"
	EvidenceInference   = "inference"

	MethodRegexSAST     = "regex-sast"
	MethodHandshake     = "protocol-handshake"
	MethodX509          = "x509-parse"
	MethodStringMarker  = "string-marker"
	MethodDeclared      = "declared-config"
	MethodSBOM          = "sbom-manifest"
	MethodUnknown       = "unknown"

	ExploitabilityCurrent = "current"
	ExploitabilityQuantum = "quantum_exposure"
	ExploitabilityBoth    = "current_and_quantum"
	ExploitabilityNone    = "none"
)

// InferPresenceKind maps a rule id and scanner to a presence kind when the
// detector did not set one explicitly.
func InferPresenceKind(ruleID, scanner, findingType string) string {
	blob := strings.ToLower(ruleID + " " + findingType)
	switch {
	case strings.Contains(blob, "inventory"):
		return PresenceInventory
	case strings.Contains(blob, "import"):
		return PresenceLibrary
	case strings.Contains(blob, "keysize") || strings.Contains(blob, "weak-") ||
		strings.Contains(blob, "version") || strings.Contains(blob, "insufficient"):
		return PresenceUsage
	case strings.Contains(blob, "declared") || strings.Contains(blob, "config"):
		return PresenceDeclared
	}
	switch strings.ToLower(scanner) {
	case "tls", "ssh", "http":
		return PresenceDetected
	case "sbom":
		return PresenceLibrary
	default:
		if ruleID == "" {
			return PresenceUnknown
		}
		return PresenceUsage
	}
}

// InferDetectionMethod maps a scanner name to a detection method.
func InferDetectionMethod(scanner, ruleID string) string {
	switch strings.ToLower(strings.TrimSpace(scanner)) {
	case "tls", "ssh":
		return MethodHandshake
	case "http":
		return MethodHandshake
	case "sbom":
		return MethodSBOM
	case "github-content", "rivicq-content-analyzer", "rivicq-content":
		return MethodRegexSAST
	case "firmware", "firmware-static":
		return MethodStringMarker
	case "identity", "certeng":
		return MethodX509
	}
	if strings.Contains(strings.ToLower(ruleID), "x509") || strings.Contains(strings.ToLower(ruleID), "certificate") {
		return MethodX509
	}
	if strings.Contains(strings.ToLower(ruleID), "ssh") || strings.Contains(strings.ToLower(ruleID), "tls") {
		return MethodRegexSAST
	}
	return MethodUnknown
}

// InferEvidenceKind reports whether a finding is a direct observation or an
// inference from markers/imports.
func InferEvidenceKind(presence, method string) string {
	switch presence {
	case PresenceUsage, PresenceDetected:
		if method == MethodHandshake || method == MethodX509 {
			return EvidenceObservation
		}
		return EvidenceObservation
	case PresenceLibrary, PresenceInventory, PresenceDeclared:
		return EvidenceInference
	default:
		return EvidenceInference
	}
}

// InferExploitability separates current (classical) breakability from quantum
// exposure. RSA-2048 is quantum-exposed but not currently exploitable by the
// key-size policy; MD5 is currently broken.
func InferExploitability(pqcClass string, quantumSafe bool) string {
	switch pqcClass {
	case ClassPQCLegacy:
		return ExploitabilityCurrent
	case ClassPQCHighRisk:
		return ExploitabilityCurrent
	case ClassPQCMigrationRequired:
		return ExploitabilityQuantum
	case ClassPQCHybridReady, ClassPQCReady:
		return ExploitabilityNone
	default:
		if quantumSafe {
			return ExploitabilityNone
		}
		return ExploitabilityQuantum
	}
}

// DefaultLimitations is the honesty note stamped on regex/string detections.
func DefaultLimitations(method, presence string) string {
	switch {
	case presence == PresenceLibrary:
		return "Library or import presence is not proof the algorithm is exercised at runtime."
	case presence == PresenceInventory:
		return "Inventory observation only. This is not a policy violation and is not currently exploitable by itself."
	case presence == PresenceDeclared:
		return "Declared in configuration or a manifest. Not confirmed by a handshake or parsed artifact."
	case method == MethodRegexSAST:
		return "Regex/SAST match on source text. Does not prove the call executes in production."
	case method == MethodStringMarker:
		return "Static string/section evidence. No firmware execution, disassembly, or key extraction was performed."
	case method == MethodHandshake:
		return "Observed from a network handshake or configured protocol version. Limited to the scanned endpoint."
	case method == MethodX509:
		return "Parsed from X.509 metadata (subject, issuer, public-key and signature algorithms). Private keys are never extracted."
	default:
		return "Detection is evidence-based and bounded by the scanner that produced it."
	}
}
