package enterprise

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/oss"
	"github.com/rivic-q/cryptobom-saas/internal/api/shared"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/awscloud"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/ibmcloud"
	"github.com/rivic-q/cryptobom-saas/internal/quantum"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/builtin"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/provider"
	"github.com/sirupsen/logrus"
)

// SetupRoutes configures Enterprise API routes with IBMQ integration.
// Enterprise mode is fail-closed: database/migration/configuration failures must
// not result in serving demo/fabricated data as real.
func SetupRoutes(router *gin.RouterGroup, db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) {
	authService := shared.SetupStandardAuth(router, db, logger)
	enterpriseAuth := authService.AuthenticateMiddleware()

	// Core database is required for enterprise tenancy/auth/state alignment.
	if !standardDBReady(db) {
		logger.Fatal("Core database unavailable — enterprise endpoints cannot start (fail-closed, no demo data)")
	}

	// Enterprise tables live in the core DB by default to preserve tenant model
	// consistency. A separate enterprise DB is opt-in via ENTERPRISE_DATABASE_URL
	// and must never silently reuse the wrong database.
	var enterpriseDB *database.EnterpriseDB
	if dsn := database.EnterpriseDatabaseURL(); dsn != "" {
		conn, err := database.NewEnterpriseConnection(config.DatabaseConfig{})
		if err != nil {
			logger.WithError(err).Fatal("Separate enterprise database (ENTERPRISE_DATABASE_URL) unavailable — fail closed")
		}
		if err := database.RunEnterpriseMigrations(conn); err != nil {
			logger.WithError(err).Fatal("Separate enterprise database migrations failed — fail closed")
		}
		enterpriseDB = conn
		logger.Info("Enterprise using separate ENTERPRISE_DATABASE_URL database")
	} else {
		enterpriseDB = database.NewEnterpriseDBFromSQL(db.DB, logger)
		if err := database.RunEnterpriseMigrations(enterpriseDB); err != nil {
			logger.WithError(err).Fatal("Enterprise migrations on core database failed — fail closed")
		}
		logger.Info("Enterprise tables aligned to core database/tenant model")
	}

	// Initialize handlers (nil-safe guards remain as defense in depth)
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

	// Setup Enterprise-specific routes.
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

	// Multi-Cloud Integration — mutating connectors require Admin
	cloudGroup := router.Group("/cloud")
	{
		cloudGroup.GET("/providers", listCloudProviders(db, logger, cfg))
		cloudWrite := cloudGroup.Group("")
		cloudWrite.Use(enterpriseAuth, auth.RequireRole("admin"))
		{
			cloudWrite.POST("/aws", configureAWSIntegration(db, logger, cfg))
			cloudWrite.POST("/gcp", configureGCPIntegration(db, logger, cfg))
			cloudWrite.POST("/azure", configureAzureIntegration(db, logger, cfg))
		}
	}

	// Enterprise SSO — configuration requires Admin
	ssoGroup := router.Group("/sso")
	{
		ssoGroup.GET("/providers", listSSOProviders(db, logger, cfg))
		ssoWrite := ssoGroup.Group("")
		ssoWrite.Use(enterpriseAuth, auth.RequireRole("admin"))
		{
			ssoWrite.POST("/saml", configureSAMLIntegration(db, logger, cfg))
			ssoWrite.POST("/ldap", configureLDAPIntegration(db, logger, cfg))
		}
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
		scansGroup.GET("", shared.ListCBOMScans(db, logger))
		scansGroup.GET("/findings", shared.ScanFindingsHandler(logger))
		scansGroup.POST("", shared.TriggerCBOMScan(db, logger))
		scansGroup.GET("/:id", shared.GetCBOMScanStatus(db, logger))
		scansGroup.GET("/:id/report", shared.GetCBOMScanReport(db, logger))
		scansGroup.GET("/:id/qbom", shared.GetScanQBOM(db, logger))
	}

	// RivicQ ecosystem + demo scan (OSS-compatible)
	oss.RegisterSupplementalRoutes(router, logger)

	// GitHub repository content scanning (same handlers as OSS — extend, do not replace)
	shared.SetupGitHubScanningRoutes(router, logger)

	// AI intelligence
	SetupAIRoutes(router, db, logger)
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
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":     "unavailable",
			"source":     "unconfigured",
			"configured": cfg != nil && cfg.IBMQ.Enabled && cfg.IBMQ.APIKey != "",
			"capability": "emergency_quantum_response",
			"message":    "Emergency quantum response is unavailable: no verified response integration configured",
		})
	}
}

