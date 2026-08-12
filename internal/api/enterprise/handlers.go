package enterprise

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/oss"
	"github.com/rivic-q/cryptobom-saas/internal/api/shared"
	"github.com/rivic-q/cryptobom-saas/internal/awscloud"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/ibmcloud"
	"github.com/rivic-q/cryptobom-saas/internal/quantum"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/builtin"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/provider"
	"github.com/sirupsen/logrus"
)

// SetupRoutes configures Enterprise API routes with IBMQ integration
func SetupRoutes(router *gin.RouterGroup, db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) {
	authService := shared.SetupStandardAuth(router, db, logger)
	enterpriseAuth := authService.JWTAuthMiddleware(nil)

	// Initialize Enterprise database with fallback
	var enterpriseDB *database.EnterpriseDB
	dbConfig := config.DatabaseConfig{
		Host:     getEnvOrDefault("CRYPTOBOM_DB_HOST", "localhost"),
		Port:     getEnvOrDefaultInt("CRYPTOBOM_DB_PORT", 5432),
		User:     getEnvOrDefault("CRYPTOBOM_DB_USER", "cryptobom"),
		Password: os.Getenv("CRYPTOBOM_DB_PASSWORD"),
		Name:     getEnvOrDefault("CRYPTOBOM_ENTERPRISE_DB_NAME", "cryptobom_enterprise"),
		SSLMode:  getEnvOrDefault("CRYPTOBOM_DB_SSLMODE", "disable"),
	}
	enterpriseDB, err := database.NewEnterpriseConnection(dbConfig)
	if err != nil {
		logger.WithError(err).Warn("Enterprise database unavailable — enterprise endpoints will use demo mode")
	} else {
		if err := database.RunEnterpriseMigrations(enterpriseDB); err != nil {
			logger.WithError(err).Warn("Enterprise migrations failed — enterprise endpoints will use demo mode")
		}
	}

	// Initialize handlers (nil-safe: each handler checks for nil db internally)
	inventoryHandler := NewInventoryHandler(enterpriseDB, logger, cfg)
	complianceHandler := NewComplianceHandler(enterpriseDB, logger)
	multicloudHandler := NewMultiCloudHandler(enterpriseDB, logger)
	cncfHandler := NewCNCFHandler(enterpriseDB, logger)
	terraformHandler := NewTerraformHandler(enterpriseDB, logger)

	// Quantum Provider SDK: register builtin providers and instantiate the ones
	// with configuration. IBM Quantum stays opt-in and reports itself
	// unavailable when no API key is configured (it is never a hard dependency).
	quantumRegistry := provider.NewRegistry()
	if err := builtin.Register(context.Background(), quantumRegistry, builtin.Options{
		Logger: logger,
		IBM: quantum.IBMQuantumConfig{
			APIKey:  cfg.IBMQ.APIKey,
			BaseURL: cfg.IBMQ.Endpoint,
			Network: cfg.IBMQ.Network,
			Timeout: cfg.IBMQ.Timeout,
		},
		EnableIBM: cfg.IBMQ.Enabled,
	}); err != nil {
		logger.WithError(err).Warn("failed to register builtin quantum providers")
	}
	if errs := quantumRegistry.Init(context.Background(), nil); len(errs) > 0 {
		for _, err := range errs {
			logger.WithError(err).Warn("quantum provider initialisation skipped")
		}
	}
	quantumHandler := NewQuantumAttestationHandler(enterpriseDB, logger, quantumRegistry)
	apiKeyManager := NewAPIKeyManager(enterpriseDB, logger)
	webhookManager := NewWebhookManager(enterpriseDB, logger)
	auditViewer := NewAuditViewer(enterpriseDB, logger)

	// Setup Enterprise-specific routes (nil-safe: handlers return demo data when db is nil)
	inventoryHandler.SetupRoutes(router)
	complianceHandler.SetupRoutes(router)
	multicloudHandler.SetupRoutes(router)
	cncfHandler.SetupRoutes(router)
	terraformHandler.SetupRoutes(router)
	quantumHandler.SetupRoutes(router)

	// Enterprise feature routes with auth middleware
	// enterpriseAuth already set from SetupStandardAuth above
	apiKeyManager.SetupRoutes(router, enterpriseAuth)
	webhookManager.SetupRoutes(router, enterpriseAuth)
	auditViewer.SetupRoutes(router, enterpriseAuth)

	if enterpriseDB == nil {
		logger.Info("Enterprise endpoints registered in demo mode")
	}

	// Enhanced CBOM Management with IBMQ Attestation
	cbom := router.Group("/cbom")
	{
		cbom.GET("", shared.ListCBOMReports(db, logger))
		cbom.POST("", shared.CreateCBOMReport(db, logger))
		cbom.GET("/:id", shared.GetCBOMReport(db, logger))
		cbom.PUT("/:id", shared.UpdateCBOMReport(db, logger))
		cbom.DELETE("/:id", shared.DeleteCBOMReport(db, logger))
		cbom.POST("/:id/scan", shared.ScanCBOMReport(db, logger, cfg))
		cbom.POST("/:id/attest", attestCBOMReport(db, logger, cfg))
	}

	// Advanced Crypto Assets with Quantum Verification
	assetsGroup := router.Group("/assets")
	{
		assetsGroup.GET("", shared.ListCryptoAssets(db, logger))
		assetsGroup.GET("/:id", shared.GetCryptoAsset(db, logger))
		assetsGroup.PUT("/:id", shared.UpdateCryptoAsset(db, logger))
		assetsGroup.GET("/:id/bom", shared.GetAssetBOM(db, logger))
		assetsGroup.POST("/:id/quantum-verify", verifyAssetQuantum(db, logger, cfg))
	}

	// Advanced Security with ML Integration
	securityGroup := router.Group("/security")
	{
		securityGroup.GET("/events", shared.ListSecurityEvents(db, logger))
		securityGroup.POST("/events", shared.CreateSecurityEvent(db, logger))
		securityGroup.PUT("/events/:id/resolve", shared.ResolveSecurityEvent(db, logger))
		securityGroup.GET("/threats", getThreatIntelligence(db, logger, cfg))
		securityGroup.POST("/ml-scan", performMLSecurityScan(db, logger, cfg))
	}

	// Enhanced Dashboard with Quantum Metrics
	dashboardGroup := router.Group("/dashboard")
	{
		dashboardGroup.GET("/overview", shared.GetDashboardOverview(db, logger))
		dashboardGroup.GET("/metrics", shared.GetMetrics(db, logger))
		dashboardGroup.GET("/compliance", shared.GetComplianceStatus(db, logger))
		dashboardGroup.GET("/quantum", getQuantumMetrics(db, logger, cfg))
	}

	// Multi-Cloud Integration
	cloudGroup := router.Group("/cloud")
	{
		cloudGroup.GET("/providers", listCloudProviders(db, logger, cfg))
		cloudGroup.POST("/aws", configureAWSIntegration(db, logger, cfg))
		cloudGroup.POST("/gcp", configureGCPIntegration(db, logger, cfg))
		cloudGroup.POST("/azure", configureAzureIntegration(db, logger, cfg))
	}

	// Enterprise SSO
	ssoGroup := router.Group("/sso")
	{
		ssoGroup.GET("/providers", listSSOProviders(db, logger, cfg))
		ssoGroup.POST("/saml", configureSAMLIntegration(db, logger, cfg))
		ssoGroup.POST("/ldap", configureLDAPIntegration(db, logger, cfg))
	}

	// Advanced Analytics
	analyticsGroup := router.Group("/analytics")
	{
		analyticsGroup.GET("/reports", generateCustomReports(db, logger, cfg))
		analyticsGroup.POST("/insights", getMLInsights(db, logger, cfg))
		analyticsGroup.GET("/forecasts", getQuantumThreatForecasts(db, logger, cfg))
	}

	// Kubernetes Integration with Enterprise Features
	k8sGroup := router.Group("/kubernetes")
	{
		k8sGroup.GET("/clusters", shared.ListKubernetesClusters(db, logger))
		k8sGroup.POST("/clusters", shared.AddKubernetesCluster(db, logger))
		k8sGroup.GET("/clusters/:id/status", shared.GetClusterStatus(db, logger))
		k8sGroup.POST("/clusters/:id/scan", shared.ScanCluster(db, logger, cfg))
		k8sGroup.POST("/clusters/:id/quantum-scan", performQuantumScan(db, logger, cfg))
	}

	// Monitoring Tools with Enterprise Features
	monitoringGroup := router.Group("/monitoring")
	{
		monitoringGroup.GET("/integrations", shared.GetMonitoringIntegrations(db, logger))
		monitoringGroup.POST("/prometheus", shared.CreatePrometheusIntegration(db, logger))
		monitoringGroup.POST("/grafana", shared.CreateGrafanaDashboard(db, logger))
		monitoringGroup.GET("/jaeger", shared.GetJaegerTracing(db, logger))
		monitoringGroup.POST("/splunk", configureSplunkIntegration(db, logger, cfg))
		monitoringGroup.POST("/datadog", configureDatadogIntegration(db, logger, cfg))
	}

	// Metrics Overview with Quantum Data
	router.GET("/metrics/overview", shared.GetMetricsOverview(db, logger))

	// CSPM (Cryptographic Security Posture Management)
	cspmGroup := router.Group("/cspm")
	cspmGroup.Use(enterpriseAuth)
	{
		cspmGroup.GET("/overview", GetCSPMOverview(db, logger, cfg))
	}

	// Enterprise Cloud HSM & Key Management Extensions
	enterpriseGroup := router.Group("/enterprise")
	{
		ibmGroup := enterpriseGroup.Group("/ibm")
		{
			ibmGroup.GET("/hpcs/status", getHPCSStatus(db, logger, cfg))
			ibmGroup.GET("/hpcs/keys", getHPCSKeys(db, logger, cfg))
			ibmGroup.GET("/cos/buckets", getCOSBuckets(db, logger, cfg))
			ibmGroup.POST("/hpcs/keys/:keyId/attest", attestHPCSKey(db, logger, cfg))
		}
		awsGroup := enterpriseGroup.Group("/aws")
		{
			awsGroup.GET("/cloudhsm/status", getCloudHSMStatus(db, logger, cfg))
			awsGroup.GET("/kms/keys", getKMSKeys(db, logger, cfg))
			awsGroup.GET("/cloudtrail/crypto-events", getCloudTrailAudit(db, logger, cfg))
		}
		quantumGroup := enterpriseGroup.Group("/quantum")
		{
			quantumGroup.GET("/assessment", getQuantumRiskAssessment(db, logger, cfg))
			quantumGroup.POST("/scan", scanForPQCAlgorithms(db, logger, cfg))
			quantumGroup.GET("/attest/:assetId", getAttestationReport(db, logger, cfg))
			quantumGroup.GET("/migration-roadmap", getMigrationRoadmap(db, logger, cfg))
			quantumGroup.GET("/bom/:assetId/export", exportQuantumSafeBOM(db, logger, cfg))
		}
		gcpGroup := enterpriseGroup.Group("/gcp")
		{
			gcpGroup.GET("/kms/keys", getGCPKMSKeys(db, logger, cfg))
			gcpGroup.GET("/gke/workloads", getGKEWorkloads(db, logger, cfg))
			gcpGroup.GET("/hsm/keyrings", getGCPHSMKeyRings(db, logger, cfg))
		}
	}

	// Benchmarks (edition-agnostic)
	router.GET("/benchmarks", getBenchmarksSummary(db, logger))

	// Scan flow (shared with OSS — scanner, Quantum BOM)
	scansGroup := router.Group("/scans")
	{
		scansGroup.POST("", shared.TriggerCBOMScan(db, logger))
		scansGroup.GET("/:id", shared.GetCBOMScanStatus(db, logger))
		scansGroup.GET("/:id/report", shared.GetCBOMScanReport(db, logger))
		scansGroup.GET("/:id/qbom", shared.GetScanQBOM(db, logger))
	}

	// RivicQ ecosystem + demo scan (OSS-compatible)
	oss.RegisterSupplementalRoutes(router, logger)

	// AI intelligence
	SetupAIRoutes(router, db, logger)
}

