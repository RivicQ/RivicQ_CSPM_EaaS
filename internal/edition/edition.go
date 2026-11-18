package edition

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
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
	AIBOM                bool `json:"aibom"`
	IBOM                 bool `json:"ibom"`
	QBOM                 bool `json:"qbom"`
	HBOM                 bool `json:"hbom"`
	ApiSecurity          bool `json:"apiSecurity"`
	AiSecurity           bool `json:"aiSecurity"`
	HSMConnector         bool `json:"hsmConnector"`
	DevSecOpsPipeline    bool `json:"devSecOpsPipeline"`
	APIRateLimit         int  `json:"apiRateLimit"`
}

// Config holds the edition configuration.
type Config struct {
	Edition  Edition  `json:"edition"`
	Features Features `json:"features"`
}

// Detect returns the current edition based on environment/license.
// Enterprise mode requires a valid signed, unexpired beta license; otherwise the
// server reports OSS capabilities (fail-closed, no aspirational enablement).
func Detect() *Config {
	if validEnterpriseLicense() {
		return enterpriseConfig()
	}
	return ossConfig()
}

func validEnterpriseLicense() bool {
	lic := strings.TrimSpace(os.Getenv("CRYPTOBOM_LICENSE_KEY"))
	secret := strings.TrimSpace(os.Getenv("CRYPTOBOM_LICENSE_SIGNING_KEY"))
	if lic == "" || secret == "" {
		return false
	}
	const prefix = "cryptobom-beta-v1."
	if !strings.HasPrefix(lic, prefix) {
		// Legacy/opaque keys are not accepted as valid signed licenses.
		return false
	}
	body := strings.TrimPrefix(lic, prefix)
	parts := strings.Split(body, ".")
	if len(parts) != 3 {
		return false
	}
	tenant, expStr, sigHex := parts[0], parts[1], parts[2]
	expUnix, err := strconv.ParseInt(expStr, 10, 64)
	if err != nil || expUnix <= 0 || time.Now().UTC().After(time.Unix(expUnix, 0).UTC()) {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(tenant + "." + expStr))
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(strings.ToLower(sigHex)), []byte(expected)) {
		return false
	}
	if bound := configuredLicenseBinding(); bound != "" && tenant != "*" && tenant != bound {
		return false
	}
	return true
}

func configuredLicenseBinding() string {
	for _, k := range []string{"CRYPTOBOM_LICENSE_TENANT_ID", "CRYPTOBOM_TENANT_ID", "CRYPTOBOM_CUSTOMER_ID"} {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			return v
		}
	}
	return ""
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
			AIBOM:                false,
			IBOM:                 false,
			QBOM:                 false,
			HBOM:                 false,
			ApiSecurity:          true,
			AiSecurity:           false,
			HSMConnector:         false,
			DevSecOpsPipeline:    true,
			APIRateLimit:         100,
		},
	}
}

