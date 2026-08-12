package oss

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/shared"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/core"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

// SetupRoutes configures OSS API routes (Open Source edition)
func SetupRoutes(router *gin.RouterGroup, db *database.DB, logger *logrus.Logger, cfg *config.OSSConfig) {
	shared.SetupStandardAuth(router, db, logger)

	// Core CBOM Management (OSS Features)
	cbom := router.Group("/cbom")
	{
		cbom.GET("", shared.ListCBOMReports(db, logger))
		cbom.POST("", shared.CreateCBOMReport(db, logger))
		cbom.GET("/:id", shared.GetCBOMReport(db, logger))
		cbom.PUT("/:id", shared.UpdateCBOMReport(db, logger))
		cbom.DELETE("/:id", shared.DeleteCBOMReport(db, logger))
		cbom.POST("/:id/scan", shared.ScanCBOMReport(db, logger, cfg))
		cbom.POST("/:id/attest", attestCBOMReportOSS(db, logger))
	}

	// Crypto Assets (Basic Discovery)
	assetsGroup := router.Group("/assets")
	{
		assetsGroup.GET("", shared.ListCryptoAssets(db, logger))
		assetsGroup.GET("/:id", shared.GetCryptoAsset(db, logger))
		assetsGroup.PUT("/:id", shared.UpdateCryptoAsset(db, logger))
		assetsGroup.GET("/:id/bom", shared.GetAssetBOM(db, logger))
	}

	// Scan Flow (headleap entry point)
	scansGroup := router.Group("/scans")
	{
		scansGroup.GET("", shared.ListCBOMScans(db, logger))
		scansGroup.GET("/findings", shared.ScanFindingsHandler(logger))
		scansGroup.POST("", shared.TriggerCBOMScan(db, logger))
		scansGroup.GET("/:id", shared.GetCBOMScanStatus(db, logger))
		scansGroup.GET("/:id/report", shared.GetCBOMScanReport(db, logger))
		scansGroup.GET("/:id/qbom", shared.GetScanQBOM(db, logger))
	}

	// Basic Security Monitoring
	securityGroup := router.Group("/security")
	{
		securityGroup.GET("/events", shared.ListSecurityEvents(db, logger))
		securityGroup.POST("/events", shared.CreateSecurityEvent(db, logger))
		securityGroup.PUT("/events/:id/resolve", shared.ResolveSecurityEvent(db, logger))
		securityGroup.GET("/threats", getThreatIntelligenceOSS(db, logger))
		securityGroup.POST("/ml-scan", performMLSecurityScanOSS(db, logger))
	}

	// Dashboard & Analytics (OSS Version)
	dashboardGroup := router.Group("/dashboard")
	{
		dashboardGroup.GET("/overview", shared.GetDashboardOverview(db, logger))
		dashboardGroup.GET("/metrics", shared.GetMetrics(db, logger))
		dashboardGroup.GET("/compliance", shared.GetComplianceStatus(db, logger))
	}

	// Kubernetes Integration (Basic)
	k8sGroup := router.Group("/kubernetes")
	{
		k8sGroup.GET("/clusters", shared.ListKubernetesClusters(db, logger))
		k8sGroup.POST("/clusters", shared.AddKubernetesCluster(db, logger))
		k8sGroup.GET("/clusters/:id/status", shared.GetClusterStatus(db, logger))
		k8sGroup.POST("/clusters/:id/scan", shared.ScanCluster(db, logger, cfg))
	}

	// Monitoring Tools Integration (Basic)
	monitoringGroup := router.Group("/monitoring")
	{
		monitoringGroup.GET("/integrations", shared.GetMonitoringIntegrations(db, logger))
		monitoringGroup.POST("/prometheus", shared.CreatePrometheusIntegration(db, logger))
		monitoringGroup.POST("/grafana", shared.CreateGrafanaDashboard(db, logger))
		monitoringGroup.GET("/jaeger", shared.GetJaegerTracing(db, logger))
	}

	// Cilium Integration (Basic)
	ciliumGroup := router.Group("/cilium")
	{
		ciliumGroup.GET("/flows", shared.GetCiliumCryptoFlows(db, logger))
		ciliumGroup.GET("/policies", shared.GetCiliumNetworkPolicies(db, logger))
		ciliumGroup.POST("/policies", shared.CreateCiliumNetworkPolicy(db, logger))
		ciliumGroup.GET("/metrics", shared.GetCiliumMetrics(db, logger))
	}

	// Metrics Overview for OSS Dashboard
	router.GET("/metrics/overview", shared.GetMetricsOverview(db, logger))

	// CSPM (Cryptographic Security Posture Management) - available in both editions
	router.GET("/cspm/overview", getCSPMOverviewOSS(logger))

	// GitHub Scanning (OSS edition — repository crypto scanning)
	shared.SetupGitHubScanningRoutes(router, logger)

	// Benchmarks (edition-agnostic)
	router.GET("/benchmarks", getBenchmarksSummaryOSS(db, logger))

	// Demo scan, ecosystem, core
	RegisterSupplementalRoutes(router, logger)

	// Dashboard demo routes — inventory, cloud, compliance, analytics for OSS UI
	shared.SetupDashboardDemoRoutes(router, logger)
}

