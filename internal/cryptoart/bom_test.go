package cryptoart

import (
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/cryptoscan"
)

func alg(name, status, qrisk string) cryptoscan.AlgorithmFinding {
	return cryptoscan.AlgorithmFinding{
		Algorithm:   name,
		QuantumRisk: qrisk,
		PQCStatus:   status,
		Replacement: "replacement-for-" + name,
		Migration:   "hint",
	}
}

func TestBuildPQCPlanEmptyIsReady(t *testing.T) {
	p := BuildPQCPlan("fw", "unknown", nil)
	if p.Readiness != "ready" || p.Priority != "P2" {
		t.Fatalf("empty plan = %+v", p)
	}
	if len(p.Affected) != 0 {
		t.Fatalf("expected no affected assets")
	}
}

func TestBuildPQCPlanClassicalRaisesPriority(t *testing.T) {
	algs := []cryptoscan.AlgorithmFinding{
		alg("RSA", "migration_required", "HIGH"),
		alg("AES", "migration_recommended", "MEDIUM"),
	}
	p := BuildPQCPlan("fw", "10 years+", algs)
	if p.Readiness != "partial" {
		t.Fatalf("readiness=%s", p.Readiness)
	}
	if p.Priority != "P0" {
		t.Fatalf("priority=%s want P0 (high quantum risk + long lifetime)", p.Priority)
	}
	if len(p.Affected) != 2 {
		t.Fatalf("affected=%d want 2", len(p.Affected))
	}
}

func TestBuildPQCPlanSkipsQuantumSafe(t *testing.T) {
	algs := []cryptoscan.AlgorithmFinding{
		alg("ML-KEM", "quantum_safe", "SAFE"),
		alg("ML-DSA", "quantum_safe", "SAFE"),
	}
	p := BuildPQCPlan("fw", "10 years+", algs)
	if len(p.Affected) != 0 {
		t.Fatalf("quantum-safe algorithms must not be affected: %+v", p.Affected)
	}
}

func TestBuildPQCPlanShortLifetimeNotP0(t *testing.T) {
	algs := []cryptoscan.AlgorithmFinding{alg("RSA", "migration_required", "HIGH")}
	p := BuildPQCPlan("fw", "<2 years", algs)
	if p.Priority == "P0" {
		t.Fatalf("short lifetime should not force P0")
	}
}

func TestSortBOMDeterministic(t *testing.T) {
	items := []BOMItem{
		{Type: "protocol", Name: "TLS"},
		{Type: "algorithm", Name: "RSA"},
		{Type: "algorithm", Name: "AES"},
	}
	SortBOM(items)
	if items[0].Name != "AES" || items[1].Name != "RSA" || items[2].Type != "protocol" {
		t.Fatalf("order=%+v", items)
	}
}

func TestHighestRisk(t *testing.T) {
	items := []BOMItem{{RiskLevel: "LOW"}, {RiskLevel: "CRITICAL"}, {RiskLevel: "MEDIUM"}}
	if HighestRisk(items) != "CRITICAL" {
		t.Fatalf("got %s", HighestRisk(items))
	}
	if HighestRisk(nil) != "INFO" {
		t.Fatalf("empty should be INFO")
	}
}
