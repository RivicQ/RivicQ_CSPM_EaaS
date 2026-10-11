package identity

import (
	"context"
	"strings"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/cryptoscan"
	"github.com/rivic-q/cryptobom-saas/internal/profile"
)

func testProfile() profile.Profile {
	return profile.Resolve(profile.Default(), "identity/gd", profile.DomainIdentity)
}

func analyze(t *testing.T, name string, data []byte) *Report {
	t.Helper()
	rep, err := AnalyzeBytes(context.Background(), name, data, testProfile(), DefaultLimits(), Options{})
	if err != nil {
		t.Fatalf("AnalyzeBytes: %v", err)
	}
	return rep
}

func TestClassifyFormat(t *testing.T) {
	if got := classifyFormat("x.json", []byte(`{}`), 0); got != FormatConfig {
		t.Fatalf("json format=%s", got)
	}
	if got := classifyFormat("x.pem", []byte("-----BEGIN CERTIFICATE-----"), 0); got != FormatCert {
		t.Fatalf("pem format=%s", got)
	}
	if got := classifyFormat("x.pem", []byte("data"), 2); got != FormatBundle {
		t.Fatalf("bundle format=%s", got)
	}
}

func TestAnalyzeCertificate(t *testing.T) {
	rep := analyze(t, "device.pem", selfSignedPEM(t))
	if rep.Format != FormatCert {
		t.Fatalf("format=%s", rep.Format)
	}
	if len(rep.Certificates) != 1 {
		t.Fatalf("certs=%d", len(rep.Certificates))
	}
	if !hasAlg(rep.Algorithms, "ECDSA") {
		t.Fatalf("cert-derived ECDSA missing: %+v", rep.Algorithms)
	}
	if len(rep.PKI) != 1 || !rep.PKI[0].SelfSigned {
		t.Fatalf("PKI=%+v", rep.PKI)
	}
	if rep.PQC.Readiness == "ready" {
		t.Fatalf("ECDSA cert should not yield ready PQC: %+v", rep.PQC)
	}
}

func TestAnalyzeESIMConfig(t *testing.T) {
	cfg := `profile: GSMA SGP.22
euicc: ISD-R enabled
isd_p: MNO-SD present
rsp: SM-DP+ referenced
crypto:
  libraries: OpenSSL
  tls: TLS1.3
  algorithms: ECDSA, AES-256, SHA-256
`
	rep := analyze(t, "esim-config.txt", []byte(cfg))
	if rep.Format != FormatConfig {
		t.Fatalf("format=%s", rep.Format)
	}
	if !hasIdentityType(rep.Identities, "euicc") {
		t.Fatalf("eUICC identity not detected: %+v", rep.Identities)
	}
	if !hasLib(rep.Libraries, "OpenSSL") {
		t.Fatalf("OpenSSL not detected: %+v", rep.Libraries)
	}
	if !hasAlg(rep.Algorithms, "AES") || !hasAlg(rep.Algorithms, "ECDSA") {
		t.Fatalf("algorithms missing: %+v", rep.Algorithms)
	}
}

func TestAnalyzeCertBundle(t *testing.T) {
	leaf := selfSignedPEM(t)
	ca := selfSignedPEM(t)
	blob := append(append([]byte{}, leaf...), ca...)
	rep := analyze(t, "chain.pem", blob)
	if rep.Format != FormatBundle {
		t.Fatalf("format=%s want bundle", rep.Format)
	}
	if len(rep.Certificates) != 2 {
		t.Fatalf("certs=%d want 2", len(rep.Certificates))
	}
	for _, c := range rep.Certificates {
		if !c.InBundle {
			t.Fatalf("cert should be flagged as in-bundle")
		}
	}
	if len(rep.PKI) == 0 {
		t.Fatalf("PKI not built")
	}
}

func TestAnalyzeGraphBuilt(t *testing.T) {
	rep := analyze(t, "device.pem", selfSignedPEM(t))
	if rep.Graph == nil || rep.Graph.Len() == 0 {
		t.Fatalf("graph not built")
	}
}

func TestNoSubscriberSecretsExposed(t *testing.T) {
	cfg := `euicc: ISD-R
subscriber_secret: KI=0123456789ABCDEF OPc=FFFFFFFF
token: SUPER_SECRET_TOKEN_VALUE
crypto: {libraries: OpenSSL, algorithms: ECDSA}
`
	rep := analyze(t, "esim.txt", []byte(cfg))
	dump := strings.Join(rep.Evidence, " ") + rep.FileName
	for _, id := range rep.Identities {
		dump += id.Name + id.Note + strings.Join(id.Markers, ",")
	}
	for _, leak := range []string{"0123456789ABCDEF", "SUPER_SECRET_TOKEN_VALUE"} {
		if strings.Contains(dump, leak) {
			t.Fatalf("secret %q leaked into report", leak)
		}
	}
}

func TestClassifyFormatUnknown(t *testing.T) {
	if got := classifyFormat("x.weird", []byte{0x00, 0x01}, 0); got != FormatUnknown {
		t.Fatalf("got %s", got)
	}
}

// --- helpers ---

func hasAlg(in []cryptoscan.AlgorithmFinding, name string) bool {
	for _, a := range in {
		if a.Algorithm == name {
			return true
		}
	}
	return false
}

func hasLib(in []cryptoscan.LibraryFinding, name string) bool {
	for _, l := range in {
		if l.Library == name {
			return true
		}
	}
	return false
}

func hasIdentityType(in []IdentityRef, typ string) bool {
	for _, i := range in {
		if i.Type == typ {
			return true
		}
	}
	return false
}