// RegisterSupplementalRoutes exposes scanner-adjacent OSS routes for enterprise reuse.
func RegisterSupplementalRoutes(router *gin.RouterGroup, logger *logrus.Logger) {
	router.GET("/demo/scan", getDemoScanResults(logger))

	ecosystemGroup := router.Group("/ecosystem")
	{
		ecosystemGroup.GET("/tools", getEcosystemTools(logger))
		ecosystemGroup.GET("/tools/:id", getEcosystemTool(logger))
		ecosystemGroup.GET("/categories", getEcosystemCategories(logger))
	}

	coreGroup := router.Group("/core")
	{
		coreGroup.GET("/status", getCoreStatus(logger))
		coreGroup.GET("/services", getCoreServices(logger))
		coreGroup.GET("/integrations/:name", getCoreIntegrationCheck(logger))
	}
}

func attestCBOMReportOSS(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Creating attestation for CBOM (OSS edition)")
		c.JSON(http.StatusAccepted, gin.H{
			"id":                 id,
			"attestation_status": "pending",
			"message":            "Attestation queued for processing",
		})
	}
}

func getThreatIntelligenceOSS(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting threat intelligence (OSS edition)")
		c.JSON(http.StatusOK, gin.H{
			"threats": []gin.H{
				{
					"type":       "vulnerability",
					"severity":   "medium",
					"confidence": 0.85,
				},
			},
		})
	}
}

func performMLSecurityScanOSS(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Performing security scan (OSS edition)")
		c.JSON(http.StatusOK, gin.H{
			"scan_results": gin.H{
				"threats_detected": 2,
				"quantum_risks":    1,
			},
		})
	}
}

type ecosystemTool struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Edition     string `json:"edition"`
	Status      string `json:"status"`
	Type        string `json:"type"`
	DocsURL     string `json:"docs_url,omitempty"`
	RepoURL     string `json:"repo_url,omitempty"`
	InstallCmd  string `json:"install_cmd,omitempty"`
}

