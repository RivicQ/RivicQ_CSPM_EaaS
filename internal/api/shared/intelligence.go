package shared

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/rivic-q/cryptobom-saas/internal/intelligence"
	"github.com/sirupsen/logrus"
)

// ToContentFinding adapts a GitHub/content finding into the intelligence DTO.
func ToContentFinding(f GHFinding) intelligence.ContentFinding {
	return intelligence.ContentFinding{
		ID:          f.ID,
		FilePath:    f.FilePath,
		FindingType: f.FindingType,
		Algorithm:   f.Algorithm,
		Severity:    f.Severity,
		Description: f.Description,
		Remediation: f.Remediation,
		Evidence:    f.Evidence,
		Tool:        f.Tool,
		CVE:         f.CVE,
		CWE:         f.CWE,
		Line:        f.LineNumber,
		KeyLength:   f.KeyLength,
		QuantumSafe: f.QuantumSafe,
		Compliance:  f.Compliance,
		Demo:        f.Demo,
	}
}

// SetupIntelligenceRoutes registers the security-intelligence API without
// changing existing CBOM scan JSON shapes.
func SetupIntelligenceRoutes(router *gin.RouterGroup, logger *logrus.Logger) {
	router.GET("/findings", IntelligenceFindingsHandler(logger))
	router.GET("/policies", ListIntelligencePolicies(logger))
	router.POST("/policies/evaluate", EvaluateIntelligencePolicies(logger))
	router.GET("/intelligence/tools", IntelligenceToolsHandler(logger))
	router.GET("/intelligence/policies", ListIntelligencePolicies(logger))
	router.POST("/intelligence/evaluate", EvaluateIntelligencePolicies(logger))
	router.GET("/scans/:id/intelligence", GetScanIntelligence(logger))
	router.GET("/scans/:id/cyclonedx", GetScanCycloneDX(logger))
}

func IntelligenceToolsHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		tools := intelligence.ProbeExternalTools()
		logger.WithField("count", len(tools)).Debug("Probing optional security tools")
		c.JSON(http.StatusOK, gin.H{"tools": tools, "source": "intelligence"})
	}
}

func ListIntelligencePolicies(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		pols := intelligence.DefaultPolicies()
		logger.WithField("count", len(pols)).Debug("Listing intelligence policies")
		c.JSON(http.StatusOK, gin.H{
			"policies": pols,
			"excludes": intelligence.DefaultExcludes(),
			"source":   "intelligence",
		})
	}
}

func EvaluateIntelligencePolicies(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body struct {
			Findings []intelligence.Finding `json:"findings"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		gate := intelligence.Evaluate(body.Findings, intelligence.DefaultPolicies())
		logger.WithField("decision", gate.Decision).Info("Evaluated intelligence policies")
		c.JSON(http.StatusOK, gin.H{"gate": gate, "source": "intelligence"})
	}
}

func IntelligenceFindingsHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		findings := normalizedFindingsFromScans()
		logger.WithField("count", len(findings)).Debug("Serving normalized intelligence findings")
		c.JSON(http.StatusOK, gin.H{
			"findings": findings,
			"total":    len(findings),
			"source":   "intelligence",
		})
	}
}

func GetScanIntelligence(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		job, ok := discovery.GetScanManager().GetScan(id)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "scan not found"})
			return
		}
		if job.Status != "completed" || job.Result == nil {
			c.JSON(http.StatusConflict, gin.H{
				"scan_id": job.ID,
				"status":  job.Status,
				"error":   "scan intelligence not ready",
			})
			return
		}
		rep := intelligence.BuildReport(intelligence.ScanInput{
			Target:    job.Target,
			Discovery: job.Result,
		})
		logger.WithFields(logrus.Fields{
			"scan_id":  id,
			"decision": rep.Gate.Decision,
			"findings": len(rep.Findings),
		}).Info("Built scan intelligence report")
		c.JSON(http.StatusOK, rep)
	}
}

func GetScanCycloneDX(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		job, ok := discovery.GetScanManager().GetScan(id)
		if !ok {
			c.JSON(http.StatusNotFound, gin.H{"error": "scan not found"})
			return
		}
		if job.Status != "completed" || job.Result == nil {
			c.JSON(http.StatusConflict, gin.H{
				"scan_id": job.ID,
				"status":  job.Status,
				"error":   "scan report not ready",
			})
			return
		}
		findings := intelligence.FromDiscoveryResult(job.Result)
		doc := intelligence.CycloneDXBOM(job.Target, job.Result.Components, findings)
		logger.WithField("scan_id", id).Info("Exported CycloneDX CBOM")
		c.JSON(http.StatusOK, doc)
	}
}

func normalizedFindingsFromScans() []intelligence.Finding {
	jobs := discovery.GetScanManager().ListScans()
	out := make([]intelligence.Finding, 0)
	for _, job := range jobs {
		if job.Status != "completed" || job.Result == nil {
			continue
		}
		out = append(out, intelligence.FromDiscoveryResult(job.Result)...)
	}
	return out
}
