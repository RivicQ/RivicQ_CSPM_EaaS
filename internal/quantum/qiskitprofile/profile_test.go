package qiskitprofile

import "testing"

func TestClassifyShorRSA(t *testing.T) {
	s := Classify("RSA-2048", 2048)
	if s.AttackClass != AttackShor {
		t.Fatalf("class=%s", s.AttackClass)
	}
	if s.QuantumSafe {
		t.Fatal("RSA must not be quantum-safe")
	}
	if s.Migration == "" {
		t.Fatal("expected NIST PQC migration guidance")
	}
}

func TestClassifyPQC(t *testing.T) {
	s := Classify("ML-KEM-768", 0)
	if s.AttackClass != AttackPQC || !s.QuantumSafe {
		t.Fatalf("%+v", s)
	}
}

func TestClassifyGroverAES(t *testing.T) {
	s := Classify("AES-256", 256)
	if s.AttackClass != AttackGrover {
		t.Fatalf("class=%s", s.AttackClass)
	}
}

func TestScoreFindingsEstate(t *testing.T) {
	r := ScoreFindings([]FindingInput{
		{Algorithm: "RSA", KeyLength: 2048, Scanner: "tls"},
		{Algorithm: "ML-KEM", Scanner: "sbom"},
		{Algorithm: "AES-256", KeyLength: 256, Scanner: "http"},
	})
	if r.Engine != Engine || r.Backend != BackendLocal {
		t.Fatalf("engine %+v", r)
	}
	if r.ShorVulnerable != 1 || r.PQCReady != 1 || r.GroverAffected != 1 {
		t.Fatalf("counts shor=%d pqc=%d grover=%d", r.ShorVulnerable, r.PQCReady, r.GroverAffected)
	}
	if r.EstateScore < 1 || r.EstateScore > 100 {
		t.Fatalf("score=%d", r.EstateScore)
	}
	if !r.Resources["tls"] || !r.Resources["http"] {
		t.Fatalf("resources %+v", r.Resources)
	}
}
