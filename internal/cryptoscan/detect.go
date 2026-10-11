// Package cryptoscan is the vendor-neutral cryptographic detection core shared
// by every RivicQ artifact analyzer (firmware, identity, configuration). It maps
// string/section evidence to crypto libraries, algorithms, crypto APIs,
// protocols and silicon markers using data-driven domain profiles.
//
// Detection is evidence-based: a library "present" marker is distinct from a
// concrete algorithm reference. Nothing here executes code or reads secrets.
package cryptoscan

import (
	"sort"
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/profile"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/qiskitprofile"
)

// ExtractStrings returns printable ASCII runs of at least minLen bytes, capped
// at max. It never interprets the bytes as code.
func ExtractStrings(data []byte, minLen, max int) []string {
	if minLen < 1 {
		minLen = 4
	}
	var out []string
	var cur strings.Builder
	flush := func() {
		if cur.Len() >= minLen {
			out = append(out, cur.String())
		}
		cur.Reset()
	}
	for _, b := range data {
		if b >= 0x20 && b <= 0x7E {
			cur.WriteByte(b)
		} else {
			flush()
		}
		if len(out) >= max {
			break
		}
	}
	flush()
	return out
}

// Surface is a searchable haystack of strings plus a lowercased copy.
type Surface struct {
	join  string
	lower string
}

// NewSurface builds a search surface from strings.
func NewSurface(strs []string) *Surface {
	j := strings.Join(strs, "\n")
	return &Surface{join: j, lower: strings.ToLower(j)}
}

// Has reports whether any marker occurs (case-insensitive).
func (s *Surface) Has(markers ...string) (string, bool) {
	if s == nil {
		return "", false
	}
	for _, m := range markers {
		if m == "" {
			continue
		}
		if strings.Contains(s.lower, strings.ToLower(m)) {
			return m, true
		}
	}
	return "", false
}

// All returns every marker that occurs (case-insensitive), preserving order.
func (s *Surface) All(markers []string) []string {
	if s == nil {
		return nil
	}
	var out []string
	for _, m := range markers {
		if m == "" {
			continue
		}
		if strings.Contains(s.lower, strings.ToLower(m)) {
			out = append(out, m)
		}
	}
	return out
}

// AllToken returns every marker that occurs as a token: the character or byte
// immediately before the match must not be alphanumeric. This prevents
// cross-algorithm false positives such as "DSA" inside "ecdsa" or "DH" inside
// "ecdh", while still matching "mbedtls_ecdsa" (preceded by '_').
func (s *Surface) AllToken(markers []string) []string {
	if s == nil {
		return nil
	}
	var out []string
	for _, m := range markers {
		if m == "" {
			continue
		}
		if s.tokenContains(strings.ToLower(m)) {
			out = append(out, m)
		}
	}
	return out
}

func (s *Surface) tokenContains(m string) bool {
	idx := 0
	for {
		i := strings.Index(s.lower[idx:], m)
		if i < 0 {
			return false
		}
		pos := idx + i
		if pos == 0 || !isAlnumByte(s.lower[pos-1]) {
			return true
		}
		idx = pos + 1
		if idx >= len(s.lower) {
			return false
		}
	}
}

func isAlnumByte(b byte) bool {
	return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || (b >= '0' && b <= '9')
}

// LibraryFinding is a crypto library detected by string evidence.
type LibraryFinding struct {
	Library    string   `json:"library"`
	Version    string   `json:"version,omitempty"`
	Markers    []string `json:"markers"`
	Algorithms []string `json:"algorithms,omitempty"`
	Confidence float64  `json:"confidence"`
	Location   string   `json:"location,omitempty"`
}

// AlgorithmFinding is a cryptographic algorithm reference.
type AlgorithmFinding struct {
	Algorithm   string   `json:"algorithm"`
	Category    string   `json:"category"`
	Markers     []string `json:"markers,omitempty"`
	Referenced  bool     `json:"referenced"`
	AttackClass string   `json:"attack_class"`
	QuantumSafe bool     `json:"quantum_safe"`
	QuantumRisk string   `json:"quantum_risk"`
	PQCStatus   string   `json:"pqc_status"`
	Replacement string   `json:"replacement,omitempty"`
	Migration   string   `json:"migration,omitempty"`
	Confidence  float64  `json:"confidence"`
	Evidence    string   `json:"evidence,omitempty"`
}

