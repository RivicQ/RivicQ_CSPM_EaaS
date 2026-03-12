package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/cilium"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

// API response structures
type CiliumFlowResponse struct {
	Flows []cilium.CryptoFlow `json:"flows"`
	Total int                 `json:"total"`
	Found int                 `json:"found"`
}

type CiliumPolicyResponse struct {
	Policies []cilium.CiliumNetworkPolicy `json:"policies"`
	Total    int                          `json:"total"`
	Applied  int                          `json:"applied"`
}

type MonitoringIntegration struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Enabled  bool   `json:"enabled"`
	Endpoint string `json:"endpoint"`
	Version  string `json:"version"`
}

type CiliumMetricsResponse struct {
	TotalFlows     int            `json:"total_flows"`
	TotalPolicies  int            `json:"total_policies"`
	CryptoFlows    int            `json:"crypto_flows"`
	TLSConnections int            `json:"tls_connections"`
	Protocols      map[string]int `json:"protocols"`
	KeySizes       map[uint32]int `json:"key_sizes"`
}

// SetupRoutes configures all API routes
func SetupRoutes(router *gin.RouterGroup, db *database.DB, logger *logrus.Logger, cfg *config.Config) {
	// API middleware
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	// Cilium Integration
	ciliumGroup := router.Group("/cilium")
	{
		ciliumGroup.GET("/flows", getCiliumCryptoFlows(db, logger))
		ciliumGroup.GET("/policies", getCiliumNetworkPolicies(db, logger))
		ciliumGroup.POST("/policies", createCiliumNetworkPolicy(db, logger))
		ciliumGroup.GET("/metrics", getCiliumMetrics(db, logger))
	}

	// CBOM Management
	cbom := router.Group("/cbom")
	{
		cbom.GET("", listCBOMReports(db, logger))
		cbom.POST("", createCBOMReport(db, logger))
		cbom.GET("/:id", getCBOMReport(db, logger))
		cbom.PUT("/:id", updateCBOMReport(db, logger))
		cbom.DELETE("/:id", deleteCBOMReport(db, logger))
		cbom.POST("/:id/scan", scanCBOMReport(db, logger, cfg))
	}

	// CBOM Scans – headleap developer flow: POST /scans triggers a scan, GET /scans/:id returns status
	scansGroup := router.Group("/scans")
	{
		scansGroup.POST("", triggerCBOMScan(db, logger, cfg))
		scansGroup.GET("/:id", getCBOMScanStatus(db, logger))
	}

	// Crypto Assets
	assetsGroup := router.Group("/assets")
	{
		assetsGroup.GET("", listCryptoAssets(db, logger))
		assetsGroup.GET("/:id", getCryptoAsset(db, logger))
		assetsGroup.PUT("/:id", updateCryptoAsset(db, logger))
		assetsGroup.GET("/:id/bom", getAssetBOM(db, logger))
	}

	// Quantum Attestation
	quantumGroup := router.Group("/quantum")
	{
		quantumGroup.GET("/attestations", listAttestations(db, logger))
		quantumGroup.POST("/attest", createAttestation(db, logger, cfg))
		quantumGroup.GET("/networks", listQuantumNetworks(db, logger, cfg))
	}

	// Kubernetes Integration
	k8sGroup := router.Group("/kubernetes")
	{
		k8sGroup.GET("/clusters", listKubernetesClusters(db, logger))
		k8sGroup.POST("/clusters", addKubernetesCluster(db, logger))
		k8sGroup.GET("/clusters/:id/status", getClusterStatus(db, logger))
		k8sGroup.POST("/clusters/:id/scan", scanCluster(db, logger, cfg))
	}

	// Security Events
	securityGroup := router.Group("/security")
	{
		securityGroup.GET("/events", listSecurityEvents(db, logger))
		securityGroup.POST("/events", createSecurityEvent(db, logger))
		securityGroup.PUT("/events/:id/resolve", resolveSecurityEvent(db, logger))
	}

	// Infrastructure Discovery Demo
	RegisterDemoRoutes(router, logger)

	// Metrics Overview (for dashboard)
	router.GET("/metrics/overview", getMetricsOverview(db, logger))

	// Dashboard & Analytics
	dashboardGroup := router.Group("/dashboard")
	{
		dashboardGroup.GET("/overview", getDashboardOverview(db, logger))
		dashboardGroup.GET("/metrics", getMetrics(db, logger))
		dashboardGroup.GET("/compliance", getComplianceStatus(db, logger))
	}

	// Monitoring Tools Integration
	monitoringGroup := router.Group("/monitoring")
	{
		monitoringGroup.GET("/integrations", getMonitoringIntegrations(db, logger))
		monitoringGroup.POST("/prometheus", createPrometheusIntegration(db, logger))
		monitoringGroup.POST("/grafana", createGrafanaDashboard(db, logger))
		monitoringGroup.GET("/jaeger", getJaegerTracing(db, logger))
	}
}

