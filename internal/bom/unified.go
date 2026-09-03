package bom

import (
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/qiskitprofile"
)

// Unified is the merged five-BOM view for a scan or the workspace.
type Unified struct {
	Target     string         `json:"target,omitempty"`
	Edition    string         `json:"edition"`
	CBOM       []Asset        `json:"cbom"`
	QBOM       []QuantumAsset `json:"qbom"`
	SBOM       []Asset        `json:"sbom"`
	AIBOM      []AIAsset      `json:"aibom"`
	IBOM       []Identity     `json:"ibom"`
	APISurface []APIFinding   `json:"api_security"`
	LayersOn   map[string]bool `json:"layers_enabled"`
	Note       string         `json:"note"`
}

// Asset is a CBOM/SBOM component summary.
type Asset struct {
	Name        string `json:"name"`
	Algorithm   string `json:"algorithm,omitempty"`
	KeySize     int    `json:"key_size,omitempty"`
	Location    string `json:"location,omitempty"`
	QuantumSafe bool   `json:"quantum_safe"`
	PQCStatus   string `json:"pqc_status,omitempty"`
	Severity    string `json:"severity,omitempty"`
}

// QuantumAsset is a QBOM row (CBOM + quantum urgency).
type QuantumAsset struct {
	Asset
	AttackClass  string `json:"attack_class"`
	Replacement  string `json:"replacement"`
	Standard     string `json:"standard"`
	Priority     string `json:"priority"`
	CRQCNote     string `json:"crqc_note"`
}

// AIAsset is a declared AIBOM row.
type AIAsset struct {
	Identifier   string   `json:"identifier"`
	RiskTier     int      `json:"risk_tier"`
	Endpoint     string   `json:"endpoint,omitempty"`
	CryptoDeps   []string `json:"crypto_dependencies,omitempty"`
	Adversarial  string   `json:"adversarial_risk,omitempty"`
	Declared     bool     `json:"declared"`
}

// Identity is an IBOM row.
type Identity struct {
	ID           string   `json:"id"`
	Type         string   `json:"type"`
	CryptoAccess []string `json:"crypto_asset_access,omitempty"`
	Source       string   `json:"source"`
}

// APIFinding is an API-security surface derived from HTTPS/TLS scans.
type APIFinding struct {
	Title    string `json:"title"`
	Severity string `json:"severity"`
	Protocol string `json:"protocol"`
	Control  string `json:"control"`
}

// FromDiscovery builds the unified BOM from a scan result without changing ScanResult.
func FromDiscovery(target string, disc *discovery.ScanResult) Unified {
	cfg := edition.Detect()
	ent := cfg.Edition == edition.Enterprise
	out := Unified{
		Target:   target,
		Edition:  string(cfg.Edition),
		LayersOn: map[string]bool{"cbom": true, "qbom": true, "sbom": true, "aibom": ent, "ibom": ent},
		Note:     Catalog().Honesty,
	}
	if disc == nil {
		return out
	}
	for _, c := range disc.Components {
		a := Asset{
			Name: c.Library, Algorithm: c.Algorithm, KeySize: c.KeySize, Location: c.Location,
			QuantumSafe: c.QuantumSafe, PQCStatus: c.PQCStatus, Severity: string(c.RiskLevel),
		}
		if a.Name == "" {
			a.Name = c.Algorithm
		}
		if strings.EqualFold(c.Library, "kubernetes-workload") || c.Location == "" && c.Algorithm == "undeclared" {
			out.SBOM = append(out.SBOM, a)
		}
		out.CBOM = append(out.CBOM, a)
		cl := qiskitprofile.Classify(c.Algorithm, c.KeySize)
		qa := QuantumAsset{Asset: a, AttackClass: string(cl.AttackClass), CRQCNote: "Local taxonomy — not a qubit measurement or IBM Quantum deadline."}
		switch cl.AttackClass {
		case qiskitprofile.AttackShor:
			qa.Replacement, qa.Standard, qa.Priority = "ML-KEM-768 or ML-DSA-65 (hybrid)", "FIPS 203/204", "plan"
		case qiskitprofile.AttackGrover:
			qa.Replacement, qa.Standard, qa.Priority = "AES-256 / SHA-384+", "SP 800-57", "hygiene"
		case qiskitprofile.AttackPQC:
			qa.Replacement, qa.Standard, qa.Priority = "Keep NIST PQC parameter set", "FIPS 203/204/205", "preferred"
		}
		if cl.AttackClass != qiskitprofile.AttackNone {
			out.QBOM = append(out.QBOM, qa)
		}
	}
	for _, f := range disc.Findings {
		if f.Protocol == "sbom" || f.FindingType == "CRYPTO_LIBRARY" {
			out.SBOM = append(out.SBOM, Asset{Name: f.Title, Algorithm: f.Algorithm, Location: f.TargetLabel, Severity: string(f.Severity), QuantumSafe: f.QuantumSafe})
		}
		if f.Protocol == "http" || f.Protocol == "tls" {
			out.APISurface = append(out.APISurface, APIFinding{
				Title: f.Title, Severity: string(f.Severity), Protocol: f.Protocol,
				Control: "OWASP API / TLS hygiene (HSTS, CSP, modern TLS)",
			})
		}
		if strings.Contains(strings.ToLower(f.FindingType), "secret") || strings.Contains(strings.ToLower(f.Title), "secret") {
			if ent {
				out.IBOM = append(out.IBOM, Identity{ID: f.ID, Type: "service", CryptoAccess: []string{f.Title}, Source: "scan"})
			}
		}
	}
	if len(out.SBOM) == 0 {
		res := discovery.ResourcesFromTargets(disc.Targets)
		if res["sbom"] {
			out.SBOM = append(out.SBOM, Asset{Name: "SBOM scan completed", Location: target, PQCStatus: "inventory_only"})
		}
	}
	if ent {
		out.AIBOM = []AIAsset{{
			Identifier: "declared-model-registry", RiskTier: 2, Declared: true,
			Adversarial: "EU AI Act documentation is operator-supplied. This is not a weight scanner.",
		}}
	}
	return out
}