// Enterprise CBOM handlers with IBMQ integration
func attestCBOMReport(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		// No real attestation pipeline is wired here; never claim initiated/attested.
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"id":         id,
			"status":     "unavailable",
			"source":     "unconfigured",
			"configured": cfg != nil && cfg.IBMQ.Enabled && cfg.IBMQ.APIKey != "",
			"capability": "cbom_quantum_attestation",
			"message":    "CBOM quantum attestation is unavailable: no verified attestation integration configured",
		})
	}
}

func verifyAssetQuantum(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"asset_id":   id,
			"status":     "unavailable",
			"source":     "unconfigured",
			"verified":   false,
			"configured": cfg != nil && cfg.IBMQ.Enabled && cfg.IBMQ.APIKey != "",
			"capability": "quantum_asset_verification",
			"message":    "Quantum asset verification is unavailable: no verified provider integration configured",
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
			"threats":            analysis.Threats,
			"total_threats":      analysis.TotalThreats,
			"quantum_risk_score": analysis.QuantumRiskScore,
			"pqc_readiness":      analysis.PQCReadiness,
			"source":             analysis.Source,
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
				"ibmq_verified":       false,
			},
			"threats":      analysis.Threats,
			"scan_id":      fmt.Sprintf("ml-scan-%d", time.Now().Unix()),
			"generated_at": analysis.GeneratedAt,
			"source":       analysis.Source,
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
			c.JSON(http.StatusOK, gin.H{
				"posture_trend": []any{},
				"trend":         []any{},
				"insights":      []any{},
				"total":         0,
				"status":        "ok",
				"source":        "analysis",
				"message":       "No insights available from configured/observed data",
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
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"cluster_id":   id,
			"status":       "unavailable",
			"source":       "unconfigured",
			"configured":   false,
			"ibmq_results": false,
			"capability":   "quantum_scan",
			"message":      "Quantum vulnerability scan is unavailable: no verified integration configured",
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
		client := ibmcloud.NewHPCSClient(&config.IBMCloudConfig{
			APIKey:       cfg.Cloud.IBM.APIKey,
			Region:       cfg.Cloud.IBM.Region,
			HPCSEnabled:  cfg.Cloud.IBM.HPCSEnabled,
			HPCSInstance: cfg.Cloud.IBM.HPCSInstance,
		})
		if !client.Configured {
			c.JSON(http.StatusOK, gin.H{"status": "unavailable", "source": "unconfigured", "configured": false, "capability": "ibm_hpcs", "message": "IBM HPCS is not configured"})
			return
		}
		status, err := client.GetStatus()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "source": "error", "configured": true, "capability": "ibm_hpcs", "message": "IBM HPCS status unavailable"})
			return
		}
		c.JSON(http.StatusOK, status)
	}
}

func getHPCSKeys(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		client := ibmcloud.NewHPCSClient(&config.IBMCloudConfig{
			APIKey:       cfg.Cloud.IBM.APIKey,
			Region:       cfg.Cloud.IBM.Region,
			HPCSEnabled:  cfg.Cloud.IBM.HPCSEnabled,
			HPCSInstance: cfg.Cloud.IBM.HPCSInstance,
		})
		if !client.Configured {
			c.JSON(http.StatusOK, gin.H{"keys": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "capability": "ibm_hpcs_keys", "message": "IBM HPCS is not configured"})
			return
		}
		keys, err := client.ListKeys()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"keys": []any{}, "total": 0, "status": "unavailable", "source": "error", "configured": true, "capability": "ibm_hpcs_keys", "message": "IBM HPCS keys unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"keys": keys, "total": len(keys), "status": "ok", "source": "ibm_hpcs"})
	}
}

