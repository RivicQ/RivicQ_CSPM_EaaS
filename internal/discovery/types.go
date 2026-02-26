package discovery

import "time"

// Target represents a network endpoint to scan
type Target struct {
	ID       string `json:"id"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Protocol string `json:"protocol"` // "tls", "ssh", "http"
	Label    string `json:"label"`
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
	ScanID      string      `json:"scan_id"`
	StartedAt   time.Time   `json:"started_at"`
	CompletedAt time.Time   `json:"completed_at"`
	Targets     []Target    `json:"targets"`
	Findings    []Finding   `json:"findings"`
	Summary     ScanSummary `json:"summary"`
}

// ScanSummary contains aggregated counts from the scan
type ScanSummary struct {
	TotalTargets   int `json:"total_targets"`
	ScannedTargets int `json:"scanned_targets"`
	TotalFindings  int `json:"total_findings"`
	Critical       int `json:"critical"`
	High           int `json:"high"`
	Medium         int `json:"medium"`
	Low            int `json:"low"`
	QuantumUnsafe  int `json:"quantum_unsafe"`
	BSICompliant   int `json:"bsi_compliant"`
}
