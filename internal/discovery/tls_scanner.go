package discovery

import (
	"context"
	"crypto/ecdsa"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// TLSScanner scans TLS endpoints for cryptographic weaknesses
type TLSScanner struct{}

// Scan connects to a TLS endpoint and returns findings
func (s *TLSScanner) Scan(ctx context.Context, target Target) ([]Finding, error) {
	var findings []Finding
	now := time.Now()

	//nolint:gosec // intentionally connecting to potentially weak TLS for scanning purposes
	cfg := &tls.Config{
		InsecureSkipVerify: true,
		MinVersion:         tls.VersionTLS10,
		CipherSuites: []uint16{
			tls.TLS_RSA_WITH_RC4_128_SHA,
			tls.TLS_RSA_WITH_3DES_EDE_CBC_SHA,
			tls.TLS_RSA_WITH_AES_128_CBC_SHA,
			tls.TLS_RSA_WITH_AES_256_CBC_SHA,
			tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
			tls.TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_AES_128_GCM_SHA256,
			tls.TLS_AES_256_GCM_SHA384,
			tls.TLS_CHACHA20_POLY1305_SHA256,
		},
	}

	dialer := tls.Dialer{Config: cfg}
	addr := fmt.Sprintf("%s:%d", target.Host, target.Port)

	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("connect %s: %w", addr, err)
	}
	defer func() { _ = conn.Close() }()

	tlsConn, ok := conn.(*tls.Conn)
	if !ok {
		return nil, fmt.Errorf("not a TLS connection")
	}

	state := tlsConn.ConnectionState()

	// Check TLS version
	versionFindings := s.checkTLSVersion(target, state, now)
	findings = append(findings, versionFindings...)

	// Check cipher suite
	cipherFindings := s.checkCipherSuite(target, state, now)
	findings = append(findings, cipherFindings...)

	// Check certificates
	if len(state.PeerCertificates) > 0 {
		certFindings := s.checkCertificate(target, state.PeerCertificates[0], now)
		findings = append(findings, certFindings...)
	}

	return findings, nil
}

func (s *TLSScanner) checkTLSVersion(target Target, state tls.ConnectionState, now time.Time) []Finding {
	var findings []Finding

	switch state.Version {
	case tls.VersionTLS10:
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "tls",
			FindingType: "WEAK_TLS_VERSION",
			Title:       "TLS 1.0 Detected",
			Description: "TLS 1.0 is deprecated and contains known vulnerabilities (BEAST, POODLE). It is prohibited by BSI TR-02102-2 and eIDAS 2.0.",
			Evidence:    "TLS version: TLS 1.0 (0x0301)",
			Severity:    SeverityCritical,
			Algorithm:   "TLS 1.0",
			Remediation: "Upgrade to TLS 1.2 (minimum) or TLS 1.3. Disable TLS 1.0 and TLS 1.1 in server configuration.",
			BSIRef:      "BSI TR-02102-2, Section 3.2",
			DORARef:     "DORA Art. 9(2) – ICT risk management",
			EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	case tls.VersionTLS11:
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "tls",
			FindingType: "WEAK_TLS_VERSION",
			Title:       "TLS 1.1 Detected",
			Description: "TLS 1.1 is deprecated and should not be used. Upgrade to TLS 1.2 or TLS 1.3.",
			Evidence:    "TLS version: TLS 1.1 (0x0302)",
			Severity:    SeverityCritical,
			Algorithm:   "TLS 1.1",
			Remediation: "Upgrade to TLS 1.2 (minimum) or TLS 1.3. Disable TLS 1.1 in server configuration.",
			BSIRef:      "BSI TR-02102-2, Section 3.2",
			DORARef:     "DORA Art. 9(2) – ICT risk management",
			EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	case tls.VersionTLS12:
		// TLS 1.2 is acceptable, but flag if no forward secrecy
		if !hasForwardSecrecy(state.CipherSuite) {
			findings = append(findings, Finding{
				ID:          uuid.New().String(),
				TargetID:    target.ID,
				TargetLabel: target.Label,
				Host:        target.Host,
				Port:        target.Port,
				Protocol:    "tls",
				FindingType: "NO_FORWARD_SECRECY",
				Title:       "TLS 1.2 Without Forward Secrecy",
				Description: "TLS 1.2 is in use but the negotiated cipher suite does not provide forward secrecy (no ECDHE/DHE key exchange).",
				Evidence:    fmt.Sprintf("TLS 1.2 with cipher suite: %s", tls.CipherSuiteName(state.CipherSuite)),
				Severity:    SeverityHigh,
				Algorithm:   tls.CipherSuiteName(state.CipherSuite),
				Remediation: "Configure cipher suite preference to require ECDHE or DHE key exchange for forward secrecy.",
				BSIRef:      "BSI TR-02102-2, Section 3.3",
				DORARef:     "DORA Art. 9(2) – ICT risk management",
				EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
				QuantumSafe: false,
				ScannedAt:   now,
			})
		}
	}

	return findings
}