func getCOSBuckets(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// IBM COS listing requires explicit COS credentials; never return demo buckets.
		if os.Getenv("IBM_COS_ACCESS_KEY") == "" || os.Getenv("IBM_COS_SECRET_KEY") == "" || os.Getenv("IBM_COS_ENDPOINT") == "" {
			c.JSON(http.StatusOK, gin.H{"buckets": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "capability": "ibm_cos", "message": "IBM COS is not configured"})
			return
		}
		client := ibmcloud.NewHPCSClient(&config.IBMCloudConfig{APIKey: cfg.Cloud.IBM.APIKey, Region: cfg.Cloud.IBM.Region, HPCSEnabled: cfg.Cloud.IBM.HPCSEnabled, HPCSInstance: cfg.Cloud.IBM.HPCSInstance})
		buckets, err := client.ListCOSBuckets()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"buckets": []any{}, "total": 0, "status": "unavailable", "source": "error", "configured": true, "capability": "ibm_cos", "message": "IBM COS buckets unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"buckets": buckets, "total": len(buckets), "status": "ok", "source": "ibm_cos"})
	}
}

func attestHPCSKey(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		keyID := c.Param("keyId")
		client := ibmcloud.NewHPCSClient(&config.IBMCloudConfig{
			APIKey:       cfg.Cloud.IBM.APIKey,
			Region:       cfg.Cloud.IBM.Region,
			HPCSEnabled:  cfg.Cloud.IBM.HPCSEnabled,
			HPCSInstance: cfg.Cloud.IBM.HPCSInstance,
		})
		if !client.Configured {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"key_id": keyID, "provider": "ibm-hpcs", "status": "unavailable", "source": "unconfigured",
				"configured": false, "verified": false, "attested": false,
				"capability": "hpcs_attestation", "message": "HPCS attestation is unavailable: HPCS is not configured or verified",
			})
			return
		}
		report, err := client.AttestKey(keyID)
		if err != nil || report == nil || !report.Verified {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"key_id": keyID, "provider": "ibm-hpcs", "status": "unavailable", "source": "ibm_hpcs",
				"configured": true, "verified": false, "attested": false,
				"capability": "hpcs_attestation", "message": "HPCS attestation unavailable or unverifiable", "report": report,
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"key_id": keyID, "provider": "ibm-hpcs", "status": report.Status, "source": "ibm_hpcs",
			"configured": true, "verified": report.Verified, "attested": report.Verified, "report": report,
		})
	}
}

// ── AWS Cloud HSM / KMS ────────────────────────────────────────────────

func getCloudHSMStatus(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		client := awscloud.NewCloudHSMClient(&cfg.Cloud.AWS)
		if !client.Configured() {
			c.JSON(http.StatusOK, gin.H{"status": "unavailable", "source": "unconfigured", "configured": false, "capability": "aws_cloudhsm", "message": "AWS CloudHSM is not configured"})
			return
		}
		status, err := client.GetClusterStatus()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "source": "error", "configured": true, "capability": "aws_cloudhsm", "message": "AWS CloudHSM status unavailable"})
			return
		}
		c.JSON(http.StatusOK, status)
	}
}

func getKMSKeys(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		client := awscloud.NewCloudHSMClient(&cfg.Cloud.AWS)
		if !client.Configured() {
			c.JSON(http.StatusOK, gin.H{"keys": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "capability": "aws_kms", "message": "AWS KMS is not configured"})
			return
		}
		keys, err := client.ListKMSKeys()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"keys": []any{}, "total": 0, "status": "unavailable", "source": "error", "configured": true, "capability": "aws_kms", "message": "AWS KMS keys unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"keys": keys, "total": len(keys), "status": "ok", "source": "aws_kms"})
	}
}

