package intelligence

import (
	"context"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/discovery"
)

type ScanInput struct {
	Target          string
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
	return &Report{
		Target:      in.Target,
		Asset:       in.Target,
		StartedAt:   started,
		CompletedAt: completed,
		Findings:    findings,
		Gate:        gate,
		Summary:     summary,
		CycloneDX:   CycloneDXBOM(in.Target, components, findings),
		Tools:       ProbeExternalTools(),
		Excludes:    DefaultExcludes(),
		Metadata:    map[string]string{"engine": "rivicq-intelligence"},
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
