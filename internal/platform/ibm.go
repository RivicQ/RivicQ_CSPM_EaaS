package platform

import "sync"

// IBMMapping is an honest capability map. Status is never "live" unless an
// official IBM API is actually invoked from this repository.
type IBMMapping struct {
	IBMTechnology       string `json:"ibm_technology"`
	RivicQCapability    string `json:"rivicq_capability"`
	IntegrationType     string `json:"integration_type"`
	TechnicalDependency string `json:"technical_dependency"`
	CommercialValue     string `json:"commercial_value"`
	Status              string `json:"status"`
	Documentation       string `json:"documentation"`
	Owner               string `json:"owner"`
}

// IBMChecklistItem tracks Partner Plus packaging work. It is RivicQ's
// internal readiness — not IBM Partner World API state.
type IBMChecklistItem struct {
	ID     string `json:"id"`
	Area   string `json:"area"`
	Detail string `json:"detail"`
	Status string `json:"status"`
	Stage  string `json:"stage"`
}

type IBMWorkspace struct {
	mu          sync.RWMutex
	checklist   []IBMChecklistItem
	partnerNote string
}

func NewIBMWorkspace() *IBMWorkspace {
	return &IBMWorkspace{
		partnerNote: "RivicQ has been selected for IBM Partner Plus. This workspace tracks RivicQ readiness. It does not call IBM seller, marketplace, or Partner Plus APIs.",
		checklist: []IBMChecklistItem{
			{ID: "packaging", Area: "product packaging", Detail: "Community vs Enterprise SKUs documented", Status: "in_progress", Stage: "explore"},
			{ID: "pricing", Area: "pricing", Detail: "Configuration-driven list prices; PSP not live", Status: "in_progress", Stage: "explore"},
			{ID: "architecture", Area: "technical architecture", Detail: "OSS API :8080 / Enterprise API :9090", Status: "in_progress", Stage: "architecture_mapping"},
			{ID: "security", Area: "security", Detail: "JWT tenancy, RBAC, no secrets on Pages", Status: "in_progress", Stage: "architecture_mapping"},
			{ID: "docs", Area: "documentation", Detail: "Public docs on GitHub Pages", Status: "in_progress", Stage: "technical_enablement"},
			{ID: "support", Area: "support", Detail: "support@rivicq.com public desk", Status: "in_progress", Stage: "explore"},
			{ID: "billing", Area: "billing", Detail: "Payment adapter stub — no card data stored", Status: "not_started", Stage: "explore"},
			{ID: "deployment", Area: "deployment", Detail: "Pages static; production needs licensed API", Status: "in_progress", Stage: "explore"},
			{ID: "sla", Area: "SLA", Detail: "Enterprise SLA is contractual, not this repo", Status: "not_started", Stage: "commercial_packaging"},
			{ID: "legal", Area: "legal", Detail: "LEGAL.md / PRIVACY.md on Pages", Status: "in_progress", Stage: "explore"},
			{ID: "privacy", Area: "privacy", Detail: "DPA is a contract artifact, not auto-published", Status: "not_started", Stage: "commercial_packaging"},
			{ID: "terms", Area: "terms", Detail: "Public legal pages; Enterprise terms via sales", Status: "in_progress", Stage: "explore"},
			{ID: "diagrams", Area: "architecture diagrams", Detail: "docs/ARCHITECTURE.md", Status: "in_progress", Stage: "technical_enablement"},
			{ID: "screenshots", Area: "product screenshots", Detail: "Operator console on nebula theme", Status: "in_progress", Stage: "marketplace_readiness"},
			{ID: "demo", Area: "demo environment", Detail: "Labeled sample demo — not a customer estate", Status: "in_progress", Stage: "technical_enablement"},
			{ID: "install", Area: "installation", Detail: "CLI rivicq scan . and GitHub Action", Status: "in_progress", Stage: "technical_enablement"},
			{ID: "openapi", Area: "API documentation", Detail: "Static OpenAPI on Pages", Status: "in_progress", Stage: "technical_enablement"},
			{ID: "marketplace_meta", Area: "Marketplace metadata", Detail: "Do not publish until IBM process permits", Status: "blocked", Stage: "marketplace_readiness"},
			{ID: "cosell", Area: "co-sell", Detail: "No fabricated IBM seller or deal-registration records", Status: "not_started", Stage: "grow"},
		},
	}
}

func (w *IBMWorkspace) Snapshot() map[string]any {
	w.mu.RLock()
	defer w.mu.RUnlock()
	items := append([]IBMChecklistItem(nil), w.checklist...)
	done, blocked := 0, 0
	for _, it := range items {
		if it.Status == "done" {
			done++
		}
		if it.Status == "blocked" {
			blocked++
		}
	}
	return map[string]any{
		"partner_program":     "IBM Partner Plus",
		"status":              "selected — readiness tracking only",
		"ibm_apis_connected":  false,
		"cosell_records":      []any{},
		"marketplace_live":    false,
		"note":                w.partnerNote,
		"checklist":           items,
		"checklist_total":     len(items),
		"checklist_done":      done,
		"checklist_blocked":   blocked,
		"build_stages":        []string{"explore", "ibm_technology_discovery", "architecture_mapping", "technical_enablement", "proof_of_concept", "integration", "validation", "commercial_packaging", "marketplace_readiness", "grow"},
		"technology_mappings": IBMTechnologyMappings(),
	}
}

func IBMTechnologyMappings() []IBMMapping {
	return []IBMMapping{
		{
			IBMTechnology: "IBM Cloud", RivicQCapability: "Enterprise cloud connector / CSPM attach",
			IntegrationType: "optional connector", TechnicalDependency: "customer IBM Cloud credentials + Enterprise license",
			CommercialValue: "Inventory of keys and workloads on IBM Cloud when the operator connects an account",
			Status:          "connector_exists_opt_in", Documentation: "internal/ibmcloud", Owner: "engineering",
		},
		{
			IBMTechnology: "IBM Cloud Hyper Protect Crypto Services", RivicQCapability: "HSM / key-protect inventory",
			IntegrationType: "optional connector", TechnicalDependency: "HPCS credentials; never claimed without config",
			CommercialValue: "Cryptographic inventory for regulated estates",
			Status:          "connector_exists_opt_in", Documentation: "internal/ibmcloud", Owner: "engineering",
		},
		{
			IBMTechnology: "IBM Quantum / Qiskit", RivicQCapability: "Local PQC taxonomy scores on scan results",
			IntegrationType: "local library — not IBM Quantum Runtime", TechnicalDependency: "none for local scores; IBM Quantum API key would be required for hardware jobs and is not invoked here",
			CommercialValue: "PQC planning language; do not sell as IBM Quantum hardware attestation",
			Status:          "local_taxonomy_only", Documentation: "docs — Qiskit scores are a local taxonomy", Owner: "security",
		},
		{
			IBMTechnology: "IBM Security", RivicQCapability: "CBOM + CSPM evidence packs",
			IntegrationType: "none — no undocumented IBM Security API", TechnicalDependency: "official API access not configured",
			CommercialValue: "Co-sell conversation only until an official integration exists",
			Status:          "not_integrated", Documentation: "", Owner: "partnerships",
		},
		{
			IBMTechnology: "watsonx", RivicQCapability: "AIBOM / AI security inventory",
			IntegrationType: "none", TechnicalDependency: "official watsonx API access not configured",
			CommercialValue: "Future mapping only",
			Status:          "not_integrated", Documentation: "", Owner: "partnerships",
		},
	}
}
