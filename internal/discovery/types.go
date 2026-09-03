package discovery

import "time"

// Target represents a network endpoint or local path to scan
type Target struct {
	ID        string `json:"id"`
	Host      string `json:"host"`
	Port      int    `json:"port"`
	Protocol  string `json:"protocol"`         // "tls", "ssh", "http", "sbom", "k8s", "hardware"
	Scheme    string `json:"scheme,omitempty"` // "http" or "https" when Protocol == "http"
	Label     string `json:"label"`
	Path      string `json:"path,omitempty"`      // local filesystem path when Protocol == "sbom"
	Kind      string `json:"kind,omitempty"`      // website | host | ip | server | pod | path | hardware
	Namespace string `json:"namespace,omitempty"` // kubernetes namespace when Protocol == "k8s"
	Workload  string `json:"workload,omitempty"`  // pod/deployment name when Protocol == "k8s"
}

// SeverityLevel represents the severity of a finding
type SeverityLevel string

const (
	SeverityCritical SeverityLevel = "CRITICAL"
	SeverityHigh     SeverityLevel = "HIGH"
	SeverityMedium   SeverityLevel = "MEDIUM"
	SeverityLow      SeverityLevel = "LOW"
	SeverityInfo     SeverityLevel = "INFO"
)

// Finding represents a single cryptographic weakness discovered during a scan
type Finding struct {
	ID          string        `json:"id"`
	TargetID    string        `json:"target_id"`
	TargetLabel string        `json:"target_label"`
	Host        string        `json:"host"`
	Port        int           `json:"port"`
	Protocol    string        `json:"protocol"`
	FindingType string        `json:"finding_type"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Evidence    string        `json:"evidence"`
	Severity    SeverityLevel `json:"severity"`
	Algorithm   string        `json:"algorithm,omitempty"`
	KeyLength   int           `json:"key_length,omitempty"`
	Remediation string        `json:"remediation"`
	BSIRef      string        `json:"bsi_ref,omitempty"`
	DORARef     string        `json:"dora_ref,omitempty"`
	EIDASRef    string        `json:"eidas_ref,omitempty"`
	QuantumSafe bool          `json:"quantum_safe"`
	ScannedAt   time.Time     `json:"scanned_at"`
}

// ScanResult represents the result of scanning all targets
type ScanResult struct {
	ScanID      string          `json:"scan_id"`
	StartedAt   time.Time       `json:"started_at"`
	CompletedAt time.Time       `json:"completed_at"`
	Targets     []Target        `json:"targets"`
	Findings    []Finding       `json:"findings"`
	Components  []CBOMComponent `json:"components"`
	Summary     ScanSummary     `json:"summary"`
}

// CBOMComponent is a single entry in a Cryptographic Bill of Materials.
type CBOMComponent struct {
	Algorithm   string        `json:"algorithm"`
	KeySize     int           `json:"key_size,omitempty"`
	Library     string        `json:"library,omitempty"`
	Version     string        `json:"version,omitempty"`
	RiskLevel   SeverityLevel `json:"risk_level"`
	QuantumSafe bool          `json:"quantum_safe"`
	PQCStatus   string        `json:"pqc_status"`
	Location    string        `json:"location,omitempty"`
	BSIRef      string        `json:"bsi_ref,omitempty"`
}

// ScanSummary contains aggregated counts from the scan
type ScanSummary struct {
	TotalTargets    int `json:"total_targets"`
	ScannedTargets  int `json:"scanned_targets"`
	TotalFindings   int `json:"total_findings"`
	Critical        int `json:"critical"`
	High            int `json:"high"`
	Medium          int `json:"medium"`
	Low             int `json:"low"`
	QuantumUnsafe   int `json:"quantum_unsafe"`
	BSIReferenced   int `json:"bsi_referenced"`
	TotalComponents int `json:"total_components"`
	AtRisk          int `json:"at_risk"`
	QuantumSafe     int `json:"quantum_safe"`
	PQCReady        int `json:"pqc_ready"`
}
