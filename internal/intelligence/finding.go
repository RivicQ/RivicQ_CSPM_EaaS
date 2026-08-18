package intelligence

import "time"

// Finding is the single normalized security finding consumed by risk, policy,
// API, CLI, and the dashboard. Scanner-specific types (discovery.Finding,
// GHFinding) are adapted into this model — they are not replaced.
type Finding struct {
	ID          string            `json:"id"`
	Source      string            `json:"source"`  // live | demo | intel | calculated
	Scanner     string            `json:"scanner"` // tls | ssh | http | sbom | github-content | syft | trivy | gitleaks
	Asset       string            `json:"asset,omitempty"`
	Repository  string            `json:"repository,omitempty"`
	Component   string            `json:"component,omitempty"`
	CVE         string            `json:"cve,omitempty"`
	CWE         string            `json:"cwe,omitempty"`
	CVSS        float64           `json:"cvss,omitempty"`
	EPSS        float64           `json:"epss,omitempty"`
	KEV         bool              `json:"kev,omitempty"`
	Severity    string            `json:"severity"`
	RiskScore   int               `json:"risk_score"`
	Risk        RiskBreakdown     `json:"risk"`
	Evidence    string            `json:"evidence,omitempty"`
	Location    string            `json:"location,omitempty"`
	Line        int               `json:"line,omitempty"`
	Algorithm   string            `json:"algorithm,omitempty"`
	KeyLength   int               `json:"key_length,omitempty"`
	Usage       string            `json:"usage,omitempty"`
	Confidence  float64           `json:"confidence"`
	Controls    []string          `json:"compliance_controls,omitempty"`
	Remediation string            `json:"remediation,omitempty"`
	Status      string            `json:"status"`
	Owner       string            `json:"owner,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	QuantumSafe bool              `json:"quantum_safe"`
	Labels      map[string]string `json:"labels,omitempty"`
}

type RiskBreakdown struct {
	Score        int      `json:"score"`
	Level        string   `json:"level"`
	Contributors []Factor `json:"contributors"`
	Method       string   `json:"method"`
}

type Factor struct {
	Label  string `json:"label"`
	Points int    `json:"points"`
}

type Report struct {
	Target      string            `json:"target"`
	Asset       string            `json:"asset,omitempty"`
	StartedAt   time.Time         `json:"started_at"`
	CompletedAt time.Time         `json:"completed_at"`
	Findings    []Finding         `json:"findings"`
	Gate        GateResult        `json:"gate"`
	Summary     ReportSummary     `json:"summary"`
	CycloneDX   map[string]any    `json:"cyclonedx,omitempty"`
	Tools       []ToolStatus      `json:"tools"`
	Excludes    []string          `json:"excludes,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

type ReportSummary struct {
	SAST       string `json:"sast"`
	Secrets    string `json:"secrets"`
	SCA        string `json:"sca"`
	SBOM       string `json:"sbom"`
	CBOM       string `json:"cbom"`
	IaC        string `json:"iac"`
	Container  string `json:"container"`
	Compliance string `json:"compliance"`
	Critical   int    `json:"critical"`
	High       int    `json:"high"`
	Medium     int    `json:"medium"`
	Low        int    `json:"low"`
	Crypto     int    `json:"crypto_assets"`
}

type ToolStatus struct {
	Name      string `json:"name"`
	Available bool   `json:"available"`
	Used      bool   `json:"used"`
	Note      string `json:"note,omitempty"`
}

func severityRank(s string) int {
	switch normalizeSeverity(s) {
	case "CRITICAL":
		return 4
	case "HIGH":
		return 3
	case "MEDIUM":
		return 2
	case "LOW":
		return 1
	default:
		return 0
	}
}

func normalizeSeverity(s string) string {
	switch s {
	case "critical", "CRITICAL", "Critical":
		return "CRITICAL"
	case "high", "HIGH", "High":
		return "HIGH"
	case "medium", "MEDIUM", "Medium":
		return "MEDIUM"
	case "low", "LOW", "Low":
		return "LOW"
	default:
		return "INFO"
	}
}
