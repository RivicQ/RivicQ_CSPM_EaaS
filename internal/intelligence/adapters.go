package intelligence

import (
	"context"
	"os/exec"
	"strings"
	"time"
)

// ProbeExternalTools records whether well-known OSS scanners are installed.
// RivicQ orchestrates them when present and never requires them to scan.
func ProbeExternalTools() []ToolStatus {
	tools := []struct {
		name, bin, note string
	}{
		{"syft", "syft", "SBOM generator (Anchore). Optional."},
		{"trivy", "trivy", "Vulnerability / license scanner. Optional."},
		{"grype", "grype", "Vulnerability scanner. Optional."},
		{"gitleaks", "gitleaks", "Secrets scanner. Optional."},
		{"semgrep", "semgrep", "SAST. Optional."},
		{"osv-scanner", "osv-scanner", "OSV vulnerability matching. Optional."},
		{"checkov", "checkov", "IaC scanner. Optional."},
		{"cosign", "cosign", "Artifact signatures. Optional."},
	}
	out := make([]ToolStatus, 0, len(tools)+1)
	out = append(out, ToolStatus{
		Name:      "rivicq-discovery",
		Available: true,
		Used:      true,
		Note:      "Built-in TLS/SSH/HTTP/SBOM/CBOM scanners.",
	})
	out = append(out, ToolStatus{
		Name:      "rivicq-content",
		Available: true,
		Used:      true,
		Note:      "Built-in source/IaC/secrets/SCA overlay analyzer.",
	})
	for _, t := range tools {
		_, err := exec.LookPath(t.bin)
		out = append(out, ToolStatus{Name: t.name, Available: err == nil, Used: false, Note: t.note})
	}
	return out
}

// TrySyftJSON runs `syft dir:<root> -o cyclonedx-json` when syft is on PATH.
func TrySyftJSON(root string) ([]byte, bool) {
	if _, err := exec.LookPath("syft"); err != nil {
		return nil, false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "syft", "dir:"+root, "-o", "cyclonedx-json")
	b, err := cmd.Output()
	if err != nil {
		return nil, false
	}
	return b, true
}

func summarizeFindings(findings []Finding) ReportSummary {
	s := ReportSummary{SAST: "PASS", Secrets: "PASS", SCA: "PASS", SBOM: "GENERATED", CBOM: "GENERATED", IaC: "PASS", Container: "PASS", Compliance: "PASS"}
	crypto := 0
	for _, f := range findings {
		switch normalizeSeverity(f.Severity) {
		case "CRITICAL":
			s.Critical++
		case "HIGH":
			s.High++
		case "MEDIUM":
			s.Medium++
		default:
			s.Low++
		}
		if f.Algorithm != "" || f.Scanner == "sbom" || f.Scanner == "tls" {
			crypto++
		}
		scan := strings.ToLower(f.Scanner + " " + f.Usage)
		if strings.Contains(scan, "secret") || strings.Contains(scan, "gitleaks") {
			s.Secrets = failIf(s.Secrets, f.Severity)
		}
		if f.CVE != "" {
			s.SCA = failIf(s.SCA, f.Severity)
		}
		if strings.Contains(scan, "terraform") || strings.Contains(scan, "iac") {
			s.IaC = failIf(s.IaC, f.Severity)
		}
		if strings.Contains(scan, "docker") || strings.Contains(scan, "container") {
			s.Container = failIf(s.Container, f.Severity)
		}
	}
	s.Crypto = crypto
	if s.Critical+s.High > 0 {
		s.SAST = failIf(s.SAST, "HIGH")
	}
	return s
}

func failIf(current, sev string) string {
	if severityRank(sev) >= 3 {
		return countLabel(current, sev)
	}
	if current == "PASS" && severityRank(sev) >= 2 {
		return "WARN"
	}
	return current
}

func countLabel(current, sev string) string {
	if strings.HasPrefix(current, "FAIL") || current == "PASS" || current == "WARN" {
		return "FAIL"
	}
	return current
}