// enterpriseConfig reports actual configured enterprise capabilities.
// Features are enabled only when a valid enterprise license is present and the
// backing configuration/credentials/integrations for that capability exist.
// Unconfigured capabilities must be reported as unavailable.
func enterpriseConfig() *Config {
	rateLimit := 1000
	if envLimit := os.Getenv("CRYPTOBOM_RATE_LIMIT"); envLimit != "" {
		if n, err := fmt.Sscanf(envLimit, "%d", &rateLimit); err != nil || n != 1 {
			rateLimit = 1000
		}
	}
	ibmQuantum := strings.TrimSpace(os.Getenv("IBMQ_API_KEY")) != ""
	awsHSM := strings.TrimSpace(os.Getenv("AWS_CLOUDHSM_CLUSTER_ID")) != "" || strings.TrimSpace(os.Getenv("AWS_CLOUDHSM_ID")) != ""
	ibmCloud := strings.TrimSpace(os.Getenv("IBM_CLOUD_API_KEY")) != "" || strings.TrimSpace(os.Getenv("IBMCLOUD_API_KEY")) != ""
	awsCloud := strings.TrimSpace(os.Getenv("AWS_ACCESS_KEY_ID")) != "" || strings.TrimSpace(os.Getenv("AWS_ROLE_ARN")) != ""
	gcpCloud := strings.TrimSpace(os.Getenv("GCP_PROJECT_ID")) != "" || strings.TrimSpace(os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")) != ""
	azureCloud := strings.TrimSpace(os.Getenv("AZURE_SUBSCRIPTION_ID")) != "" || strings.TrimSpace(os.Getenv("AZURE_TENANT_ID")) != ""
	cloudConnectors := awsCloud || gcpCloud || azureCloud || ibmCloud
	multiCloud := countTrue(awsCloud, gcpCloud, azureCloud, ibmCloud) >= 1
	quantumAttestation := ibmQuantum
	compliance := strings.TrimSpace(os.Getenv("DELVE_API_KEY")) != "" || strings.TrimSpace(os.Getenv("KERTOS_API_KEY")) != "" || strings.TrimSpace(os.Getenv("CRYPTOBOM_COMPLIANCE_ENABLED")) == "true"
	sso := strings.TrimSpace(os.Getenv("CRYPTOBOM_SSO_ENABLED")) == "true" || strings.TrimSpace(os.Getenv("OIDC_ISSUER_URL")) != "" || strings.TrimSpace(os.Getenv("SAML_METADATA_URL")) != ""
	apiKeys := strings.TrimSpace(os.Getenv("CRYPTOBOM_API_KEYS_ENABLED")) == "true"
	hsmConnector := awsHSM || ibmCloud
	return &Config{
		Edition: Enterprise,
		Features: Features{
			// Core analysis engine remains available in enterprise builds.
			WebsiteScan:          true,
			HostIPScan:           true,
			ServerScan:           true,
			PodInventory:         true,
			LiveKubernetesAttach: strings.TrimSpace(os.Getenv("KUBECONFIG")) != "" || os.Getenv("KUBERNETES_SERVICE_HOST") != "",
			LocalSBOM:            true,
			Intelligence:         true,
			QiskitProfile:        true,
			CycloneDX:            true,
			GitHubScanning:       strings.TrimSpace(os.Getenv("GITHUB_TOKEN")) != "" || strings.TrimSpace(os.Getenv("GITHUB_APP_ID")) != "",
			Dashboard:            true,
			// Control-plane/capability features reflect actual configuration.
			DORAPack:             compliance,
			HardwareInventory:    hsmConnector,
			QSICDeclaration:      false,
			CloudConnectors:      cloudConnectors,
			QuantumConnector:     ibmQuantum,
			IBMCloudIntegration:  ibmCloud,
			AWSHSMIntegration:    awsHSM,
			QuantumAttestation:   quantumAttestation,
			MultiCloudInventory:  multiCloud,
			ComplianceReporting:  compliance,
			SSOSAMIL:             sso,
			AuditLog:             true, // enterprise control plane audit endpoint available when licensed+DB configured
			APIKeysWebhooks:      apiKeys,
			AIBOM:                strings.TrimSpace(os.Getenv("CRYPTOBOM_AIBOM_ENABLED")) == "true",
			IBOM:                 strings.TrimSpace(os.Getenv("CRYPTOBOM_IBOM_ENABLED")) == "true",
			QBOM:                 ibmQuantum,
			HBOM:                 hsmConnector,
			ApiSecurity:          true,
			AiSecurity:           strings.TrimSpace(os.Getenv("CRYPTOBOM_AI_SECURITY_ENABLED")) == "true",
			HSMConnector:         hsmConnector,
			DevSecOpsPipeline:    strings.TrimSpace(os.Getenv("CRYPTOBOM_DEVSECOPS_ENABLED")) == "true",
			APIRateLimit:         rateLimit,
		},
	}
}

func countTrue(vals ...bool) int {
	n := 0
	for _, v := range vals {
		if v {
			n++
		}
	}
	return n
}

// Public is the /edition payload plus the client-architecture scan catalog.
func (c *Config) Public() map[string]any {
	if c == nil {
		c = Detect()
	}
	return map[string]any{
		"edition":             c.Edition,
		"features":            c.Features,
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
			"hsm":     c.Features.HSMConnector || c.Features.AWSHSMIntegration,
			"note":    "Capabilities reflect actual configured credentials/integrations and a valid enterprise license; unconfigured capabilities are unavailable.",
		},
		"bom_layers": map[string]any{
			"cbom":  true,
			"sbom":  c.Features.LocalSBOM,
			"qbom":  c.Features.QBOM,
			"hbom":  c.Features.HBOM,
			"aibom": c.Features.AIBOM,
			"ibom":  c.Features.IBOM,
			"note":  "BOM layers reflect actual configured capability. QBOM/HBOM/AIBOM/IBOM require licensed, configured integrations.",
		},
	}
}
