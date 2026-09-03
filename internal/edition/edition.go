package edition

import (
	"fmt"
	"os"
	"strings"
)

// Edition represents the software edition.
type Edition string

const (
	// OSS is the open-source / Community edition.
	OSS Edition = "oss"
	// Enterprise is the enterprise edition.
	Enterprise Edition = "enterprise"
)

// Features holds feature flags for the current edition.
// OSS is intentionally limited. Enterprise enables the control plane and connectors
// (credentials still required; QSIC is declared inventory, not shipped silicon).
type Features struct {
	WebsiteScan          bool `json:"websiteScan"`
	HostIPScan           bool `json:"hostIpScan"`
	ServerScan           bool `json:"serverScan"`
	PodInventory         bool `json:"podInventory"`
	LiveKubernetesAttach bool `json:"liveKubernetesAttach"`
	LocalSBOM            bool `json:"localSbom"`
	Intelligence         bool `json:"intelligence"`
	QiskitProfile        bool `json:"qiskitProfile"`
	CycloneDX            bool `json:"cycloneDx"`
	GitHubScanning       bool `json:"gitHubScanning"`
	Dashboard            bool `json:"dashboard"`
	DORAPack             bool `json:"doraPack"`
	HardwareInventory    bool `json:"hardwareInventory"`
	QSICDeclaration      bool `json:"qsicDeclaration"`
	CloudConnectors      bool `json:"cloudConnectors"`
	QuantumConnector     bool `json:"quantumConnector"`
	IBMCloudIntegration  bool `json:"ibmCloudIntegration"`
	AWSHSMIntegration    bool `json:"awsHsmIntegration"`
	QuantumAttestation   bool `json:"quantumAttestation"`
	MultiCloudInventory  bool `json:"multiCloudInventory"`
	ComplianceReporting  bool `json:"complianceReporting"`
	SSOSAMIL             bool `json:"sso"`
	AuditLog             bool `json:"auditLog"`
	APIKeysWebhooks      bool `json:"apiKeysWebhooks"`
	APIRateLimit         int  `json:"apiRateLimit"`
}

// Config holds the edition configuration.
type Config struct {
	Edition  Edition  `json:"edition"`
	Features Features `json:"features"`
}

// Detect returns the current edition based on environment/license.
func Detect() *Config {
	licenseKey := os.Getenv("CRYPTOBOM_LICENSE_KEY")
	if isEnterpriseKey(licenseKey) {
		return enterpriseConfig()
	}
	return ossConfig()
}

func isEnterpriseKey(key string) bool {
	return strings.HasPrefix(key, "ENT-") && len(key) >= 20
}

func ossConfig() *Config {
	return &Config{
		Edition: OSS,
		Features: Features{
			WebsiteScan:          true,
			HostIPScan:           true,
			ServerScan:           true,
			PodInventory:         true,
			LiveKubernetesAttach: false,
			LocalSBOM:            true,
			Intelligence:         true,
			QiskitProfile:        true,
			CycloneDX:            true,
			GitHubScanning:       true,
			Dashboard:            true,
			DORAPack:             false,
			HardwareInventory:    false,
			QSICDeclaration:      true,
			CloudConnectors:      false,
			QuantumConnector:     false,
			IBMCloudIntegration:  false,
			AWSHSMIntegration:    false,
			QuantumAttestation:   false,
			MultiCloudInventory:  false,
			ComplianceReporting:  false,
			SSOSAMIL:             false,
			AuditLog:             false,
			APIKeysWebhooks:      false,
			APIRateLimit:         100,
		},
	}
}

func enterpriseConfig() *Config {
	rateLimit := 1000
	if envLimit := os.Getenv("CRYPTOBOM_RATE_LIMIT"); envLimit != "" {
		if n, err := fmt.Sscanf(envLimit, "%d", &rateLimit); err != nil || n != 1 {
			rateLimit = 1000
		}
	}
	return &Config{
		Edition: Enterprise,
		Features: Features{
			WebsiteScan:          true,
			HostIPScan:           true,
			ServerScan:           true,
			PodInventory:         true,
			LiveKubernetesAttach: true,
			LocalSBOM:            true,
			Intelligence:         true,
			QiskitProfile:        true,
			CycloneDX:            true,
			GitHubScanning:       true,
			Dashboard:            true,
			DORAPack:             true,
			HardwareInventory:    true,
			QSICDeclaration:      true,
			CloudConnectors:      true,
			QuantumConnector:     true,
			IBMCloudIntegration:  true,
			AWSHSMIntegration:    true,
			QuantumAttestation:   true,
			MultiCloudInventory:  true,
			ComplianceReporting:  true,
			SSOSAMIL:             true,
			AuditLog:             true,
			APIKeysWebhooks:      true,
			APIRateLimit:         rateLimit,
		},
	}
}

// Public is the /edition payload plus the client-architecture scan catalog.
func (c *Config) Public() map[string]any {
	if c == nil {
		c = Detect()
	}
	return map[string]any{
		"edition":  c.Edition,
		"features": c.Features,
		"client_architecture": []string{"discover", "mitigate", "report"},
		"scan_targets": map[string]any{
			"website":  map[string]any{"enabled": c.Features.WebsiteScan, "resources": []string{"tls", "https"}},
			"host":     map[string]any{"enabled": c.Features.HostIPScan, "resources": []string{"tls", "ssh", "http"}},
			"ip":       map[string]any{"enabled": c.Features.HostIPScan, "resources": []string{"tls", "ssh", "http"}},
			"server":   map[string]any{"enabled": c.Features.ServerScan, "resources": []string{"tls", "ssh", "http"}},
			"pod":      map[string]any{"enabled": c.Features.PodInventory, "live_attach": c.Features.LiveKubernetesAttach, "resources": []string{"k8s"}},
			"hardware": map[string]any{"enabled": c.Features.QSICDeclaration, "persist": c.Features.HardwareInventory, "resources": []string{"hardware"}},
			"path":     map[string]any{"enabled": c.Features.LocalSBOM, "resources": []string{"sbom"}},
		},
		"connectors": map[string]any{
			"cloud":   c.Features.CloudConnectors,
			"quantum": c.Features.QuantumConnector,
			"hsm":     c.Features.AWSHSMIntegration,
			"note":    "Connectors are empty without customer credentials. Qiskit scores are local. QSIC is a research ASIC declaration.",
		},
	}
}
