package intelligence

import (
	"strings"
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
	cases := []struct {
		name    string
		finding Finding
		want    string
	}{
		{"ml-kem is standardised pqc", Finding{Algorithm: "ML-KEM-768"}, ClassPQCReady},
		{"ml-dsa is standardised pqc", Finding{Algorithm: "ML-DSA-65"}, ClassPQCReady},
		{"slh-dsa is standardised pqc", Finding{Algorithm: "SLH-DSA-SHA2-128s"}, ClassPQCReady},
		{"rsa-1024 is below policy", Finding{Algorithm: "RSA", KeyLength: 1024}, ClassPQCHighRisk},
		{"rsa-2048 needs migration, not broken", Finding{Algorithm: "RSA", KeyLength: 2048}, ClassPQCMigrationRequired},
		{"md5 is already broken classically", Finding{Algorithm: "MD5"}, ClassPQCLegacy},
		{"sha1 is already broken classically", Finding{Algorithm: "SHA-1"}, ClassPQCLegacy},
		{"rc4 is already broken classically", Finding{Algorithm: "RC4"}, ClassPQCLegacy},
		{"3des is already broken classically", Finding{Algorithm: "3DES"}, ClassPQCLegacy},
		{"tls 1.0 is obsolete", Finding{Evidence: "TLS 1.0 negotiated"}, ClassPQCLegacy},
		{"aes-256 resists grover", Finding{Algorithm: "AES", KeyLength: 256}, ClassPQCHybridReady},
		{"aes-128 is below grover resistance", Finding{Algorithm: "AES", KeyLength: 128}, ClassPQCHighRisk},
		{"hybrid ml-kem is hybrid_ready", Finding{Algorithm: "X25519+ML-KEM-768", Evidence: "hybrid"}, ClassPQCHybridReady},
		{"no evidence is unknown", Finding{}, ClassPQCUnknown},
		{"unrecognised is unknown", Finding{Algorithm: "SomeVendorCipher"}, ClassPQCUnknown},
	}
	for _, tc := range cases {
		if got := ClassifyPQC(tc.finding); got != tc.want {
			t.Errorf("%s: got %q want %q", tc.name, got, tc.want)
		}
	}
}

// TestPQCClassificationAlwaysSuppliesAReason guards against a class shipped
// without justification: a reviewer must be able to check every verdict.
func TestPQCClassificationAlwaysSuppliesAReason(t *testing.T) {
	for _, f := range []Finding{
		{Algorithm: "ML-KEM-768"},
		{Algorithm: "RSA", KeyLength: 2048},
		{Algorithm: "MD5"},
		{Algorithm: "AES", KeyLength: 256},
		{},
	} {
		r := ClassifyPQCWithReason(f)
		if r.Class == "" {
			t.Errorf("%+v produced an empty class", f)
		}
		if !IsValidPQCClass(r.Class) {
			t.Errorf("%+v produced %q which is not in the taxonomy", f, r.Class)
		}
		if r.Reason == "" {
			t.Errorf("%+v produced no reason", f)
		}
		if r.Action == "" {
			t.Errorf("%+v produced no recommended action", f)
		}
		if r.Version != TaxonomyVersion {
			t.Errorf("%+v reported version %q want %q", f, r.Version, TaxonomyVersion)
		}
	}
}

// TestTaxonomyIsClosedAndVersioned prevents an unversioned or ad-hoc class from
// leaking into stored data.
func TestTaxonomyIsClosedAndVersioned(t *testing.T) {
	if len(PQCClasses) != 6 {
		t.Fatalf("expected six classes, got %d: %v", len(PQCClasses), PQCClasses)
	}
	if !strings.Contains(TaxonomyVersion, "1.0.0") {
		t.Fatalf("taxonomy version must carry a semver, got %q", TaxonomyVersion)
	}
	seen := map[string]bool{}
	for _, c := range PQCClasses {
		if c == "" {
			t.Error("empty class name in taxonomy")
		}
		if seen[c] {
			t.Errorf("duplicate class %q", c)
		}
		seen[c] = true
		if !IsValidPQCClass(c) {
			t.Errorf("%q should be valid", c)
		}
		if PQCRecommendedAction(c) == "" {
			t.Errorf("%q has no recommended action", c)
		}
	}
	if IsValidPQCClass("pqc-ready") {
		t.Error("the pre-taxonomy hyphenated names must not remain valid")
	}
	if IsValidPQCClass("anything-else") {
		t.Error("unknown classes must be invalid")
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
	if rep.PQCReadiness.Classifications[ClassPQCLegacy] < 1 {
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
