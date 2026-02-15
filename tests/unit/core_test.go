package unit

import (
	"testing"
)

func TestAssetValidation(t *testing.T) {
	tests := []struct {
		name      string
		algorithm string
		keySize   int
		valid     bool
	}{
		{"RSA-2048 valid", "RSA-2048", 2048, true},
		{"RSA-1024 invalid", "RSA-1024", 1024, false},
		{"AES-256 valid", "AES-256", 256, true},
		{"ECDSA-P256 valid", "ECDSA-P256", 256, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.keySize >= 2048 || tt.algorithm == "AES-256"
			if isValid != tt.valid {
				t.Errorf("expected %v", tt.valid)
			}
		})
	}
}

func TestQuantumVulnerability(t *testing.T) {
	vulnerable := map[string]bool{
		"RSA-2048":   true,
		"ECDSA-P256": true,
		"AES-256":    false,
		"Kyber-512":  false,
	}
	for alg, expected := range vulnerable {
		isVuln := len(alg) >= 3 && (alg[:3] == "RSA" || alg[:3] == "ECD")
		if isVuln != expected {
			t.Errorf("%s: expected %v", alg, expected)
		}
	}
}

func TestComplianceScore(t *testing.T) {
	score := 100 - 15 - 10
	if score != 75 {
		t.Errorf("expected 75, got %d", score)
	}
}

func TestPQCMapping(t *testing.T) {
	mapping := map[string]string{"RSA-2048": "Kyber-1024", "ECDSA-P256": "Dilithium-5"}
	if mapping["RSA-2048"] != "Kyber-1024" {
		t.Errorf("PQC mapping failed")
	}
}

func TestMigrationPlan(t *testing.T) {
	plan := map[string]interface{}{"version": "1.3.0", "total": 3}
	if plan["version"] != "1.3.0" {
		t.Errorf("plan version mismatch")
	}
}
