package shared

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/sirupsen/logrus"
)

// GetScanQBOM returns a Quantum BOM view derived from a completed CBOM scan.
func GetScanQBOM(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		logger.WithField("scan_id", id).Info("Serving QBOM for scan")

		sm := discovery.GetScanManager()
		job, ok := sm.GetScan(id)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "scan not found"})
			return
		}
		if job.Status != "completed" || job.Result == nil {
			c.JSON(http.StatusConflict, gin.H{
				"scan_id":  job.ID,
				"status":   job.Status,
				"progress": job.Progress,
				"error":    "scan not complete — QBOM available after CBOM scan finishes",
			})
			return
		}

		r := job.Result
		algoCounts := map[string]gin.H{}
		components := make([]gin.H, 0, len(r.Components))
		priority := make([]string, 0)

		for i, comp := range r.Components {
			key := comp.Algorithm
			if key == "" {
				key = "unknown"
			}
			entry, exists := algoCounts[key]
			if !exists {
				migration := "monitored"
				if !comp.QuantumSafe {
					migration = "PQC migration required"
					if comp.RiskLevel == discovery.SeverityCritical || comp.RiskLevel == discovery.SeverityHigh {
						priority = append(priority, "Migrate "+key+" at "+comp.Location)
					}
				}
				entry = gin.H{
					"name":         key,
					"count":        0,
					"quantum_safe": comp.QuantumSafe,
					"migration":    migration,
				}
			}
			entry["count"] = entry["count"].(int) + 1
			algoCounts[key] = entry

			compType := "cryptographic"
			if comp.Library != "" {
				compType = "library"
			}
			components = append(components, gin.H{
				"id":        fmt.Sprintf("cmp-%s-%d", job.ID[:8], i),
				"type":      compType,
				"algorithm": comp.Algorithm,
				"location":  comp.Location,
				"risk":      strings.ToLower(string(comp.RiskLevel)),
			})
		}

		algorithms := make([]gin.H, 0, len(algoCounts))
		for _, v := range algoCounts {
			algorithms = append(algorithms, v)
		}

		readiness := 0
		if r.Summary.TotalComponents > 0 {
			readiness = int(float64(r.Summary.QuantumSafe) / float64(r.Summary.TotalComponents) * 100)
		}

		c.JSON(http.StatusOK, gin.H{
			"scan_id":    id,
			"generated":  time.Now().UTC().Format(time.RFC3339),
			"schema":     "qbom-1.0",
			"pqc_ready":  readiness >= 80,
			"readiness":  readiness,
			"algorithms": algorithms,
			"components": components,
			"migration_plan": gin.H{
				"priority":         priority,
				"timeline_months":  estimateMigrationMonths(readiness),
				"estimated_effort": migrationEffort(readiness),
			},
			"attestation": gin.H{
				"status":   attestationStatus(readiness),
				"provider": "rivicq-cbom",
				"message":  "QBOM generated from live CBOM scan components and findings",
			},
			"source": "cbom_scan",
		})
	}
}

func estimateMigrationMonths(readiness int) int {
	switch {
	case readiness >= 80:
		return 6
	case readiness >= 60:
		return 12
	default:
		return 18
	}
}

func migrationEffort(readiness int) string {
	switch {
	case readiness >= 80:
		return "low"
	case readiness >= 60:
		return "medium"
	default:
		return "high"
	}
}

func attestationStatus(readiness int) string {
	if readiness >= 80 {
		return "ready"
	}
	if readiness >= 50 {
		return "in_progress"
	}
	return "pending"
}
