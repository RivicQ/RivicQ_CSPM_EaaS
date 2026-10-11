package cryptoscan

import (
	"strings"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/profile"
)

func genericProfile() profile.Profile {
	return profile.Resolve(profile.Default(), "", profile.DomainGeneric)
}

func has(findings []AlgorithmFinding, name string) (AlgorithmFinding, bool) {
	for _, a := range findings {
		if a.Algorithm == name {
			return a, true
		}
	}
	return AlgorithmFinding{}, false
}

func TestDetectFindsLibraryAndAlgorithms(t *testing.T) {
	strs := []string{
		"mbedtls_ssl_init", "MBEDTLS_AES_C", "mbedtls_ecdsa_sign",
		"AES-256", "ECDSA", "SHA-256", "TLS1.3", "MQTT",
	}
	det := Detect(genericProfile(), strs)
	if len(det.Libraries) == 0 {
		t.Fatalf("expected mbedTLS library detection, got none")
	}
	if _, ok := has(det.Algorithms, "AES"); !ok {
		t.Fatalf("AES not detected: %+v", det.Algorithms)
	}
	if _, ok := has(det.Algorithms, "ECDSA"); !ok {
		t.Fatalf("ECDSA not detected")
	}
	if _, ok := has(det.Algorithms, "SHA-256"); !ok {
		t.Fatalf("SHA-256 not detected")
	}
}

func TestDetectNoDSAFalsePositiveFromECDSA(t *testing.T) {
	strs := []string{"mbedtls_ecdsa_sign", "ecdsa_do_verify", "ECDSA_sign"}
	det := Detect(genericProfile(), strs)
	if a, ok := has(det.Algorithms, "DSA"); ok {
		t.Fatalf("ECDSA strings must not be reported as DSA: %+v", a)
	}
	if _, ok := has(det.Algorithms, "ECDSA"); !ok {
		t.Fatalf("ECDSA should still be detected")
	}
}

func TestDetectNoDHFalsePositiveFromECDH(t *testing.T) {
	strs := []string{"mbedtls_ecdh_shared", "ECDHE", "ecdh_compute"}
	det := Detect(genericProfile(), strs)
	if a, ok := has(det.Algorithms, "DH"); ok {
		t.Fatalf("ECDH strings must not be reported as DH: %+v", a)
	}
	if _, ok := has(det.Algorithms, "ECDH"); !ok {
		t.Fatalf("ECDH should be detected")
	}
}

func TestDetectPQCAlgorithmsQuantumSafe(t *testing.T) {
	strs := []string{"ML-KEM", "Kyber", "ML-DSA", "Dilithium", "SLH-DSA", "SPHINCS"}
	det := Detect(genericProfile(), strs)
	for _, name := range []string{"ML-KEM", "ML-DSA", "SLH-DSA"} {
		a, ok := has(det.Algorithms, name)
		if !ok {
			t.Fatalf("%s not detected", name)
		}
		if !a.QuantumSafe {
			t.Fatalf("%s should be quantum safe, got %+v", name, a)
		}
	}
}

func TestAlgorithmFromCertClassification(t *testing.T) {
	a := Algorithm("ECDSA", "certificate abc123")
	if a.Algorithm != "ECDSA" || a.Category != "asymmetric" {
		t.Fatalf("unexpected classification: %+v", a)
	}
	if a.QuantumSafe {
		t.Fatalf("ECDSA must not be quantum safe")
	}
	if a.PQCStatus != "migration_required" {
		t.Fatalf("ECDSA status=%s want migration_required", a.PQCStatus)
	}
}

func TestAlgorithmsFromCertMapping(t *testing.T) {
	got := AlgorithmsFromCert("ECDSA", "SHA256-RSA")
	want := map[string]bool{"ECDSA": true, "RSA": true, "SHA-256": true}
	if len(got) != len(want) {
		t.Fatalf("got %v want keys %v", got, want)
	}
	for _, g := range got {
		if !want[g] {
			t.Fatalf("unexpected algorithm %q in %v", g, got)
		}
	}

	pqc := AlgorithmsFromCert("Ed25519", "Ed25519")
	if len(pqc) != 1 || pqc[0] != "Ed25519" {
		t.Fatalf("Ed25519 mapping: %v", pqc)
	}

	ml := AlgorithmsFromCert("ML-DSA", "ML-DSA")
	if len(ml) != 1 || ml[0] != "ML-DSA" {
		t.Fatalf("ML-DSA mapping: %v", ml)
	}
}

func TestExtractStringsMinLength(t *testing.T) {
	data := []byte("abc\x00abcd\x00abcdef")
	strs := ExtractStrings(data, 4, 100)
	for _, s := range strs {
		if len(s) < 4 {
			t.Fatalf("string %q shorter than min length", s)
		}
	}
	if len(strs) == 0 {
		t.Fatalf("expected strings")
	}
	_ = strings.Join(strs, ",")
}
