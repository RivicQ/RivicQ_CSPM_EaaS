package intelligence

import (
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
)

func TestEvaluatePolicyBlocksWeakRSA(t *testing.T) {
	f := Finding{
		ID:        "t1",
		Scanner:   "github-content",
		Severity:  "high",
		Location:  "src/auth.go",
		Line:      10,
		Evidence:  "rsa.GenerateKey(rand.Reader, 1024)",
		Algorithm: "RSA",
		KeyLength: 1024,
		Usage:     "signature verification",
	}
	f.Risk = ScoreCrypto(f)
	f.RiskScore = f.Risk.Score
	r := Evaluate([]Finding{f}, DefaultPolicy())
	if r.Decision != "BLOCK" {
		t.Fatalf("decision=%s want BLOCK, reasons=%v", r.Decision, r.Reasons)
	}
	if f.Risk.Score < 40 {
		t.Fatalf("risk too low: %+v", f.Risk)
	}
}

func TestEvaluatePolicyAllowsRSA2048WithoutBlock(t *testing.T) {
	f := Finding{
		ID:        "t2",
		Scanner:   "tls",
		Location:  "src/tls.go",
		Evidence:  "tls.VersionTLS12",
		Algorithm: "RSA",
		KeyLength: 2048,
		Usage:     "tls",
	}
	f.Risk = ScoreCrypto(f)
	r := Evaluate([]Finding{f}, DefaultPolicy())
	if r.Decision == "BLOCK" {
		t.Fatalf("RSA-2048 must not BLOCK: %v", r.Reasons)
	}
}

func TestEvaluateKEVBlocks(t *testing.T) {
	f := Finding{
		ID:       "t3",
		Scanner:  "sca",
		Severity: "critical",
		CVE:      "CVE-2021-44228",
		KEV:      true,
		Location: "go.mod",
	}
	r := Evaluate([]Finding{f}, DefaultPolicy())
	if r.Decision != "BLOCK" {
		t.Fatalf("KEV should BLOCK, got %s %v", r.Decision, r.Reasons)
	}
}

func TestExcludedPathsSkipDemoFixtures(t *testing.T) {
	f := Finding{
		ID:       "t4",
		Scanner:  "gitleaks",
		Severity: "critical",
		Location: "internal/api/shared/testdata/demo-repo/config.env",
		Evidence: "AWS_SECRET_ACCESS_KEY=",
		Usage:    "credential material",
	}
	r := Evaluate([]Finding{f}, DefaultPolicy())
	if r.Decision != "ALLOW" {
		t.Fatalf("testdata must be excluded, got %s %v", r.Decision, r.Reasons)
	}
}

func TestFromDiscoveryTLS(t *testing.T) {
	res := &discovery.ScanResult{
		Findings: []discovery.Finding{{
			FindingType: "weak_tls_version",
			Protocol:    "tls",
			Severity:    discovery.SeverityHigh,
			Title:       "TLS 1.0",
			Evidence:    "tls1.0",
			Host:        "example.com:443",
			Algorithm:   "TLS 1.0",
		}},
	}
	fs := FromDiscoveryResult(res)
	if len(fs) != 1 {
		t.Fatalf("got %d findings", len(fs))
	}
	if fs[0].Scanner != "tls" {
		t.Fatalf("scanner=%s", fs[0].Scanner)
	}
	r := Evaluate(fs, DefaultPolicy())
	if r.Decision != "BLOCK" {
		t.Fatalf("TLS 1.0 should BLOCK, got %s %v", r.Decision, r.Reasons)
	}
}

func TestCycloneDXCryptoBOM(t *testing.T) {
	comps := []discovery.CBOMComponent{{
		Algorithm: "RSA", KeySize: 2048, Library: "crypto/rsa", Location: "tls",
	}}
	doc := CycloneDXBOM("demo", comps, nil)
	if doc["bomFormat"] != "CycloneDX" || doc["specVersion"] != "1.6" {
		t.Fatalf("header %+v", doc)
	}
	list, _ := doc["components"].([]map[string]any)
	if len(list) != 1 || list[0]["type"] != "cryptographic-asset" {
		t.Fatalf("components %+v", doc["components"])
	}
}

func TestBuildReportGate(t *testing.T) {
	res := &discovery.ScanResult{
		Findings: []discovery.Finding{{
			FindingType: "md5_hash",
			Protocol:    "sbom",
			Severity:    discovery.SeverityHigh,
			Title:       "MD5",
			Evidence:    "md5",
			Host:        "a.go:1",
			Algorithm:   "MD5",
		}},
		Components: []discovery.CBOMComponent{{Algorithm: "MD5"}},
	}
	rep := BuildReport(ScanInput{Target: "demo", Discovery: res})
	if !rep.Gate.Failed {
		t.Fatal("MD5 should fail policy")
	}
	if len(rep.Findings) == 0 {
		t.Fatal("expected findings")
	}
	if rep.Qiskit == nil {
		t.Fatal("expected Qiskit pipeline result")
	}
	if rep.Qiskit.Engine == "" || rep.Qiskit.Backend != "local-classical" {
		t.Fatalf("qiskit %+v", rep.Qiskit)
	}
	if rep.Findings[0].Labels["qiskit_attack_class"] == "" {
		t.Fatal("expected qiskit attack class label")
	}
	if rep.AuditScore == nil || rep.AuditScore.Note == "" {
		t.Fatal("expected audit score with honesty note")
	}
	if rep.AuditScore.Overall < 0 || rep.AuditScore.Overall > 100 {
		t.Fatalf("audit overall=%d", rep.AuditScore.Overall)
	}
	if rep.ClientArchitecture == nil || len(rep.ClientArchitecture.Phases) != 3 {
		t.Fatal("expected discover/mitigate/report")
	}
	if rep.PQCReadiness == nil || rep.PQCReadiness.Layers["cbom"] == 0 {
		t.Fatal("expected PQC readiness layers")
	}
}
