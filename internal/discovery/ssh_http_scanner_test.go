package discovery

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── SSH Scanner Unit Tests ─────────────────────────────────────────────────────

func TestSSHScanner_CheckHostKey_DSA_Critical(t *testing.T) {
	s := &SSHScanner{}
	findings := s.checkHostKey(
		Target{ID: "t1", Host: "localhost", Port: 2222, Protocol: "ssh", Label: "Test SSH"},
		"ssh-dss",
		time.Now(),
	)

	assert.Len(t, findings, 1)
	assert.Equal(t, "WEAK_HOST_KEY_DSA", findings[0].FindingType)
	assert.Equal(t, SeverityCritical, findings[0].Severity)
	assert.Equal(t, "DSA", findings[0].Algorithm)
	assert.Equal(t, 1024, findings[0].KeyLength)
	assert.NotEmpty(t, findings[0].BSIRef)
}

func TestSSHScanner_CheckHostKey_RSA_Medium(t *testing.T) {
	s := &SSHScanner{}
	findings := s.checkHostKey(
		Target{ID: "t1", Host: "localhost", Port: 2222, Protocol: "ssh", Label: "Test SSH"},
		"ssh-rsa",
		time.Now(),
	)

	assert.Len(t, findings, 1)
	assert.Equal(t, "RSA_HOST_KEY", findings[0].FindingType)
	assert.Equal(t, SeverityMedium, findings[0].Severity)
}

func TestSSHScanner_CheckHostKey_Ed25519_NoFindings(t *testing.T) {
	s := &SSHScanner{}
	findings := s.checkHostKey(
		Target{ID: "t1", Host: "localhost", Port: 2222, Protocol: "ssh", Label: "Test SSH"},
		"ssh-ed25519",
		time.Now(),
	)
	assert.Empty(t, findings)
}

func TestSSHScanner_WeakKEXFinding_Group1_Critical(t *testing.T) {
	s := &SSHScanner{}
	f := s.weakKEXFinding(
		Target{ID: "t1", Host: "localhost", Port: 2222, Protocol: "ssh", Label: "Test SSH"},
		"diffie-hellman-group1-sha1",
		time.Now(),
	)

	assert.Equal(t, SeverityCritical, f.Severity)
	assert.Equal(t, "WEAK_SSH_KEX", f.FindingType)
	assert.Equal(t, "diffie-hellman-group1-sha1", f.Algorithm)
	assert.NotEmpty(t, f.BSIRef)
	assert.False(t, f.QuantumSafe)
}

func TestSSHScanner_WeakKEXFinding_Group14_High(t *testing.T) {
	s := &SSHScanner{}
	f := s.weakKEXFinding(
		Target{ID: "t1", Host: "localhost", Port: 2222, Protocol: "ssh", Label: "Test SSH"},
		"diffie-hellman-group14-sha1",
		time.Now(),
	)

	assert.Equal(t, SeverityHigh, f.Severity)
	assert.Equal(t, "WEAK_SSH_KEX", f.FindingType)
}

// ── HTTP Scanner Unit Tests ────────────────────────────────────────────────────

func TestHTTPScanner_CheckSecurityHeaders_AllMissing(t *testing.T) {
	s := &HTTPScanner{}
	target := Target{ID: "t1", Host: "localhost", Port: 5001, Protocol: "http", Label: "Test HTTP"}
	headers := http.Header{}

	findings := s.checkSecurityHeaders(target, headers, time.Now(), "http", target.Port)

	assert.Len(t, findings, 4)

	findingTypes := make(map[string]bool)
	for _, f := range findings {
		findingTypes[f.FindingType] = true
	}
	assert.True(t, findingTypes["MISSING_HSTS"])
	assert.True(t, findingTypes["MISSING_XCTO"])
	assert.True(t, findingTypes["MISSING_XFO"])
	assert.True(t, findingTypes["MISSING_CSP"])
}

func TestHTTPScanner_CheckSecurityHeaders_HSTSPresent(t *testing.T) {
	s := &HTTPScanner{}
	target := Target{ID: "t1", Host: "localhost", Port: 5001, Protocol: "http", Label: "Test HTTP"}
	headers := http.Header{
		"Strict-Transport-Security": []string{"max-age=63072000"},
	}

	findings := s.checkSecurityHeaders(target, headers, time.Now(), "http", target.Port)

	for _, f := range findings {
		assert.NotEqual(t, "MISSING_HSTS", f.FindingType)
	}
}

func TestHTTPScanner_CheckSecurityHeaders_AllPresent(t *testing.T) {
	s := &HTTPScanner{}
	target := Target{ID: "t1", Host: "localhost", Port: 5001, Protocol: "http", Label: "Test HTTP"}
	headers := http.Header{
		"Strict-Transport-Security": []string{"max-age=63072000; includeSubDomains"},
		"X-Content-Type-Options":    []string{"nosniff"},
		"X-Frame-Options":           []string{"DENY"},
		"Content-Security-Policy":   []string{"default-src 'self'"},
	}

	findings := s.checkSecurityHeaders(target, headers, time.Now(), "http", target.Port)
	assert.Empty(t, findings)
}

