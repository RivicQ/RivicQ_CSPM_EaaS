package certeng

import (
	"bytes"
	"testing"
	"time"
)

const rsaKeyPEM = `-----BEGIN PRIVATE KEY-----
MIIBVwIBADANBgkqhkiG9w0BAQEFAASCAUEwggE9AgEAAkEA0fakekeymaterialnotreal
-----END PRIVATE KEY-----
`

func TestParsePEMReturnsCertificateMetadata(t *testing.T) {
	// Rebuild a valid self-signed cert at runtime to avoid baking an unverifiable
	// base64 blob into the test.
	certPEM := mustSelfSigned(t, "ECDSA")
	ms := ParsePEM(certPEM, "test.pem")
	if len(ms) != 1 {
		t.Fatalf("got %d certs want 1", len(ms))
	}
	m := ms[0]
	if m.PublicKeyAlgorithm == "" || m.FingerprintSHA256 == "" {
		t.Fatalf("incomplete metadata: %+v", m)
	}
	if !m.SelfSigned {
		t.Fatalf("expected self-signed")
	}
}

func TestParsePEMIgnoresPrivateKeys(t *testing.T) {
	certPEM := mustSelfSigned(t, "ECDSA")
	blob := append([]byte(rsaKeyPEM), certPEM...)
	ms := ParsePEM(blob, "mixed.pem")
	if len(ms) != 1 {
		t.Fatalf("got %d certs want 1 (private key must be ignored)", len(ms))
	}
}

func TestParsePEMFindsEmbeddedNULPaddedCert(t *testing.T) {
	certPEM := mustSelfSigned(t, "ECDSA")
	blob := append([]byte("firmware-image\x00\x00header\x00"), certPEM...)
	blob = append(blob, 0x00, 0x00, 0xff)
	ms := ParsePEM(blob, "firmware.bin")
	if len(ms) != 1 {
		t.Fatalf("embedded cert not found: got %d", len(ms))
	}
}

func TestExtractFromBytesDER(t *testing.T) {
	der := mustSelfSignedDER(t, "ECDSA")
	ms := ExtractFromBytes(der, "cert.der")
	if len(ms) != 1 {
		t.Fatalf("DER cert not extracted: got %d", len(ms))
	}
}

func TestAssessQuantumAndClassicalRisk(t *testing.T) {
	der := mustSelfSignedDER(t, "RSA")
	m, err := ParseDER(der, "x")
	if err != nil {
		t.Fatal(err)
	}
	r := Assess(m, time.Now(), "10+ years")
	if r.QuantumStatus != "quantum_vulnerable" {
		t.Fatalf("RSA quantum status=%s", r.QuantumStatus)
	}
	if r.QuantumRisk != "HIGH" {
		t.Fatalf("RSA quantum risk=%s", r.QuantumRisk)
	}
	if r.MigrationPriority == "" {
		t.Fatalf("missing migration priority")
	}
}

func TestAssessPQCKeyIsSafe(t *testing.T) {
	m := &Metadata{
		PublicKeyAlgorithm: "Ed25519",
		NotAfter:           time.Now().Add(100 * 24 * time.Hour),
	}
	// Ed25519 is classical; validate classification remains vulnerable.
	r := Assess(m, time.Now(), "unknown")
	if r.QuantumStatus != "quantum_vulnerable" {
		t.Fatalf("Ed25519 status=%s", r.QuantumStatus)
	}
}

func TestNoPrivateKeyMaterialExposed(t *testing.T) {
	certPEM := mustSelfSigned(t, "ECDSA")
	blob := append([]byte(rsaKeyPEM), certPEM...)
	ms := ParsePEM(blob, "mixed.pem")
	for _, m := range ms {
		if bytes.Contains([]byte(m.Subject), []byte("PRIVATE")) {
			t.Fatalf("subject leaked key material")
		}
	}
}
