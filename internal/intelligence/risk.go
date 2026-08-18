package intelligence

import "strings"

const RiskMethod = "crypto_risk = algorithm + key_strength + usage_criticality + exposure + quantum_migration + compliance_impact (capped at 100)"

// ScoreCrypto produces an explainable risk score. Detection is not the same as
// vulnerability — RSA-2048 is classified, not automatically "vulnerable".
func ScoreCrypto(f Finding) RiskBreakdown {
	var factors []Factor
	add := func(label string, pts int) {
		if pts != 0 {
			factors = append(factors, Factor{Label: label, Points: pts})
		}
	}

	algo := strings.ToUpper(f.Algorithm + " " + f.Evidence + " " + f.Location)
	switch {
	case strings.Contains(algo, "MD5") || strings.Contains(algo, "SHA-1") || strings.Contains(algo, "SHA1"):
		add("Broken or legacy hash", 28)
	case strings.Contains(algo, "3DES") || strings.Contains(algo, "RC4") || strings.Contains(algo, "DES"):
		add("Broken or legacy cipher", 30)
	case strings.Contains(algo, "DSA") && !strings.Contains(algo, "ECDSA") && !strings.Contains(algo, "ML-DSA"):
		add("Legacy DSA", 24)
	case strings.Contains(algo, "RSA"):
		bits := f.KeyLength
		if bits == 0 {
			bits = parseBits(algo)
		}
		switch {
		case bits > 0 && bits < 2048:
			add("RSA key shorter than 2048 bits", 32)
		case bits == 2048:
			add("RSA-2048 (classical, BSI sunset for new systems)", 16)
		default:
			add("RSA (quantum-vulnerable primitive)", 12)
		}
	case strings.Contains(algo, "ECDSA") || strings.Contains(algo, "ECDH") || strings.Contains(algo, "P-256"):
		add("Elliptic-curve primitive (quantum-vulnerable)", 14)
	case strings.Contains(algo, "TLS 1.0") || strings.Contains(algo, "TLS1.0") || strings.Contains(algo, "TLS 1.1"):
		add("TLS below 1.2", 26)
	}

	switch strings.ToLower(f.Usage) {
	case "transport authentication", "remote access", "signature verification":
		add("Usage criticality (auth/transport)", 12)
	case "credential material":
		add("Usage criticality (secrets)", 18)
	}

	if strings.Contains(strings.ToLower(f.Evidence+f.Location), "0.0.0.0") ||
		strings.Contains(strings.ToLower(f.Evidence), "public") {
		add("Internet exposure indicator", 16)
	}
	if f.KEV {
		add("CISA KEV", 20)
	}
	if f.CVE != "" {
		add("Known CVE mapping", 10)
	}
	if !f.QuantumSafe && (strings.Contains(algo, "RSA") || strings.Contains(algo, "EC")) {
		add("Quantum migration risk (no PQC plan asserted)", 8)
	}
	if len(f.Controls) > 0 {
		add("Compliance control mapping", 6)
	}

	score := 0
	for _, c := range factors {
		score += c.Points
	}
	if score > 100 {
		score = 100
	}
	level := "LOW"
	switch {
	case score >= 70:
		level = "CRITICAL"
	case score >= 45:
		level = "HIGH"
	case score >= 25:
		level = "MEDIUM"
	case score == 0:
		level = normalizeSeverity(f.Severity)
		if level == "INFO" {
			level = "LOW"
		}
	}
	return RiskBreakdown{Score: score, Level: level, Contributors: factors, Method: RiskMethod}
}

func parseBits(s string) int {
	for _, n := range []int{1024, 2048, 3072, 4096} {
		if strings.Contains(s, itoa(n)) {
			return n
		}
	}
	return 0
}

func itoa(n int) string {
	if n == 1024 {
		return "1024"
	}
	if n == 2048 {
		return "2048"
	}
	if n == 3072 {
		return "3072"
	}
	return "4096"
}