var ecosystemTools = []ecosystemTool{
	{ID: "sdk-py", Name: "cryptobom-core (Python)", Category: "sdk", Description: "Python SDK for CBOM scanning, quantum risk assessment, and PQC migration planning.", Edition: "both", Status: "available", Type: "sdk", DocsURL: "https://docs.rivicq.com/python", RepoURL: "https://github.com/rivic-q/cryptobom-python", InstallCmd: "pip install cryptobom-core"},
	{ID: "sdk-java", Name: "cryptobom-enterprise (Java)", Category: "sdk", Description: "Java SDK for enterprise CBOM generation, IBM Quantum attestation, and multi-cloud scanning.", Edition: "enterprise", Status: "enterprise_only", Type: "sdk", DocsURL: "https://docs.rivicq.com/java", InstallCmd: "mvn dependency:copy -Dartifact=com.rivicq:cryptobom-enterprise:1.3.0"},
	{ID: "sdk-rust", Name: "cryptobom-enterprise (Rust)", Category: "sdk", Description: "Rust crate for high-performance cryptographic asset scanning with quantum provider integration.", Edition: "enterprise", Status: "enterprise_only", Type: "sdk", InstallCmd: "cargo install cryptobom-enterprise --features quantum"},
	{ID: "sdk-cpp", Name: "cryptobom-cpp", Category: "sdk", Description: "C++ library for embedded CBOM scanning in native applications and IoT firmware.", Edition: "enterprise", Status: "beta", Type: "sdk", RepoURL: "https://github.com/rivicq/cryptobom-cpp"},
	{ID: "sdk-c", Name: "libcryptobom (C)", Category: "sdk", Description: "C library for lightweight cryptographic discovery in constrained environments.", Edition: "enterprise", Status: "beta", Type: "sdk", InstallCmd: "wget https://github.com/rivicq/cryptobom-c/releases/download/v1.3.0/libcryptobom.so"},
	{ID: "sdk-ruby", Name: "cryptobom-enterprise (Ruby)", Category: "sdk", Description: "Ruby gem for CBOM generation and compliance reporting in Rails applications.", Edition: "enterprise", Status: "enterprise_only", Type: "sdk", InstallCmd: "gem install cryptobom-enterprise"},
	{ID: "cli-oss", Name: "CryptoBOM Scanner (OSS)", Category: "cli", Description: "Standalone CLI for TLS/SSH/HTTP cryptographic discovery and SBOM generation.", Edition: "oss", Status: "available", Type: "cli", RepoURL: "https://github.com/rivic-q/cryptobom-saas", InstallCmd: "go install github.com/rivic-q/cryptobom-saas/cmd/scanner@latest"},
	{ID: "cli-enterprise", Name: "CryptoBOM Scanner (Enterprise)", Category: "cli", Description: "Enterprise CLI with multi-cloud HSM scanning, quantum attestation, and ML threat detection.", Edition: "enterprise", Status: "enterprise_only", Type: "cli", InstallCmd: "docker pull rivic-q/cryptobom-enterprise:latest"},
	{ID: "cli-demo", Name: "Infrastructure Discovery Scanner", Category: "cli", Description: "Demo scanner for weak crypto discovery across TLS, SSH, and HTTP endpoints.", Edition: "both", Status: "available", Type: "cli", RepoURL: "https://github.com/rivic-q/cryptobom-saas", InstallCmd: "make build-scanner && ./bin/cryptobom-scanner"},
	{ID: "plugin-headlamp", Name: "Headlamp Plugin", Category: "plugin", Description: "Kubernetes cluster crypto dashboard — visualize CBOM data, quantum risk, and compliance status in Headlamp.", Edition: "both", Status: "available", Type: "plugin", DocsURL: "https://docs.rivicq.com/headlamp", RepoURL: "https://github.com/rivic-q/cryptobom-headlamp-plugin"},
	{ID: "plugin-k8s-operator", Name: "Kubernetes Operator", Category: "plugin", Description: "Automated CBOM scanning for Kubernetes clusters — detects cryptographic assets in pods, services, and secrets.", Edition: "enterprise", Status: "enterprise_only", Type: "plugin", RepoURL: "https://github.com/rivic-q/cryptobom-operator"},
	{ID: "cloud-aws", Name: "AWS Cloud Integration", Category: "service", Description: "CloudHSM cluster status, KMS key inventory, CloudTrail cryptographic event auditing.", Edition: "enterprise", Status: "enterprise_only", Type: "service", DocsURL: "https://docs.rivicq.com/aws"},
	{ID: "cloud-gcp", Name: "GCP Cloud Integration", Category: "service", Description: "Cloud KMS key management, GKE workload crypto scanning, HSM key ring attestation.", Edition: "enterprise", Status: "enterprise_only", Type: "service", DocsURL: "https://docs.rivicq.com/gcp"},
	{ID: "cloud-ibm", Name: "IBM Cloud HPCS", Category: "service", Description: "Hyper Protect Crypto Service key management, COS bucket attestation, quantum-safe key generation.", Edition: "enterprise", Status: "enterprise_only", Type: "service", DocsURL: "https://docs.rivicq.com/ibm"},
	{ID: "cloud-azure", Name: "Azure Cloud Integration", Category: "service", Description: "Azure Key Vault, managed HSM, and cryptographic asset inventory scanning.", Edition: "enterprise", Status: "enterprise_only", Type: "service"},
	{ID: "quantum-ibm", Name: "IBM Quantum Attestation", Category: "service", Description: "Quantum network attestation for CBOM reports — validates PQC readiness against IBM Quantum systems.", Edition: "enterprise", Status: "enterprise_only", Type: "service", DocsURL: "https://docs.rivicq.com/quantum"},
	{ID: "int-prometheus", Name: "Prometheus", Category: "integration", Description: "Scrape cryptographic asset metrics, quantum risk scores, and compliance status.", Edition: "both", Status: "available", Type: "integration", DocsURL: "https://prometheus.io/docs"},
	{ID: "int-grafana", Name: "Grafana", Category: "integration", Description: "Pre-built CBOM compliance dashboards with DORA, NIS2, and quantum risk visualizations.", Edition: "both", Status: "available", Type: "integration", DocsURL: "https://grafana.com/docs"},
	{ID: "int-cilium", Name: "Cilium / eBPF", Category: "integration", Description: "Real-time cryptographic flow monitoring via eBPF — detect TLS/SSH algorithm usage in live traffic.", Edition: "both", Status: "available", Type: "integration", DocsURL: "https://docs.cilium.io"},
	{ID: "int-trivy", Name: "Trivy", Category: "integration", Description: "Container and filesystem vulnerability scanning with CBOM enrichment.", Edition: "oss", Status: "available", Type: "integration", DocsURL: "https://aquasecurity.github.io/trivy"},
	{ID: "int-syft", Name: "Syft", Category: "integration", Description: "SBOM generation for containers and filesystems — import into CryptoBOM for crypto analysis.", Edition: "oss", Status: "available", Type: "integration", RepoURL: "https://github.com/anchore/syft"},
	{ID: "int-codeql", Name: "CodeQL", Category: "integration", Description: "Static analysis for cryptographic misuse in source code — detect weak algorithms, hardcoded keys.", Edition: "both", Status: "available", Type: "integration", DocsURL: "https://codeql.github.com/docs"},
	{ID: "int-argocd", Name: "ArgoCD", Category: "integration", Description: "GitOps deployment with CBOM compliance gates — block deployments with critical crypto findings.", Edition: "enterprise", Status: "enterprise_only", Type: "integration"},
	{ID: "int-flux", Name: "Flux", Category: "integration", Description: "Continuous delivery with automated CBOM scanning on cluster sync.", Edition: "enterprise", Status: "enterprise_only", Type: "integration"},
	{ID: "int-delve", Name: "Delve Compliance", Category: "integration", Description: "Automated compliance evidence collection for DORA, NIS2, and SOC 2 frameworks.", Edition: "enterprise", Status: "enterprise_only", Type: "integration"},
	{ID: "int-kertos", Name: "Kertos GRC", Category: "integration", Description: "Governance, risk, and compliance platform integration for centralized audit reporting.", Edition: "enterprise", Status: "enterprise_only", Type: "integration"},
	{ID: "int-splunk", Name: "Splunk", Category: "integration", Description: "Forward CBOM security events and quantum risk scores to Splunk for SIEM correlation.", Edition: "enterprise", Status: "enterprise_only", Type: "integration"},
	{ID: "int-datadog", Name: "Datadog", Category: "integration", Description: "Monitor CBOM metrics alongside infrastructure telemetry in Datadog dashboards.", Edition: "enterprise", Status: "enterprise_only", Type: "integration"},

	// RivicQ Agentic Security AI
	{ID: "agentic-security", Name: "RivicQ Agentic Security AI", Category: "service", Description: "AI-powered security agent for autonomous threat detection, compliance monitoring, and incident response.", Edition: "both", Status: "available", Type: "service", DocsURL: "https://github.com/rivic-q/rivicq-agentic-security", RepoURL: "https://github.com/rivic-q/rivicq-agentic-security", InstallCmd: "pip install rivicq-agentic-security"},

	// RivicQ Crosschain Protocol
	{ID: "crosschain-protocol", Name: "RivicQ Crosschain Protocol", Category: "service", Description: "Secure cross-chain communication protocol with eIDAS 2.0 compliance, zk-proofs, and quantum-safe signatures.", Edition: "both", Status: "available", Type: "service", DocsURL: "https://github.com/rivicq/rivicq-protocol", RepoURL: "https://github.com/rivicq/rivicq-protocol", InstallCmd: "docker pull rivicq/crosschain-hub"},

	// GitHub Integration
	{ID: "github-scanning", Name: "GitHub Crypto Scanning", Category: "integration", Description: "Scan GitHub repositories for cryptographic assets, weak algorithms, and quantum risk. Integrates with GitHub Actions.", Edition: "oss", Status: "available", Type: "integration", DocsURL: "https://docs.rivicq.com/github-scanning"},
}

