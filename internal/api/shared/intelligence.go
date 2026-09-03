package shared

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/rivic-q/cryptobom-saas/internal/edition"
	"github.com/rivic-q/cryptobom-saas/internal/hardware"
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
	router.GET("/scans/:id/qiskit", GetScanQiskit(logger))
	router.GET("/scans/:id/cyclonedx", GetScanCycloneDX(logger))
	router.GET("/architecture", PlatformArchitectureHandler(logger))
	router.GET("/hardware/catalog", HardwareCatalogHandler(logger))
	SetupBOMRoutes(router, logger)
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
			ScanType:  job.ScanType,
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

func GetScanQiskit(logger *logrus.Logger) gin.HandlerFunc {
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
				"error":   "qiskit pipeline not ready",
			})
			return
		}
		rep := intelligence.BuildReport(intelligence.ScanInput{
			Target:    job.Target,
			ScanType:  job.ScanType,
			Discovery: job.Result,
		})
		estate := 0
		if rep.Qiskit != nil {
			estate = rep.Qiskit.EstateScore
		}
		logger.WithFields(logrus.Fields{
			"scan_id":      id,
			"estate_score": estate,
			"findings":     len(rep.Findings),
		}).Info("Built Qiskit pipeline score")
		c.JSON(http.StatusOK, gin.H{
			"scan_id":     job.ID,
			"target":      job.Target,
			"qiskit":      rep.Qiskit,
			"audit_score": rep.AuditScore,
			"resources":   discovery.ResourcesFromTargets(job.Result.Targets),
			"source":      "qiskitprofile",
			"note":        "Local Qiskit-aligned scoring. IBM Quantum Runtime is not invoked.",
		})
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

func PlatformArchitectureHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg := edition.Detect()
		logger.WithField("edition", cfg.Edition).Debug("Serving platform architecture")
		c.JSON(http.StatusOK, gin.H{
			"product":     "RivicQ Security Cloud",
			"layers":      []string{"input", "cbom-engine", "pqc-operationalization", "outputs"},
			"client_path": []string{"discover", "mitigate", "report"},
			"edition":     cfg.Public(),
			"honesty":     "Community is a limited CBOM engine. Enterprise enables the control plane and connectors when credentials exist. QSIC is declared research hardware, not a shipped chip.",
		})
	}
}

func HardwareCatalogHandler(logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg := edition.Detect()
		c.JSON(http.StatusOK, gin.H{
			"catalog": hardware.Catalog(),
			"note":    hardware.Honesty,
			"edition": cfg.Edition,
			"persist": cfg.Features.HardwareInventory,
			"engine":  "declared_inventory",
		})
	}
}
