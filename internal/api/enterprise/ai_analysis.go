package enterprise

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

// aiResponse is the structured output of the AI analysis endpoint.
type aiResponse struct {
	AnalysisID   string           `json:"analysis_id"`
	Subject      string           `json:"subject"`
	Summary      string           `json:"summary"`
	Severity     string           `json:"severity"`
	Confidence   float64          `json:"confidence"`
	KeyFindings  []string         `json:"key_findings"`
	Risks        []aiRisk         `json:"risks"`
	Recommendations []string      `json:"recommendations"`
	Scope        string           `json:"scope"`
	GeneratedAt  time.Time        `json:"generated_at"`
	Source       string           `json:"source"`
}

type aiRisk struct {
	Title       string `json:"title"`
	Severity    string `json:"severity"`
	Probability string `json:"probability"`
	Mitigation  string `json:"mitigation"`
}

type aiAnalyzeRequest struct {
	Context  string `json:"context"` // dashboard | asset | report | posture | scan
	TargetID string `json:"target_id"`
	Query    string `json:"query"`
}

func analyzeAI(db *database.DB, logger *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req aiAnalyzeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if req.Context == "" {
			req.Context = "dashboard"
		}

		result, err := runAnalysis(c.Request.Context(), db, req)
		if err != nil {
			logger.WithError(err).Error("AI analysis failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "AI analysis failed"})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}

func runAnalysis(ctx context.Context, db *database.DB, req aiAnalyzeRequest) (*aiResponse, error) {
	tenantID := enterpriseDefaultTenant
	analysis, err := analyzeThreats(ctx, db, tenantID)
	if err != nil {
		return nil, err
	}

	switch req.Context {
	case "asset":
		return analyzeAsset(ctx, db, req, analysis)
	case "report":
		return analyzeReport(ctx, db, req, analysis)
	case "scan":
		return analyzeScan(ctx, db, req, analysis)
	case "posture":
		return analyzePosture(analysis)
	default:
		return analyzeDashboard(analysis)
	}
}

func analyzeDashboard(analysis *ThreatAnalysis) (*aiResponse, error) {
	resp := &aiResponse{
		AnalysisID: fmt.Sprintf("ai-%d", time.Now().Unix()),
		Subject:    "Platform security posture",
		Confidence: 0.92,
		GeneratedAt: time.Now().UTC(),
		Source:     "rivicq-ai",
		Scope:      "dashboard",
		Severity:   severityFromRisk(analysis.QuantumRiskScore),
		Summary: fmt.Sprintf(
			"Your cryptographic inventory contains %d asset(s); %d (%.1f%%) are quantum-safe. "+
				"%d threat(s) were detected by the ML engine, with %d critical and %d high.",
			analysis.TotalAssets, analysis.QuantumSafeAssets, analysis.PQCReadiness,
			analysis.TotalThreats, analysis.Critical, analysis.High),
	}
	if analysis.TotalAssets == 0 {
		resp.Summary = "No cryptographic assets have been scanned yet. Run a CBOM scan to generate posture intelligence."
		resp.Severity = "info"
		resp.Recommendations = []string{"Run a CBOM scan from the Scanner workspace to populate your inventory."}
		return resp, nil
	}
	resp.KeyFindings = []string{
		fmt.Sprintf("PQC readiness is %.1f%%, target is 100%%", analysis.PQCReadiness),
		fmt.Sprintf("%d vulnerable asset(s) exposed to future harvest-now-decrypt-later attacks", analysis.VulnerableAssets),
	}
	for _, t := range analysis.Threats {
		if len(resp.Risks) >= 3 {
			break
		}
		resp.Risks = append(resp.Risks, aiRisk{
			Title:       t.Description,
			Severity:    t.Severity,
			Probability: probabilityLabel(t.Confidence),
			Mitigation:  t.Recommendation,
		})
	}
	if analysis.Critical+analysis.High == 0 {
		resp.Recommendations = []string{
			"Maintain current PQC migration velocity to close the remaining readiness gap.",
			"Schedule a fresh quantum risk assessment after the next CBOM scan.",
		}
	} else {
		resp.Recommendations = []string{
			fmt.Sprintf("Resolve the %d critical/high threat(s) before the next audit cycle.", analysis.Critical+analysis.High),
			"Prioritize migration of algorithms flagged 'migrate' in the risk breakdown.",
			"Attest high-value assets via IBM Quantum attestation for compliance evidence.",
		}
	}
	return resp, nil
}

func analyzePosture(analysis *ThreatAnalysis) (*aiResponse, error) {
	resp, err := analyzeDashboard(analysis)
	if err != nil {
		return nil, err
	}
	resp.Subject = "Post-quantum posture assessment"
	resp.Scope = "posture"
	resp.Summary = fmt.Sprintf(
		"Posture health: %.1f%% quantum-safe across %d asset(s). Overall risk is %s (score %.2f).",
		analysis.PQCReadiness, analysis.TotalAssets, severityFromRisk(analysis.QuantumRiskScore), analysis.QuantumRiskScore)
	resp.KeyFindings = append(resp.KeyFindings,
		fmt.Sprintf("Risk breakdown spans %d algorithm family/families", len(analysis.AlgorithmStats)))
	return resp, nil
}

func analyzeAsset(ctx context.Context, db *database.DB, req aiAnalyzeRequest, _ *ThreatAnalysis) (*aiResponse, error) {
	if db == nil || db.Queries == nil {
		return &aiResponse{
			AnalysisID: fmt.Sprintf("ai-%d", time.Now().Unix()),
			Subject:    "Asset analysis",
			Confidence: 0.7,
			GeneratedAt: time.Now().UTC(),
			Source:     "rivicq-ai",
			Scope:      "asset",
			Summary:    "Asset intelligence is unavailable in demo mode. Connect the enterprise database.",
			Severity:   "info",
		}, nil
	}
	asset, err := db.Queries.GetCryptoAsset(req.TargetID)
	if err != nil {
		return nil, err
	}
	resp := &aiResponse{
		AnalysisID: fmt.Sprintf("ai-%d", time.Now().Unix()),
		Subject:    "Cryptographic asset " + asset.Algorithm,
		Confidence: 0.9,
		GeneratedAt: time.Now().UTC(),
		Source:     "rivicq-ai",
		Scope:      "asset",
		Severity:   riskLevelFor(asset.VulnerabilityScore, asset.QuantumSafe, !asset.QuantumSafe),
		Summary: fmt.Sprintf(
			"Asset uses %s (key size %d) with a vulnerability score of %d. Quantum-safe: %t.",
			asset.Algorithm, asset.KeySize, asset.VulnerabilityScore, asset.QuantumSafe),
	}
	if asset.QuantumSafe {
		resp.Recommendations = []string{"Algorithm is already quantum-safe — continue monitoring."}
		resp.KeyFindings = []string{"No immediate migration required for this asset."}
	} else {
		resp.Recommendations = []string{
			"Replace " + asset.Algorithm + " with a NIST PQC alternative (ML-KEM/ML-DSA).",
			"Attest this asset via quantum attestation to capture compliance evidence.",
		}
		resp.KeyFindings = []string{
			"Asset uses a quantum-vulnerable algorithm and requires migration.",
		}
	}
	return resp, nil
}

func analyzeReport(ctx context.Context, db *database.DB, req aiAnalyzeRequest, _ *ThreatAnalysis) (*aiResponse, error) {
	if db == nil || db.Queries == nil {
		return nil, fmt.Errorf("database unavailable")
	}
	report, err := db.Queries.GetCBOMReport(req.TargetID)
	if err != nil {
		return nil, err
	}
	assets, err := db.Queries.ListCryptoAssets(req.TargetID, 1000, 0)
	if err != nil {
		return nil, err
	}
	safe := 0
	for _, a := range assets {
		if a.QuantumSafe {
			safe++
		}
	}
	pct := 0.0
	if len(assets) > 0 {
		pct = float64(safe) / float64(len(assets)) * 100
	}
	resp := &aiResponse{
		AnalysisID: fmt.Sprintf("ai-%d", time.Now().Unix()),
		Subject:    "CBOM report " + report.Name,
		Confidence: 0.88,
		GeneratedAt: time.Now().UTC(),
		Source:     "rivicq-ai",
		Scope:      "report",
		Severity:   severityFromRisk(1 - pct/100),
		Summary: fmt.Sprintf(
			"CBOM report %q (v%s) contains %d cryptographic asset(s), %.1f%% quantum-safe.",
			report.Name, report.Version, len(assets), pct),
		KeyFindings: []string{
			fmt.Sprintf("%d asset(s) are already quantum-safe", safe),
			fmt.Sprintf("%d asset(s) require attention", len(assets)-safe),
		},
	}
	return resp, nil
}

func analyzeScan(ctx context.Context, db *database.DB, req aiAnalyzeRequest, analysis *ThreatAnalysis) (*aiResponse, error) {
	resp, err := analyzeDashboard(analysis)
	if err != nil {
		return nil, err
	}
	resp.Subject = "Latest scan intelligence"
	resp.Scope = "scan"
	resp.Summary = fmt.Sprintf(
		"The most recent analysis detected %d threat(s): %d critical, %d high, %d medium, %d low.",
		analysis.TotalThreats, analysis.Critical, analysis.High, analysis.Medium, analysis.Low)
	return resp, nil
}

func probabilityLabel(confidence float64) string {
	switch {
	case confidence >= 0.85:
		return "high"
	case confidence >= 0.7:
		return "medium"
	default:
		return "low"
	}
}

// SetupAIRoutes registers the AI analysis endpoint.
func SetupAIRoutes(router *gin.RouterGroup, db *database.DB, logger *logrus.Logger) {
	ai := router.Group("/ai")
	{
		ai.POST("/analyze", analyzeAI(db, logger))
		ai.GET("/status", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"engine":   "rivicq-ai",
				"version":  "1.0",
				"enabled":  true,
				"capabilities": strings.Split("dashboard,asset,report,scan,posture", ","),
			})
		})
	}
}