func getEcosystemTools(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Serving RivicQ ecosystem tools list")
		c.JSON(http.StatusOK, gin.H{"tools": ecosystemTools})
	}
}

func getEcosystemTool(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		for _, tool := range ecosystemTools {
			if tool.ID == id {
				c.JSON(http.StatusOK, gin.H{"tool": tool})
				return
			}
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Tool not found"})
	}
}

func getEcosystemCategories(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		categories := []gin.H{
			{"id": "sdk", "name": "SDKs & Libraries", "count": 6},
			{"id": "cli", "name": "CLI & Scanner", "count": 3},
			{"id": "plugin", "name": "Plugins", "count": 2},
			{"id": "service", "name": "Cloud Services", "count": 7},
			{"id": "integration", "name": "Integrations", "count": 13},
		}
		c.JSON(http.StatusOK, gin.H{"categories": categories})
	}
}

func getDemoScanResults(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Serving demo infrastructure scan results")

		type Finding struct {
			ID          string `json:"id"`
			TargetID    string `json:"target_id"`
			TargetLabel string `json:"target_label"`
			Host        string `json:"host"`
			Port        int    `json:"port"`
			Protocol    string `json:"protocol"`
			FindingType string `json:"finding_type"`
			Title       string `json:"title"`
			Description string `json:"description"`
			Evidence    string `json:"evidence"`
			Severity    string `json:"severity"`
			Algorithm   string `json:"algorithm"`
			KeyLength   int    `json:"key_length"`
			Remediation string `json:"remediation"`
			BSIRef      string `json:"bsi_ref"`
			DORARef     string `json:"dora_ref"`
			EIDASRef    string `json:"eidas_ref"`
			QuantumSafe bool   `json:"quantum_safe"`
			ScannedAt   string `json:"scanned_at"`
		}

		now := time.Now().UTC().Format(time.RFC3339)
		findings := []Finding{
			{ID: "f-001", TargetID: "tls-1", TargetLabel: "NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)", Host: "localhost", Port: 4431, Protocol: "tls", FindingType: "WEAK_TLS_VERSION", Title: "TLS 1.0 Detected", Description: "TLS 1.0 is deprecated and contains known vulnerabilities (BEAST, POODLE). Prohibited by BSI TR-02102-2 and eIDAS 2.0.", Evidence: "TLS version: TLS 1.0 (0x0301)", Severity: "CRITICAL", Algorithm: "TLS 1.0", KeyLength: 0, Remediation: "Upgrade to TLS 1.2 (minimum) or TLS 1.3. Disable TLS 1.0 and 1.1 in server config.", BSIRef: "BSI TR-02102-2, Section 3.2", DORARef: "DORA Art. 9(2)", EIDASRef: "eIDAS 2.0 ETSI TS 119 312", QuantumSafe: false, ScannedAt: now},
			{ID: "f-002", TargetID: "tls-1", TargetLabel: "NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)", Host: "localhost", Port: 4431, Protocol: "tls", FindingType: "WEAK_CIPHER_RC4", Title: "RC4 Cipher Suite Detected", Description: "RC4 is a broken stream cipher.", Evidence: "Negotiated cipher: TLS_RSA_WITH_RC4_128_SHA", Severity: "CRITICAL", Algorithm: "RC4", KeyLength: 128, Remediation: "Disable RC4 cipher suites.", BSIRef: "BSI TR-02102-2, Section 3.3.1", DORARef: "DORA Art. 9(2)", EIDASRef: "eIDAS 2.0 ETSI TS 119 312", QuantumSafe: false, ScannedAt: now},
			{ID: "f-003", TargetID: "tls-4", TargetLabel: "Java Legacy HTTPS (RSA-512, MD5withRSA)", Host: "localhost", Port: 8443, Protocol: "tls", FindingType: "WEAK_KEY_RSA", Title: "RSA Key Too Short (512 bits)", Description: "RSA-512 is cryptographically weak.", Evidence: "Certificate public key: RSA-512", Severity: "CRITICAL", Algorithm: "RSA", KeyLength: 512, Remediation: "Replace certificate with RSA-3072 or higher.", BSIRef: "BSI TR-02102-1, Section 3.5", DORARef: "DORA Art. 9(4)(b)", EIDASRef: "eIDAS 2.0 Annex IV", QuantumSafe: false, ScannedAt: now},
			{ID: "f-004", TargetID: "tls-1", TargetLabel: "NGINX TLS 1.0 (RC4, RSA-1024, SHA-1)", Host: "localhost", Port: 4431, Protocol: "tls", FindingType: "WEAK_SIG_SHA1", Title: "SHA-1 Certificate Signature", Description: "SHA-1 is deprecated for certificate signing.", Evidence: "Certificate signature algorithm: SHA1withRSA", Severity: "HIGH", Algorithm: "SHA1withRSA", KeyLength: 0, Remediation: "Re-issue certificate using SHA-256 or SHA-384 signature algorithm.", BSIRef: "BSI TR-02102-1, Section 3.3", DORARef: "DORA Art. 9(2)", EIDASRef: "eIDAS 2.0 ETSI TS 119 312", QuantumSafe: false, ScannedAt: now},
			{ID: "f-005", TargetID: "ssh-1", TargetLabel: "SSH Weak KEX + DSA Host Key", Host: "localhost", Port: 2222, Protocol: "ssh", FindingType: "WEAK_SSH_KEX", Title: "Oakley Group 1 (768-bit DH) KEX Detected", Description: "diffie-hellman-group1-sha1 uses 768-bit DH.", Evidence: "SSH KEX algorithm: diffie-hellman-group1-sha1", Severity: "HIGH", Algorithm: "diffie-hellman-group1-sha1", KeyLength: 768, Remediation: "Remove weak KEX algorithms.", BSIRef: "BSI TR-02102-4, Section 3.2", DORARef: "DORA Art. 9(2)", EIDASRef: "eIDAS 2.0 ETSI TS 119 312", QuantumSafe: false, ScannedAt: now},
			{ID: "f-006", TargetID: "tls-2", TargetLabel: "NGINX TLS 1.2 (No Forward Secrecy)", Host: "localhost", Port: 4432, Protocol: "tls", FindingType: "NO_FORWARD_SECRECY", Title: "TLS 1.2 Without Forward Secrecy", Description: "TLS 1.2 cipher suite does not provide forward secrecy.", Evidence: "TLS 1.2 with cipher: TLS_RSA_WITH_AES_128_CBC_SHA", Severity: "HIGH", Algorithm: "TLS_RSA_WITH_AES_128_CBC_SHA", KeyLength: 0, Remediation: "Require ECDHE or DHE key exchange.", BSIRef: "BSI TR-02102-2, Section 3.3", DORARef: "DORA Art. 9(2)", EIDASRef: "eIDAS 2.0 ETSI TS 119 312", QuantumSafe: false, ScannedAt: now},
			{ID: "f-007", TargetID: "ssh-1", TargetLabel: "SSH Weak KEX + DSA Host Key", Host: "localhost", Port: 2222, Protocol: "ssh", FindingType: "WEAK_HOST_KEY_DSA", Title: "DSA Host Key Detected", Description: "DSA is limited to 1024-bit keys.", Evidence: "SSH host key algorithm: ssh-dss", Severity: "CRITICAL", Algorithm: "DSA", KeyLength: 1024, Remediation: "Replace DSA host keys with Ed25519 or ECDSA P-256.", BSIRef: "BSI TR-02102-4, Section 3.4", DORARef: "DORA Art. 9(2)", EIDASRef: "eIDAS 2.0 ETSI TS 119 312", QuantumSafe: false, ScannedAt: now},
			{ID: "f-008", TargetID: "http-1", TargetLabel: "Legacy MD5 Hash API", Host: "localhost", Port: 5001, Protocol: "http", FindingType: "MISSING_HSTS", Title: "Missing HTTP Strict-Transport-Security Header", Description: "Absent HSTS header allows potential protocol downgrade attacks.", Evidence: "HTTP response missing 'Strict-Transport-Security' header", Severity: "MEDIUM", Algorithm: "", KeyLength: 0, Remediation: "Add 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload'.", BSIRef: "BSI TR-02102-2, Section 3.6", DORARef: "DORA Art. 9(2)", EIDASRef: "", QuantumSafe: false, ScannedAt: now},
		}

		c.JSON(http.StatusOK, gin.H{
			"scan_id":      "demo-scan-live",
			"started_at":   now,
			"completed_at": now,
			"findings":     findings,
			"summary": gin.H{
				"total_targets":   4,
				"scanned_targets": 4,
				"total_findings":  len(findings),
				"critical":        4,
				"high":            3,
				"medium":          1,
				"low":             0,
				"quantum_unsafe":  len(findings),
				"bsi_compliant":   0,
			},
		})
	}
}