// APIFinding is a crypto API surface (PSA Crypto, TF-M, PKCS#11, ...).
type APIFinding struct {
	API     string   `json:"api"`
	Markers []string `json:"markers"`
	Note    string   `json:"note,omitempty"`
}

// ProtocolFinding is a wire/transport protocol.
type ProtocolFinding struct {
	Protocol string   `json:"protocol"`
	Layer    string   `json:"layer,omitempty"`
	Markers  []string `json:"markers"`
}

// RuleFinding is a secure-boot / RoT / device-identity / attestation marker.
type RuleFinding struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Kind    string   `json:"kind"`
	Markers []string `json:"markers"`
	Note    string   `json:"note,omitempty"`
}

// Detection is the full detection result for one artifact surface.
type Detection struct {
	Libraries  []LibraryFinding   `json:"crypto_libraries"`
	Algorithms []AlgorithmFinding `json:"algorithms"`
	CryptoAPIs []APIFinding       `json:"crypto_apis"`
	Protocols  []ProtocolFinding  `json:"protocols"`
	Rules      []RuleFinding      `json:"rules"`
}

// Detect runs the full detection set against a string corpus.
func Detect(p profile.Profile, strs []string) Detection {
	surface := NewSurface(strs)
	return Detection{
		Libraries:  detectLibraries(surface, p),
		Algorithms: detectAlgorithms(surface),
		CryptoAPIs: detectAPIs(surface, p),
		Protocols:  detectProtocols(surface, p),
		Rules:      detectRules(surface, p),
	}
}

type algorithmRule struct {
	Algorithm   string
	Category    string
	Markers     []string
	Replacement string
}

func algorithmCatalog() []algorithmRule {
	return []algorithmRule{
		{Algorithm: "RSA", Category: "asymmetric", Replacement: "ML-KEM (KEM) / hybrid; ML-DSA (signatures)", Markers: []string{"RSA", "rsa_", "RSA_", "rsaEncryption"}},
		{Algorithm: "ECDSA", Category: "asymmetric", Replacement: "ML-DSA / SLH-DSA (hybrid during transition)", Markers: []string{"ECDSA", "ecdsa_", "ECDSA_sign", "ecdsa_sign"}},
		{Algorithm: "ECDH", Category: "asymmetric", Replacement: "ML-KEM / hybrid X25519+ML-KEM", Markers: []string{"ECDH", "ecdh_", "ECDHE"}},
		{Algorithm: "Ed25519", Category: "asymmetric", Replacement: "ML-DSA", Markers: []string{"Ed25519", "ed25519", "ED25519"}},
		{Algorithm: "X25519", Category: "asymmetric", Replacement: "X25519+ML-KEM hybrid", Markers: []string{"X25519", "x25519", "curve25519"}},
		{Algorithm: "DH", Category: "asymmetric", Replacement: "ML-KEM", Markers: []string{"Diffie-Hellman", "diffie_hellman", "dh_generate", "DH_generate", "dh_compute", "DH_compute", "dhkey"}},
		{Algorithm: "DSA", Category: "asymmetric", Replacement: "ML-DSA", Markers: []string{"OpenSSL DSA", "DSA signature", "dsa_key", "DSA key", "(DSA)", "DSA-"}},
		{Algorithm: "ML-KEM", Category: "kem", Replacement: "-", Markers: []string{"ML-KEM", "MLKEM", "Kyber", "kyber", "CRYSTALS-Kyber"}},
		{Algorithm: "ML-DSA", Category: "asymmetric", Replacement: "-", Markers: []string{"ML-DSA", "MLDSA", "Dilithium", "dilithium"}},
		{Algorithm: "SLH-DSA", Category: "asymmetric", Replacement: "-", Markers: []string{"SLH-DSA", "SPHINCS", "sphincs", "SPHINCS+"}},
		{Algorithm: "AES", Category: "symmetric", Replacement: "AES-256", Markers: []string{"AES", "aes_", "AES_", "aes_gcm", "AES-GCM"}},
		{Algorithm: "3DES", Category: "symmetric", Replacement: "AES-256", Markers: []string{"3DES", "Triple-DES", "DES3", "des3"}},
		{Algorithm: "DES", Category: "symmetric", Replacement: "AES-256", Markers: []string{"DES_", "_DES", "des_cbc"}},
		{Algorithm: "RC4", Category: "symmetric", Replacement: "AES-256-GCM / ChaCha20", Markers: []string{"RC4", "rc4", "arc4"}},
		{Algorithm: "ChaCha20", Category: "symmetric", Replacement: "-", Markers: []string{"ChaCha20", "chacha20", "CHACHA20"}},
		{Algorithm: "SHA-1", Category: "hash", Replacement: "SHA-256/384", Markers: []string{"SHA-1", "SHA1", "sha1", "SHA1_"}},
		{Algorithm: "SHA-256", Category: "hash", Replacement: "-", Markers: []string{"SHA-256", "SHA256", "sha256"}},
		{Algorithm: "SHA-512", Category: "hash", Replacement: "-", Markers: []string{"SHA-512", "SHA512", "sha512"}},
		{Algorithm: "SHA3", Category: "hash", Replacement: "-", Markers: []string{"SHA3", "sha3", "Keccak"}},
		{Algorithm: "MD5", Category: "hash", Replacement: "SHA-256", Markers: []string{"MD5", "md5_"}},
		{Algorithm: "HMAC", Category: "mac", Replacement: "-", Markers: []string{"HMAC", "hmac_", "CMAC", "cmac"}},
		{Algorithm: "Poly1305", Category: "mac", Replacement: "-", Markers: []string{"Poly1305", "poly1305"}},
	}
}

