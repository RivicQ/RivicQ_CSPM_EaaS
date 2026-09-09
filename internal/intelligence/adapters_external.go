package intelligence

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const maxExternalFindings = 40

// RunOptionalTools invokes PATH-installed OSS scanners when present.
// Missing binaries are skipped. Secrets from gitleaks are never copied into findings.
func RunOptionalTools(root string) ([]Finding, []string) {
	if strings.TrimSpace(os.Getenv("RIVICQ_EXTERNAL_TOOLS")) == "0" {
		return nil, nil
	}
	root = strings.TrimSpace(root)
	if root == "" {
		return nil, nil
	}
	st, err := os.Stat(root)
	if err != nil || !st.IsDir() {
		return nil, nil
	}

	var findings []Finding
	var used []string
	if extra, ok := runSyft(root); ok {
		findings = append(findings, extra...)
		used = append(used, "syft")
	}
	if extra, ok := runTrivy(root); ok {
		findings = append(findings, extra...)
		used = append(used, "trivy")
	}
	if extra, ok := runGrype(root); ok {
		findings = append(findings, extra...)
		used = append(used, "grype")
	}
	if extra, ok := runGitleaks(root); ok {
		findings = append(findings, extra...)
		used = append(used, "gitleaks")
	}
	if extra, ok := runOSV(root); ok {
		findings = append(findings, extra...)
		used = append(used, "osv-scanner")
	}
	return findings, used
}

func runSyft(root string) ([]Finding, bool) {
	b, ok := TrySyftJSON(root)
	if !ok || len(b) == 0 {
		return nil, false
	}
	var doc struct {
		Components []struct {
			Name    string `json:"name"`
			Version string `json:"version"`
			PURL    string `json:"purl"`
			Type    string `json:"type"`
		} `json:"components"`
	}
	if err := json.Unmarshal(b, &doc); err != nil {
		return nil, false
	}
	out := make([]Finding, 0)
	for _, c := range doc.Components {
		blob := strings.ToLower(c.Name + " " + c.PURL + " " + c.Type)
		if !cryptoComponent(blob) {
			continue
		}
		out = appendExternal(out, Finding{
			ID:          fmt.Sprintf("syft-%d", len(out)+1),
			Source:      "live",
			Scanner:     "syft",
			Component:   c.Name,
			Severity:    "LOW",
			Evidence:    strings.TrimSpace(c.PURL + " " + c.Version),
			Location:    root,
			Remediation: "Review this SBOM cryptographic component for PQC readiness.",
			Status:      "open",
			Confidence:  0.7,
			Labels:      map[string]string{"tool": "syft", "version": c.Version},
		})
	}
	return out, true
}

func runTrivy(root string) ([]Finding, bool) {
	if _, err := exec.LookPath("trivy"); err != nil {
		return nil, false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
	defer cancel()
	args := []string{"fs", "--scanners", "vuln", "--format", "json", "--quiet", "--timeout", "30s"}
	for _, d := range defaultExcludes {
		args = append(args, "--skip-dirs", d)
	}
	args = append(args, root)
	b, ok := runToolJSON(ctx, "trivy", args...)
	if !ok {
		return nil, false
	}
	var doc struct {
		Results []struct {
			Target          string `json:"Target"`
			Vulnerabilities []struct {
				VulnerabilityID  string `json:"VulnerabilityID"`
				PkgName          string `json:"PkgName"`
				InstalledVersion string `json:"InstalledVersion"`
				Severity         string `json:"Severity"`
				Title            string `json:"Title"`
			} `json:"Vulnerabilities"`
		} `json:"Results"`
	}
	if err := json.Unmarshal(b, &doc); err != nil {
		return nil, false
	}
	out := make([]Finding, 0)
	for _, res := range doc.Results {
		for _, v := range res.Vulnerabilities {
			if v.VulnerabilityID == "" {
				continue
			}
			out = appendExternal(out, Finding{
				ID:          fmt.Sprintf("trivy-%d", len(out)+1),
				Source:      "live",
				Scanner:     "trivy",
				Component:   v.PkgName,
				CVE:         v.VulnerabilityID,
				Severity:    normalizeSeverity(v.Severity),
				Evidence:    strings.TrimSpace(v.Title + " " + v.PkgName + "@" + v.InstalledVersion),
				Location:    res.Target,
				Remediation: "Upgrade or replace the affected package. Trivy finding, not a RivicQ CVE invention.",
				Status:      "open",
				Confidence:  0.85,
				Labels:      map[string]string{"tool": "trivy"},
			})
		}
	}
	return out, true
}

func runGrype(root string) ([]Finding, bool) {
	if _, err := exec.LookPath("grype"); err != nil {
		return nil, false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
	defer cancel()
	b, ok := runToolJSON(ctx, "grype", "dir:"+root, "-o", "json")
	if !ok {
		return nil, false
	}
	var doc struct {
		Matches []struct {
			Vulnerability struct {
				ID       string `json:"id"`
				Severity string `json:"severity"`
			} `json:"vulnerability"`
			Artifact struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			} `json:"artifact"`
		} `json:"matches"`
	}
	if err := json.Unmarshal(b, &doc); err != nil {
		return nil, false
	}
	out := make([]Finding, 0)
	for _, m := range doc.Matches {
		if m.Vulnerability.ID == "" {
			continue
		}
		out = appendExternal(out, Finding{
			ID:          fmt.Sprintf("grype-%d", len(out)+1),
			Source:      "live",
			Scanner:     "grype",
			Component:   m.Artifact.Name,
			CVE:         m.Vulnerability.ID,
			Severity:    normalizeSeverity(m.Vulnerability.Severity),
			Evidence:    strings.TrimSpace(m.Artifact.Name + "@" + m.Artifact.Version),
			Location:    root,
			Remediation: "Upgrade or replace the affected package. Grype finding, not a RivicQ CVE invention.",
			Status:      "open",
			Confidence:  0.85,
			Labels:      map[string]string{"tool": "grype"},
		})
	}
	return out, true
}

func runGitleaks(root string) ([]Finding, bool) {
	if _, err := exec.LookPath("gitleaks"); err != nil {
		return nil, false
	}
	tmp, err := os.CreateTemp("", "rivicq-gitleaks-*.json")
	if err != nil {
		return nil, false
	}
	path := tmp.Name()
	_ = tmp.Close()
	defer func() { _ = os.Remove(path) }()

	ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "gitleaks", "detect", "--source", root, "--no-git",
		"--report-format", "json", "--report-path", path, "--exit-code", "0")
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return nil, false
		}
		if _, ok := err.(*exec.ExitError); !ok {
			return nil, false
		}
	}
	b, err := os.ReadFile(path)
	if err != nil || len(b) == 0 {
		return nil, true
	}
	var leaks []struct {
		RuleID      string `json:"RuleID"`
		Description string `json:"Description"`
		File        string `json:"File"`
		StartLine   int    `json:"StartLine"`
	}
	if err := json.Unmarshal(b, &leaks); err != nil {
		return nil, false
	}
	out := make([]Finding, 0, len(leaks))
	for _, leak := range leaks {
		out = appendExternal(out, Finding{
			ID:          fmt.Sprintf("gitleaks-%d", len(out)+1),
			Source:      "live",
			Scanner:     "gitleaks",
			Severity:    "HIGH",
			Evidence:    leak.RuleID + " " + leak.Description,
			Location:    leak.File,
			Line:        leak.StartLine,
			Remediation: "Rotate the credential and remove it from source. Secret values are not stored in this finding.",
			Status:      "open",
			Confidence:  0.8,
			Labels:      map[string]string{"tool": "gitleaks", "rule": leak.RuleID},
		})
	}
	return out, true
}