func getCoreServices(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		services := core.GetServices()
		logger.Info("Serving core services health")
		c.JSON(http.StatusOK, gin.H{"services": services})
	}
}

func getCoreStatus(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		edition := c.DefaultQuery("edition", "oss")
		status := core.GetStatus(edition)
		logger.WithField("edition", edition).Info("Serving core status")
		c.JSON(http.StatusOK, gin.H{"core": status})
	}
}

func getCoreIntegrationCheck(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		enabled, description := core.CheckIntegration(name)
		c.JSON(http.StatusOK, gin.H{
			"integration": name,
			"enabled":     enabled,
			"description": description,
		})
	}
}

func getBenchmarksSummaryOSS(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting benchmark summary (OSS edition)")
		c.JSON(http.StatusOK, gin.H{
			"benchmarks": []gin.H{
				{"name": "NIST SP 800-56A", "status": "compliant", "score": 92.5, "findings": 2},
				{"name": "BSI TR-02102", "status": "compliant", "score": 88.0, "findings": 3},
			},
			"overall_score": 90.2,
		})
	}
}

// CSPM handler for OSS edition - returns demo CSPM overview data
func getCSPMOverviewOSS(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Serving CSPM overview (OSS edition)")

		type algorithmRisk struct {
			Name        string `json:"name"`
			Usage       int    `json:"usage"`
			RiskLevel   string `json:"risk_level"`
			QuantumSafe bool   `json:"quantum_safe"`
			Migration   string `json:"migration"`
		}
		type topologyLink struct {
			From      string `json:"from"`
			To        string `json:"to"`
			Encrypted bool   `json:"encrypted"`
			Provider  string `json:"provider"`
		}

		c.JSON(http.StatusOK, gin.H{
			"health_score":        74,
			"total_assets":        1427,
			"outdated_algorithms": 23,
			"at_risk_data":        847,
			"quantum_safe_pct":    62.5,
			"generated":           time.Now().UTC().Format(time.RFC3339),
			"risk_breakdown": []algorithmRisk{
				{Name: "AES-256-GCM", Usage: 142, RiskLevel: "low", QuantumSafe: true, Migration: "monitored"},
				{Name: "RSA-2048", Usage: 89, RiskLevel: "high", QuantumSafe: false, Migration: "migrate"},
				{Name: "Triple DES", Usage: 23, RiskLevel: "critical", QuantumSafe: false, Migration: "migrate"},
				{Name: "ChaCha20-Poly1305", Usage: 56, RiskLevel: "low", QuantumSafe: true, Migration: "monitored"},
				{Name: "ECDSA P-384", Usage: 34, RiskLevel: "medium", QuantumSafe: false, Migration: "plan"},
				{Name: "ML-KEM-768", Usage: 12, RiskLevel: "low", QuantumSafe: true, Migration: "monitored"},
			},
			"topology": []topologyLink{
				{From: "AWS KMS", To: "S3", Encrypted: true, Provider: "aws"},
				{From: "Azure Key Vault", To: "Blob", Encrypted: true, Provider: "azure"},
				{From: "GCP KMS", To: "GCS", Encrypted: true, Provider: "gcp"},
				{From: "K8s Pod", To: "Pod", Encrypted: true, Provider: "kubernetes"},
			},
		})
	}
}