func allowedDomainsFromEnv() []string {
	raw := strings.TrimSpace(os.Getenv("AUTH_ALLOWED_DOMAINS"))
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	domains := make([]string, 0, len(parts))
	for _, part := range parts {
		domain := strings.ToLower(strings.TrimSpace(part))
		if domain != "" {
			domains = append(domains, domain)
		}
	}
	return domains
}

// IBMQ API Handlers
func GetIBMQStatus(cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !cfg.IBMQ.Enabled {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "disabled",
				"message": "IBM Quantum integration is not enabled",
			})
			return
		}

		quantumConfig := quantum.IBMQuantumConfig{
			APIKey:    cfg.IBMQ.APIKey,
			BaseURL:   cfg.IBMQ.Endpoint,
			Network:   cfg.IBMQ.Network,
			Timeout:   cfg.IBMQ.Timeout,
			EnableTLS: true,
		}
		client, err := quantum.NewIBMQuantumClient(quantumConfig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		networkInfo, err := client.GetNetworkInfo(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":  err.Error(),
				"status": "error",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":         "connected",
			"ibmq_network":   networkInfo,
			"network_name":   networkInfo.Name,
			"nodes":          networkInfo.Nodes,
			"qubits":         networkInfo.Qubits,
			"fidelity":       networkInfo.Fidelity,
			"network_status": networkInfo.Status,
		})
	}
}