func runOSV(root string) ([]Finding, bool) {
	if _, err := exec.LookPath("osv-scanner"); err != nil {
		return nil, false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
	defer cancel()
	b, ok := runToolJSON(ctx, "osv-scanner", "--json", root)
	if !ok {
		return nil, false
	}
	var doc struct {
		Results []struct {
			Packages []struct {
				Package struct {
					Name    string `json:"name"`
					Version string `json:"version"`
				} `json:"package"`
				Vulnerabilities []struct {
					ID      string `json:"id"`
					Summary string `json:"summary"`
				} `json:"vulnerabilities"`
			} `json:"packages"`
		} `json:"results"`
	}
	if err := json.Unmarshal(b, &doc); err != nil {
		return nil, false
	}
	out := make([]Finding, 0)
	for _, res := range doc.Results {
		for _, pkg := range res.Packages {
			for _, v := range pkg.Vulnerabilities {
				if v.ID == "" {
					continue
				}
				out = appendExternal(out, Finding{
					ID:          fmt.Sprintf("osv-%d", len(out)+1),
					Source:      "live",
					Scanner:     "osv-scanner",
					Component:   pkg.Package.Name,
					CVE:         v.ID,
					Severity:    "MEDIUM",
					Evidence:    strings.TrimSpace(v.Summary + " " + pkg.Package.Name + "@" + pkg.Package.Version),
					Location:    root,
					Remediation: "Review OSV advisory and upgrade the package. Not a RivicQ-invented CVE.",
					Status:      "open",
					Confidence:  0.8,
					Labels:      map[string]string{"tool": "osv-scanner"},
				})
			}
		}
	}
	return out, true
}

func runToolJSON(ctx context.Context, name string, args ...string) ([]byte, bool) {
	cmd := exec.CommandContext(ctx, name, args...)
	b, err := cmd.Output()
	if ctx.Err() != nil {
		return nil, false
	}
	if len(b) == 0 {
		return nil, false
	}
	if err != nil {
		if _, ok := err.(*exec.ExitError); !ok {
			return nil, false
		}
	}
	return b, true
}

func appendExternal(out []Finding, f Finding) []Finding {
	if excludedPath(f.Location) {
		return out
	}
	if len(out) >= maxExternalFindings {
		return out
	}
	return append(out, f)
}

func cryptoComponent(blob string) bool {
	keys := []string{"rsa", "ecdsa", "ed25519", "openssl", "libcrypto", "boringssl", "wolfssl", "mbedtls", "libsodium", "nacl", "x509", "pkcs", "ml-kem", "kyber", "dilithium", "tls", "gnutls"}
	for _, k := range keys {
		if strings.Contains(blob, k) {
			return true
		}
	}
	return false
}

func LocalRootIfDir(target string) string {
	target = strings.TrimSpace(target)
	if target == "" {
		return ""
	}
	st, err := os.Stat(target)
	if err != nil || !st.IsDir() {
		if abs, aerr := filepath.Abs(target); aerr == nil {
			st, err = os.Stat(abs)
			if err == nil && st.IsDir() {
				return abs
			}
		}
		return ""
	}
	return target
}