func TestHTTPScanner_Truncate(t *testing.T) {
	tests := []struct {
		input    string
		max      int
		expected string
	}{
		{"hello", 10, "hello"},
		{"hello world", 5, "hello..."},
		{"", 10, ""},
		{"abc", 3, "abc"},
	}
	for _, tc := range tests {
		result := truncate(tc.input, tc.max)
		assert.Equal(t, tc.expected, result)
	}
}

// ── TLS Helper Unit Tests ──────────────────────────────────────────────────────

func TestHasForwardSecrecy_ECDHE_True(t *testing.T) {
	import_tls := []uint16{
		0xC02B, // TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256
		0xC02F, // TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
	}
	for _, suite := range import_tls {
		assert.True(t, hasForwardSecrecy(suite))
	}
}

func TestHasForwardSecrecy_RSA_False(t *testing.T) {
	rsaSuites := []uint16{
		0x002F, // TLS_RSA_WITH_AES_128_CBC_SHA
		0x0035, // TLS_RSA_WITH_AES_256_CBC_SHA
	}
	for _, suite := range rsaSuites {
		assert.False(t, hasForwardSecrecy(suite))
	}
}

// ── HTTP Scanner Scan Tests ────────────────────────────────────────────────────

func TestHTTPScanner_Scan_MD5Response_Critical(t *testing.T) {
	// Create a test HTTP server that returns an MD5 hash
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Return a known MD5 hash (32 lowercase hex chars)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("098f6bcd4621d373cade4e832627b4f6")) // md5("test")
	}))
	defer srv.Close()

	host, portStr, err := splitHostPort(srv.URL[7:]) // strip "http://"
	require.NoError(t, err)
	var port int
	_, err = parsePort(portStr, &port)
	require.NoError(t, err)

	scanner := &HTTPScanner{}
	target := Target{ID: "t1", Host: host, Port: port, Protocol: "http", Label: "Test MD5 API"}
	findings, err := scanner.Scan(context.Background(), target)
	require.NoError(t, err)

	hasMD5 := false
	for _, f := range findings {
		if f.FindingType == "MD5_HASH_USAGE" {
			hasMD5 = true
			assert.Equal(t, SeverityCritical, f.Severity)
			assert.Equal(t, "MD5", f.Algorithm)
			assert.NotEmpty(t, f.BSIRef)
		}
	}
	assert.True(t, hasMD5, "expected MD5_HASH_USAGE finding")
}

func TestHTTPScanner_Scan_NoMD5Response(t *testing.T) {
	// Create a test HTTP server that returns a non-MD5 response
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Strict-Transport-Security", "max-age=63072000")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	host, portStr, err := splitHostPort(srv.URL[7:])
	require.NoError(t, err)
	var port int
	_, err = parsePort(portStr, &port)
	require.NoError(t, err)

	scanner := &HTTPScanner{}
	target := Target{ID: "t1", Host: host, Port: port, Protocol: "http", Label: "Test HTTP"}
	findings, err := scanner.Scan(context.Background(), target)
	require.NoError(t, err)

	for _, f := range findings {
		assert.NotEqual(t, "MD5_HASH_USAGE", f.FindingType)
	}
}

func TestHTTPScanner_HTTPSSchemeAndInsecureCookie(t *testing.T) {
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Set-Cookie", "sid=abc")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	host, portStr, err := splitHostPort(strings.TrimPrefix(srv.URL, "https://"))
	require.NoError(t, err)
	var port int
	_, err = parsePort(portStr, &port)
	require.NoError(t, err)

	scanner := &HTTPScanner{}
	target := Target{ID: "t1", Host: host, Port: port, Protocol: "http", Scheme: "https", Label: "Test HTTPS"}
	findings, err := scanner.Scan(context.Background(), target)
	require.NoError(t, err)

	var cookie, csp bool
	for _, f := range findings {
		if f.FindingType == "INSECURE_COOKIE" {
			cookie = true
		}
		if f.FindingType == "MISSING_CSP" {
			csp = true
		}
	}
	assert.True(t, cookie, "HTTPS responses should flag cookies missing Secure/HttpOnly")
	assert.True(t, csp, "expected CSP detection on HTTPS")
}

func TestHTTPScanner_CheckSecurityHeaders_HTTPSCookie(t *testing.T) {
	s := &HTTPScanner{}
	target := Target{ID: "t1", Host: "localhost", Port: 443, Protocol: "http", Scheme: "https"}
	headers := http.Header{
		"Strict-Transport-Security": []string{"max-age=1"},
		"X-Content-Type-Options":    []string{"nosniff"},
		"X-Frame-Options":           []string{"DENY"},
		"Content-Security-Policy":   []string{"default-src 'self'"},
		"Set-Cookie":                []string{"session=1"},
	}
	findings := s.checkSecurityHeaders(target, headers, time.Now(), "https", 443)
	require.Len(t, findings, 1)
	assert.Equal(t, "INSECURE_COOKIE", findings[0].FindingType)
}

// splitHostPort helper for tests
func splitHostPort(addr string) (string, string, error) {
	for i := len(addr) - 1; i >= 0; i-- {
		if addr[i] == ':' {
			return addr[:i], addr[i+1:], nil
		}
	}
	return addr, "80", nil
}
