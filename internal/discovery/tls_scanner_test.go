package discovery

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// generateSelfSignedCert creates a self-signed certificate with the given key and signature algorithm
func generateSelfSignedCert(t *testing.T, key interface{}, sigAlg x509.SignatureAlgorithm) tls.Certificate {
	t.Helper()

	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			CommonName: "test.local",
		},
		NotBefore:             time.Now().Add(-1 * time.Hour),
		NotAfter:              time.Now().Add(24 * time.Hour),
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		SignatureAlgorithm:    sigAlg,
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1")},
	}

	var certDER []byte
	var err error

	switch k := key.(type) {
	case *rsa.PrivateKey:
		certDER, err = x509.CreateCertificate(rand.Reader, template, template, &k.PublicKey, k)
	case *ecdsa.PrivateKey:
		certDER, err = x509.CreateCertificate(rand.Reader, template, template, &k.PublicKey, k)
	}
	require.NoError(t, err)

	keyDER, err := x509.MarshalPKCS8PrivateKey(key)
	require.NoError(t, err)

	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: keyDER})

	cert, err := tls.X509KeyPair(certPEM, keyPEM)
	require.NoError(t, err)

	return cert
}

// startTLSServer starts a test HTTPS server with the given TLS config
func startTLSServer(t *testing.T, tlsCfg *tls.Config) *httptest.Server {
	t.Helper()
	srv := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	srv.TLS = tlsCfg
	srv.StartTLS()
	t.Cleanup(srv.Close)
	return srv
}

func TestTLSScanner_TLS12_NoForwardSecrecy(t *testing.T) {
	rsaKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	cert := generateSelfSignedCert(t, rsaKey, x509.SHA256WithRSA)

	tlsCfg := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS12,
		MaxVersion:   tls.VersionTLS12,
		CipherSuites: []uint16{
			tls.TLS_RSA_WITH_AES_128_CBC_SHA,
		},
	}

	srv := startTLSServer(t, tlsCfg)
	host, portStr, err := net.SplitHostPort(srv.Listener.Addr().String())
	require.NoError(t, err)
	var port int
	_, err = parsePort(portStr, &port)
	require.NoError(t, err)

	scanner := &TLSScanner{}
	target := Target{ID: "test", Host: host, Port: port, Protocol: "tls", Label: "Test"}
	findings, err := scanner.Scan(context.Background(), target)
	require.NoError(t, err)

	hasNoFS := false
	for _, f := range findings {
		if f.FindingType == "NO_FORWARD_SECRECY" {
			hasNoFS = true
			assert.Equal(t, SeverityHigh, f.Severity)
		}
	}
	assert.True(t, hasNoFS, "expected NO_FORWARD_SECRECY finding")
}

func TestTLSScanner_RSA1024_Critical(t *testing.T) {
	rsaKey, err := rsa.GenerateKey(rand.Reader, 1024)
	require.NoError(t, err)

	cert := generateSelfSignedCert(t, rsaKey, x509.SHA256WithRSA)

	tlsCfg := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS12,
	}

	srv := startTLSServer(t, tlsCfg)
	host, portStr, err := net.SplitHostPort(srv.Listener.Addr().String())
	require.NoError(t, err)
	var port int
	_, err = parsePort(portStr, &port)
	require.NoError(t, err)

	scanner := &TLSScanner{}
	target := Target{ID: "test", Host: host, Port: port, Protocol: "tls", Label: "Test"}
	findings, err := scanner.Scan(context.Background(), target)
	require.NoError(t, err)

	hasWeakKey := false
	for _, f := range findings {
		if f.FindingType == "WEAK_KEY_RSA" {
			hasWeakKey = true
			assert.Equal(t, SeverityCritical, f.Severity)
			assert.Equal(t, 1024, f.KeyLength)
		}
	}
	assert.True(t, hasWeakKey, "expected WEAK_KEY_RSA finding for RSA-1024")
}

func TestTLSScanner_SHA1Cert_High(t *testing.T) {
	rsaKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	cert := generateSelfSignedCert(t, rsaKey, x509.SHA1WithRSA)

	tlsCfg := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS12,
	}

	srv := startTLSServer(t, tlsCfg)
	host, portStr, err := net.SplitHostPort(srv.Listener.Addr().String())
	require.NoError(t, err)
	var port int
	_, err = parsePort(portStr, &port)
	require.NoError(t, err)

	scanner := &TLSScanner{}
	target := Target{ID: "test", Host: host, Port: port, Protocol: "tls", Label: "Test"}
	findings, err := scanner.Scan(context.Background(), target)
	require.NoError(t, err)

	hasSHA1 := false
	for _, f := range findings {
		if f.FindingType == "WEAK_SIG_SHA1" {
			hasSHA1 = true
			assert.Equal(t, SeverityHigh, f.Severity)
		}
	}
	assert.True(t, hasSHA1, "expected WEAK_SIG_SHA1 finding")
}

func TestTLSScanner_TLS13_ECDHE_NoFindings(t *testing.T) {
	ecKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)

	cert := generateSelfSignedCert(t, ecKey, x509.ECDSAWithSHA256)

	tlsCfg := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS13,
	}

	srv := startTLSServer(t, tlsCfg)
	host, portStr, err := net.SplitHostPort(srv.Listener.Addr().String())
	require.NoError(t, err)
	var port int
	_, err = parsePort(portStr, &port)
	require.NoError(t, err)

	scanner := &TLSScanner{}
	target := Target{ID: "test", Host: host, Port: port, Protocol: "tls", Label: "Test"}
	findings, err := scanner.Scan(context.Background(), target)
	require.NoError(t, err)

	// TLS 1.3 with a good EC cert should produce no critical or high findings
	for _, f := range findings {
		assert.NotEqual(t, SeverityCritical, f.Severity, "unexpected CRITICAL finding: %s", f.Title)
		assert.NotEqual(t, SeverityHigh, f.Severity, "unexpected HIGH finding: %s", f.Title)
	}
}

func TestTLSScanner_RSA2048_Medium(t *testing.T) {
	rsaKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	cert := generateSelfSignedCert(t, rsaKey, x509.SHA256WithRSA)

	tlsCfg := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS13,
	}

	srv := startTLSServer(t, tlsCfg)
	host, portStr, err := net.SplitHostPort(srv.Listener.Addr().String())
	require.NoError(t, err)
	var port int
	_, err = parsePort(portStr, &port)
	require.NoError(t, err)

	scanner := &TLSScanner{}
	target := Target{ID: "test", Host: host, Port: port, Protocol: "tls", Label: "Test"}
	findings, err := scanner.Scan(context.Background(), target)
	require.NoError(t, err)

	hasMedium := false
	for _, f := range findings {
		if f.FindingType == "RSA_2048_SUBOPTIMAL" {
			hasMedium = true
			assert.Equal(t, SeverityMedium, f.Severity)
		}
	}
	assert.True(t, hasMedium, "expected RSA_2048_SUBOPTIMAL finding")
}

// parsePort is a helper for tests
func parsePort(s string, port *int) (int, error) {
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("invalid port: %s", s)
		}
		n = n*10 + int(c-'0')
	}
	*port = n
	return n, nil
}
