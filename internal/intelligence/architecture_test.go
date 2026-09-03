package intelligence

import (
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/qiskitprofile"
)

func TestPQCMitigationsMapECDSA(t *testing.T) {
	ms := pqcMitigations([]Finding{{Algorithm: "ECDSA P-256", KeyLength: 256}})
	if len(ms) == 0 {
		t.Fatal("expected mitigation")
	}
	if ms[0].Standard != "FIPS 204" {
		t.Fatalf("ECDSA should map to ML-DSA / FIPS 204, got %+v", ms[0])
	}
}

func TestClientArchitectureWebsite(t *testing.T) {
	res := &discovery.ScanResult{
		Targets: []discovery.Target{{Protocol: "tls"}, {Protocol: "http", Scheme: "https"}},
		Findings: []discovery.Finding{{
			Algorithm: "ECDSA P-256", KeyLength: 256, Protocol: "tls", Title: "cert",
		}},
	}
	rep := BuildReport(ScanInput{Target: "https://example.com", ScanType: "website", Discovery: res})
	if rep.ClientArchitecture.TargetClass != "website" {
		t.Fatalf("class=%s", rep.ClientArchitecture.TargetClass)
	}
	if !rep.ClientArchitecture.Resources["https"] {
		t.Fatalf("resources %+v", rep.ClientArchitecture.Resources)
	}
	if len(rep.PQCReadiness.Compliance) < 3 {
		t.Fatal("expected DORA/NIS2/BSI maps")
	}
	if rep.PQCReadiness.PackAvailable {
		t.Fatal("OSS must not claim DORA pack")
	}
	if qiskitprofile.Classify("ECDSA P-256", 256).AttackClass != qiskitprofile.AttackShor {
		t.Fatal("ECDSA is Shor-class")
	}
}