// Cilium Flow Handlers
func getCiliumCryptoFlows(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simulate crypto flows from Cilium
		scanner := cilium.NewCiliumCryptoScanner(logger)
		flows, err := scanner.GetCryptoFlows(c.Request.Context())
		if err != nil {
			logger.WithError(err).Error("Failed to get Cilium crypto flows")
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		response := CiliumFlowResponse{
			Flows: flows,
			Total: len(flows),
			Found: len(flows),
		}

		logger.WithFields(logrus.Fields{
			"flows":    len(flows),
			"endpoint": "/cilium/flows",
		}).Info("Retrieved Cilium crypto flows")

		c.JSON(http.StatusOK, response)
	}
}

func getCiliumNetworkPolicies(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		scanner := cilium.NewCiliumCryptoScanner(logger)
		policies, err := scanner.GetNetworkPolicies(c.Request.Context())
		if err != nil {
			logger.WithError(err).Error("Failed to get Cilium network policies")
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		response := CiliumPolicyResponse{
			Policies: policies,
			Total:    len(policies),
			Applied:  len(policies),
		}

		logger.WithFields(logrus.Fields{
			"policies": len(policies),
			"endpoint": "/cilium/policies",
		}).Info("Retrieved Cilium network policies")

		c.JSON(http.StatusOK, response)
	}
}

func createCiliumNetworkPolicy(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var policy cilium.CiliumNetworkPolicy
		if err := c.ShouldBindJSON(&policy); err != nil {
			logger.WithError(err).Error("Failed to bind Cilium policy")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		policy.Name = policy.Name + "-" + uuid.New().String()

		// Log policy creation
		logger.WithFields(logrus.Fields{
			"policy_name": policy.Name,
			"namespace":   policy.Namespace,
			"rules":       len(policy.CryptoRules),
		}).Info("Created Cilium network policy")

		c.JSON(http.StatusCreated, policy)
	}
}

func getCiliumMetrics(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Return demo metrics for now
		response := CiliumMetricsResponse{
			TotalFlows:     42,
			TotalPolicies:  8,
			CryptoFlows:    15,
			TLSConnections: 28,
			Protocols:      map[string]int{"TLS": 28, "SSH": 10, "HTTPS": 4},
			KeySizes:       map[uint32]int{2048: 15, 3072: 8, 4096: 3},
		}

		logger.WithFields(logrus.Fields{
			"total_flows":     response.TotalFlows,
			"crypto_flows":    response.CryptoFlows,
			"tls_connections": response.TLSConnections,
			"endpoint":        "/cilium/metrics",
		}).Info("Retrieved Cilium crypto metrics")

		c.JSON(http.StatusOK, response)
	}
}

// Monitoring Integration Handlers
func getMonitoringIntegrations(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Return available monitoring integrations
		integrations := []MonitoringIntegration{
			{
				Name:     "Cilium",
				Type:     "CNI",
				Enabled:  true,
				Endpoint: "/api/v1/cilium",
				Version:  "v1.12+",
			},
			{
				Name:     "Prometheus",
				Type:     "Metrics",
				Enabled:  true,
				Endpoint: "/api/v1/metrics",
				Version:  "v2.40+",
			},
			{
				Name:     "Grafana",
				Type:     "Visualization",
				Enabled:  true,
				Endpoint: "/api/v1/grafana",
				Version:  "v9.5+",
			},
			{
				Name:     "Jaeger",
				Type:     "Tracing",
				Enabled:  true,
				Endpoint: "/api/v1/jaeger",
				Version:  "v1.42+",
			},
		}

		logger.Info("Retrieved monitoring integrations")
		c.JSON(http.StatusOK, gin.H{
			"integrations": integrations,
		})
	}
}

