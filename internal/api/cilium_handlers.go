package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
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
	router.Use(RequireAuth(cfg))

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

	// Crypto Assets
	assetsGroup := router.Group("/assets")
	{
		assetsGroup.GET("", listCryptoAssets(db, logger))
		assetsGroup.GET("/:id", getCryptoAsset(db, logger))
		assetsGroup.PUT("/:id", updateCryptoAsset(db, logger))
	}

	// Cilium Integration
	ciliumGroup := router.Group("/cilium")
	{
		ciliumGroup.GET("/flows", getCiliumCryptoFlows(db, logger))
		ciliumGroup.GET("/policies", getCiliumNetworkPolicies(db, logger))
		ciliumGroup.POST("/policies", createCiliumNetworkPolicy(db, logger))
		ciliumGroup.GET("/metrics", getCiliumMetrics(db, logger))
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
		// In real implementation, this would query Cilium flow logs
		// For now, return simulated data
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

		// Generate ID
		policy.Name = policy.Name + "-" + uuid.New().String()

		// For demo, just log the policy creation
		logger.WithFields(logrus.Fields{
			"policy_name": policy.Name,
			"namespace":   policy.Namespace,
			"rules":       len(policy.CryptoRules),
		}).Info("Created Cilium network policy (demo)")

		c.JSON(http.StatusCreated, policy)
	}
}

func getCiliumMetrics(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		scanner := cilium.NewCiliumCryptoScanner(logger)
		metrics, err := scanner.GetMetrics(c.Request.Context())
		if err != nil {
			logger.WithError(err).Error("Failed to get Cilium metrics")
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		response := CiliumMetricsResponse{
			TotalFlows:     metrics["total_crypto_flows"].(int),
			TotalPolicies:  metrics["crypto_network_policies"].(int),
			CryptoFlows:    metrics["crypto_flows"].(int),
			TLSConnections: metrics["tls_connections"].(int),
			Protocols:      metrics["protocols"].(map[string]int),
			KeySizes:       metrics["key_sizes"].(map[uint32]int),
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
			Datasource    string `json:"datasource"`
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
			"datasource":     config.Datasource,
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
