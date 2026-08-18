package shared

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// SetupDashboardDemoRoutes registers enterprise-style dashboard endpoints for OSS/demo mode.
func SetupDashboardDemoRoutes(router *gin.RouterGroup, logger *logrus.Logger) {
	inventory := router.Group("/inventory")
	{
		inventory.GET("/assets", InventoryAssetsHandler(logger, demoInventoryAssets(logger)))
		inventory.GET("/assets/:id", demoInventoryAsset(logger))
		inventory.GET("/summary", InventorySummaryHandler(logger, demoInventorySummary(logger)))
		inventory.GET("/crypto", InventoryAssetsHandler(logger, demoInventoryAssets(logger)))
	}

	router.GET("/cloud/resources/summary", demoCloudResourcesSummary(logger))
	router.GET("/cloud/accounts", demoCloudAccounts(logger))

	compliance := router.Group("/compliance")
	{
		compliance.GET("/dashboard", demoComplianceDashboards(logger))
	}

	analytics := router.Group("/analytics")
	{
		analytics.POST("/insights", demoAnalyticsInsights(logger))
		analytics.GET("/reports", demoAnalyticsReports(logger))
	}
}

func demoInventoryAssets(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Debug("Serving demo inventory assets")
		now := time.Now().UTC().Format(time.RFC3339)
		c.JSON(http.StatusOK, gin.H{
			"assets": []gin.H{
				{"id": "asset-1", "name": "prod-api TLS cert", "category": "cryptographic", "cloud_provider": "aws", "algorithm": "RSA-2048", "crypto_algorithm": "RSA-2048", "risk_level": "HIGH", "quantum_safe": false, "discovered_at": now},
				{"id": "asset-2", "name": "azure-keyvault-prod", "category": "cryptographic", "cloud_provider": "azure", "algorithm": "AES-256", "crypto_algorithm": "AES-256", "risk_level": "LOW", "quantum_safe": true, "discovered_at": now},
				{"id": "asset-3", "name": "gcs-bucket-keys", "category": "cryptographic", "cloud_provider": "gcp", "algorithm": "ECDSA", "crypto_algorithm": "ECDSA", "risk_level": "MEDIUM", "quantum_safe": false, "discovered_at": now},
				{"id": "asset-4", "name": "k8s-secrets-tls", "category": "cryptographic", "cloud_provider": "kubernetes", "algorithm": "ML-KEM", "crypto_algorithm": "ML-KEM", "risk_level": "LOW", "quantum_safe": true, "discovered_at": now},
				{"id": "asset-5", "name": "legacy-3des-hsm", "category": "cryptographic", "cloud_provider": "aws", "algorithm": "3DES", "crypto_algorithm": "3DES", "risk_level": "CRITICAL", "quantum_safe": false, "discovered_at": now},
			},
			"total": 5,
		})
	}
}

func demoInventoryAsset(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		c.JSON(http.StatusOK, gin.H{
			"id": id, "name": "Demo Asset", "category": "cryptographic", "cloud_provider": "aws",
			"algorithm": "RSA-2048", "risk_level": "HIGH", "quantum_safe": false,
		})
	}
}

func demoInventorySummary(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Debug("Serving demo inventory summary")
		c.JSON(http.StatusOK, gin.H{
			"total_assets":        18742,
			"compliance_score":    0,
			"by_category":         gin.H{"cryptographic": 2140, "compute": 3214, "containers": 4860, "storage": 1280, "databases": 436, "identity": 12680},
			"by_cloud_provider":   gin.H{"aws": 11480, "azure": 3880, "gcp": 3382},
			"quantum_safe_count":  1391,
			"non_quantum_safe":    749,
			"vulnerable_assets":   842,
			"last_scan_time":      time.Now().UTC().Format(time.RFC3339),
			"source":              "enterprise_simulation",
			"data_kind":           "demo",
			"note":                "Deterministic enterprise simulation. Scores are calculated in the UI scoring engine, not hardcoded here.",
		})
	}
}

func demoCloudResourcesSummary(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Debug("Serving demo cloud resources summary")
		c.JSON(http.StatusOK, gin.H{
			"total_resources": 18742,
			"by_provider": gin.H{
				"aws":   11480,
				"azure": 3880,
				"gcp":   3382,
			},
			"security_findings": gin.H{
				"critical": 49,
				"high":     279,
				"medium":   874,
				"low":      1040,
			},
			"scan_coverage":  94.7,
			"scans_today":    14,
			"active_threats": 14,
			"source":         "enterprise_simulation",
			"data_kind":      "demo",
		})
	}
}

func demoCloudAccounts(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"accounts": []gin.H{
				{"id": "aws-prod", "provider": "aws", "name": "Production", "status": "connected", "resources": 80},
				{"id": "gcp-prod", "provider": "gcp", "name": "Production", "status": "connected", "resources": 45},
				{"id": "azure-prod", "provider": "azure", "name": "Production", "status": "connected", "resources": 5},
			},
		})
	}
}

func demoComplianceDashboards(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		frameworks := []string{"iso27001", "dora", "gdpr", "eu_ai_act", "soc2", "nist", "pqc"}
		dashboards := make([]gin.H, 0, len(frameworks))
		for _, fw := range frameworks {
			dashboards = append(dashboards, gin.H{
				"id": fw, "framework": fw, "name": fw, "score": 75, "status": "active",
				"total_controls": 100, "passed_controls": 75, "failed_controls": 10, "pending_controls": 15,
			})
		}
		c.JSON(http.StatusOK, gin.H{
			"dashboards": dashboards,
			"summary": gin.H{
				"overall_score":     75,
				"frameworks_count":  len(frameworks),
				"critical_findings": 2,
				"high_findings":     8,
			},
		})
	}
}

func demoAnalyticsInsights(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Debug("Serving demo analytics insights")
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
				{"type": "critical_algorithm", "title": "3DES keys require migration", "severity": "critical", "confidence": 0.92},
			},
			"total": 2,
		})
	}
}

func demoAnalyticsReports(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"reports": []gin.H{
				{"id": "rpt-1", "name": "Weekly Posture Report", "generated_at": time.Now().UTC().Format(time.RFC3339)},
			},
		})
	}
}
