package nistpqc

import (
	"context"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/quantum"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/provider"
)

func TestClassify_Standardized(t *testing.T) {
	e := New()
	cases := map[string]AlgorithmClass{
		"ML-KEM-512":        {Name: "ML-KEM-512", NISTStandard: "FIPS-203", Category: CategoryKEM, SecurityLevel: 1, Status: StatusStandardized, QuantumSafe: true},
		"ML-KEM-768":        {Name: "ML-KEM-768", NISTStandard: "FIPS-203", Category: CategoryKEM, SecurityLevel: 3, Status: StatusStandardized, QuantumSafe: true},
		"ML-KEM-1024":       {Name: "ML-KEM-1024", NISTStandard: "FIPS-203", Category: CategoryKEM, SecurityLevel: 5, Status: StatusStandardized, QuantumSafe: true},
		"ML-DSA-44":         {Name: "ML-DSA-44", NISTStandard: "FIPS-204", Category: CategorySignature, SecurityLevel: 2, Status: StatusStandardized, QuantumSafe: true},
		"ML-DSA-65":         {Name: "ML-DSA-65", NISTStandard: "FIPS-204", Category: CategorySignature, SecurityLevel: 3, Status: StatusStandardized, QuantumSafe: true},
		"ML-DSA-87":         {Name: "ML-DSA-87", NISTStandard: "FIPS-204", Category: CategorySignature, SecurityLevel: 5, Status: StatusStandardized, QuantumSafe: true},
		"SLH-DSA-SHA2-128s": {Name: "SLH-DSA-SHA2-128s", NISTStandard: "FIPS-205", Category: CategorySignature, SecurityLevel: 1, Status: StatusStandardized, QuantumSafe: true},
	}
	for name, want := range cases {
		got, err := e.Classify(name, 0)
		if err != nil {
			t.Fatalf("Classify(%q): %v", name, err)
		}
		if got != want {
			t.Errorf("Classify(%q) = %+v, want %+v", name, got, want)
		}
	}
}

func TestClassify_ClassicalVulnerable(t *testing.T) {
	e := New()
	for _, name := range []string{"RSA-2048", "ECDSA-P256", "ECDH-P384", "Ed25519", "DSA-2048", "DH-2048"} {
		got, err := e.Classify(name, 0)
		if err != nil {
			t.Fatalf("Classify(%q): %v", name, err)
		}
		if got.QuantumSafe {
			t.Errorf("Classify(%q) must not be quantum-safe", name)
		}
	}
}

func TestClassify_SymmetricSafe(t *testing.T) {
	e := New()
	for _, name := range []string{"AES-128", "AES-192", "AES-256", "AES-256-GCM", "ChaCha20-Poly1305", "SHA-256", "SHA-3-512", "BLAKE3"} {
		if !e.QuantumSafe(name) {
			t.Errorf("QuantumSafe(%q) should be true", name)
		}
	}
}

func TestClassify_Normalization(t *testing.T) {
	e := New()
	for _, name := range []string{"ml-kem-768", "ML-KEM-768 ", " Ml-Kem-768"} {
		got, err := e.Classify(name, 0)
		if err != nil {
			t.Fatalf("Classify(%q): %v", name, err)
		}
		if got.Name != "ML-KEM-768" {
			t.Errorf("Classify(%q) = %q, want ML-KEM-768", name, got.Name)
		}
	}
}

func TestClassify_KeySizeFallback(t *testing.T) {
	e := New()
	got, err := e.Classify("AES", 256)
	if err != nil {
		t.Fatalf("Classify(AES, 256): %v", err)
	}
	if got.Name != "AES-256" {
		t.Errorf("expected AES-256 via size fallback, got %q", got.Name)
	}
}

func TestClassify_Unknown(t *testing.T) {
	e := New()
	if _, err := e.Classify("TOTALLY-MADE-UP", 0); err == nil {
		t.Fatal("expected error for unknown algorithm")
	}
	if e.QuantumSafe("TOTALLY-MADE-UP") {
		t.Error("unknown algorithms must fail closed (not quantum-safe)")
	}
}

func TestQuantumSafe_FailClosed(t *testing.T) {
	e := New()
	if e.QuantumSafe("") {
		t.Error("empty algorithm must not be quantum-safe")
	}
}

func TestRecommended_OnlyStandardizedNIST(t *testing.T) {
	e := New()
	recs := e.Recommended()
	if len(recs) < 6 {
		t.Fatalf("expected at least the 6 FIPS 203/204 algs, got %d", len(recs))
	}
	for _, c := range recs {
		if c.NISTStandard == "" || c.Status != StatusStandardized || !c.QuantumSafe {
			t.Errorf("Recommended() contains non-standardized entry: %+v", c)
		}
	}
}

