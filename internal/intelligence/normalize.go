package intelligence

import (
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
)

// FromDiscovery adapts a working network/SBOM finding into the unified model.
func FromDiscovery(f discovery.Finding) Finding {
	n := Finding{
		ID:          f.ID,
		Source:      "live",
		Scanner:     f.Protocol,
		Asset:       f.TargetLabel,
		Component:   f.Algorithm,
		Severity:    string(f.Severity),
		Evidence:    f.Evidence,
		Location:    f.Host,
		Algorithm:   f.Algorithm,
		KeyLength:   f.KeyLength,
		Confidence:  confidenceForScanner(f.Protocol),
		Remediation: f.Remediation,
		Status:      "open",
		CreatedAt:   f.ScannedAt,
		UpdatedAt:   f.ScannedAt,
		QuantumSafe: f.QuantumSafe,
		Usage:       usageFromType(f.FindingType, f.Protocol),
	}
	if f.BSIRef != "" {
		n.Controls = append(n.Controls, f.BSIRef)
	}
	if f.DORARef != "" {
		n.Controls = append(n.Controls, f.DORARef)
	}
	if f.EIDASRef != "" {
		n.Controls = append(n.Controls, f.EIDASRef)
	}
	n.Risk = ScoreCrypto(n)
	n.RiskScore = n.Risk.Score
	n.Severity = n.Risk.Level
	if f.Severity != "" && severityRank(string(f.Severity)) > severityRank(n.Severity) {
		n.Severity = normalizeSeverity(string(f.Severity))
	}
	return n
}

// ContentFinding is a scanner-agnostic DTO so this package does not import API handlers.
type ContentFinding struct {
	ID, FilePath, FindingType, Algorithm, Severity, Description, Remediation, Evidence, Tool, CVE, CWE string
	Line, KeyLength                                                                                     int
	QuantumSafe                                                                                         bool
	Compliance                                                                                          []string
	Demo                                                                                                bool
}

func FromContent(repo string, f ContentFinding) Finding {
	n := Finding{
		ID:          f.ID,
		Source:      "live",
		Scanner:     firstNonEmpty(f.Tool, "github-content"),
		Asset:       repo,
		Repository:  repo,
		CVE:         f.CVE,
		CWE:         f.CWE,
		Severity:    normalizeSeverity(f.Severity),
		Evidence:    f.Evidence,
		Location:    f.FilePath,
		Line:        f.Line,
		Algorithm:   f.Algorithm,
		KeyLength:   f.KeyLength,
		Confidence:  0.72,
		Controls:    f.Compliance,
		Remediation: f.Remediation,
		Status:      "open",
		QuantumSafe: f.QuantumSafe,
		Usage:       usageFromType(f.FindingType, ""),
	}
	if f.Demo {
		n.Source = "demo"
	}
	if n.KeyLength == 0 {
		n.KeyLength = parseBits(strings.ToUpper(f.Evidence + " " + f.Description + " " + f.Algorithm))
	}
	if f.CVE != "" {
		n.Scanner = firstNonEmpty(f.Tool, "sca")
		n.Confidence = 0.95
		n.KEV = kevCVEs[f.CVE]
	}
	n.Risk = ScoreCrypto(n)
	n.RiskScore = n.Risk.Score
	if severityRank(n.Risk.Level) > severityRank(n.Severity) {
		n.Severity = n.Risk.Level
	}
	return n
}

func FromDiscoveryResult(res *discovery.ScanResult) []Finding {
	if res == nil {
		return nil
	}
	out := make([]Finding, 0, len(res.Findings))
	for _, f := range res.Findings {
		out = append(out, FromDiscovery(f))
	}
	return out
}

func confidenceForScanner(protocol string) float64 {
	switch protocol {
	case "tls", "ssh":
		return 0.97
	case "http":
		return 0.8
	case "sbom":
		return 0.9
	default:
		return 0.7
	}
}

func usageFromType(findingType, protocol string) string {
	t := strings.ToUpper(findingType + " " + protocol)
	switch {
	case strings.Contains(t, "TLS") || strings.Contains(t, "CERT"):
		return "transport authentication"
	case strings.Contains(t, "SSH") || strings.Contains(t, "HOST_KEY"):
		return "remote access"
	case strings.Contains(t, "JWT") || strings.Contains(t, "SIG"):
		return "signature verification"
	case strings.Contains(t, "SECRET") || strings.Contains(t, "KEY"):
		return "credential material"
	case strings.Contains(t, "MD5") || strings.Contains(t, "SHA"):
		return "hashing"
	default:
		return "cryptographic usage"
	}
}

func firstNonEmpty(v ...string) string {
	for _, s := range v {
		if strings.TrimSpace(s) != "" {
			return s
		}
	}
	return ""
}

// Curated CISA KEV membership used by the policy engine. Only IDs that this
// repository actually emits are listed. CVE-2022-23529 is omitted (NVD rejected).
var kevCVEs = map[string]bool{}
