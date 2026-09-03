// Package bom implements the RivicQ five-BOM DevSecOps framework
// (CBOM, QBOM, SBOM, AIBOM, IBOM) from the Complete BOM Guide.
// Partner names are optional connectors. They are never required at runtime.
package bom

import (
	"os"
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/edition"
)

// Layer is one of the five BOM types.
type Layer string

const (
	LayerCBOM Layer = "cbom"
	LayerQBOM Layer = "qbom"
	LayerSBOM Layer = "sbom"
	LayerAIBOM Layer = "aibom"
	LayerIBOM Layer = "ibom"
)

// LayerInfo describes a BOM type and whether the current edition enables it.
type LayerInfo struct {
	ID          Layer    `json:"id"`
	Name        string   `json:"name"`
	Role        string   `json:"role"`
	Community   bool     `json:"community"`
	Enterprise  bool     `json:"enterprise"`
	Enabled     bool     `json:"enabled"`
	Schema      string   `json:"schema"`
	Regulations []string `json:"regulations"`
	Honesty     string   `json:"honesty"`
}

// PipelineStage is one DevSecOps stage from the BOM guide.
type PipelineStage struct {
	ID       int      `json:"id"`
	Name     string   `json:"name"`
	BOMs     []Layer  `json:"boms"`
	Action   string   `json:"action"`
	Artifact string   `json:"artifact"`
	OSS      bool     `json:"oss"`
	Partner  string   `json:"partner,omitempty"`
}

// Connector is an optional partner/HSM/quantum integration.
type Connector struct {
	ID         string `json:"id"`
	Domain     string `json:"domain"`
	Protocol   string `json:"protocol"`
	Auth       string `json:"auth"`
	Connected  bool   `json:"connected"`
	Enterprise bool   `json:"enterprise"`
	EnvHint    string `json:"env_hint,omitempty"`
	Note       string `json:"note"`
}

// Control is a governance mapping (not a certification).
type Control struct {
	Framework string `json:"framework"`
	Control   string `json:"control"`
	BOM       Layer  `json:"bom"`
	Status    string `json:"status"`
	Pack      bool   `json:"pack"`
	Evidence  string `json:"evidence"`
}

// Framework is the edition-aware catalog.
type Framework struct {
	Product    string          `json:"product"`
	Edition    edition.Edition `json:"edition"`
	Layers     []LayerInfo     `json:"layers"`
	Pipeline   []PipelineStage `json:"pipeline"`
	Connectors []Connector     `json:"connectors"`
	Controls   []Control       `json:"controls"`
	Honesty    string          `json:"honesty"`
}

// Catalog returns the five-BOM framework gated by the current edition.
func Catalog() Framework {
	cfg := edition.Detect()
	ent := cfg.Edition == edition.Enterprise
	return Framework{
		Product:  "RivicQ Security Cloud",
		Edition:  cfg.Edition,
		Layers:   layers(ent),
		Pipeline: pipeline(),
		Connectors: connectors(ent),
		Controls:   controls(ent),
		Honesty:    "Community ships CBOM + SBOM + local QBOM. AIBOM, IBOM, HSM/PKCS#11, and GRC packs are Enterprise. Partner APIs stay disconnected without customer credentials. Mappings are not certifications. QSIC is declared research hardware.",
	}
}

func layers(ent bool) []LayerInfo {
	return []LayerInfo{
		{
			ID: LayerCBOM, Name: "CBOM", Role: "Cryptographic inventory — algorithms, keys, certs, libraries",
			Community: true, Enterprise: true, Enabled: true,
			Schema: "CycloneDX 1.6 cryptographic-asset",
			Regulations: []string{"DORA RTS Art. 9", "NIS2 Art. 21", "FIPS 140-3", "OWASP A02"},
			Honesty: "Primary Apache-2.0 product. Shared engine for both editions.",
		},
		{
			ID: LayerQBOM, Name: "QBOM", Role: "Quantum vulnerability + CRQC urgency + PQC replacement",
			Community: true, Enterprise: true, Enabled: true,
			Schema: "CBOM + qiskitprofile attack class",
			Regulations: []string{"NIST IR 8105", "FIPS 203/204/205", "CISA PQC"},
			Honesty: "Local Shor/Grover/PQC taxonomy. IBM Quantum Runtime is not invoked.",
		},
		{
			ID: LayerSBOM, Name: "SBOM", Role: "Software components with crypto-library flag",
			Community: true, Enterprise: true, Enabled: true,
			Schema: "CycloneDX 1.6 / SPDX",
			Regulations: []string{"US EO 14028", "EU CRA", "DORA RTS Art. 9(4)"},
			Honesty: "Generated from local path / lockfiles. Optional Syft/Trivy when installed.",
		},
		{
			ID: LayerAIBOM, Name: "AIBOM", Role: "AI/ML model provenance, EU AI Act risk tier, serving crypto",
			Community: false, Enterprise: true, Enabled: ent,
			Schema: "CycloneDX 1.6 + ISO/IEC 42001 fields",
			Regulations: []string{"EU AI Act Art. 6 / Annex IV", "NIST AI RMF", "OWASP ML Top 10"},
			Honesty: "Enterprise declared inventory. Not a live model-weight scanner.",
		},
		{
			ID: LayerIBOM, Name: "IBOM", Role: "Human, machine, and service identities bound to crypto assets",
			Community: false, Enterprise: true, Enabled: ent,
			Schema: "NIST SP 800-207 inventory",
			Regulations: []string{"NIST SP 800-207", "DORA RTS identity", "Zero Trust"},
			Honesty: "Enterprise connector (directory / NHI). Community still scans secrets into CBOM.",
		},
	}
}

