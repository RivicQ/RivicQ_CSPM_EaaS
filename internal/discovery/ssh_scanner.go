package discovery

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

// SSHScanner scans SSH endpoints for cryptographic weaknesses
type SSHScanner struct{}

// Scan connects to an SSH server and returns findings about weak cryptography
func (s *SSHScanner) Scan(ctx context.Context, target Target) ([]Finding, error) {
	var findings []Finding
	now := time.Now()

	var negotiatedKex string
	var hostKeyAlgo string

	cfg := &ssh.ClientConfig{
		User: "scanner",
		Auth: []ssh.AuthMethod{
			ssh.Password(""),
		},
		//nolint:gosec // intentionally accepting any host key for scanning purposes
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			hostKeyAlgo = key.Type()
			return nil
		},
		Config: ssh.Config{
			KeyExchanges: []string{
				"diffie-hellman-group1-sha1",
				"diffie-hellman-group14-sha1",
				"diffie-hellman-group14-sha256",
				"diffie-hellman-group16-sha512",
				"ecdh-sha2-nistp256",
				"curve25519-sha256",
			},
		},
		Timeout: 10 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", target.Host, target.Port)

	// Use a net.Dialer to respect context
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("dial %s: %w", addr, err)
	}
	defer func() { _ = conn.Close() }()

	sshConn, chans, reqs, err := ssh.NewClientConn(conn, addr, cfg)
	if err != nil {
		// Even a failed auth gives us server banner / algo info
		// Try to extract info from the error or partial connection
		// If we can't connect at all, return error
		if !strings.Contains(err.Error(), "unable to authenticate") &&
			!strings.Contains(err.Error(), "no supported methods remain") {
			// Real connection failure – try to get algo info from banner
			return s.scanBanner(ctx, target, now)
		}
	}
	if sshConn != nil {
		defer func() { _ = sshConn.Close() }()
		go ssh.DiscardRequests(reqs)
		for range chans {
			// drain
		}
		negotiatedKex = string(sshConn.ClientVersion())
	}

	_ = negotiatedKex

	// Analyze host key algorithm
	hostKeyFindings := s.checkHostKey(target, hostKeyAlgo, now)
	findings = append(findings, hostKeyFindings...)

	return findings, nil
}

// scanBanner performs a lightweight SSH banner probe to gather KEX info
func (s *SSHScanner) scanBanner(ctx context.Context, target Target, now time.Time) ([]Finding, error) {
	var findings []Finding
	var hostKeyAlgo string

	cfg := &ssh.ClientConfig{
		User: "scanner",
		Auth: []ssh.AuthMethod{
			ssh.Password("wrongpassword"),
		},
		//nolint:gosec // intentionally accepting any host key for scanning purposes
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			hostKeyAlgo = key.Type()
			return nil
		},
		Config: ssh.Config{
			KeyExchanges: []string{
				"diffie-hellman-group1-sha1",
				"diffie-hellman-group14-sha1",
				"diffie-hellman-group14-sha256",
				"ecdh-sha2-nistp256",
				"curve25519-sha256",
			},
		},
		Timeout: 10 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", target.Host, target.Port)
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("dial %s: %w", addr, err)
	}
	defer func() { _ = conn.Close() }()

	sshConn, _, _, err := ssh.NewClientConn(conn, addr, cfg)
	if sshConn != nil {
		defer func() { _ = sshConn.Close() }()
	}
	// Expected to fail on auth, but host key will be set

	hostKeyFindings := s.checkHostKey(target, hostKeyAlgo, now)
	findings = append(findings, hostKeyFindings...)

	// If connection used weak KEX, add finding
	if err != nil && strings.Contains(err.Error(), "group1") {
		findings = append(findings, s.weakKEXFinding(target, "diffie-hellman-group1-sha1", now))
	}

	return findings, nil
}

func (s *SSHScanner) checkHostKey(target Target, hostKeyAlgo string, now time.Time) []Finding {
	var findings []Finding

	switch {
	case hostKeyAlgo == "ssh-dss":
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "ssh",
			FindingType: "WEAK_HOST_KEY_DSA",
			Title:       "DSA Host Key Detected",
			Description: "DSA (Digital Signature Algorithm) is limited to 1024-bit keys and is considered cryptographically weak. It is deprecated in OpenSSH.",
			Evidence:    fmt.Sprintf("SSH host key algorithm: %s", hostKeyAlgo),
			Severity:    SeverityCritical,
			Algorithm:   "DSA",
			KeyLength:   1024,
			Remediation: "Replace DSA host keys with Ed25519 or ECDSA P-256. Add 'HostKeyAlgorithms -ssh-dss' to sshd_config.",
			BSIRef:      "BSI TR-02102-4, Section 3.4",
			DORARef:     "DORA Art. 9(2)",
			EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	case strings.HasPrefix(hostKeyAlgo, "ssh-rsa"):
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "ssh",
			FindingType: "RSA_HOST_KEY",
			Title:       "RSA Host Key (Upgrade to Ed25519 Recommended)",
			Description: "RSA host keys are acceptable if ≥3072 bits, but Ed25519 is preferred for better performance and security.",
			Evidence:    fmt.Sprintf("SSH host key algorithm: %s", hostKeyAlgo),
			Severity:    SeverityMedium,
			Algorithm:   "RSA",
			Remediation: "Prefer Ed25519 host keys: run 'ssh-keygen -t ed25519 -f /etc/ssh/ssh_host_ed25519_key'.",
			BSIRef:      "BSI TR-02102-4, Section 3.4",
			DORARef:     "DORA Art. 9(2)",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	return findings
}

func (s *SSHScanner) weakKEXFinding(target Target, kex string, now time.Time) Finding {
	severity := SeverityHigh
	title := fmt.Sprintf("Weak SSH KEX Algorithm: %s", kex)
	desc := fmt.Sprintf("SSH key exchange algorithm '%s' is deprecated and considered weak.", kex)

	if kex == "diffie-hellman-group1-sha1" {
		severity = SeverityCritical
		title = "CRITICAL: Oakley Group 1 (768-bit DH) KEX Detected"
		desc = "diffie-hellman-group1-sha1 uses 768-bit Diffie-Hellman (Oakley Group 1) which is trivially breakable with modern hardware (Logjam attack)."
	}

	return Finding{
		ID:          uuid.New().String(),
		TargetID:    target.ID,
		TargetLabel: target.Label,
		Host:        target.Host,
		Port:        target.Port,
		Protocol:    "ssh",
		FindingType: "WEAK_SSH_KEX",
		Title:       title,
		Description: desc,
		Evidence:    fmt.Sprintf("SSH KEX algorithm offered: %s", kex),
		Severity:    severity,
		Algorithm:   kex,
		Remediation: "Remove weak KEX algorithms from sshd_config. Use curve25519-sha256 or diffie-hellman-group16-sha512.",
		BSIRef:      "BSI TR-02102-4, Section 3.2",
		DORARef:     "DORA Art. 9(2)",
		EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
		QuantumSafe: false,
		ScannedAt:   now,
	}
}