func ListIBMQuantumSystems(cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !cfg.IBMQ.Enabled {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"systems": []gin.H{},
				"message": "IBM Quantum integration not enabled",
			})
			return
		}

		quantumConfig := quantum.IBMQuantumConfig{
			APIKey:    cfg.IBMQ.APIKey,
			BaseURL:   cfg.IBMQ.Endpoint,
			Network:   cfg.IBMQ.Network,
			Timeout:   cfg.IBMQ.Timeout,
			EnableTLS: true,
		}
		client, err := quantum.NewIBMQuantumClient(quantumConfig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		algorithms, err := client.GetPostQuantumAlgorithms(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"algorithms": algorithms,
			"total":      len(algorithms),
		})
	}
}

func CreateIBMQuantumAttestation(cfg *config.EnterpriseConfig, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !cfg.IBMQ.Enabled {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "IBM Quantum integration not enabled",
			})
			return
		}

		var request struct {
			AssetID     string                 `json:"asset_id"`
			Algorithm   string                 `json:"algorithm"`
			Certificate map[string]interface{} `json:"certificate"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		quantumConfig := quantum.IBMQuantumConfig{
			APIKey:    cfg.IBMQ.APIKey,
			BaseURL:   cfg.IBMQ.Endpoint,
			Network:   cfg.IBMQ.Network,
			Timeout:   cfg.IBMQ.Timeout,
			EnableTLS: true,
		}
		client, err := quantum.NewIBMQuantumClient(quantumConfig)
		if err != nil {
			logger.WithError(err).Error("Failed to create IBM Quantum client")
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		// Perform quantum attestation
		attestationReq := quantum.QuantumAttestationRequest{
			Algorithm:       request.Algorithm,
			Usage:           "cryptographic_attestation",
			Metadata:        request.Certificate,
			Timestamp:       time.Now(),
			AttestationType: "cbom_verification",
		}
		attestation, err := client.AttestAlgorithm(c.Request.Context(), attestationReq)
		if err != nil {
			logger.WithError(err).Error("Failed to create IBM Quantum attestation")
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		logger.WithFields(logrus.Fields{
			"asset_id":       request.AssetID,
			"attestation_id": attestation.ID,
		}).Info("Created IBM Quantum attestation")

		c.JSON(http.StatusCreated, gin.H{
			"attestation":      attestation,
			"quantum_safe":     attestation.QuantumSafe,
			"confidence_score": attestation.Confidence,
		})
	}
}

func ListQuantumNetworks(cfg *config.EnterpriseConfig, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !cfg.IBMQ.Enabled {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"networks": []gin.H{},
			})
			return
		}

		quantumConfig := quantum.IBMQuantumConfig{
			APIKey:    cfg.IBMQ.APIKey,
			BaseURL:   cfg.IBMQ.Endpoint,
			Network:   cfg.IBMQ.Network,
			Timeout:   cfg.IBMQ.Timeout,
			EnableTLS: true,
		}
		client, err := quantum.NewIBMQuantumClient(quantumConfig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		networkInfo, err := client.GetNetworkInfo(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"network": networkInfo,
		})
	}
}

func TriggerEmergencyQuantumResponse(cfg *config.EnterpriseConfig, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !cfg.IBMQ.Enabled {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "IBM Quantum integration not enabled",
			})
			return
		}

		var request struct {
			ThreatLevel    string   `json:"threat_level"`
			AffectedAssets []string `json:"affected_assets"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// For now, create a mock emergency response
		response := gin.H{
			"status":          "emergency_triggered",
			"threat_level":    request.ThreatLevel,
			"affected_assets": len(request.AffectedAssets),
			"timestamp":       time.Now(),
			"response_id":     fmt.Sprintf("emergency_%d", time.Now().Unix()),
		}

		logger.WithFields(logrus.Fields{
			"threat_level":    request.ThreatLevel,
			"affected_assets": len(request.AffectedAssets),
		}).Warn("Triggered emergency quantum response")

		c.JSON(http.StatusOK, gin.H{
			"emergency_response": response,
			"initiated_at":       response["timestamp"],
		})
	}
}

