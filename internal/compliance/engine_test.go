package compliance_test

import (
	"context"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/compliance"
)

func TestOSSComplianceEngine_Frameworks(t *testing.T) {
	engine := compliance.NewOSSComplianceEngine()
	frameworks := engine.Frameworks()
	expected := map[string]bool{
		"DORA": false, "NIS2": false, "NIST-CSF": false, "CRA": false, "ENISA": false,
	}
	for _, f := range frameworks {
		if _, ok := expected[f]; !ok {
			t.Errorf("unexpected framework %q", f)
		}
		expected[f] = true
	}
	for name, seen := range expected {
		if !seen {
			t.Errorf("framework %q missing from Frameworks()", name)
		}
	}
}

// TestOSSComplianceEngine_RSA2048_ViolatesDORA_and_NIS2 verifies that a quantum-vulnerable
// RSA-2048 asset is correctly mapped to DORA Art.9 and NIS2 Art.21.
func TestOSSComplianceEngine_RSA2048_ViolatesDORA_and_NIS2(t *testing.T) {
	engine := compliance.NewOSSComplianceEngine()
	ctx := context.Background()

	asset := &compliance.CryptoAsset{
		ID:        "asset-rsa2048",
		Name:      "Production TLS Certificate",
		Algorithm: "RSA-2048",
		KeySize:   2048,
		Usage:     "TLS",
	}

	report, err := engine.Evaluate(ctx, asset)
	if err != nil {
		t.Fatalf("Evaluate returned unexpected error: %v", err)
	}
	if report == nil {
		t.Fatal("Evaluate returned nil report")
	}
	if report.Compliant {
		t.Error("RSA-2048 asset should be non-compliant")
	}
	if len(report.Violations) == 0 {
		t.Fatal("expected compliance violations for RSA-2048, got none")
	}

	foundDORA, foundNIS2 := false, false
	for _, v := range report.Violations {
		if v.Framework == "DORA" && v.Article == "Art.9" {
			foundDORA = true
		}
		if v.Framework == "NIS2" && v.Article == "Art.21" {
			foundNIS2 = true
		}
	}
	if !foundDORA {
		t.Error("expected DORA Art.9 violation for RSA-2048 asset, not found")
	}
	if !foundNIS2 {
		t.Error("expected NIS2 Art.21 violation for RSA-2048 asset, not found")
	}
}

func TestOSSComplianceEngine_QuantumSafeAsset_Compliant(t *testing.T) {
	engine := compliance.NewOSSComplianceEngine()
	ctx := context.Background()

	asset := &compliance.CryptoAsset{
		ID:        "asset-mlkem",
		Name:      "PQC Key Exchange",
		Algorithm: "ML-KEM-768",
		KeySize:   768,
		Usage:     "key-exchange",
	}

	report, err := engine.Evaluate(ctx, asset)
	if err != nil {
		t.Fatalf("Evaluate returned unexpected error: %v", err)
	}
	if !report.Compliant {
		t.Errorf("ML-KEM-768 asset should be compliant, violations: %v", report.Violations)
	}
	if len(report.Violations) != 0 {
		t.Errorf("expected zero violations for quantum-safe asset, got %d", len(report.Violations))
	}
}

func TestOSSComplianceEngine_NilAsset_Error(t *testing.T) {
	engine := compliance.NewOSSComplianceEngine()
	_, err := engine.Evaluate(context.Background(), nil)
	if err == nil {
		t.Error("expected error when asset is nil, got nil")
	}
}

func TestOSSComplianceEngine_ImplementsInterface(t *testing.T) {
	// Compile-time check: OSSComplianceEngine implements ComplianceEngine.
	var _ compliance.ComplianceEngine = (*compliance.OSSComplianceEngine)(nil)
}