func detectLibraries(surface *Surface, p profile.Profile) []LibraryFinding {
	var out []LibraryFinding
	for _, rule := range p.Libraries {
		markers := surface.All(rule.Markers)
		if len(markers) == 0 {
			continue
		}
		out = append(out, LibraryFinding{
			Library:    rule.Library,
			Markers:    markers,
			Algorithms: rule.Algorithms,
			Confidence: confidenceFor(len(markers)),
			Location:   "string-evidence",
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Library < out[j].Library })
	return out
}

func detectAlgorithms(surface *Surface) []AlgorithmFinding {
	var out []AlgorithmFinding
	for _, rule := range algorithmCatalog() {
		markers := surface.AllToken(rule.Markers)
		if len(markers) == 0 {
			continue
		}
		cl := qiskitprofile.Classify(rule.Algorithm, 0)
		out = append(out, AlgorithmFinding{
			Algorithm:   rule.Algorithm,
			Category:    rule.Category,
			Markers:     markers,
			Referenced:  true,
			AttackClass: string(cl.AttackClass),
			QuantumSafe: cl.QuantumSafe,
			PQCStatus:   PQCStatus(cl),
			Replacement: rule.Replacement,
			Migration:   cl.Migration,
			Confidence:  confidenceFor(len(markers)),
			Evidence:    "string-evidence: " + strings.Join(markers, ", "),
			QuantumRisk: QuantumRisk(cl),
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Algorithm < out[j].Algorithm })
	return out
}

func detectAPIs(surface *Surface, p profile.Profile) []APIFinding {
	var out []APIFinding
	for _, rule := range p.CryptoAPIs {
		markers := surface.All(rule.Markers)
		if len(markers) == 0 {
			continue
		}
		out = append(out, APIFinding{API: rule.API, Markers: markers, Note: rule.Note})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].API < out[j].API })
	return out
}

func detectProtocols(surface *Surface, p profile.Profile) []ProtocolFinding {
	var out []ProtocolFinding
	for _, rule := range p.Protocols {
		markers := surface.All(rule.Markers)
		if len(markers) == 0 {
			continue
		}
		out = append(out, ProtocolFinding{Protocol: rule.Protocol, Layer: rule.Layer, Markers: markers})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Protocol < out[j].Protocol })
	return out
}

