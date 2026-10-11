// Package certeng is the RivicQ certificate engine. It extracts X.509
// *metadata* (subject, issuer, serial, validity, public-key algorithm, key size,
// curve, signature algorithm, SANs, fingerprint, usage) and computes classical,
// quantum and expiry risk plus a migration priority.
//
// It NEVER reads or emits private keys, credential secrets or SIM/SE material.
package certeng

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"strings"
	"time"
)

// Metadata is the parsed, non-secret view of an X.509 certificate.
type Metadata struct {
	Subject            string    `json:"subject"`
	Issuer             string    `json:"issuer"`
	Serial             string    `json:"serial"`
	NotBefore          time.Time `json:"not_before"`
	NotAfter           time.Time `json:"not_after"`
	PublicKeyAlgorithm string    `json:"public_key_algorithm"`
	KeySize            int       `json:"key_size,omitempty"`
	Curve              string    `json:"curve,omitempty"`
	SignatureAlgorithm string    `json:"signature_algorithm"`
	SAN                []string  `json:"san,omitempty"`
	FingerprintSHA256  string    `json:"fingerprint_sha256"`
	IsCA               bool      `json:"is_ca"`
	SelfSigned         bool      `json:"self_signed"`
	Usage              []string  `json:"usage,omitempty"`
	Source             string    `json:"source,omitempty"`
}

// RiskReport is the classical/quantum/expiry assessment of a certificate.
type RiskReport struct {
	ClassicalRisk     string   `json:"classical_risk"`
	QuantumStatus     string   `json:"quantum_status"`
	QuantumRisk       string   `json:"quantum_risk"`
	ExpiryStatus      string   `json:"expiry_status"`
	DaysToExpiry      int      `json:"days_to_expiry"`
	MigrationPriority string   `json:"migration_priority"`
	Evidence          []string `json:"evidence"`
}

// ParseDER parses a single DER-encoded X.509 certificate into Metadata.
func ParseDER(der []byte, source string) (*Metadata, error) {
	cert, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, err
	}
	return fromCert(cert, source), nil
}

// ParsePEM returns metadata for every certificate found in a byte blob. It
// handles both well-formed PEM streams and certificates embedded in binaries
// (e.g. NUL-padded firmware images). Non-certificate PEM blocks (e.g. private
// keys) are ignored and never read.
func ParsePEM(data []byte, source string) []*Metadata {
	var out []*Metadata
	seen := map[string]bool{}
	add := func(der []byte) {
		m, err := ParseDER(der, source)
		if err != nil {
			return
		}
		if seen[m.FingerprintSHA256] {
			return
		}
		seen[m.FingerprintSHA256] = true
		out = append(out, m)
	}

	rest := data
	for {
		block, r := pem.Decode(rest)
		if block == nil {
			break
		}
		rest = r
		if block.Type == "CERTIFICATE" {
			add(block.Bytes)
		}
	}

	const begin = "-----BEGIN CERTIFICATE-----"
	const end = "-----END CERTIFICATE-----"
	idx := 0
	for {
		i := bytes.Index(data[idx:], []byte(begin))
		if i < 0 {
			break
		}
		start := idx + i
		e := bytes.Index(data[start:], []byte(end))
		if e < 0 {
			break
		}
		endPos := start + e + len(end)
		seg := append(append([]byte{}, data[start:endPos]...), '\n')
		if block, _ := pem.Decode(seg); block != nil && block.Type == "CERTIFICATE" {
			add(block.Bytes)
		}
		idx = endPos
	}
	return out
}

// ExtractFromBytes finds certificates in an arbitrary blob: PEM blocks first,
// then a whole-file DER attempt. It never parses private keys.
func ExtractFromBytes(data []byte, source string) []*Metadata {
	if out := ParsePEM(data, source); len(out) > 0 {
		return out
	}
	if m, err := ParseDER(data, source); err == nil {
		return []*Metadata{m}
	}
	return nil
}

func fromCert(cert *x509.Certificate, source string) *Metadata {
	fp := sha256.Sum256(cert.Raw)
	m := &Metadata{
		Subject:            cert.Subject.String(),
		Issuer:             cert.Issuer.String(),
		Serial:             cert.SerialNumber.String(),
		NotBefore:          cert.NotBefore.UTC(),
		NotAfter:           cert.NotAfter.UTC(),
		PublicKeyAlgorithm: cert.PublicKeyAlgorithm.String(),
		SignatureAlgorithm: cert.SignatureAlgorithm.String(),
		FingerprintSHA256:  hex.EncodeToString(fp[:]),
		IsCA:               cert.IsCA,
		SelfSigned:         cert.Subject.String() == cert.Issuer.String(),
		Source:             source,
	}
	m.SAN = append(m.SAN, cert.DNSNames...)
	for _, ip := range cert.IPAddresses {
		m.SAN = append(m.SAN, ip.String())
	}
	m.SAN = append(m.SAN, cert.EmailAddresses...)
	for _, u := range cert.URIs {
		m.SAN = append(m.SAN, u.String())
	}
	if cert.KeyUsage != 0 {
		m.Usage = usageNames(cert.KeyUsage)
	}
	fillKey(m, cert)
	return m
}

