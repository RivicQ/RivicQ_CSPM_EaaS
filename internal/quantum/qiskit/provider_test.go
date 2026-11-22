package qiskit

import (
	"context"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/quantum"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/provider"
)

func TestProviderContract(t *testing.T) {
	var p provider.QuantumProvider = New()
	if p.Info().Name != "qiskit-profile" {
		t.Fatalf("unexpected provider name %q", p.Info().Name)
	}
	if p.Status(context.Background()).State != "available" {
		t.Fatal("provider should report available")
	}
	if err := p.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

func TestValidateClassicalAndPQC(t *testing.T) {
	ctx := context.Background()
	p := New()
	classical, err := p.Validate(ctx, "RSA-2048", 2048)
	if err != nil {
		t.Fatalf("Validate RSA: %v", err)
	}
	if classical.QuantumSafe {
		t.Fatal("RSA-2048 must not be quantum-safe")
	}
	if classical.Analysis["ibm_quantum_runtime"] != false {
		t.Fatal("provider must not invoke IBM Quantum Runtime")
	}
	pqc, err := p.Validate(ctx, "ML-KEM-768", 0)
	if err != nil {
		t.Fatalf("Validate ML-KEM: %v", err)
	}
	if !pqc.QuantumSafe {
		t.Fatal("ML-KEM-768 must be quantum-safe")
	}
}

func TestAttestIncludesProfileMetadata(t *testing.T) {
	result, err := New().Attest(context.Background(), quantum.AttestationRequest{
		AssetID:   "asset-1",
		Algorithm: "AES-128",
		KeySize:   128,
		Usage:     "encryption",
	})
	if err != nil {
		t.Fatalf("Attest: %v", err)
	}
	if result.ProviderName != "qiskit-profile" {
		t.Fatalf("unexpected provider %q", result.ProviderName)
	}
	if result.Analysis["backend"] != "local-classical" {
		t.Fatalf("unexpected backend %v", result.Analysis["backend"])
	}
	if len(result.Recommendations) == 0 {
		t.Fatal("expected migration guidance")
	}
}

func TestMigrationPath(t *testing.T) {
	path, err := New().MigrationPath(context.Background(), "RSA-2048")
	if err != nil {
		t.Fatalf("MigrationPath: %v", err)
	}
	if len(path) != 1 || !path[0].QuantumSafe {
		t.Fatalf("unexpected migration path: %+v", path)
	}
}