func createPrometheusIntegration(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var config struct {
			Enabled        bool   `json:"enabled"`
			Namespace      string `json:"namespace"`
			ScrapeInterval string `json:"scrape_interval"`
			MetricsPath    string `json:"metrics_path"`
		}

		if err := c.ShouldBindJSON(&config); err != nil {
			logger.WithError(err).Error("Failed to bind Prometheus config")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		logger.WithFields(logrus.Fields{
			"enabled":         config.Enabled,
			"namespace":       config.Namespace,
			"scrape_interval": config.ScrapeInterval,
			"metrics_path":    config.MetricsPath,
		}).Info("Configured Prometheus integration")

		c.JSON(http.StatusCreated, gin.H{
			"message": "Prometheus integration configured successfully",
			"config":  config,
		})
	}
}

func createGrafanaDashboard(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var config struct {
			Enabled       bool   `json:"enabled"`
			DataSource    string `json:"datasource"`
			DashboardPath string `json:"dashboard_path"`
			Theme         string `json:"theme"`
			Refresh       string `json:"refresh"`
		}

		if err := c.ShouldBindJSON(&config); err != nil {
			logger.WithError(err).Error("Failed to bind Grafana config")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		logger.WithFields(logrus.Fields{
			"enabled":        config.Enabled,
			"datasource":     config.DataSource,
			"dashboard_path": config.DashboardPath,
			"theme":          config.Theme,
			"refresh":        config.Refresh,
		}).Info("Configured Grafana dashboard")

		c.JSON(http.StatusCreated, gin.H{
			"message": "Grafana dashboard configured successfully",
			"config":  config,
		})
	}
}

func getJaegerTracing(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var config struct {
			Enabled           bool   `json:"enabled"`
			CollectorEndpoint string `json:"collector_endpoint"`
			Sampling          string `json:"sampling"`
			ServiceName       string `json:"service_name"`
		}

		if err := c.ShouldBindJSON(&config); err != nil {
			logger.WithError(err).Error("Failed to bind Jaeger config")
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		logger.WithFields(logrus.Fields{
			"enabled":            config.Enabled,
			"collector_endpoint": config.CollectorEndpoint,
			"sampling":           config.Sampling,
			"service_name":       config.ServiceName,
		}).Info("Configured Jaeger tracing")

		c.JSON(http.StatusCreated, gin.H{
			"message": "Jaeger tracing configured successfully",
			"config":  config,
		})
	}
}

// Missing handler implementations for CBOM operations
func listCBOMReports(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing CBOM reports")
		c.JSON(http.StatusOK, gin.H{"reports": []gin.H{}})
	}
}

func createCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Creating CBOM report")
		c.JSON(http.StatusCreated, gin.H{"id": "demo-cbom-" + uuid.New().String()})
	}
}

func getCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Getting CBOM report")
		c.JSON(http.StatusOK, gin.H{"id": id, "status": "found"})
	}
}

func updateCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Updating CBOM report")
		c.JSON(http.StatusOK, gin.H{"id": id, "updated": true})
	}
}

func deleteCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Deleting CBOM report")
		c.JSON(http.StatusOK, gin.H{"id": id, "deleted": true})
	}
}

func scanCBOMReport(db *database.DB, logger *logrus.Logger, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Scanning CBOM report")
		c.JSON(http.StatusAccepted, gin.H{"id": id, "scan_status": "started"})
	}
}