func fillKey(m *Metadata, cert *x509.Certificate) {
	switch pub := cert.PublicKey.(type) {
	case *rsa.PublicKey:
		m.KeySize = pub.N.BitLen()
	case *ecdsa.PublicKey:
		if pub.Curve != nil {
			m.Curve = pub.Curve.Params().Name
			m.KeySize = pub.Curve.Params().BitSize
		}
	case ed25519.PublicKey:
		m.KeySize = 256
	case interface{ Size() int }:
		m.KeySize = pub.Size() * 8
	}
}

func usageNames(u x509.KeyUsage) []string {
	var out []string
	add := func(bit x509.KeyUsage, name string) {
		if u&bit != 0 {
			out = append(out, name)
		}
	}
	add(x509.KeyUsageDigitalSignature, "digital_signature")
	add(x509.KeyUsageKeyEncipherment, "key_encipherment")
	add(x509.KeyUsageCertSign, "cert_sign")
	add(x509.KeyUsageCRLSign, "crl_sign")
	add(x509.KeyUsageKeyAgreement, "key_agreement")
	return out
}

// Assess computes classical risk, quantum status/risk, expiry and migration priority.
func Assess(m *Metadata, now time.Time, deviceLifetime string) RiskReport {
	r := RiskReport{}
	alg := normalizeAlg(m.PublicKeyAlgorithm)

	switch {
	case alg == "RSA" && m.KeySize > 0 && m.KeySize < 2048:
		r.ClassicalRisk = "CRITICAL"
		r.Evidence = append(r.Evidence, fmt.Sprintf("RSA key %d bits < 2048", m.KeySize))
	case alg == "RSA" && m.KeySize == 2048:
		r.ClassicalRisk = "HIGH"
		r.Evidence = append(r.Evidence, "RSA-2048 classified (Shor family), deprecating")
	case alg == "ECC" && m.KeySize > 0 && m.KeySize < 256:
		r.ClassicalRisk = "HIGH"
		r.Evidence = append(r.Evidence, fmt.Sprintf("ECC key %d bits < 256", m.KeySize))
	case alg == "DSA":
		r.ClassicalRisk = "HIGH"
		r.Evidence = append(r.Evidence, "DSA deprecated")
	default:
		r.ClassicalRisk = "LOW"
	}

	if isSHA1(m.SignatureAlgorithm) {
		r.ClassicalRisk = escalate(r.ClassicalRisk, "HIGH")
		r.Evidence = append(r.Evidence, "SHA-1 signature")
	}
	if isMD5(m.SignatureAlgorithm) {
		r.ClassicalRisk = escalate(r.ClassicalRisk, "CRITICAL")
		r.Evidence = append(r.Evidence, "MD5 signature")
	}

	switch alg {
	case "RSA", "ECC", "EdDSA", "DH":
		r.QuantumStatus = "quantum_vulnerable"
		r.QuantumRisk = "HIGH"
		r.Evidence = append(r.Evidence, alg+" is broken by Shor's algorithm")
	case "ML-KEM", "ML-DSA", "SLH-DSA":
		r.QuantumStatus = "quantum_safe"
		r.QuantumRisk = "SAFE"
	default:
		r.QuantumStatus = "unknown"
		r.QuantumRisk = "MEDIUM"
	}

	r.DaysToExpiry = int(m.NotAfter.Sub(now).Hours() / 24)
	switch {
	case now.After(m.NotAfter):
		r.ExpiryStatus = "expired"
	case r.DaysToExpiry <= 30:
		r.ExpiryStatus = "expiring_soon"
	default:
		r.ExpiryStatus = "valid"
	}

	r.MigrationPriority = migrationPriority(r, deviceLifetime)
	return r
}

func migrationPriority(r RiskReport, deviceLifetime string) string {
	score := 0
	switch r.QuantumRisk {
	case "HIGH":
		score += 2
	case "MEDIUM":
		score++
	}
	switch r.ClassicalRisk {
	case "CRITICAL":
		score += 2
	case "HIGH":
		score++
	}
	if r.ExpiryStatus != "valid" {
		score++
	}
	switch deviceLifetime {
	case "10+ years", "5-10 years", "10 years+":
		score++
	}
	switch {
	case score >= 4:
		return "P0"
	case score >= 2:
		return "P1"
	default:
		return "P2"
	}
}

func escalate(cur, next string) string {
	order := map[string]int{"": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
	if order[next] > order[cur] {
		return next
	}
	return cur
}

func normalizeAlg(a string) string {
	u := strings.ToUpper(a)
	switch {
	case strings.Contains(u, "RSA"):
		return "RSA"
	case strings.Contains(u, "ECDSA"), strings.Contains(u, "ECC"):
		return "ECC"
	case strings.Contains(u, "ED25519"), strings.Contains(u, "EDDSA"):
		return "EdDSA"
	case strings.Contains(u, "ML-DSA"), strings.Contains(u, "MLDSA"):
		return "ML-DSA"
	case strings.Contains(u, "ML-KEM"), strings.Contains(u, "MLKEM"), strings.Contains(u, "KYBER"):
		return "ML-KEM"
	case strings.Contains(u, "SLH-DSA"), strings.Contains(u, "SPHINCS"):
		return "SLH-DSA"
	case strings.Contains(u, "DSA"):
		return "DSA"
	case strings.Contains(u, "DH"):
		return "DH"
	default:
		return a
	}
}

func isSHA1(s string) bool {
	u := strings.ToUpper(s)
	return strings.Contains(u, "SHA1") || strings.Contains(u, "SHA-1")
}

func isMD5(s string) bool {
	return strings.Contains(strings.ToUpper(s), "MD5")
}