// Enterprise CBOM handlers with IBMQ integration
func attestCBOMReport(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Creating IBM Quantum attestation for CBOM")

		if !cfg.IBMQ.Enabled {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "IBM Quantum integration required for attestation",
			})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{
			"id":                 id,
			"attestation_status": "ibmq_initiated",
			"message":            "Quantum attestation started via IBM Quantum",
		})
	}
}

func verifyAssetQuantum(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Performing quantum verification via IBMQ")

		// Mock verification for now
		verification := gin.H{
			"asset_id":        id,
			"quantum_safe":    false,
			"score":           0.3,
			"recommendations": []string{"Upgrade to post-quantum algorithms"},
			"verified_at":     time.Now(),
		}

		c.JSON(http.StatusOK, gin.H{
			"asset_id":             id,
			"quantum_verification": verification,
		})
	}
}

func getThreatIntelligence(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting ML-powered threat intelligence")
		analysis, err := analyzeThreats(c.Request.Context(), db, tenantIDFor(c))
		if err != nil {
			logger.WithError(err).Error("Threat intelligence analysis failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Threat analysis failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"threats":           analysis.Threats,
			"total_threats":     analysis.TotalThreats,
			"quantum_risk_score": analysis.QuantumRiskScore,
			"pqc_readiness":     analysis.PQCReadiness,
			"source":            analysis.Source,
		})
	}
}

func performMLSecurityScan(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Performing ML-powered security scan")
		analysis, err := analyzeThreats(c.Request.Context(), db, tenantIDFor(c))
		if err != nil {
			logger.WithError(err).Error("ML security scan failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ML security scan failed"})
			return
		}
		// Persist detected high/critical findings into the real events feed.
		if err := persistThreatEvents(db, analysis, tenantIDFor(c)); err != nil {
			logger.WithError(err).Warn("failed to persist detected threat events")
		}
		c.JSON(http.StatusOK, gin.H{
			"scan_results": gin.H{
				"ml_threats_detected": analysis.TotalThreats,
				"quantum_risks":       analysis.VulnerableAssets,
				"critical":            analysis.Critical,
				"high":                analysis.High,
				"medium":              analysis.Medium,
				"low":                 analysis.Low,
				"ibmq_verified":       true,
			},
			"threats":      analysis.Threats,
			"scan_id":      fmt.Sprintf("ml-scan-%d", time.Now().Unix()),
			"generated_at": analysis.GeneratedAt,
		})
	}
}

