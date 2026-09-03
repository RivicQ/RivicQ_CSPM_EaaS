package intelligence

import (
	"context"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
	"github.com/rivic-q/cryptobom-saas/internal/quantum/qiskitprofile"
)

type ScanInput struct {
	Target          string
	ScanType        string
	Discovery       *discovery.ScanResult
	ContentFindings []ContentFinding
	ContentRepo     string
}

func BuildReport(in ScanInput) *Report {
	started := time.Now()
	if in.Discovery != nil {
		started = in.Discovery.StartedAt
	}
	findings := FromDiscoveryResult(in.Discovery)
	for _, cf := range in.ContentFindings {
		findings = append(findings, FromContent(in.ContentRepo, cf))
	}
	var components []discovery.CBOMComponent
	if in.Discovery != nil {
		components = in.Discovery.Components
	}
	gate := Evaluate(findings, DefaultPolicies())
	summary := summarizeFindings(findings)
	if !gate.Passed {
		summary.Compliance = "FAIL"
	} else if gate.Warned > 0 {
		summary.Compliance = "WARN"
	}
	completed := time.Now()
	if in.Discovery != nil && !in.Discovery.CompletedAt.IsZero() {
		completed = in.Discovery.CompletedAt
	}
	qiskit := attachQiskit(findings, in.Discovery)
	return &Report{
		Target:             in.Target,
		Asset:              in.Target,
		StartedAt:          started,
		CompletedAt:        completed,
		Findings:           findings,
		Gate:               gate,
		Summary:            summary,
		Qiskit:             &qiskit,
		AuditScore:         buildAuditScore(gate, qiskit),
		ClientArchitecture: buildClientArchitecture(in, findings, qiskit),
		PQCReadiness:       buildPQCReadiness(findings, in.Discovery),
		CycloneDX:          CycloneDXBOM(in.Target, components, findings),
		Tools:              ProbeExternalTools(),
		Excludes:           DefaultExcludes(),
		Metadata: map[string]string{
			"engine":          "rivicq-intelligence",
			"qiskit_pipeline": qiskitprofile.Engine,
		},
	}
}

func attachQiskit(findings []Finding, disc *discovery.ScanResult) qiskitprofile.PipelineResult {
	in := make([]qiskitprofile.FindingInput, 0, len(findings))
	for i := range findings {
		in = append(in, qiskitprofile.FindingInput{
			Algorithm:   findings[i].Algorithm,
			KeyLength:   findings[i].KeyLength,
			QuantumSafe: findings[i].QuantumSafe,
			Scanner:     findings[i].Scanner,
		})
		cl := qiskitprofile.Classify(findings[i].Algorithm, findings[i].KeyLength)
		if findings[i].Labels == nil {
			findings[i].Labels = map[string]string{}
		}
		findings[i].Labels["qiskit_attack_class"] = string(cl.AttackClass)
		findings[i].Labels["qiskit_family"] = cl.QiskitFamily
	}
	res := qiskitprofile.ScoreFindings(in)
	if disc != nil {
		for k, v := range discovery.ResourcesFromTargets(disc.Targets) {
			if v {
				res.Resources[k] = true
			}
		}
	}
	return res
}

func buildAuditScore(gate GateResult, qiskit qiskitprofile.PipelineResult) *AuditScore {
	overall := qiskit.EstateScore
	if gate.Failed {
		overall -= 25
	} else if gate.Warned > 0 {
		overall -= 8
	}
	if overall < 0 {
		overall = 0
	}
	if overall > 100 {
		overall = 100
	}
	risk := 100 - qiskit.EstateScore
	if risk < 0 {
		risk = 0
	}
	return &AuditScore{
		Edition:      "community-engine",
		Overall:      overall,
		PolicyGate:   gate.Decision,
		QiskitEstate: qiskit.EstateScore,
		QuantumRisk:  risk,
		Note:         "Composite of the Qiskit-aligned estate score and the policy gate. Control mappings, not an ISO/SOC/NIST certification. IBM Quantum hardware is not invoked.",
	}
}

func ScanLocalSBOM(ctx context.Context, path string) (*discovery.ScanResult, error) {
	scanner := discovery.NewScanner()
	targets := []discovery.Target{{
		ID:       "sbom-local",
		Host:     "filesystem",
		Protocol: "sbom",
		Label:    path,
		Path:     path,
	}}
	return scanner.ScanAll(ctx, targets)
}
