package cryptoart

import (
	"sort"
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/cryptoscan"
)

// BOMItem is a Cryptographic BOM row derived from static artifact analysis.
type BOMItem struct {
	Type        string `json:"type"` // algorithm | crypto_library | certificate | protocol
	Name        string `json:"name"`
	KeySize     int    `json:"key_size,omitempty"`
	Location    string `json:"location,omitempty"`
	Library     string `json:"library,omitempty"`
	QuantumSafe bool   `json:"quantum_safe"`
	PQCStatus   string `json:"pqc_status"`
	RiskLevel   string `json:"risk_level"`
	Source      string `json:"source"`
	Evidence    string `json:"evidence,omitempty"`
}

// AffectedAsset is one PQC migration target.
type AffectedAsset struct {
	Asset       string `json:"asset"`
	Algorithm   string `json:"algorithm"`
	QuantumRisk string `json:"quantum_risk"`
	PQCStatus   string `json:"pqc_status"`
	Replacement string `json:"replacement,omitempty"`
	Phase       string `json:"phase"`
	Priority    string `json:"priority"`
}

// Recommendation is a human-facing migration recommendation.
type Recommendation struct {
	Algorithm   string `json:"algorithm"`
	Replacement string `json:"replacement"`
	Phase       string `json:"phase"`
	Rationale   string `json:"rationale"`
}

// PQCPlan is a derived post-quantum migration plan.
type PQCPlan struct {
	Readiness       string           `json:"readiness"` // ready | partial | not_ready
	Priority        string           `json:"priority"`  // P0 | P1 | P2
	Affected        []AffectedAsset  `json:"affected_assets"`
	Recommendations []Recommendation `json:"recommendations"`
	Note            string           `json:"note"`
}

// BuildPQCPlan derives a migration plan from algorithm findings. The optional
// device lifetime raises priority for long-lived embedded devices.
func BuildPQCPlan(assetName, deviceLifetime string, algs []cryptoscan.AlgorithmFinding) PQCPlan {
	plan := PQCPlan{Readiness: "ready", Priority: "P2"}
	phaseFor := map[string]string{
		"migration_required":    "phase-1",
		"migration_recommended": "phase-2",
		"broken_classical":      "phase-0",
	}
	for _, a := range algs {
		if a.PQCStatus == "quantum_safe" || a.PQCStatus == "quantum_resistant" {
			continue
		}
		phase := phaseFor[a.PQCStatus]
		if phase == "" {
			phase = "phase-3"
		}
		prio := "P2"
		switch a.PQCStatus {
		case "migration_required":
			prio = "P1"
		case "broken_classical":
			prio = "P0"
		}
		plan.Affected = append(plan.Affected, AffectedAsset{
			Asset: assetName, Algorithm: a.Algorithm,
			QuantumRisk: a.QuantumRisk, PQCStatus: a.PQCStatus,
			Replacement: a.Replacement, Phase: phase, Priority: prio,
		})
		if a.Replacement != "" && a.Replacement != "-" {
			plan.Recommendations = append(plan.Recommendations, Recommendation{
				Algorithm: a.Algorithm, Replacement: a.Replacement, Phase: phase,
				Rationale: a.Migration,
			})
		}
	}
	if len(plan.Affected) == 0 {
		plan.Note = "No quantum-vulnerable public-key cryptography detected in this artifact."
		return plan
	}
	plan.Readiness = "partial"
	plan.Priority = "P1"
	qHigh := false
	for _, a := range plan.Affected {
		if a.QuantumRisk == "HIGH" {
			qHigh = true
		}
	}
	if qHigh && lifetimeRank(deviceLifetime) >= 3 {
		plan.Priority = "P0"
	}
	plan.Note = "Derived from static artifact evidence and the Qiskit-aligned taxonomy. Not a NIST CAVP validation."
	return plan
}

func lifetimeRank(v string) int {
	switch v {
	case "10+ years", "10 years+":
		return 4
	case "5-10 years":
		return 3
	case "2-5 years":
		return 2
	case "<2 years":
		return 1
	default:
		return 0
	}
}

// SortBOM orders BOM rows by type then name for deterministic output.
func SortBOM(items []BOMItem) {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Type != items[j].Type {
			return items[i].Type < items[j].Type
		}
		return items[i].Name < items[j].Name
	})
}

// HighestRisk returns the most severe risk level in a BOM.
func HighestRisk(items []BOMItem) string {
	order := map[string]int{"INFO": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
	best := "INFO"
	for _, it := range items {
		if order[strings.ToUpper(it.RiskLevel)] > order[best] {
			best = strings.ToUpper(it.RiskLevel)
		}
	}
	return best
}
