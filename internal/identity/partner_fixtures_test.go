package identity

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/profile"
)

func partnerFile(t *testing.T, parts ...string) []byte {
	t.Helper()
	p := filepath.Join(append([]string{"..", "..", "fixtures", "partners"}, parts...)...)
	b, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v", p, err)
	}
	return b
}

func TestGDCertificateFixtures(t *testing.T) {
	cases := []struct {
		path []string
		want string
	}{
		{[]string{"gd", "certificate", "device-ecdsa-p256.pem"}, "ECDSA"},
		{[]string{"gd", "certificate", "device-rsa2048.pem"}, "RSA"},
	}
	for _, tc := range cases {
		t.Run(tc.want, func(t *testing.T) {
			rep := analyze(t, filepath.Join(tc.path...), partnerFile(t, tc.path...))
			if len(rep.Certificates) == 0 {
				t.Fatalf("expected parsed certificate, format=%s", rep.Format)
			}
			if !hasAlg(rep.Algorithms, tc.want) {
				t.Fatalf("expected algorithm %s, got %+v", tc.want, rep.Algorithms)
			}
			if rep.PQC.Readiness == "ready" {
				t.Fatalf("classical %s cert must not be PQC-ready: %+v", tc.want, rep.PQC)
			}
		})
	}
}

func TestGDConfigMarkers(t *testing.T) {
	p := profile.Resolve(profile.Default(), "identity/gd", profile.DomainIdentity)
	rep, err := AnalyzeBytes(t.Context(), "esim-config.txt", partnerFile(t, "gd", "esim", "esim-config.txt"), p, DefaultLimits(), Options{})
	if err != nil {
		t.Fatal(err)
	}
	if rep.Format == "" {
		t.Fatal("expected a classified format")
	}
}

func TestGDMalformedDoesNotPanic(t *testing.T) {
	rep := analyze(t, "garbage.bin", []byte{0x00, 0xff, 0x00, 0x7f})
	if len(rep.Certificates) != 0 {
		t.Fatalf("malformed bytes must not invent certificates: %+v", rep.Certificates)
	}
}
