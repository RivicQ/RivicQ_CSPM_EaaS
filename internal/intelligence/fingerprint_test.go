package intelligence

import (
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
)

func TestFingerprintIsDeterministic(t *testing.T) {
	a := Finding{
		Scanner: "tls", Algorithm: "RSA", KeyLength: 2048,
		Location: "example.com:443", Evidence: "RSA 2048",
	}
	b := a
	fa := FinalizeFinding(a)
	fb := FinalizeFinding(b)
	if fa.Fingerprint == "" || fa.Fingerprint != fb.Fingerprint {
		t.Fatalf("fingerprint mismatch %s vs %s", fa.Fingerprint, fb.Fingerprint)
	}
	if fa.ID != fb.ID || !hasPrefix(fa.ID, "rvq-") {
		t.Fatalf("id %s", fa.ID)
	}
	if fa.RuleID != "crypto.rsa" {
		t.Fatalf("rule %s", fa.RuleID)
	}
}

func TestDedupMergesRepeatedScans(t *testing.T) {
	f1 := FinalizeFinding(Finding{Scanner: "sbom", Algorithm: "MD5", Location: "a.go", Evidence: "md5"})
	f2 := FinalizeFinding(Finding{Scanner: "sbom", Algorithm: "MD5", Location: "a.go", Evidence: "md5"})
	f2.Severity = "CRITICAL"
	out := DedupFindings([]Finding{f1, f2, f1})
	if len(out) != 1 {
		t.Fatalf("got %d want 1", len(out))
	}
	if out[0].Fingerprint != f1.Fingerprint {
		t.Fatal("fingerprint lost")
	}
}

func TestClassifyPQC(t *testing.T) {
	if ClassifyPQC(Finding{Algorithm: "ML-KEM-768"}) != PQCReady {
		t.Fatal("ML-KEM should be pqc-ready")
	}
	if ClassifyPQC(Finding{Algorithm: "RSA", KeyLength: 1024}) != PQCHighRisk {
		t.Fatal("RSA-1024 should be high-risk")
	}
	if ClassifyPQC(Finding{Algorithm: "RSA", KeyLength: 2048}) != PQCMigrationReq {
		t.Fatal("RSA-2048 is classified for migration, not auto-vulnerable")
	}
	if ClassifyPQC(Finding{Algorithm: "MD5"}) != PQCHighRisk {
		t.Fatal("MD5 high-risk")
	}
	if ClassifyPQC(Finding{Algorithm: "AES", KeyLength: 256}) != PQCHybridReady {
		t.Fatal("AES-256 hybrid-ready / grover-sized")
	}
}

func TestShouldFailOn(t *testing.T) {
	rep := &Report{
		Findings: []Finding{
			{Severity: "HIGH"},
			{Severity: "LOW"},
		},
		Gate: GateResult{Failed: false, Decision: "ALLOW"},
	}
	if ShouldFailOn("none", rep) {
		t.Fatal("none")
	}
	if ShouldFailOn("critical", rep) {
		t.Fatal("no critical")
	}
	if !ShouldFailOn("high", rep) {
		t.Fatal("high should fail")
	}
	rep.Gate.Failed = true
	if !ShouldFailOn("block", rep) {
		t.Fatal("block")
	}
}

func TestBuildReportStampsFingerprints(t *testing.T) {
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
	}
	rep := BuildReport(ScanInput{Target: "demo", Discovery: res})
	if len(rep.Findings) == 0 {
		t.Fatal("findings")
	}
	if rep.Findings[0].Fingerprint == "" {
		t.Fatal("missing fingerprint")
	}
	if rep.PQCReadiness.Classifications[PQCHighRisk] < 1 {
		t.Fatalf("classifications %+v", rep.PQCReadiness.Classifications)
	}
	if len(rep.PQCReadiness.SupportedNISTPQC) != 3 {
		t.Fatal("supported nist list")
	}
	if rep.Metadata["finding_identity"] != "sha256-fingerprint" {
		t.Fatalf("metadata %+v", rep.Metadata)
	}
}

func hasPrefix(s, p string) bool {
	return len(s) >= len(p) && s[:len(p)] == p
}
