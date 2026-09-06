package core

// ScannerLifecycleStep defines one stage in the standard scanner lifecycle.
type ScannerLifecycleStep struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Order       int    `json:"order"`
}

// ScannerCapability describes a scanner module and its implementation status.
type ScannerCapability struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	Status      string `json:"status"` // implemented | partial | planned
	Streaming   bool   `json:"streaming"`
	Webhook     bool   `json:"webhook"`
	History     bool   `json:"history"`
}

// ScannerFrameworkStatus captures the scanner framework contract and supported modules.
type ScannerFrameworkStatus struct {
	Version        string                `json:"version"`
	Lifecycle      []ScannerLifecycleStep `json:"lifecycle"`
	SupportedScans []ScannerCapability   `json:"supported_scans"`
}

// GetScannerFrameworkStatus returns the canonical scanner framework contract
// used by the platform to evolve scanner modules consistently over time.
func GetScannerFrameworkStatus() ScannerFrameworkStatus {
	return ScannerFrameworkStatus{
		Version: "1.0",
		Lifecycle: []ScannerLifecycleStep{
			{Name: "discover", Description: "Identify candidate assets and data sources.", Order: 1},
			{Name: "fingerprint", Description: "Collect metadata and runtime signatures.", Order: 2},
			{Name: "scan", Description: "Execute scanner-specific collection and checks.", Order: 3},
			{Name: "analyze", Description: "Correlate findings and infer security posture.", Order: 4},
			{Name: "risk_score", Description: "Calculate normalized risk score for entities.", Order: 5},
			{Name: "compliance", Description: "Map findings to compliance controls and frameworks.", Order: 6},
			{Name: "generate_evidence", Description: "Emit evidence artifacts for audit workflows.", Order: 7},
			{Name: "export", Description: "Export reports and machine-readable artifacts.", Order: 8},
			{Name: "webhook", Description: "Emit event notifications for automation integrations.", Order: 9},
			{Name: "streaming", Description: "Support near real-time signal streaming.", Order: 10},
			{Name: "history", Description: "Persist and retrieve historical scan records.", Order: 11},
		},
		SupportedScans: []ScannerCapability{
			{ID: "cloud", DisplayName: "Cloud Scanner", Status: "partial", Streaming: false, Webhook: true, History: true},
			{ID: "kubernetes", DisplayName: "Kubernetes Scanner", Status: "partial", Streaming: false, Webhook: true, History: true},
			{ID: "container", DisplayName: "Container Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "certificate", DisplayName: "Certificate Scanner", Status: "implemented", Streaming: false, Webhook: true, History: true},
			{ID: "tls", DisplayName: "TLS Scanner", Status: "implemented", Streaming: false, Webhook: true, History: true},
			{ID: "pki", DisplayName: "PKI Scanner", Status: "partial", Streaming: false, Webhook: true, History: true},
			{ID: "secrets", DisplayName: "Secrets Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "git", DisplayName: "Git Scanner", Status: "partial", Streaming: false, Webhook: true, History: true},
			{ID: "dependencies", DisplayName: "Dependency Scanner", Status: "partial", Streaming: false, Webhook: true, History: true},
			{ID: "source_code", DisplayName: "Source Code Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "api", DisplayName: "API Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "ai_models", DisplayName: "AI Model Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "ai_agents", DisplayName: "AI Agent Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "mcp_servers", DisplayName: "MCP Server Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "databases", DisplayName: "Database Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "saas_applications", DisplayName: "SaaS Application Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "network", DisplayName: "Network Scanner", Status: "partial", Streaming: false, Webhook: true, History: true},
			{ID: "identity", DisplayName: "Identity Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "runtime", DisplayName: "Runtime Scanner", Status: "planned", Streaming: true, Webhook: true, History: true},
			{ID: "binary", DisplayName: "Binary Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "firmware", DisplayName: "Firmware Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
			{ID: "iot", DisplayName: "IoT Scanner", Status: "planned", Streaming: false, Webhook: true, History: true},
		},
	}
}
