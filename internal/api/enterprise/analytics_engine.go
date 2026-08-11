package enterprise

import (
	"context"
	"fmt"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/database"
)

// mlInsight is a data-driven finding produced from the current inventory.
type mlInsight struct {
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Confidence  float64   `json:"confidence"`
	Severity    string    `json:"severity"`
	GeneratedAt time.Time `json:"generated_at"`
}

func generateInsights(ctx context.Context, db *database.DB, tenantID string) ([]mlInsight, error) {
	analysis, err := analyzeThreats(ctx, db, tenantID)
	if err != nil {
		return nil, err
	}
	if db == nil || analysis.TotalAssets == 0 {
		return nil, nil
	}

	now := time.Now().UTC()
	var insights []mlInsight

	// Overall readiness insight.
	if len(analysis.AlgorithmStats) > 0 {
		top := analysis.AlgorithmStats[0]
		insights = append(insights, mlInsight{
			Type:        "posture_summary",
			Title:       "Post-quantum readiness assessment",
			Description: fmt.Sprintf(
				"%d%% of %d cryptographic assets are quantum-safe. Highest risk is %s (%s, %d use(s)).",
				int(analysis.PQCReadiness), analysis.TotalAssets, top.Algorithm, top.RiskLevel, top.Usage),
			Confidence:  0.9,
			Severity:    severityFromRisk(analysis.QuantumRiskScore),
			GeneratedAt: now,
		})
	}

	// Worst algorithm insight.
	if len(analysis.AlgorithmStats) > 0 {
		worst := analysis.AlgorithmStats[0]
		if worst.RiskLevel == "critical" || worst.RiskLevel == "high" {
			insights = append(insights, mlInsight{
				Type:        "critical_algorithm",
				Title:       fmt.Sprintf("%s is the largest quantum exposure", worst.Algorithm),
				Description: fmt.Sprintf(
					"%d asset(s) rely on %s with a vulnerability score of %d. Recommended action: %s.",
					worst.Usage, worst.Algorithm, worst.Vulnerability, worst.Migration),
				Confidence:  mathRound(0.7 + float64(worst.Usage)*0.02),
				Severity:    worst.RiskLevel,
				GeneratedAt: now,
			})
		}
	}

	// Vulnerability trend insight from unresolved events.
	if db != nil && db.Queries != nil {
		events, err := db.Queries.ListSecurityEvents(tenantID, 100, 0)
		if err == nil {
			open := 0
			for _, e := range events {
				if !e.Resolved {
					open++
				}
			}
			if open > 0 {
				insights = append(insights, mlInsight{
					Type:        "open_incidents",
					Title:       fmt.Sprintf("%d unresolved security event(s)", open),
					Description: "Resolve open high/critical findings to reduce overall risk exposure.",
					Confidence:  0.85,
					Severity:    "medium",
					GeneratedAt: now,
				})
			}
		}
	}

	return insights, nil
}

// threatForecast is a projected probability of quantum compromise events.
type threatForecast struct {
	Threat      string  `json:"threat"`
	Probability float64 `json:"probability"`
	HorizonDays int     `json:"horizon_days"`
	Driver      string  `json:"driver"`
}

func generateForecasts(ctx context.Context, db *database.DB, tenantID string) ([]threatForecast, error) {
	analysis, err := analyzeThreats(ctx, db, tenantID)
	if err != nil {
		return nil, err
	}
	if db == nil || analysis.TotalAssets == 0 {
		return nil, nil
	}

	// Baseline probability scales with vulnerable share; PQC-readiness lowers it.
	baseline := 0.05 + analysis.QuantumRiskScore*0.15
	forecasts := []threatForecast{
		{
			Threat:      "quantum_compromise",
			Probability: round2(baseline),
			HorizonDays: 365,
			Driver:      fmt.Sprintf("%d quantum-vulnerable asset(s) in production", analysis.VulnerableAssets),
		},
		{
			Threat:      "harvest_now_decrypt_later",
			Probability: round2(baseline * 1.3),
			HorizonDays: 90,
			Driver:      "captured ciphertext remains decryptable once CRQCs mature",
		},
		{
			Threat:      "algorithm_deprecation",
			Probability: round2(0.35),
			HorizonDays: 180,
			Driver:      fmt.Sprintf("%d algorithm families use deprecated/weak primitives", len(analysis.AlgorithmStats)),
		},
	}
	return forecasts, nil
}

func severityFromRisk(risk float64) string {
	switch {
	case risk >= 0.6:
		return "critical"
	case risk >= 0.35:
		return "high"
	case risk >= 0.15:
		return "medium"
	default:
		return "low"
	}
}

func mathRound(v float64) float64 {
	if v > 1.0 {
		return 1.0
	}
	if v < 0.0 {
		return 0.0
	}
	return v
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
