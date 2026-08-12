package shared

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/sirupsen/logrus"
)

// findingsToGin renders scan findings for API consumers.
func findingsToGin(findings []discovery.Finding) []gin.H {
	out := make([]gin.H, 0, len(findings))
	for _, f := range findings {
		out = append(out, gin.H{
			"id":            f.ID,
			"severity":      strings.ToLower(string(f.Severity)),
			"title":         f.Title,
			"description":   f.Description,
			"asset":         f.TargetLabel,
			"target_label":  f.TargetLabel,
			"host":          f.Host,
			"port":          f.Port,
			"protocol":      f.Protocol,
			"algorithm":     f.Algorithm,
			"recommendation": f.Remediation,
			"remediation":   f.Remediation,
			"evidence":      f.Evidence,
			"quantum_safe":  f.QuantumSafe,
			"bsi_ref":       f.BSIRef,
		})
	}
	return out
}

// scanJobToGin renders a scan job summary for list endpoints.
func scanJobToGin(job *discovery.ScanJob) gin.H {
	item := gin.H{
		"scan_id":    job.ID,
		"id":         job.ID,
		"asset_id":   job.AssetID,
		"target":     job.Target,
		"scan_type":  job.ScanType,
		"status":     job.Status,
		"progress":   job.Progress,
		"created_at": job.CreatedAt.Format(time.RFC3339),
	}
	if job.Status == "completed" && job.Result != nil {
		item["findings"] = gin.H{
			"total":    job.Result.Summary.TotalFindings,
			"critical": job.Result.Summary.Critical,
			"high":     job.Result.Summary.High,
			"medium":   job.Result.Summary.Medium,
			"low":      job.Result.Summary.Low,
		}
		item["completed_at"] = job.Result.CompletedAt.Format(time.RFC3339)
	}
	if job.Error != "" {
		item["error"] = job.Error
	}
	return item
}

// ListCBOMScans returns in-memory CBOM scan jobs (newest first).
func ListCBOMScans(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		_ = db
		logger.Debug("Listing CBOM scans")

		jobs := discovery.GetScanManager().ListScans()
		sort.Slice(jobs, func(i, j int) bool {
			return jobs[i].CreatedAt.After(jobs[j].CreatedAt)
		})

		items := make([]gin.H, 0, len(jobs))
		for _, job := range jobs {
			items = append(items, scanJobToGin(job))
		}

		c.JSON(http.StatusOK, gin.H{
			"scans":  items,
			"total":  len(items),
			"source": "cbom_scans",
		})
	}
}

// InventoryFromCBOMScans builds inventory assets from completed scan results.
func InventoryFromCBOMScans() ([]gin.H, bool) {
	jobs := discovery.GetScanManager().ListScans()
	assets := make([]gin.H, 0)
	seen := make(map[string]struct{})

	for _, job := range jobs {
		if job.Status != "completed" || job.Result == nil {
			continue
		}
		for i, comp := range job.Result.Components {
			key := job.ID + ":" + comp.Algorithm + ":" + comp.Location
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}

			name := comp.Library
			if name == "" {
				name = comp.Algorithm
			}
			if comp.Location != "" {
				name = name + " @ " + comp.Location
			}

			assets = append(assets, gin.H{
				"id":               fmt.Sprintf("%s-%s-%d", job.AssetID, job.ID[:8], i),
				"name":             name,
				"category":         "cryptographic",
				"cloud_provider":   inferCloudProvider(comp.Location),
				"algorithm":        comp.Algorithm,
				"crypto_algorithm": comp.Algorithm,
				"key_size":         comp.KeySize,
				"risk_level":       string(comp.RiskLevel),
				"quantum_safe":     comp.QuantumSafe,
				"location":         comp.Location,
				"discovered_at":    job.Result.CompletedAt.Format(time.RFC3339),
				"source":           "cbom_scan",
				"scan_id":          job.ID,
				"target":           job.Target,
			})
		}
	}

	return assets, len(assets) > 0
}

