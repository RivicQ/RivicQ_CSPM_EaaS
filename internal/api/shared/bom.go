package shared

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/bom"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/sirupsen/logrus"
)

// SetupBOMRoutes registers the five-BOM framework, pipeline, HSM, quantum, and governance APIs.
func SetupBOMRoutes(router *gin.RouterGroup, logger *logrus.Logger) {
	router.GET("/bom/framework", func(c *gin.Context) {
		c.JSON(http.StatusOK, bom.Catalog())
	})
	router.GET("/bom/pipeline", func(c *gin.Context) {
		fw := bom.Catalog()
		c.JSON(http.StatusOK, gin.H{"pipeline": fw.Pipeline, "edition": fw.Edition, "honesty": fw.Honesty})
	})
	router.GET("/bom/unified", func(c *gin.Context) {
		target := c.Query("scan_id")
		var disc *discovery.ScanResult
		scanTarget := ""
		if target != "" {
			if job, ok := discovery.GetScanManager().GetScan(target); ok && job.Result != nil {
				disc = job.Result
				scanTarget = job.Target
			}
		} else {
			for _, job := range discovery.GetScanManager().ListScans() {
				if job.Status == "completed" && job.Result != nil {
					disc = job.Result
					scanTarget = job.Target
					break
				}
			}
		}
		c.JSON(http.StatusOK, bom.FromDiscovery(scanTarget, disc))
	})
	router.GET("/governance/controls", func(c *gin.Context) {
		fw := bom.Catalog()
		c.JSON(http.StatusOK, gin.H{"controls": fw.Controls, "edition": fw.Edition, "note": "Operator mappings, not ISO/SOC/NIST certifications."})
	})
	router.GET("/hsm/status", func(c *gin.Context) {
		c.JSON(http.StatusOK, bom.ReadHSM())
	})
	router.GET("/quantum/status", func(c *gin.Context) {
		c.JSON(http.StatusOK, bom.ReadQuantum())
	})
	router.GET("/security/api", func(c *gin.Context) {
		u := latestUnified()
		c.JSON(http.StatusOK, gin.H{
			"findings": u.APISurface,
			"source":   "tls_https_scans",
			"note":     "API security from TLS/HTTPS discovery (HSTS, CSP, protocol). Full API inventory is Enterprise when a gateway connector exists.",
			"edition":  u.Edition,
		})
	})
	router.GET("/security/ai", func(c *gin.Context) {
		fw := bom.Catalog()
		u := latestUnified()
		c.JSON(http.StatusOK, gin.H{
			"enabled": u.LayersOn["aibom"],
			"aibom":   u.AIBOM,
			"layer":   layerByID(fw, bom.LayerAIBOM),
			"note":    "AIBOM is an Enterprise declared inventory. Community CBOM still flags crypto used by serving stacks when scanned.",
		})
	})
	logger.Debug("BOM framework routes registered")
}

func latestUnified() bom.Unified {
	for _, job := range discovery.GetScanManager().ListScans() {
		if job.Status == "completed" && job.Result != nil {
			return bom.FromDiscovery(job.Target, job.Result)
		}
	}
	return bom.FromDiscovery("", nil)
}

func layerByID(fw bom.Framework, id bom.Layer) *bom.LayerInfo {
	for i := range fw.Layers {
		if fw.Layers[i].ID == id {
			return &fw.Layers[i]
		}
	}
	return nil
}
