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
	HealthScore     int              `json:"health_score"`
	TotalAssets     int              `json:"total_assets"`
	OutdatedAlgs    int              `json:"outdated_algorithms"`
	AtRiskData      int              `json:"at_risk_data"`
	RiskBreakdown   []AlgorithmRisk  `json:"risk_breakdown"`
	Topology        []TopologyLink   `json:"topology"`
	QuantumSafePct  float64          `json:"quantum_safe_pct"`
	Generated       string           `json:"generated"`
}

type AlgorithmRisk struct {
	Name       string `json:"name"`
	Usage      int    `json:"usage"`
	RiskLevel  string `json:"risk_level"`
	QuantumSafe bool  `json:"quantum_safe"`
	Migration  string `json:"migration"`
}

type TopologyLink struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Encrypted bool  `json:"encrypted"`
	Provider string `json:"provider"`
}

func GetCSPMOverview(db *database.DB, logger *logrus.Logger, _ *config.EnterpriseConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		healthScore := 74
		totalAssets := 1427
		outdatedAlgs := 23
		atRisk := 847
		quantumSafePct := 62.5

		if db != nil && db.Queries != nil {
			metrics, err := db.Queries.GetMetricsOverview("00000000-0000-0000-0000-000000000001")
			if err == nil {
				if v, ok := metrics["total_assets"].(int); ok && v > 0 {
					totalAssets = v
				}
				if v, ok := metrics["compliance_score"].(float64); ok {
					healthScore = int(v)
				}
				if v, ok := metrics["quantum_safe"].(int); ok {
					qp := float64(v) / float64(totalAssets) * 100
					quantumSafePct = float64(int(qp*10)) / 10
				}
			}
		}

		riskBreakdown := []AlgorithmRisk{
			{Name: "AES-256-GCM", Usage: 142, RiskLevel: "low", QuantumSafe: true, Migration: "monitored"},
			{Name: "RSA-2048", Usage: 89, RiskLevel: "high", QuantumSafe: false, Migration: "migrate"},
			{Name: "Triple DES", Usage: 23, RiskLevel: "critical", QuantumSafe: false, Migration: "migrate"},
			{Name: "ChaCha20-Poly1305", Usage: 56, RiskLevel: "low", QuantumSafe: true, Migration: "monitored"},
			{Name: "ECDSA P-384", Usage: 34, RiskLevel: "medium", QuantumSafe: false, Migration: "plan"},
			{Name: "ML-KEM-768", Usage: 12, RiskLevel: "low", QuantumSafe: true, Migration: "monitored"},
		}

		topology := []TopologyLink{
			{From: "AWS KMS", To: "S3", Encrypted: true, Provider: "aws"},
			{From: "Azure Key Vault", To: "Blob", Encrypted: true, Provider: "azure"},
			{From: "GCP KMS", To: "GCS", Encrypted: true, Provider: "gcp"},
			{From: "K8s Pod", To: "Pod", Encrypted: true, Provider: "kubernetes"},
		}

		c.JSON(http.StatusOK, CSPMOverview{
			HealthScore:    healthScore,
			TotalAssets:    totalAssets,
			OutdatedAlgs:   outdatedAlgs,
			AtRiskData:     atRisk,
			RiskBreakdown:  riskBreakdown,
			Topology:       topology,
			QuantumSafePct: quantumSafePct,
			Generated:      time.Now().UTC().Format(time.RFC3339),
		})
	}
}