func (s *TLSScanner) checkCipherSuite(target Target, state tls.ConnectionState, now time.Time) []Finding {
	var findings []Finding

	suite := state.CipherSuite
	suiteName := tls.CipherSuiteName(suite)

	// Check for RC4
	if isRC4Cipher(suite) {
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "tls",
			FindingType: "WEAK_CIPHER_RC4",
			Title:       "RC4 Cipher Suite Detected",
			Description: "RC4 is a broken stream cipher with multiple known vulnerabilities (BEAST, RC4 biases). Its use is prohibited.",
			Evidence:    fmt.Sprintf("Negotiated cipher: %s", suiteName),
			Severity:    SeverityCritical,
			Algorithm:   "RC4",
			Remediation: "Disable RC4 cipher suites. Use ECDHE with AES-GCM or ChaCha20-Poly1305.",
			BSIRef:      "BSI TR-02102-2, Section 3.3.1",
			DORARef:     "DORA Art. 9(2) – ICT risk management",
			EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	// Check for 3DES
	if is3DESCipher(suite) {
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "tls",
			FindingType: "WEAK_CIPHER_3DES",
			Title:       "3DES Cipher Suite Detected",
			Description: "Triple-DES (3DES) has 64-bit block size making it vulnerable to the SWEET32 attack. It is deprecated.",
			Evidence:    fmt.Sprintf("Negotiated cipher: %s", suiteName),
			Severity:    SeverityCritical,
			Algorithm:   "3DES",
			Remediation: "Disable 3DES cipher suites. Use AES-128-GCM or AES-256-GCM.",
			BSIRef:      "BSI TR-02102-2, Section 3.3.1",
			DORARef:     "DORA Art. 9(2) – ICT risk management",
			EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	return findings
}

func (s *TLSScanner) checkCertificate(target Target, cert *x509.Certificate, now time.Time) []Finding {
	var findings []Finding

	// Check key type and length
	switch pub := cert.PublicKey.(type) {
	case *rsa.PublicKey:
		bits := pub.N.BitLen()
		switch {
		case bits < 2048:
			findings = append(findings, Finding{
				ID:          uuid.New().String(),
				TargetID:    target.ID,
				TargetLabel: target.Label,
				Host:        target.Host,
				Port:        target.Port,
				Protocol:    "tls",
				FindingType: "WEAK_KEY_RSA",
				Title:       fmt.Sprintf("RSA Key Too Short (%d bits)", bits),
				Description: fmt.Sprintf("RSA-%d key is cryptographically weak and can be factored with modern hardware. Minimum acceptable is RSA-2048.", bits),
				Evidence:    fmt.Sprintf("Certificate public key: RSA-%d", bits),
				Severity:    SeverityCritical,
				Algorithm:   "RSA",
				KeyLength:   bits,
				Remediation: "Replace certificate with RSA-3072 or higher (BSI recommends RSA-3072 for post-2022 use).",
				BSIRef:      "BSI TR-02102-1, Section 3.5",
				DORARef:     "DORA Art. 9(4)(b) – strong authentication",
				EIDASRef:    "eIDAS 2.0 Annex IV",
				QuantumSafe: false,
				ScannedAt:   now,
			})
		case bits == 2048:
			findings = append(findings, Finding{
				ID:          uuid.New().String(),
				TargetID:    target.ID,
				TargetLabel: target.Label,
				Host:        target.Host,
				Port:        target.Port,
				Protocol:    "tls",
				FindingType: "RSA_2048_SUBOPTIMAL",
				Title:       "RSA-2048 Key (Upgrade Recommended)",
				Description: "RSA-2048 meets current minimums but BSI TR-02102-1 recommends RSA-3072 or higher for long-term security beyond 2025.",
				Evidence:    "Certificate public key: RSA-2048",
				Severity:    SeverityMedium,
				Algorithm:   "RSA",
				KeyLength:   2048,
				Remediation: "Plan migration to RSA-3072 or ECDSA-P-256/P-384 for better performance and longer security horizon.",
				BSIRef:      "BSI TR-02102-1, Section 3.5",
				DORARef:     "DORA Art. 9(4)(b)",
				EIDASRef:    "eIDAS 2.0 Annex IV",
				QuantumSafe: false,
				ScannedAt:   now,
			})
		}
	case *ecdsa.PublicKey:
		bits := pub.Curve.Params().BitSize
		if bits < 256 {
			findings = append(findings, Finding{
				ID:          uuid.New().String(),
				TargetID:    target.ID,
				TargetLabel: target.Label,
				Host:        target.Host,
				Port:        target.Port,
				Protocol:    "tls",
				FindingType: "WEAK_KEY_EC",
				Title:       fmt.Sprintf("EC Key Too Short (%d bits)", bits),
				Description: fmt.Sprintf("EC-%d key does not meet minimum security requirements. Use P-256 or higher.", bits),
				Evidence:    fmt.Sprintf("Certificate public key: EC-%d", bits),
				Severity:    SeverityHigh,
				Algorithm:   "ECDSA",
				KeyLength:   bits,
				Remediation: "Replace with ECDSA P-256 or P-384 certificate.",
				BSIRef:      "BSI TR-02102-1, Section 3.6",
				DORARef:     "DORA Art. 9(4)(b)",
				EIDASRef:    "eIDAS 2.0 Annex IV",
				QuantumSafe: false,
				ScannedAt:   now,
			})
		}
	}

	// Check signature algorithm
	switch cert.SignatureAlgorithm {
	case x509.MD5WithRSA:
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "tls",
			FindingType: "WEAK_SIG_MD5",
			Title:       "MD5withRSA Certificate Signature",
			Description: "MD5 is cryptographically broken (collision attacks demonstrated). Certificates signed with MD5 can be forged.",
			Evidence:    fmt.Sprintf("Certificate signature algorithm: %s", cert.SignatureAlgorithm),
			Severity:    SeverityCritical,
			Algorithm:   "MD5withRSA",
			Remediation: "Re-issue certificate using SHA-256 or SHA-384 signature algorithm.",
			BSIRef:      "BSI TR-02102-1, Section 3.3",
			DORARef:     "DORA Art. 9(2)",
			EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	case x509.SHA1WithRSA, x509.ECDSAWithSHA1:
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "tls",
			FindingType: "WEAK_SIG_SHA1",
			Title:       "SHA-1 Certificate Signature",
			Description: "SHA-1 is deprecated for certificate signing. Practical collision attacks have been demonstrated (SHAttered). Browsers reject SHA-1 certificates.",
			Evidence:    fmt.Sprintf("Certificate signature algorithm: %s", cert.SignatureAlgorithm),
			Severity:    SeverityHigh,
			Algorithm:   "SHA1withRSA",
			Remediation: "Re-issue certificate using SHA-256 or SHA-384 signature algorithm.",
			BSIRef:      "BSI TR-02102-1, Section 3.3",
			DORARef:     "DORA Art. 9(2)",
			EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	// Check expiry
	if time.Now().After(cert.NotAfter) {
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "tls",
			FindingType: "CERT_EXPIRED",
			Title:       "Certificate Expired",
			Description: fmt.Sprintf("The TLS certificate expired on %s.", cert.NotAfter.Format(time.RFC3339)),
			Evidence:    fmt.Sprintf("Certificate NotAfter: %s", cert.NotAfter.Format(time.RFC3339)),
			Severity:    SeverityCritical,
			Remediation: "Renew the certificate immediately.",
			BSIRef:      "BSI TR-02102-2, Section 3.4",
			DORARef:     "DORA Art. 9(2)",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	return findings
}

// hasForwardSecrecy returns true if the cipher suite provides forward secrecy
func hasForwardSecrecy(suite uint16) bool {
	switch suite {
	case tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
		tls.TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA,
		tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256,
		tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
		tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA,
		tls.TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA,
		tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,
		tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,
		// TLS 1.3 always has forward secrecy
		tls.TLS_AES_128_GCM_SHA256,
		tls.TLS_AES_256_GCM_SHA384,
		tls.TLS_CHACHA20_POLY1305_SHA256:
		return true
	}
	return false
}

func isRC4Cipher(suite uint16) bool {
	switch suite {
	case tls.TLS_RSA_WITH_RC4_128_SHA,
		tls.TLS_ECDHE_RSA_WITH_RC4_128_SHA,
		tls.TLS_ECDHE_ECDSA_WITH_RC4_128_SHA:
		return true
	}
	return false
}

func is3DESCipher(suite uint16) bool {
	return suite == tls.TLS_RSA_WITH_3DES_EDE_CBC_SHA ||
		suite == tls.TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA
}
