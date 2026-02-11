package oss

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/api/shared"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

// SetupRoutes configures OSS API routes (Open Source edition)
func SetupRoutes(router *gin.RouterGroup, db *database.DB, logger *logrus.Logger, cfg *config.OSSConfig) {
	// API middleware
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	// Core CBOM Management (OSS Features)
	cbom := router.Group("/cbom")
	{
		cbom.GET("", shared.ListCBOMReports(db, logger))
		cbom.POST("", shared.CreateCBOMReport(db, logger))
		cbom.GET("/:id", shared.GetCBOMReport(db, logger))
		cbom.PUT("/:id", shared.UpdateCBOMReport(db, logger))
		cbom.DELETE("/:id", shared.DeleteCBOMReport(db, logger))
		cbom.POST("/:id/scan", shared.ScanCBOMReport(db, logger, cfg))
	}

	// Crypto Assets (Basic Discovery)
	assetsGroup := router.Group("/assets")
	{
		assetsGroup.GET("", shared.ListCryptoAssets(db, logger))
		assetsGroup.GET("/:id", shared.GetCryptoAsset(db, logger))
		assetsGroup.PUT("/:id", shared.UpdateCryptoAsset(db, logger))
	}

	// Basic Security Monitoring
	securityGroup := router.Group("/security")
	{
		securityGroup.GET("/events", shared.ListSecurityEvents(db, logger))
		securityGroup.POST("/events", shared.CreateSecurityEvent(db, logger))
		securityGroup.PUT("/events/:id/resolve", shared.ResolveSecurityEvent(db, logger))
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
}

// OSS Handlers - Basic implementations
func listCBOMReports(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Listing CBOM reports (OSS)")
		c.JSON(http.StatusOK, gin.H{"reports": []gin.H{}})
	}
}

func createCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Info("Creating CBOM report (OSS)")
		c.JSON(http.StatusCreated, gin.H{"id": "oss-cbom-1"})
	}
}

func getCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Getting CBOM report (OSS)")
		c.JSON(http.StatusOK, gin.H{"id": id, "oss": true})
	}
}

func updateCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Updating CBOM report (OSS)")
		c.JSON(http.StatusOK, gin.H{"id": id, "updated": true})
	}
}

func deleteCBOMReport(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Deleting CBOM report (OSS)")
		c.JSON(http.StatusOK, gin.H{"id": id, "deleted": true})
	}
}

func scanCBOMReport(db *database.DB, logger *logrus.Logger, cfg *config.OSSConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("id", id).Info("Scanning CBOM report (OSS)")
		c.JSON(http.StatusAccepted, gin.H{"id": id, "scan_status": "started"})
	}
}
