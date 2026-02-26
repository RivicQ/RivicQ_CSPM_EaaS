package discovery

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestScanAll_ReturnsStructuredResult(t *testing.T) {
	ecKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)
	cert := generateSelfSignedCert(t, ecKey, x509.ECDSAWithSHA256)

	srv := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	srv.TLS = &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS13,
	}
	srv.StartTLS()
	defer srv.Close()

	host, portStr, err := net.SplitHostPort(srv.Listener.Addr().String())
	require.NoError(t, err)
	var port int
	_, err = parsePort(portStr, &port)
	require.NoError(t, err)

	targets := []Target{
		{ID: "t1", Host: host, Port: port, Protocol: "tls", Label: "Test TLS"},
	}

	scanner := NewScanner()
	result, err := scanner.ScanAll(context.Background(), targets)
	require.NoError(t, err)

	assert.NotEmpty(t, result.ScanID)
	assert.Equal(t, 1, result.Summary.TotalTargets)
	assert.Equal(t, 1, result.Summary.ScannedTargets)
	assert.False(t, result.StartedAt.IsZero())
	assert.False(t, result.CompletedAt.IsZero())
}

func TestScanAll_SummaryCounts(t *testing.T) {
	findings := []Finding{
		{Severity: SeverityCritical, QuantumSafe: false, BSIRef: "BSI-1"},
		{Severity: SeverityCritical, QuantumSafe: false, BSIRef: "BSI-2"},
		{Severity: SeverityHigh, QuantumSafe: false, BSIRef: "BSI-3"},
		{Severity: SeverityMedium, QuantumSafe: true, BSIRef: ""},
		{Severity: SeverityLow, QuantumSafe: false, BSIRef: "BSI-5"},
	}

	summary := computeSummary([]Target{{}, {}}, 2, findings)
	assert.Equal(t, 2, summary.TotalTargets)
	assert.Equal(t, 2, summary.ScannedTargets)
	assert.Equal(t, 5, summary.TotalFindings)
	assert.Equal(t, 2, summary.Critical)
	assert.Equal(t, 1, summary.High)
	assert.Equal(t, 1, summary.Medium)
	assert.Equal(t, 1, summary.Low)
	assert.Equal(t, 4, summary.QuantumUnsafe)
	assert.Equal(t, 4, summary.BSIReferenced)
}

func TestScanAll_ConcurrentNoRace(t *testing.T) {
	var targets []Target
	var servers []*httptest.Server

	for i := 0; i < 3; i++ {
		ecKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		require.NoError(t, err)
		cert := generateSelfSignedCert(t, ecKey, x509.ECDSAWithSHA256)

		srv := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))
		srv.TLS = &tls.Config{
			Certificates: []tls.Certificate{cert},
			MinVersion:   tls.VersionTLS13,
		}
		srv.StartTLS()
		servers = append(servers, srv)

		host, portStr, err := net.SplitHostPort(srv.Listener.Addr().String())
		require.NoError(t, err)
		var port int
		_, err = parsePort(portStr, &port)
		require.NoError(t, err)

		targets = append(targets, Target{
			ID:       fmt.Sprintf("t%d", i),
			Host:     host,
			Port:     port,
			Protocol: "tls",
			Label:    fmt.Sprintf("Test %d", i),
		})
	}

	defer func() {
		for _, s := range servers {
			s.Close()
		}
	}()

	scanner := NewScanner()
	result, err := scanner.ScanAll(context.Background(), targets)
	require.NoError(t, err)
	assert.Equal(t, 3, result.Summary.TotalTargets)
}
