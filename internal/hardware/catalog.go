// Package hardware is the declared cryptographic-module inventory (HBOM).
// It does not reverse-engineer firmware, extract keys, or claim a shipped QSIC chip.
package hardware

// DeclaredAsset is operator-supplied or catalog metadata for HSM / TPM / SE / QSIC / QRNG.
type DeclaredAsset struct {
	ID          string   `json:"id"`
	Kind        string   `json:"kind"` // hsm | tpm | se | qsic | qrng
	Vendor      string   `json:"vendor"`
	Model       string   `json:"model"`
	Algorithms  []string `json:"algorithms"`
	FIPS        string   `json:"fips"`
	Shipped     bool     `json:"shipped"`
	Connectable bool     `json:"connectable"`
	Note        string   `json:"note"`
}

const Honesty = "Declared hardware inventory only. QSIC is a research ASIC roadmap (ML-KEM / ML-DSA / SLH-DSA, FIPS 140-3 Level 3 target). This is not a certified module, not a live silicon run, and not firmware reverse-engineering."

// Catalog returns the static hardware frame the product can inventory today.
func Catalog() []DeclaredAsset {
	return []DeclaredAsset{
		{
			ID:         "qsic-research-asic",
			Kind:       "qsic",
			Vendor:     "RivicQ",
			Model:      "QSIC research ASIC (65nm, NTT)",
			Algorithms: []string{"ML-KEM", "ML-DSA", "SLH-DSA"},
			FIPS:       "FIPS 140-3 Level 3 roadmap — not certified today",
			Shipped:    false,
			Note:       "Research hardware. Inventory and declare; do not present as a deployed HSM.",
		},
		{
			ID:          "generic-hsm",
			Kind:        "hsm",
			Vendor:      "customer-declared",
			Model:       "PKCS#11 / cloud HSM connector",
			Algorithms:  []string{"AES-256", "RSA", "ECDSA", "ML-KEM"},
			FIPS:        "Customer module attestation — not issued by RivicQ",
			Shipped:     true,
			Connectable: true,
			Note:        "Enterprise connector when the customer supplies credentials. Empty when disconnected.",
		},
		{
			ID:         "generic-tpm",
			Kind:       "tpm",
			Vendor:     "customer-declared",
			Model:      "TPM 2.0",
			Algorithms: []string{"SHA-256", "ECDSA", "AES-128"},
			FIPS:       "Declared TPM 2.0 inventory",
			Shipped:    true,
			Note:       "Operator-supplied TPM metadata. Keys are not extracted.",
		},
		{
			ID:         "generic-qrng",
			Kind:       "qrng",
			Vendor:     "customer-declared",
			Model:      "QRNG entropy source",
			Algorithms: []string{"entropy"},
			Note:       "Optional entropy source. Not required for CBOM or Qiskit scoring.",
		},
	}
}

// Match returns catalog entries whose id, kind, or model contains label (case-insensitive).
func Match(label string) []DeclaredAsset {
	if label == "" || label == "declared-crypto-module" {
		return Catalog()
	}
	out := make([]DeclaredAsset, 0)
	for _, a := range Catalog() {
		if containsFold(a.ID, label) || containsFold(a.Kind, label) || containsFold(a.Model, label) {
			out = append(out, a)
		}
	}
	if len(out) == 0 {
		return Catalog()
	}
	return out
}

func containsFold(haystack, needle string) bool {
	h, n := []rune(haystack), []rune(needle)
	if len(n) == 0 {
		return true
	}
	hl, nl := toLower(string(h)), toLower(string(n))
	return len(hl) >= len(nl) && (hl == nl || indexOf(hl, nl) >= 0)
}

func toLower(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		b[i] = c
	}
	return string(b)
}

func indexOf(haystack, needle string) int {
	n := len(needle)
	if n == 0 {
		return 0
	}
	for i := 0; i+n <= len(haystack); i++ {
		if haystack[i:i+n] == needle {
			return i
		}
	}
	return -1
}