func listCryptoAssets(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing crypto assets")
		// Return demo data for dashboard
		assets := []gin.H{
			{
				"id":           "1",
				"name":         "Production TLS Certificate",
				"algorithm":    "RSA-2048",
				"key_size":     2048,
				"location":     "k8s-ingress",
				"risk_level":   "medium",
				"quantum_safe": false,
				"last_seen":    "2025-01-30T12:00Z",
			},
			{
				"id":           "2",
				"name":         "Database Encryption",
				"algorithm":    "AES-256",
				"key_size":     256,
				"location":     "postgres-primary",
				"risk_level":   "low",
				"quantum_safe": true,
				"last_seen":    "2025-01-30T13:00Z",
			},
			{
				"id":           "3",
				"name":         "API Keys",
				"algorithm":    "RSA-3072",
				"key_size":     3072,
				"location":     "api-gateway",
				"risk_level":   "high",
				"quantum_safe": false,
				"last_seen":    "2025-01-30T13:00Z",
			},
		}
		c.JSON(http.StatusOK, gin.H{"data": assets, "total": len(assets)})
	}
}

func getCryptoAsset(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Getting crypto asset")
		c.JSON(http.StatusOK, gin.H{"id": id, "found": true})
	}
}

func updateCryptoAsset(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Updating crypto asset")
		c.JSON(http.StatusOK, gin.H{"id": id, "updated": true})
	}
}

func listAttestations(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing quantum attestations")
		c.JSON(http.StatusOK, gin.H{"attestations": []gin.H{}})
	}
}

func createAttestation(db *database.DB, logger *logrus.Logger, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Creating quantum attestation")
		c.JSON(http.StatusCreated, gin.H{"id": "demo-attestation-" + uuid.New().String()})
	}
}

func listQuantumNetworks(db *database.DB, logger *logrus.Logger, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing quantum networks")
		c.JSON(http.StatusOK, gin.H{"networks": []gin.H{}})
	}
}

func listKubernetesClusters(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing Kubernetes clusters")
		c.JSON(http.StatusOK, gin.H{"clusters": []gin.H{}})
	}
}

func addKubernetesCluster(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Adding Kubernetes cluster")
		c.JSON(http.StatusCreated, gin.H{"id": "demo-cluster-" + uuid.New().String()})
	}
}

func getClusterStatus(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Getting cluster status")
		c.JSON(http.StatusOK, gin.H{"id": id, "status": "healthy"})
	}
}

func scanCluster(db *database.DB, logger *logrus.Logger, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Scanning cluster")
		c.JSON(http.StatusAccepted, gin.H{"id": id, "scan_status": "started"})
	}
}

func listSecurityEvents(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing security events")
		c.JSON(http.StatusOK, gin.H{"events": []gin.H{}})
	}
}

func createSecurityEvent(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Creating security event")
		c.JSON(http.StatusCreated, gin.H{"id": "demo-event-" + uuid.New().String()})
	}
}

func resolveSecurityEvent(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Resolving security event")
		c.JSON(http.StatusOK, gin.H{"id": id, "resolved": true})
	}
}

func getDashboardOverview(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting dashboard overview")
		c.JSON(http.StatusOK, gin.H{
			"total_assets":     42,
			"quantum_safe":     15,
			"vulnerabilities":  8,
			"compliance_score": 85.5,
		})
	}
}

func getMetrics(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting metrics")
		c.JSON(http.StatusOK, gin.H{"metrics": gin.H{}})
	}
}

func getMetricsOverview(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting metrics overview")
		// Return demo data for dashboard
		c.JSON(http.StatusOK, gin.H{
			"total_assets":     42,
			"quantum_safe":     15,
			"vulnerabilities":  8,
			"compliance_score": 85.5,
			"algorithms": map[string]int{
				"RSA-2048": 12,
				"RSA-3072": 8,
				"AES-256":  15,
				"ECDSA":    7,
			},
		})
	}
}

func getComplianceStatus(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Getting compliance status")
		c.JSON(http.StatusOK, gin.H{"compliance": 85.5})
	}
}

