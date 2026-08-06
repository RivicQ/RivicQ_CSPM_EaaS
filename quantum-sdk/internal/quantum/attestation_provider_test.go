package quantum_test

import (
	"context"
	"testing"

	"github.com/RivicQ/RivicQ_CSPM_EaaS/quantum-sdk/internal/quantum"
)

func TestLocalAttestationProvider_Name(t *testing.T) {
	p := quantum.NewLocalAttestationProvider()
	if p.Name() != "local-pqc" {
		t.Errorf("expected name %q, got %q", "local-pqc", p.Name())
	}
}

func TestLocalAttestationProvider_IsAvailable(t *testing.T) {
	p := quantum.NewLocalAttestationProvider()
	if !p.IsAvailable() {
		t.Error("LocalAttestationProvider.IsAvailable() must always return true")
	}
}

func TestLocalAttestationProvider_Attest_QuantumVulnerable(t *testing.T) {
	p := quantum.NewLocalAttestationProvider()
	ctx := context.Background()

	result, err := p.Attest(ctx, quantum.AttestationRequest{
		AssetID:   "asset-1",
		Algorithm: "RSA-2048",
		KeySize:   2048,
		Usage:     "TLS",
	})
	if err != nil {
		t.Fatalf("Attest returned unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("Attest returned nil result")
	}
	if result.QuantumSafe {
		t.Error("RSA-2048 should be classified as quantum-vulnerable")
	}
	if result.RiskScore <= 0 {
		t.Errorf("expected positive risk score for RSA-2048, got %f", result.RiskScore)
	}
	if len(result.Recommendations) == 0 {
		t.Error("expected at least one recommendation for a quantum-vulnerable asset")
	}
	if result.ProviderName != "local-pqc" {
		t.Errorf("expected ProviderName %q, got %q", "local-pqc", result.ProviderName)
	}
	if result.AttestationID == "" {
		t.Error("AttestationID must not be empty")
	}
}

func TestLocalAttestationProvider_Attest_QuantumSafe(t *testing.T) {
	p := quantum.NewLocalAttestationProvider()
	ctx := context.Background()

	result, err := p.Attest(ctx, quantum.AttestationRequest{
		AssetID:   "asset-2",
		Algorithm: "ML-KEM-768",
		KeySize:   768,
		Usage:     "key-exchange",
	})
	if err != nil {
		t.Fatalf("Attest returned unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("Attest returned nil result")
	}
	if !result.QuantumSafe {
		t.Error("ML-KEM-768 should be classified as quantum-safe")
	}
}

func TestLocalAttestationProvider_Attest_EmptyAssetID(t *testing.T) {
	p := quantum.NewLocalAttestationProvider()
	_, err := p.Attest(context.Background(), quantum.AttestationRequest{
		AssetID:   "",
		Algorithm: "RSA-2048",
	})
	if err == nil {
		t.Error("expected error when AssetID is empty, got nil")
	}
}

func TestLocalAttestationProvider_ImplementsInterface(t *testing.T) {
	// Compile-time check: LocalAttestationProvider implements QuantumAttestationProvider.
	var _ quantum.QuantumAttestationProvider = (*quantum.LocalAttestationProvider)(nil)
}
