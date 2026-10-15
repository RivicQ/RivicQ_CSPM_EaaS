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

// ParseFailOn validates the CLI --fail-on value. Unknown values must not
// silently behave as BLOCK (a typo in CI would otherwise pass a clean tree).
func ParseFailOn(failOn string) (string, error) {
	v := strings.ToLower(strings.TrimSpace(failOn))
	switch v {
	case "":
		return "block", nil
	case "block", "none", "warn", "critical", "high", "medium":
		return v, nil
	default:
		return "", fmt.Errorf("invalid --fail-on %q (want BLOCK|WARN|NONE|critical|high|medium)", failOn)
	}
}

// ParseOutputFormat validates --format. Unknown values must not silently print a table.
func ParseOutputFormat(format string) (string, error) {
	v := strings.ToLower(strings.TrimSpace(format))
	switch v {
	case "", "table":
		return "table", nil
	case "json":
		return "json", nil
	default:
		return "", fmt.Errorf("invalid --format %q (want table|json)", format)
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
		return false
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