func getCloudTrailAudit(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		client := awscloud.NewCloudHSMClient(&cfg.Cloud.AWS)
		if !client.Configured() {
			c.JSON(http.StatusOK, gin.H{"events": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "capability": "aws_cloudtrail", "message": "AWS CloudTrail is not configured"})
			return
		}
		since := time.Now().Add(-24 * time.Hour)
		events, err := client.GetCryptoAuditEvents(since)
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"events": []any{}, "total": 0, "status": "unavailable", "source": "error", "configured": true, "capability": "aws_cloudtrail", "message": "AWS CloudTrail events unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"events": events, "total": len(events), "status": "ok", "source": "aws_cloudtrail"})
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
			"overall_risk":        overall,
			"quantum_safe_assets": analysis.QuantumSafeAssets,
			"vulnerable_assets":   analysis.VulnerableAssets,
			"total_assets":        analysis.TotalAssets,
			"migration_priority":  migrationPriority,
			"risk_score":          analysis.QuantumRiskScore,
			"pqc_readiness":       analysis.PQCReadiness,
			"threats_detected":    analysis.TotalThreats,
			"algorithm_stats":     analysis.AlgorithmStats,
		})
	}
}

func scanForPQCAlgorithms(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":     "unavailable",
			"source":     "unconfigured",
			"configured": false,
			"capability": "pqc_scan",
			"message":    "PQC scanning is unavailable: no verified scan integration configured",
		})
	}
}

func getAttestationReport(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		assetID := c.Param("assetId")
		if !standardDBReady(db) {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"asset_id": assetID, "attestations": []any{}, "status": "unavailable", "source": "unconfigured",
				"message": "Attestation report unavailable: database not configured",
			})
			return
		}
		attestations := []gin.H{}
		rows, err := db.Query(`
			SELECT qa.id, qa.status, qa.attestation_data, qa.attested_at
			FROM quantum_attestations qa
			WHERE qa.asset_id::text = $1 OR qa.id::text = $1
		`, assetID)
		if err == nil {
			defer func() { _ = rows.Close() }()
			for rows.Next() {
				var id, status string
				var data, attestedAt interface{}
				if err := rows.Scan(&id, &status, &data, &attestedAt); err != nil {
					continue
				}
				attestations = append(attestations, gin.H{"id": id, "status": status, "attested_at": attestedAt})
			}
		}
		c.JSON(http.StatusOK, gin.H{
			"asset_id": assetID, "attestations": attestations, "status": "ok", "source": "database",
			"summary": gin.H{"total": len(attestations)},
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
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"asset_id": assetId, "status": "unavailable", "source": "unconfigured", "configured": false,
			"capability": "quantum_safe_bom_export", "message": "Quantum-safe BOM export is unavailable: no verified export source configured",
		})
	}
}

// ── GCP Cloud HSM / KMS ────────────────────────────────────────────────

func getGCPKMSKeys(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"keys": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "capability": "gcp_kms", "message": "GCP KMS is not configured"})
	}
}

func getGKEWorkloads(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"workloads": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "capability": "gke_workloads", "message": "GKE integration is not configured"})
	}
}

func getGCPHSMKeyRings(db *database.DB, logger *logrus.Logger, cfg *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"key_rings": []any{}, "total": 0, "status": "unavailable", "source": "unconfigured", "configured": false, "capability": "gcp_hsm_keyrings", "message": "GCP HSM key rings are not configured"})
	}
}

// ── Benchmarks ─────────────────────────────────────────────────────────

func getBenchmarksSummary(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"benchmarks":    []any{},
			"overall_score": 0,
			"status":        "unavailable",
			"source":        "unconfigured",
			"configured":    false,
			"message":       "Benchmarks unavailable: no verified benchmark/compliance data configured",
		})
	}
}