func TestMigrationTarget(t *testing.T) {
	e := New()
	cases := map[string]string{
		"RSA-2048":   "ML-KEM-768 + ML-DSA-65",
		"ECDSA-P256": "ML-DSA-65",
		"ECDH-P256":  "ML-KEM-768",
		"Ed25519":    "ML-DSA-65",
		"AES-128":    "AES-256-GCM",
	}
	for from, want := range cases {
		if got := e.MigrationTarget(from); got != want {
			t.Errorf("MigrationTarget(%q) = %q, want %q", from, got, want)
		}
	}
	if e.MigrationTarget("ML-KEM-768") != "" {
		t.Error("quantum-safe algorithms have no migration target")
	}
	if e.MigrationTarget("NOPE") != "" {
		t.Error("unknown algorithms have no migration target")
	}
}

func TestTable_Complete(t *testing.T) {
	e := New()
	table := e.Table()
	if len(table) < 20 {
		t.Fatalf("expected a comprehensive table, got %d entries", len(table))
	}
}

func TestProvider_Info(t *testing.T) {
	p := NewProvider()
	info := p.Info()
	if info.Name != "nist-pqc" {
		t.Errorf("expected name nist-pqc, got %q", info.Name)
	}
	if len(info.Capabilities) == 0 {
		t.Error("provider must declare capabilities")
	}
}

func TestProvider_Status(t *testing.T) {
	p := NewProvider()
	st := p.Status(context.Background())
	if st.State != "available" {
		t.Errorf("expected available state, got %q", st.State)
	}
	if st.Metrics["algorithms_tracked"] <= 0 {
		t.Errorf("expected algorithms_tracked metric, got %v", st.Metrics)
	}
}

func TestProvider_Validate(t *testing.T) {
	p := NewProvider()
	ctx := context.Background()

	ok, err := p.Validate(ctx, "ML-KEM-768", 0)
	if err != nil {
		t.Fatalf("Validate(ML-KEM-768): %v", err)
	}
	if !ok.QuantumSafe {
		t.Error("ML-KEM-768 must validate as quantum-safe")
	}

	vuln, err := p.Validate(ctx, "RSA-2048", 0)
	if err != nil {
		t.Fatalf("Validate(RSA-2048): %v", err)
	}
	if vuln.QuantumSafe {
		t.Error("RSA-2048 must validate as vulnerable")
	}

	if _, err := p.Validate(ctx, "UNKNOWN-ALG", 0); err == nil {
		t.Error("expected error for unknown algorithm")
	}
}

func TestProvider_Attest(t *testing.T) {
	p := NewProvider()
	result, err := p.Attest(context.Background(), quantum.AttestationRequest{
		AssetID:   "asset-1",
		Algorithm: "RSA-2048",
		KeySize:   2048,
	})
	if err != nil {
		t.Fatalf("Attest: %v", err)
	}
	if result.QuantumSafe {
		t.Error("RSA-2048 attestation must not be quantum-safe")
	}
	if result.ProviderName != "nist-pqc" {
		t.Errorf("expected provider nist-pqc, got %q", result.ProviderName)
	}
	if result.AttestationID == "" {
		t.Error("attestation ID must not be empty")
	}
}

func TestProvider_Assess(t *testing.T) {
	p := NewProvider()
	report, err := p.Assess(context.Background(), quantum.CryptoAsset{
		ID:        "asset-1",
		Name:      "API Gateway TLS key",
		Algorithm: "RSA-2048",
	})
	if err != nil {
		t.Fatalf("Assess: %v", err)
	}
	if report.AssetID != "asset-1" {
		t.Errorf("expected asset-1, got %q", report.AssetID)
	}
}

func TestProvider_MigrationPath(t *testing.T) {
	p := NewProvider()
	path, err := p.MigrationPath(context.Background(), "RSA-2048")
	if err != nil {
		t.Fatalf("MigrationPath: %v", err)
	}
	if len(path) == 0 {
		t.Fatal("expected a migration path for RSA-2048")
	}
	if !path[0].QuantumSafe || !path[0].Recommended {
		t.Errorf("migration target should be recommended and quantum-safe: %+v", path[0])
	}

	empty, err := p.MigrationPath(context.Background(), "ML-KEM-768")
	if err != nil {
		t.Fatalf("MigrationPath(quantum-safe): %v", err)
	}
	if len(empty) != 0 {
		t.Errorf("expected empty path for quantum-safe algorithm, got %v", empty)
	}
}

func TestProvider_ImplementsInterface(t *testing.T) {
	var _ provider.QuantumProvider = (*Provider)(nil)
}

func TestProvider_Close(t *testing.T) {
	p := NewProvider()
	if err := p.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

func TestProvider_EngineExposed(t *testing.T) {
	p := NewProvider()
	if p.Engine() == nil {
		t.Fatal("Engine must not be nil")
	}
}
