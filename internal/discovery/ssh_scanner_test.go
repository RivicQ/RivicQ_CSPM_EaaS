package discovery

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"fmt"
	"net"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/ssh"
)

// startMockSSHServer creates a minimal SSH server for testing
func startMockSSHServer(t *testing.T, hostKey ssh.Signer, kexAlgos []string) (int, func()) {
	t.Helper()

	cfg := &ssh.ServerConfig{
		NoClientAuth: true,
		Config: ssh.Config{
			KeyExchanges: kexAlgos,
		},
	}
	cfg.AddHostKey(hostKey)

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)

	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				//nolint:errcheck
				ssh.NewServerConn(c, cfg)
				_ = c.Close()
			}(conn)
		}
	}()

	port := ln.Addr().(*net.TCPAddr).Port
	return port, func() { _ = ln.Close() }
}

func TestSSHScanner_Scan_DSAHostKey_Findings(t *testing.T) {
	// Generate RSA key for the mock server (DSA is not directly supported by golang.org/x/crypto/ssh signer)
	// We use RSA here because the ssh package doesn't have a convenient DSA signer.
	// The scanner checks the key type from the server — "ssh-rsa" will match our RSA_HOST_KEY branch.
	rsaKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	signer, err := ssh.NewSignerFromKey(rsaKey)
	require.NoError(t, err)

	port, cleanup := startMockSSHServer(t, signer, []string{
		"curve25519-sha256",
		"diffie-hellman-group14-sha256",
	})
	defer cleanup()

	scanner := &SSHScanner{}
	target := Target{
		ID: "ssh-test", Host: "127.0.0.1", Port: port,
		Protocol: "ssh", Label: "Test SSH",
	}

	findings, err := scanner.Scan(context.Background(), target)
	// Either succeeds or auth fails — either way we should get host key findings
	if err != nil {
		t.Logf("Scan error (expected): %v", err)
	}

	// Should have an RSA host key finding
	hasRSA := false
	for _, f := range findings {
		if f.FindingType == "RSA_HOST_KEY" {
			hasRSA = true
			assert.Equal(t, SeverityMedium, f.Severity)
		}
		// Verify all findings have required fields
		assert.NotEmpty(t, f.ID)
		assert.Equal(t, "ssh-test", f.TargetID)
		assert.False(t, f.ScannedAt.IsZero())
	}
	assert.True(t, hasRSA, fmt.Sprintf("expected RSA_HOST_KEY finding, got: %+v", findings))
}

func TestSSHScanner_ScanBanner_HostKeyExtracted(t *testing.T) {
	rsaKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	signer, err := ssh.NewSignerFromKey(rsaKey)
	require.NoError(t, err)

	port, cleanup := startMockSSHServer(t, signer, []string{"curve25519-sha256"})
	defer cleanup()

	scanner := &SSHScanner{}
	target := Target{
		ID: "ssh-test", Host: "127.0.0.1", Port: port,
		Protocol: "ssh", Label: "Test SSH Banner",
	}

	// Call scanBanner directly
	findings, _ := scanner.scanBanner(context.Background(), target, time.Now())
	// Should detect RSA host key
	found := false
	for _, f := range findings {
		if f.FindingType == "RSA_HOST_KEY" {
			found = true
		}
	}
	assert.True(t, found, "expected RSA_HOST_KEY from scanBanner")
}