func detectRules(surface *Surface, p profile.Profile) []RuleFinding {
	var out []RuleFinding
	for _, rule := range p.Rules {
		markers := surface.All(rule.Markers)
		if len(markers) == 0 {
			continue
		}
		out = append(out, RuleFinding{ID: rule.ID, Label: rule.Label, Kind: rule.Kind, Markers: markers, Note: rule.Note})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

// Algorithm builds a classified AlgorithmFinding for a known algorithm name
// without string evidence (e.g. derived from a parsed certificate's public-key
// or signature algorithm). It is the certificate-derived counterpart to the
// string-based detection in Detect.
func Algorithm(name, evidence string) AlgorithmFinding {
	rule := algorithmRule{Algorithm: name, Category: "asymmetric", Replacement: "-"}
	for _, r := range algorithmCatalog() {
		if strings.EqualFold(r.Algorithm, name) {
			rule = r
			break
		}
	}
	cl := qiskitprofile.Classify(rule.Algorithm, 0)
	return AlgorithmFinding{
		Algorithm:   rule.Algorithm,
		Category:    rule.Category,
		Referenced:  true,
		AttackClass: string(cl.AttackClass),
		QuantumSafe: cl.QuantumSafe,
		PQCStatus:   PQCStatus(cl),
		Replacement: rule.Replacement,
		Migration:   cl.Migration,
		Confidence:  0.9,
		Evidence:    evidence,
		QuantumRisk: QuantumRisk(cl),
	}
}

// AlgorithmsFromCert maps an X.509 certificate's public-key and signature
// algorithm names (as reported by crypto/x509) to canonical catalog algorithm
// names. It returns a de-duplicated, sorted list.
func AlgorithmsFromCert(pub, sig string) []string {
	set := map[string]bool{}
	add := func(s string) {
		s = strings.ToUpper(s)
		switch {
		case strings.Contains(s, "ML-DSA"), strings.Contains(s, "MLDSA"):
			set["ML-DSA"] = true
		case strings.Contains(s, "ML-KEM"), strings.Contains(s, "KYBER"):
			set["ML-KEM"] = true
		case strings.Contains(s, "SLH-DSA"), strings.Contains(s, "SPHINCS"):
			set["SLH-DSA"] = true
		case strings.Contains(s, "ECDSA"), strings.Contains(s, "ECC"):
			set["ECDSA"] = true
		case strings.Contains(s, "ED25519"), strings.Contains(s, "EDDSA"):
			set["Ed25519"] = true
		case strings.Contains(s, "RSA"):
			set["RSA"] = true
		case strings.Contains(s, "DSA"):
			set["DSA"] = true
		case strings.Contains(s, "DH"):
			set["DH"] = true
		}
		switch {
		case strings.Contains(s, "SHA-1"), strings.Contains(s, "SHA1"):
			set["SHA-1"] = true
		case strings.Contains(s, "SHA-256"), strings.Contains(s, "SHA256"):
			set["SHA-256"] = true
		case strings.Contains(s, "SHA-384"), strings.Contains(s, "SHA384"):
			set["SHA-384"] = true
		case strings.Contains(s, "SHA-512"), strings.Contains(s, "SHA512"):
			set["SHA-512"] = true
		case strings.Contains(s, "MD5"):
			set["MD5"] = true
		}
	}
	add(pub)
	add(sig)
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func confidenceFor(markerHits int) float64 {
	switch {
	case markerHits >= 3:
		return 0.95
	case markerHits == 2:
		return 0.85
	case markerHits == 1:
		return 0.7
	default:
		return 0.5
	}
}

// PQCStatus maps a Qiskit classification to a PQC status string.
func PQCStatus(cl qiskitprofile.AlgorithmScore) string {
	switch {
	case cl.AttackClass == qiskitprofile.AttackPQC:
		return "quantum_safe"
	case cl.QiskitFamily == "broken_classical":
		return "broken_classical"
	case cl.AttackClass == qiskitprofile.AttackShor:
		return "migration_required"
	case cl.AttackClass == qiskitprofile.AttackGrover:
		if cl.QuantumSafe {
			return "quantum_resistant"
		}
		return "migration_recommended"
	default:
		return "unclassified"
	}
}

// QuantumRisk maps a Qiskit classification to a risk level.
func QuantumRisk(cl qiskitprofile.AlgorithmScore) string {
	switch cl.AttackClass {
	case qiskitprofile.AttackShor:
		return "HIGH"
	case qiskitprofile.AttackGrover:
		if cl.QuantumSafe {
			return "LOW"
		}
		return "MEDIUM"
	case qiskitprofile.AttackPQC:
		return "SAFE"
	default:
		return "UNKNOWN"
	}
}

// RiskFromPQC maps a PQC status to a CBOM risk level.
func RiskFromPQC(status string) string {
	switch status {
	case "migration_required":
		return "HIGH"
	case "migration_recommended", "broken_classical":
		return "MEDIUM"
	case "quantum_safe", "quantum_resistant":
		return "LOW"
	default:
		return "INFO"
	}
}
