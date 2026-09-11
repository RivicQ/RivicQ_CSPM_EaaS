package intelligence

import "strings"

// FailOnExit codes for the CLI (and GitHub Action). Deterministic for CI.
const (
	ExitPass   = 0
	ExitFailOn = 1
	ExitUsage  = 2
)

// ShouldFailOn reports whether a report should fail CI for the given threshold.
//
//	none                — never fail
//	critical            — fail if any CRITICAL finding remains
//	high                — fail on CRITICAL or HIGH
//	medium              — fail on CRITICAL, HIGH, or MEDIUM
//	warn                — fail on policy WARN or BLOCK
//	block (default)     — fail on policy BLOCK
func ShouldFailOn(failOn string, rep *Report) bool {
	if rep == nil {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(failOn)) {
	case "", "block":
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
		return rep.Gate.Failed
	}
}

func countSeverity(rep *Report, level string) int {
	n := 0
	want := normalizeSeverity(level)
	for _, f := range rep.Findings {
		if normalizeSeverity(f.Severity) == want {
			n++
		}
	}
	return n
}
