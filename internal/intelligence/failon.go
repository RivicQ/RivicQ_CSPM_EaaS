package intelligence

import (
	"fmt"
	"strings"
)

// FailOnExit codes for the CLI (and GitHub Action). Deterministic for CI.
const (
	ExitPass   = 0
	ExitFailOn = 1
	ExitUsage  = 2
)

// KnownFailOnValues is the closed set accepted by --fail-on.
var KnownFailOnValues = []string{"BLOCK", "WARN", "NONE", "critical", "high", "medium"}

// KnownFormatValues is the closed set accepted by --format.
var KnownFormatValues = []string{"table", "json"}

// ParseFailOn validates a --fail-on flag. Unknown values are a usage error;
// they must not silently fall back to BLOCK (that would let a typo pass CI).
func ParseFailOn(raw string) (string, error) {
	v := strings.TrimSpace(raw)
	if v == "" {
		return "block", nil
	}
	switch strings.ToLower(v) {
	case "block", "warn", "none", "critical", "high", "medium":
		return strings.ToLower(v), nil
	default:
		return "", fmt.Errorf("invalid --fail-on %q (want BLOCK|WARN|NONE|critical|high|medium)", raw)
	}
}

// ParseFormat validates a --format flag.
func ParseFormat(raw string) (string, error) {
	v := strings.ToLower(strings.TrimSpace(raw))
	if v == "" {
		return "table", nil
	}
	switch v {
	case "table", "json":
		return v, nil
	default:
		return "", fmt.Errorf("invalid --format %q (want table|json)", raw)
	}
}

// ShouldFailOn reports whether a report should fail CI for the given threshold.
//
//	none                — never fail
//	critical            — fail if any CRITICAL finding remains
//	high                — fail on CRITICAL or HIGH
//	medium              — fail on CRITICAL, HIGH, or MEDIUM
//	warn                — fail on policy WARN or BLOCK
//	block (default)     — fail on policy BLOCK
//
// Callers must pass a value already accepted by ParseFailOn. Unknown values
// never fail the gate — ParseFailOn is the usage-error path.
func ShouldFailOn(failOn string, rep *Report) bool {
	if rep == nil {
		return false
	}
	normalized, err := ParseFailOn(failOn)
	if err != nil {
		return false
	}
	switch normalized {
	case "block":
		return rep.Gate.Failed
	case "none":
		return false
	case "warn":
		return rep.Gate.Failed || len(rep.Gate.Warnings) > 0
	case "critical":
		return countSeverity(rep, "CRITICAL") > 0
	case "high":
		return countSeverity(rep, "CRITICAL")+countSeverity(rep, "HIGH") > 0
	case "medium":
		return countSeverity(rep, "CRITICAL")+countSeverity(rep, "HIGH")+countSeverity(rep, "MEDIUM") > 0
	default:
		// ParseFailOn rejects anything else; this branch is a closed-set guard.
		return false
	}
}

func countSeverity(rep *Report, level string) int {
	n := 0
	want := normalizeSeverity(level)
	for _, f := range rep.Findings {
		if f.PresenceKind == PresenceInventory {
			continue
		}
		if normalizeSeverity(f.Severity) == want {
			n++
		}
	}
	return n
}
