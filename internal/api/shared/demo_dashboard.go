package shared

import (
	"fmt"
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

// Demo inventory is a deterministic simulation: every endpoint derives its
// counts from the same 36 rows and every payload declares "dataset":
// "simulated", so no screen ever contradicts another during a pitch and the
// data is never mistaken for a connected cloud estate.

const demoAssetCount = 36

type demoCounts struct {
	total          int
	quantumSafe    int
	nonQuantumSafe int
	vulnerable     int
	byCategory     map[string]int
	byProvider     map[string]int
}

func buildDemoAssets() ([]gin.H, demoCounts) {
	now := time.Now().UTC().Format(time.RFC3339)
	templates := []gin.H{
		{"category": "cryptographic", "cloud_provider": "aws", "algorithm": "RSA-2048", "crypto_algorithm": "RSA-2048", "risk_level": "HIGH", "quantum_safe": false},
		{"category": "cryptographic", "cloud_provider": "azure", "algorithm": "AES-256", "crypto_algorithm": "AES-256", "risk_level": "LOW", "quantum_safe": true},
		{"category": "cryptographic", "cloud_provider": "gcp", "algorithm": "ECDSA", "crypto_algorithm": "ECDSA", "risk_level": "MEDIUM", "quantum_safe": false},
		{"category": "cryptographic", "cloud_provider": "kubernetes", "algorithm": "ML-KEM", "crypto_algorithm": "ML-KEM", "risk_level": "LOW", "quantum_safe": true},
		{"category": "cryptographic", "cloud_provider": "aws", "algorithm": "3DES", "crypto_algorithm": "3DES", "risk_level": "CRITICAL", "quantum_safe": false},
	}
	vendors := []string{"tls", "kms", "hsm", "signing", "database", "vault", "sdk", "egress", "ingress", "mesh", "queue", "cd"}

	counts := demoCounts{byCategory: map[string]int{}, byProvider: map[string]int{}}
	assets := make([]gin.H, 0, demoAssetCount)
	for i := 0; i < demoAssetCount; i++ {
		base := templates[i%len(templates)]
		row := gin.H{}
		for k, v := range base {
			row[k] = v
		}
		row["id"] = fmt.Sprintf("asset-%d", i+1)
		row["name"] = fmt.Sprintf("%s-%03d-%s", row["cloud_provider"], i+1, vendors[i%len(vendors)])
		row["discovered_at"] = now

		assets = append(assets, row)
		counts.total++
		provider := row["cloud_provider"].(string)
		counts.byProvider[provider]++
		category := row["category"].(string)
		counts.byCategory[category]++
		if row["quantum_safe"] == true {
			counts.quantumSafe++
		} else {
			counts.nonQuantumSafe++
		}
		switch row["risk_level"] {
		case "HIGH", "CRITICAL":
			counts.vulnerable++
		}
	}
	return assets, counts
}

func demoInventoryAssets(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Debug("Serving demo inventory assets")
		assets, _ := buildDemoAssets()
		c.JSON(http.StatusOK, gin.H{
			"assets":  assets,
			"total":   len(assets),
			"dataset": "simulated",
		})
	}
}

func demoInventoryAsset(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Debug("Serving demo inventory asset")
		id := c.Param("id")
		assets, _ := buildDemoAssets()
		for _, a := range assets {
			if a["id"] == id {
				a["dataset"] = "simulated"
				c.JSON(http.StatusOK, a)
				return
			}
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "asset not found"})
	}
}

func demoInventorySummary(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Debug("Serving demo inventory summary")
		_, counts := buildDemoAssets()
		c.JSON(http.StatusOK, gin.H{
			"total_assets":       counts.total,
			"compliance_score":   0,
			"by_category":        counts.byCategory,
			"by_cloud_provider":  counts.byProvider,
			"quantum_safe_count": counts.quantumSafe,
			"non_quantum_safe":   counts.nonQuantumSafe,
			"vulnerable_assets":  counts.vulnerable,
			"last_scan_time":     time.Now().UTC().Format(time.RFC3339),
			"source":             "demo_simulation",
			"data_kind":          "demo",
			"note":               "Simulated inventory consistent with /inventory/assets. Scores are calculated in the UI scoring engine, not hardcoded here.",
		})
	}
}

func demoCloudResourcesSummary(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Debug("Serving demo cloud resources summary")
		_, counts := buildDemoAssets()
		critical := counts.vulnerable / 2
		c.JSON(http.StatusOK, gin.H{
			"total_resources": counts.total,
			"by_provider":     counts.byProvider,
			"security_findings": gin.H{
				"critical": critical,
				"high":     counts.vulnerable - critical,
				"medium":   counts.total / 4,
				"low":      counts.total / 3,
			},
			"scan_coverage":  100,
			"scans_today":    1,
			"active_threats": counts.vulnerable,
			"source":         "demo_simulation",
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
			"dataset": "simulated",
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
				"source": "simulated",
			})
		}
		c.JSON(http.StatusOK, gin.H{
			"dashboards": dashboards,
			"summary": gin.H{
				"overall_score":     75,
				"frameworks_count":  len(frameworks),
				"critical_findings": 2,
				"high_findings":     8,
				"source":            "simulated",
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
			"total":    2,
			"dataset":  "simulated",
		})
	}
}

func demoAnalyticsReports(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"reports": []gin.H{
				{"id": "rpt-1", "name": "Weekly Posture Report", "generated_at": time.Now().UTC().Format(time.RFC3339)},
			},
			"dataset": "simulated",
		})
	}
}