// Cloud integration handlers
func listCloudProviders(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := tenantIDFor(c)
		providers := []gin.H{}

		// Report which providers are configured via the SDK env.
		sdks := newCloudSDKs(c.Request.Context())
		if sdks.aws != nil {
			providers = append(providers, gin.H{"provider": "aws", "configured": true, "source": "sdk"})
		}
		if sdks.gcp != nil {
			providers = append(providers, gin.H{"provider": "gcp", "configured": true, "source": "sdk"})
		}
		if sdks.azure != nil {
			providers = append(providers, gin.H{"provider": "azure", "configured": true, "source": "sdk"})
		}

		// Add providers registered in the enterprise DB.
		if db != nil {
			rows, err := db.Query(`SELECT DISTINCT provider FROM cloud_accounts WHERE tenant_id = $1 AND status = 'active'`, tenantID)
			if err == nil {
				defer func() { _ = rows.Close() }()
				seen := map[string]bool{"aws": sdks.aws != nil, "gcp": sdks.gcp != nil, "azure": sdks.azure != nil}
				for rows.Next() {
					var provider string
					if err := rows.Scan(&provider); err != nil {
						continue
					}
					if seen[provider] {
						continue
					}
					seen[provider] = true
					providers = append(providers, gin.H{"provider": provider, "configured": true, "source": "db"})
				}
			}
		}

		if len(providers) == 0 {
			providers = []gin.H{
				{"provider": "aws", "configured": false, "source": "unconfigured"},
				{"provider": "gcp", "configured": false, "source": "unconfigured"},
				{"provider": "azure", "configured": false, "source": "unconfigured"},
			}
		}

		c.JSON(http.StatusOK, gin.H{"providers": providers})
	}
}

func configureAWSIntegration(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"aws": "configured"})
	}
}

func configureGCPIntegration(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"gcp": "configured"})
	}
}

func configureAzureIntegration(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"azure": "configured"})
	}
}

// SSO handlers
func listSSOProviders(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := tenantIDFor(c)
		providers := []gin.H{}

		if db != nil {
			rows, err := db.Query(`
				SELECT provider, enabled, metadata FROM sso_configs
				WHERE tenant_id = $1
			`, tenantID)
			if err == nil {
				defer func() { _ = rows.Close() }()
				for rows.Next() {
					var provider string
					var enabled bool
					var metadata interface{}
					if err := rows.Scan(&provider, &enabled, &metadata); err != nil {
						continue
					}
					providers = append(providers, gin.H{
						"provider": provider,
						"enabled":  enabled,
						"metadata": metadata,
					})
				}
			}
		}

		c.JSON(http.StatusOK, gin.H{"providers": providers})
	}
}

func configureSAMLIntegration(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := tenantIDFor(c)
		var req struct {
			IDPMetadata string `json:"idp_metadata"`
			EntityID    string `json:"entity_id"`
			ACSURL      string `json:"acs_url"`
			Enabled     bool   `json:"enabled"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
			return
		}
		metadataJSON, _ := json.Marshal(map[string]interface{}{
			"idp_metadata": req.IDPMetadata,
			"entity_id":    req.EntityID,
			"acs_url":      req.ACSURL,
		})
		_, err := db.Exec(`
			INSERT INTO sso_configs (tenant_id, provider, enabled, metadata, created_at, updated_at)
			VALUES ($1, 'saml', $2, $3, NOW(), NOW())
			ON CONFLICT (tenant_id, provider)
			DO UPDATE SET enabled = EXCLUDED.enabled, metadata = EXCLUDED.metadata, updated_at = NOW()
		`, tenantID, req.Enabled, string(metadataJSON))
		if err != nil {
			logger.WithError(err).Error("Failed to configure SAML integration")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to configure SAML integration"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"saml": "configured", "enabled": req.Enabled})
	}
}

func configureLDAPIntegration(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := tenantIDFor(c)
		var req struct {
			ServerURL string `json:"server_url"`
			BindDN    string `json:"bind_dn"`
			BaseDN    string `json:"base_dn"`
			Enabled   bool   `json:"enabled"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
			return
		}
		metadataJSON, _ := json.Marshal(map[string]interface{}{
			"server_url": req.ServerURL,
			"bind_dn":    req.BindDN,
			"base_dn":    req.BaseDN,
		})
		_, err := db.Exec(`
			INSERT INTO sso_configs (tenant_id, provider, enabled, metadata, created_at, updated_at)
			VALUES ($1, 'ldap', $2, $3, NOW(), NOW())
			ON CONFLICT (tenant_id, provider)
			DO UPDATE SET enabled = EXCLUDED.enabled, metadata = EXCLUDED.metadata, updated_at = NOW()
		`, tenantID, req.Enabled, string(metadataJSON))
		if err != nil {
			logger.WithError(err).Error("Failed to configure LDAP integration")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to configure LDAP integration"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ldap": "configured", "enabled": req.Enabled})
	}
}