func pipeline() []PipelineStage {
	return []PipelineStage{
		{ID: 1, Name: "Developer IDE", BOMs: []Layer{LayerQBOM, LayerIBOM}, Action: "Crypto API lint + secrets scan", Artifact: "Pre-commit policy violations", OSS: true},
		{ID: 2, Name: "Source commit", BOMs: []Layer{LayerSBOM}, Action: "cdxgen / syft from lock files", Artifact: "SBOM JSON (CycloneDX 1.6)", OSS: true},
		{ID: 3, Name: "CI/CD build", BOMs: []Layer{LayerCBOM, LayerQBOM, LayerSBOM, LayerAIBOM, LayerIBOM}, Action: "rivicq scan . — unified BOM merge", Artifact: "unified-bom.cdx.json", OSS: true},
		{ID: 4, Name: "Container scan", BOMs: []Layer{LayerCBOM, LayerSBOM}, Action: "Optional Trivy/Grype + crypto lib versions", Artifact: "Container CBOM patch", OSS: true},
		{ID: 5, Name: "Staging deploy", BOMs: []Layer{LayerCBOM, LayerQBOM}, Action: "TLS/HTTPS endpoint scan + QBOM scoring", Artifact: "CBOM report JSON", OSS: true},
		{ID: 6, Name: "Security gate", BOMs: []Layer{LayerCBOM, LayerQBOM, LayerSBOM}, Action: "Policy gate BLOCK / WARN / ALLOW", Artifact: "Pass / block decision", OSS: true},
		{ID: 7, Name: "Production", BOMs: []Layer{LayerCBOM, LayerIBOM}, Action: "Continuous EaaS monitoring (Enterprise)", Artifact: "Live CBOM dashboard", OSS: false},
		{ID: 8, Name: "Compliance report", BOMs: []Layer{LayerCBOM, LayerQBOM, LayerSBOM, LayerAIBOM, LayerIBOM}, Action: "DORA / NIS2 / SOC 2 mappings", Artifact: "JSON (Community) or pack (Enterprise)", OSS: true},
	}
}

func envSet(keys ...string) bool {
	for _, k := range keys {
		if strings.TrimSpace(os.Getenv(k)) != "" {
			return true
		}
	}
	return false
}