// FindingsFromCBOMScans aggregates findings across completed scans.
func FindingsFromCBOMScans() []gin.H {
	jobs := discovery.GetScanManager().ListScans()
	out := make([]gin.H, 0)
	for _, job := range jobs {
		if job.Status != "completed" || job.Result == nil {
			continue
		}
		out = append(out, findingsToGin(job.Result.Findings)...)
	}
	return out
}

// SummaryFromCBOMScans builds inventory summary from scan-derived assets.
func SummaryFromCBOMScans(assets []gin.H) gin.H {
	byCategory := gin.H{"cryptographic": 0, "ai": 0, "hardware": 0, "software": 0, "infrastructure": 0}
	byCloud := gin.H{"aws": 0, "gcp": 0, "ibm_cloud": 0, "azure": 0, "discovered": 0}
	quantumSafe := 0
	vulnerable := 0

	for _, a := range assets {
		cat, _ := a["category"].(string)
		if cat == "" {
			cat = "cryptographic"
		}
		if v, ok := byCategory[cat].(int); ok {
			byCategory[cat] = v + 1
		}

		provider, _ := a["cloud_provider"].(string)
		if provider == "" {
			provider = "discovered"
		}
		if v, ok := byCloud[provider].(int); ok {
			byCloud[provider] = v + 1
		}

		if qs, ok := a["quantum_safe"].(bool); ok && qs {
			quantumSafe++
		}
		rl, _ := a["risk_level"].(string)
		if rl == "HIGH" || rl == "CRITICAL" {
			vulnerable++
		}
	}

	total := len(assets)
	compliance := 74
	if total > 0 {
		compliance = int(float64(quantumSafe) / float64(total) * 100)
	}

	return gin.H{
		"total_assets":       total,
		"compliance_score":   compliance,
		"by_category":        byCategory,
		"by_cloud_provider":  byCloud,
		"quantum_safe_count": quantumSafe,
		"non_quantum_safe":   total - quantumSafe,
		"vulnerable_assets":  vulnerable,
		"last_scan_time":     time.Now().UTC().Format(time.RFC3339),
		"source":             "cbom_scans",
	}
}

func inferCloudProvider(location string) string {
	loc := strings.ToLower(location)
	switch {
	case strings.Contains(loc, "aws") || strings.Contains(loc, "amazon"):
		return "aws"
	case strings.Contains(loc, "gcp") || strings.Contains(loc, "google"):
		return "gcp"
	case strings.Contains(loc, "azure"):
		return "azure"
	case strings.Contains(loc, "ibm"):
		return "ibm_cloud"
	case strings.Contains(loc, "k8s") || strings.Contains(loc, "kubernetes"):
		return "kubernetes"
	default:
		return "discovered"
	}
}

// InventoryAssetsHandler serves CBOM scan inventory with demo fallback.
func InventoryAssetsHandler(logger *logrus.Logger, demoFallback gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		if assets, ok := InventoryFromCBOMScans(); ok {
			logger.WithField("count", len(assets)).Info("Serving CBOM scan inventory assets")
			c.JSON(http.StatusOK, gin.H{
				"assets": assets,
				"total":  len(assets),
				"source": "cbom_scans",
			})
			return
		}
		demoFallback(c)
	}
}

// InventorySummaryHandler serves summary from scans or demo fallback.
func InventorySummaryHandler(logger *logrus.Logger, demoFallback gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		if assets, ok := InventoryFromCBOMScans(); ok {
			logger.WithField("count", len(assets)).Info("Serving CBOM scan inventory summary")
			c.JSON(http.StatusOK, SummaryFromCBOMScans(assets))
			return
		}
		demoFallback(c)
	}
}

// ScanFindingsHandler returns aggregated findings from completed scans.
func ScanFindingsHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		findings := FindingsFromCBOMScans()
		logger.WithField("count", len(findings)).Debug("Serving CBOM scan findings")
		c.JSON(http.StatusOK, gin.H{
			"findings": findings,
			"total":    len(findings),
			"source":   "cbom_scans",
		})
	}
}