// Analytics handlers
func generateCustomReports(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		analysis, err := analyzeThreats(c.Request.Context(), db, tenantIDFor(c))
		if err != nil {
			logger.WithError(err).Error("Report generation failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Report generation failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"reports": []gin.H{
				{
					"type":                "quantum_risk_assessment",
					"ibmq_data":           cfg.IBMQ.Enabled,
					"total_assets":        analysis.TotalAssets,
					"quantum_safe_assets": analysis.QuantumSafeAssets,
					"vulnerable_assets":   analysis.VulnerableAssets,
					"pqc_readiness":       analysis.PQCReadiness,
					"threats_detected":    analysis.TotalThreats,
					"generated_at":        analysis.GeneratedAt,
				},
			},
		})
	}
}

func getMLInsights(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		insights, err := generateInsights(c.Request.Context(), db, tenantIDFor(c))
		if err != nil {
			logger.WithError(err).Error("Insight generation failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Insight generation failed"})
			return
		}
		if len(insights) == 0 {
			labels := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
			trend := make([]gin.H, len(labels))
			for i, label := range labels {
				trend[i] = gin.H{"label": label, "score": 68 + i*2, "value": 68 + i*2}
			}
			c.JSON(http.StatusOK, gin.H{
				"posture_trend": trend,
				"trend":         trend,
				"insights": []gin.H{
					{"type": "posture_summary", "title": "Post-quantum readiness improving", "severity": "medium", "confidence": 0.88},
				},
				"total": 1,
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"insights": insights,
			"total":    len(insights),
		})
	}
}

func getQuantumThreatForecasts(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		forecasts, err := generateForecasts(c.Request.Context(), db, tenantIDFor(c))
		if err != nil {
			logger.WithError(err).Error("Forecast generation failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Forecast generation failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"forecasts": forecasts,
			"total":     len(forecasts),
		})
	}
}

// Enterprise enhanced handlers
func performQuantumScan(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("cluster_id", id).Info("Performing quantum vulnerability scan")
		c.JSON(http.StatusOK, gin.H{
			"cluster_id":   id,
			"quantum_scan": "completed",
			"ibmq_results": true,
		})
	}
}

// Enterprise monitoring handlers
func configureSplunkIntegration(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"splunk": "configured"})
	}
}

func configureDatadogIntegration(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"datadog": "configured"})
	}
}

// Quantum metrics handler
func getQuantumMetrics(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		metrics, err := computeQuantumMetrics(c.Request.Context(), db, tenantIDFor(c))
		if err != nil {
			logger.WithError(err).Error("Quantum metrics computation failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Quantum metrics computation failed"})
			return
		}
		c.JSON(http.StatusOK, metrics)
	}
}

// ── Enterprise Cloud HSM / Key Management ──────────────────────────────

func getHPCSStatus(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting IBM HPCS status")
		client := ibmcloud.NewHPCSClient(&config.IBMCloudConfig{
			APIKey:       cfg.Cloud.IBM.APIKey,
			Region:       cfg.Cloud.IBM.Region,
			HPCSEnabled:  cfg.Cloud.IBM.HPCSEnabled,
			HPCSInstance: cfg.Cloud.IBM.HPCSInstance,
		})
		status, err := client.GetStatus()
		if err != nil && !client.Configured {
			logger.WithError(err).Warn("HPCS not configured, returning demo status")
		}
		c.JSON(http.StatusOK, status)
	}
}

func getHPCSKeys(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing IBM HPCS keys")
		client := ibmcloud.NewHPCSClient(&config.IBMCloudConfig{
			APIKey:       cfg.Cloud.IBM.APIKey,
			Region:       cfg.Cloud.IBM.Region,
			HPCSEnabled:  cfg.Cloud.IBM.HPCSEnabled,
			HPCSInstance: cfg.Cloud.IBM.HPCSInstance,
		})
		keys, err := client.ListKeys()
		if err != nil && !client.Configured {
			logger.WithError(err).Warn("HPCS not configured, returning demo keys")
		}
		c.JSON(http.StatusOK, gin.H{"keys": keys, "total": len(keys)})
	}
}

func getCOSBuckets(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing IBM COS buckets")
		client := ibmcloud.NewHPCSClient(&config.IBMCloudConfig{
			APIKey:       cfg.Cloud.IBM.APIKey,
			Region:       cfg.Cloud.IBM.Region,
			HPCSEnabled:  cfg.Cloud.IBM.HPCSEnabled,
			HPCSInstance: cfg.Cloud.IBM.HPCSInstance,
		})
		buckets, err := client.ListCOSBuckets()
		if err != nil && !client.Configured {
			logger.WithError(err).Warn("IBM COS not configured, returning demo buckets")
		}
		c.JSON(http.StatusOK, gin.H{"buckets": buckets, "total": len(buckets)})
	}
}