func connectors(ent bool) []Connector {
	return []Connector{
		{
			ID: "cryptonext", Domain: "Post-quantum PKI / crypto-agility", Protocol: "REST / gRPC",
			Auth: "mTLS + API key", Connected: ent && envSet("CRYPTONEXT_API_KEY"), Enterprise: true,
			EnvHint: "CRYPTONEXT_API_KEY",
			Note: "QBOM → ML-KEM/ML-DSA migration confirmation. Disconnected without a customer key.",
		},
		{
			ID: "crypto4a", Domain: "Quantum-safe HSM (QxHSM)", Protocol: "PKCS#11 / REST",
			Auth: "HSM token + API key", Connected: ent && envSet("CRYPTO4A_API_KEY", "PKCS11_MODULE"), Enterprise: true,
			EnvHint: "CRYPTO4A_API_KEY or PKCS11_MODULE",
			Note: "PQC key storage. FIPS 140-3 claims belong to the customer module, not RivicQ.",
		},
		{
			ID: "cloud-hsm", Domain: "Cloud HSM / KMS", Protocol: "AWS CloudHSM / KMS / PKCS#11",
			Auth: "customer IAM", Connected: ent && envSet("AWS_CLOUDHSM_CLUSTER_ID", "AWS_ACCESS_KEY_ID"), Enterprise: true,
			EnvHint: "AWS_CLOUDHSM_CLUSTER_ID",
			Note: "Enterprise connector. Empty inventory when credentials are missing.",
		},
		{
			ID: "local-qiskit", Domain: "Quantum scoring", Protocol: "in-process",
			Auth: "none", Connected: true, Enterprise: false,
			Note: "Local qiskitprofile. Not IBM Quantum hardware.",
		},
		{
			ID: "quantum-runtime", Domain: "Optional quantum runtime", Protocol: "REST",
			Auth: "API key", Connected: ent && envSet("IBMQ_API_KEY", "IBM_QUANTUM_TOKEN"), Enterprise: true,
			EnvHint: "IBMQ_API_KEY",
			Note: "Never required for QBOM scores.",
		},
		{
			ID: "vanta", Domain: "Compliance evidence", Protocol: "REST",
			Auth: "OAuth 2.0", Connected: ent && envSet("VANTA_API_KEY"), Enterprise: true,
			EnvHint: "VANTA_API_KEY",
			Note: "Optional GRC sink for SBOM/CBOM JSON. Not a certification of RivicQ.",
		},
		{
			ID: "okta", Domain: "Identity directory (IBOM)", Protocol: "SCIM 2.0",
			Auth: "OAuth 2.0", Connected: ent && envSet("OKTA_API_TOKEN"), Enterprise: true,
			EnvHint: "OKTA_API_TOKEN",
			Note: "Human + OAuth client inventory. Disconnected by default.",
		},
		{
			ID: "unosecur", Domain: "NHI / AI agent identities", Protocol: "REST / SCIM",
			Auth: "OAuth 2.0", Connected: ent && envSet("UNOSECURE_API_KEY"), Enterprise: true,
			EnvHint: "UNOSECURE_API_KEY",
			Note: "Machine-identity enrichment for IBOM/AIBOM. Optional.",
		},
	}
}

func controls(ent bool) []Control {
	pack := "json_only"
	if ent {
		pack = "pack_enabled"
	}
	return []Control{
		{Framework: "DORA RTS", Control: "Art. 9 ICT asset inventory + crypto controls", BOM: LayerCBOM, Status: pack, Pack: ent, Evidence: "CycloneDX CBOM"},
		{Framework: "DORA RTS", Control: "Art. 9(4) software component inventory", BOM: LayerSBOM, Status: pack, Pack: ent, Evidence: "SBOM from lockfiles / syft"},
		{Framework: "DORA", Control: "Art. 6 ICT governance", BOM: LayerCBOM, Status: pack, Pack: ent, Evidence: "Enterprise control plane"},
		{Framework: "NIS2", Control: "Art. 21 cryptographic security measures", BOM: LayerQBOM, Status: "mapped", Pack: ent, Evidence: "QBOM + PQC migration list"},
		{Framework: "EU AI Act", Control: "Art. 6 / Annex IV technical documentation", BOM: LayerAIBOM, Status: statusEnt(ent, "enterprise_layer"), Pack: ent, Evidence: "Declared AIBOM"},
		{Framework: "EU CRA", Control: "Software component transparency", BOM: LayerSBOM, Status: "mapped", Pack: ent, Evidence: "SBOM"},
		{Framework: "US EO 14028", Control: "SBOM for federal software", BOM: LayerSBOM, Status: "mapped", Pack: ent, Evidence: "SBOM"},
		{Framework: "NIST SP 800-207", Control: "Zero Trust identity inventory", BOM: LayerIBOM, Status: statusEnt(ent, "enterprise_layer"), Pack: ent, Evidence: "IBOM connector"},
		{Framework: "FIPS 140-3", Control: "Crypto module inventory", BOM: LayerCBOM, Status: "mapped", Pack: ent, Evidence: "Declared HSM/QSIC catalog — not RivicQ certification"},
		{Framework: "BSI TR-02102", Control: "Algorithm strength", BOM: LayerCBOM, Status: "mapped", Pack: ent, Evidence: "Finding bsi_ref"},
		{Framework: "NIST PQC", Control: "FIPS 203/204/205 migration", BOM: LayerQBOM, Status: "mapped", Pack: ent, Evidence: "Migration mapper"},
		{Framework: "India DPDPA", Control: "Encryption + identity controls", BOM: LayerCBOM, Status: "mapped", Pack: ent, Evidence: "CBOM + IBOM mapping"},
	}
}

func statusEnt(ent bool, enterpriseStatus string) string {
	if ent {
		return enterpriseStatus
	}
	return "locked"
}
