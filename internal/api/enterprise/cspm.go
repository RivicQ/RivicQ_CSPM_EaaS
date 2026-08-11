package enterprise

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/config"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

type CSPMOverview struct {
	HealthScore    int             `json:"health_score"`
	TotalAssets    int             `json:"total_assets"`
	OutdatedAlgs   int             `json:"outdated_algorithms"`
	AtRiskData     int             `json:"at_risk_data"`
	RiskBreakdown  []AlgorithmRisk `json:"risk_breakdown"`
	Topology       []TopologyLink  `json:"topology"`
	QuantumSafePct float64         `json:"quantum_safe_pct"`
	Generated      string          `json:"generated"`
}

type AlgorithmRisk struct {
	Name        string `json:"name"`
	Usage       int    `json:"usage"`
	RiskLevel   string `json:"risk_level"`
	QuantumSafe bool   `json:"quantum_safe"`
	Migration   string `json:"migration"`
}

type TopologyLink struct {
	From      string `json:"from"`
	To        string `json:"to"`
	Encrypted bool   `json:"encrypted"`
	Provider  string `json:"provider"`
}

func GetCSPMOverview(db *database.DB, logger *logrus.Logger, _ *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := tenantIDFor(c)

		analysis, err := analyzeThreats(c.Request.Context(), db, tenantID)
		if err != nil {
			logger.WithError(err).Error("CSPM overview analysis failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "CSPM overview failed"})
			return
		}

		riskBreakdown := make([]AlgorithmRisk, 0, len(analysis.AlgorithmStats))
		for _, st := range analysis.AlgorithmStats {
			riskBreakdown = append(riskBreakdown, AlgorithmRisk{
				Name:        st.Algorithm,
				Usage:       st.Usage,
				RiskLevel:   st.RiskLevel,
				QuantumSafe: st.QuantumSafe && !st.Vulnerable,
				Migration:   st.Migration,
			})
		}

		topology := buildTopology(db, tenantID)

		healthScore := 100
		if analysis.TotalAssets > 0 {
			healthScore = int(analysis.PQCReadiness)
		}

		c.JSON(http.StatusOK, CSPMOverview{
			HealthScore:    healthScore,
			TotalAssets:    analysis.TotalAssets,
			OutdatedAlgs:   len(analysis.AlgorithmStats),
			AtRiskData:     analysis.VulnerableAssets,
			RiskBreakdown:  riskBreakdown,
			Topology:       topology,
			QuantumSafePct: analysis.PQCReadiness,
			Generated:      time.Now().UTC().Format(time.RFC3339),
		})
	}
}

// buildTopology derives real encryption links from configured cloud accounts
// and registered Kubernetes clusters. When there is no real inventory it
// returns an empty graph instead of fabricated links.
func buildTopology(db *database.DB, tenantID string) []TopologyLink {
	if db == nil {
		return []TopologyLink{}
	}

	providers := map[string]string{
		"aws":       "AWS",
		"azure":     "Azure",
		"gcp":       "GCP",
		"ibm_cloud": "IBM Cloud",
	}
	rows, err := db.Query(`SELECT provider FROM cloud_accounts WHERE tenant_id = $1 AND status = 'active'`, tenantID)
	if err == nil {
		defer rows.Close()
		var links []TopologyLink
		for rows.Next() {
			var provider string
			if err := rows.Scan(&provider); err != nil {
				continue
			}
			label := providers[provider]
			if label == "" {
				continue
			}
			links = append(links, TopologyLink{
				From:      label + " KMS",
				To:        label + " Storage",
				Encrypted: true,
				Provider:  provider,
			})
		}
		if len(links) > 0 {
			return links
		}
	}

	clusterRows, err := db.Query(`SELECT name, platform, region FROM kubernetes_clusters WHERE tenant_id = $1`, tenantID)
	if err == nil {
		defer clusterRows.Close()
		var links []TopologyLink
		for clusterRows.Next() {
			var name, platform, region string
			if err := clusterRows.Scan(&name, &platform, &region); err != nil {
				continue
			}
			links = append(links, TopologyLink{
				From:      "K8s " + name,
				To:        "K8s Pod",
				Encrypted: true,
				Provider:  "kubernetes",
			})
		}
		return links
	}

	return []TopologyLink{}
}