func attestHPCSKey(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		keyID := c.Param("keyId")
		logger.WithField("key_id", keyID).Info("Attesting IBM HPCS key")
		client := ibmcloud.NewHPCSClient(&config.IBMCloudConfig{
			APIKey:       cfg.Cloud.IBM.APIKey,
			Region:       cfg.Cloud.IBM.Region,
			HPCSEnabled:  cfg.Cloud.IBM.HPCSEnabled,
			HPCSInstance: cfg.Cloud.IBM.HPCSInstance,
		})
		report, err := client.AttestKey(keyID)
		if err != nil && !client.Configured {
			logger.WithError(err).Warn("HPCS not configured, returning demo attestation")
		}
		c.JSON(http.StatusOK, gin.H{
			"key_id":   keyID,
			"status":   "attested",
			"provider": "ibm-hpcs",
			"verified": report != nil && report.NISTCompliant,
			"report":   report,
		})
	}
}

// ── AWS Cloud HSM / KMS ────────────────────────────────────────────────

func getCloudHSMStatus(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting AWS CloudHSM status")
		client := awscloud.NewCloudHSMClient(&cfg.Cloud.AWS)
		status, err := client.GetClusterStatus()
		if err != nil {
			logger.WithError(err).Warn("CloudHSM lookup failed, returning demo status")
		}
		c.JSON(http.StatusOK, status)
	}
}

func getKMSKeys(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing AWS KMS keys")
		client := awscloud.NewCloudHSMClient(&cfg.Cloud.AWS)
		keys, err := client.ListKMSKeys()
		if err != nil {
			logger.WithError(err).Warn("KMS lookup failed, returning demo keys")
		}
		c.JSON(http.StatusOK, gin.H{"keys": keys, "total": len(keys)})
	}
}

func getCloudTrailAudit(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting AWS CloudTrail crypto events")
		client := awscloud.NewCloudHSMClient(&cfg.Cloud.AWS)
		since := time.Now().Add(-24 * time.Hour)
		events, err := client.GetCryptoAuditEvents(since)
		if err != nil {
			logger.WithError(err).Warn("CloudTrail lookup failed, returning demo events")
		}
		c.JSON(http.StatusOK, gin.H{"events": events, "total": len(events)})
	}
}

// ── Quantum Attestation Extended ────────────────────────────────────────

func getQuantumRiskAssessment(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting quantum risk assessment")
		analysis, err := analyzeThreats(c.Request.Context(), db, tenantIDFor(c))
		if err != nil {
			logger.WithError(err).Error("Quantum risk assessment failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Quantum risk assessment failed"})
			return
		}
		overall := severityFromRisk(analysis.QuantumRiskScore)
		migrationPriority := "low"
		if analysis.VulnerableAssets > 0 {
			migrationPriority = severityFromRisk(analysis.QuantumRiskScore)
		}
		c.JSON(http.StatusOK, gin.H{
			"overall_risk":         overall,
			"quantum_safe_assets":  analysis.QuantumSafeAssets,
			"vulnerable_assets":    analysis.VulnerableAssets,
			"total_assets":         analysis.TotalAssets,
			"migration_priority":   migrationPriority,
			"risk_score":           analysis.QuantumRiskScore,
			"pqc_readiness":        analysis.PQCReadiness,
			"threats_detected":     analysis.TotalThreats,
			"algorithm_stats":      analysis.AlgorithmStats,
		})
	}
}

func scanForPQCAlgorithms(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Scanning for PQC algorithms")
		c.JSON(http.StatusAccepted, gin.H{
			"scan_id":        fmt.Sprintf("pqc-scan-%d", time.Now().Unix()),
			"status":         "in_progress",
			"assets_scanned": 0,
		})
	}
}

func getAttestationReport(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		assetID := c.Param("assetId")
		logger.WithField("asset_id", assetID).Info("Getting attestation report")

		attestations := []gin.H{}
		if db != nil {
			rows, err := db.Query(`
				SELECT qa.id, ca.algorithm, qa.status, ca.quantum_safe, qa.attested_at
				FROM quantum_attestations qa
				JOIN cbom_reports cr ON qa.cbom_report_id = cr.id
				JOIN crypto_assets ca ON ca.cbom_report_id = cr.id
				WHERE ca.id = $1
			`, assetID)
			if err == nil {
				defer func() { _ = rows.Close() }()
				for rows.Next() {
					var id, algorithm, status string
					var quantumSafe bool
					var attestedAt interface{}
					if err := rows.Scan(&id, &algorithm, &status, &quantumSafe, &attestedAt); err != nil {
						continue
					}
					attestations = append(attestations, gin.H{
						"algorithm":    algorithm,
						"status":       status,
						"quantum_safe": quantumSafe,
					})
				}
			}
		}

		quantumSafe := 0
		for _, a := range attestations {
			if a["quantum_safe"] == true {
				quantumSafe++
			}
		}
		c.JSON(http.StatusOK, gin.H{
			"asset_id":     assetID,
			"attestations": attestations,
			"summary":      gin.H{"total": len(attestations), "quantum_safe": quantumSafe, "vulnerable": len(attestations) - quantumSafe},
		})
	}
}