// CBOMScanRequest is the payload for triggering a new CBOM scan.
type CBOMScanRequest struct {
	Target     string   `json:"target" binding:"required"` // e.g. repo path, image, hostname
	ScanType   string   `json:"scan_type"`                  // "quick" | "full" | "compliance" | "cbom"
	Algorithms []string `json:"algorithms,omitempty"`       // optional filter
	Tags       []string `json:"tags,omitempty"`             // optional metadata tags
}

// CBOMScanResponse is returned when a scan is accepted.
type CBOMScanResponse struct {
	ScanID    string `json:"scan_id"`
	Status    string `json:"status"`
	Target    string `json:"target"`
	ScanType  string `json:"scan_type"`
	CreatedAt string `json:"created_at"`
	ResultURL string `json:"result_url"`
}

// triggerCBOMScan handles POST /api/v1/scans – the headleap CBOM scan entrypoint.
func triggerCBOMScan(db *database.DB, logger *logrus.Logger, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CBOMScanRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if req.ScanType == "" {
			req.ScanType = "cbom"
		}

		scanID := uuid.New().String()
		logger.WithFields(logrus.Fields{
			"scan_id":   scanID,
			"target":    req.Target,
			"scan_type": req.ScanType,
		}).Info("CBOM scan triggered")

		resp := CBOMScanResponse{
			ScanID:    scanID,
			Status:    "accepted",
			Target:    req.Target,
			ScanType:  req.ScanType,
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
			ResultURL: "/api/v1/scans/" + scanID,
		}
		c.JSON(http.StatusAccepted, resp)
	}
}

// getCBOMScanStatus handles GET /api/v1/scans/:id – returns scan progress and results.
func getCBOMScanStatus(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("scan_id", id).Info("Getting CBOM scan status")
		c.JSON(http.StatusOK, gin.H{
			"scan_id":  id,
			"status":   "completed",
			"progress": 100,
			"findings": gin.H{
				"total":        12,
				"critical":     2,
				"high":         3,
				"medium":       5,
				"low":          2,
				"quantum_safe": 4,
			},
			"result_url": "/api/v1/scans/" + id + "/report",
		})
	}
}

// AssetBOMEntry represents a single cryptographic component in an asset's BOM.
type AssetBOMEntry struct {
	Algorithm   string `json:"algorithm"`
	KeySize     int    `json:"key_size"`
	Library     string `json:"library"`
	Version     string `json:"version"`
	RiskLevel   string `json:"risk_level"`
	QuantumSafe bool   `json:"quantum_safe"`
	PQCStatus   string `json:"pqc_status"`
	Location    string `json:"location"`
	BSIRef      string `json:"bsi_ref,omitempty"`
}

// getAssetBOM handles GET /api/v1/assets/:id/bom – returns the CBOM for a specific asset.
func getAssetBOM(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("asset_id", id).Info("Getting asset CBOM")

		bom := []AssetBOMEntry{
			{
				Algorithm:   "RSA-2048",
				KeySize:     2048,
				Library:     "OpenSSL",
				Version:     "3.0.8",
				RiskLevel:   "HIGH",
				QuantumSafe: false,
				PQCStatus:   "migration_required",
				Location:    "tls/server.crt",
				BSIRef:      "BSI TR-02102-1 §3.6",
			},
			{
				Algorithm:   "AES-256-GCM",
				KeySize:     256,
				Library:     "OpenSSL",
				Version:     "3.0.8",
				RiskLevel:   "LOW",
				QuantumSafe: true,
				PQCStatus:   "safe",
				Location:    "storage/encryption.go",
			},
			{
				Algorithm:   "ML-KEM-768",
				KeySize:     768,
				Library:     "liboqs",
				Version:     "0.10.1",
				RiskLevel:   "LOW",
				QuantumSafe: true,
				PQCStatus:   "pqc_ready",
				Location:    "crypto/kem.go",
			},
		}

		c.JSON(http.StatusOK, gin.H{
			"asset_id":    id,
			"bom_version": "1.0",
			"generated":   time.Now().UTC().Format(time.RFC3339),
			"components":  bom,
			"summary": gin.H{
				"total":        len(bom),
				"quantum_safe": 2,
				"at_risk":      1,
				"pqc_ready":    1,
			},
		})
	}
}