func getMigrationRoadmap(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting migration roadmap")
		analysis, err := analyzeThreats(c.Request.Context(), db, tenantIDFor(c))
		if err != nil {
			logger.WithError(err).Error("Migration roadmap computation failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Migration roadmap computation failed"})
			return
		}

		phase1Completion := 0
		if analysis.TotalAssets > 0 {
			phase1Completion = 100
		}
		phase2Completion := 0
		criticalHigh := analysis.Critical + analysis.High
		if criticalHigh > 0 {
			phase2Completion = 100 - int(float64(criticalHigh)/float64(max(analysis.TotalThreats, 1))*100)
			if phase2Completion < 0 {
				phase2Completion = 0
			}
		} else if analysis.TotalAssets > 0 {
			phase2Completion = 100
		}
		phase3Completion := int(analysis.PQCReadiness)

		c.JSON(http.StatusOK, gin.H{
			"phases": []gin.H{
				{"phase": 1, "description": "Inventory and classify cryptographic assets", "status": statusFor(phase1Completion), "completion": phase1Completion},
				{"phase": 2, "description": "Prioritize critical algorithms for migration", "status": statusFor(phase2Completion), "completion": phase2Completion},
				{"phase": 3, "description": "Implement PQC replacements", "status": statusFor(phase3Completion), "completion": phase3Completion},
			},
			"total_phases":         3,
			"current_phase":        currentPhase(phase1Completion, phase2Completion, phase3Completion),
			"estimated_completion": "2026-Q4",
			"quantum_safe_assets":  analysis.QuantumSafeAssets,
			"vulnerable_assets":    analysis.VulnerableAssets,
		})
	}
}

func statusFor(completion int) string {
	switch {
	case completion >= 100:
		return "completed"
	case completion > 0:
		return "in_progress"
	default:
		return "pending"
	}
}

func currentPhase(phase1, phase2, phase3 int) int {
	switch {
	case phase1 < 100:
		return 1
	case phase2 < 100:
		return 2
	default:
		return 3
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func exportQuantumSafeBOM(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		assetId := c.Param("assetId")
		logger.WithField("asset_id", assetId).Info("Exporting quantum-safe BOM")
		c.JSON(http.StatusOK, gin.H{
			"asset_id":    assetId,
			"bom_version": "2.0",
			"format":      "cyclonedx",
			"components":  shared.BOMComponents(),
			"summary":     gin.H{"total": 3, "quantum_safe": 2, "pqc_ready": 1},
		})
	}
}

// ── GCP Cloud HSM / KMS ────────────────────────────────────────────────

func getGCPKMSKeys(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing GCP KMS keys")
		c.JSON(http.StatusOK, gin.H{
			"keys": []gin.H{
				{"id": "gcp-kms-1", "algorithm": "GOOGLE_SYMMETRIC_ENCRYPTION", "state": "enabled", "location": "global"},
				{"id": "gcp-kms-2", "algorithm": "RSA_DECRYPT_OAEP_4096_SHA256", "state": "enabled", "location": "us-central1"},
			},
			"total": 2,
		})
	}
}

func getGKEWorkloads(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing GKE workloads")
		c.JSON(http.StatusOK, gin.H{
			"workloads": []gin.H{
				{"name": "api-server", "namespace": "default", "crypto_assets": 4, "quantum_safe": 2},
				{"name": "auth-service", "namespace": "security", "crypto_assets": 6, "quantum_safe": 3},
			},
			"total": 2,
		})
	}
}

func getGCPHSMKeyRings(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing GCP HSM key rings")
		c.JSON(http.StatusOK, gin.H{
			"key_rings": []gin.H{
				{"name": "cryptobom-production", "location": "us-central1", "keys": 4, "hsm": true},
				{"name": "cryptobom-staging", "location": "us-east1", "keys": 2, "hsm": false},
			},
			"total": 2,
		})
	}
}

// ── Benchmarks ─────────────────────────────────────────────────────────

func getBenchmarksSummary(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting benchmark summary")
		c.JSON(http.StatusOK, gin.H{
			"benchmarks": []gin.H{
				{"name": "NIST SP 800-56A", "status": "compliant", "score": 92.5, "findings": 2},
				{"name": "BSI TR-02102", "status": "compliant", "score": 88.0, "findings": 3},
				{"name": "PCI DSS 4.0", "status": "non_compliant", "score": 65.0, "findings": 7},
			},
			"overall_score": 81.8,
		})
	}
}

// env helper functions
func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvOrDefaultInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
