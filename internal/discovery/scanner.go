package discovery

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Scanner orchestrates scanning across all target types
type Scanner struct {
	tlsScanner  *TLSScanner
	sshScanner  *SSHScanner
	httpScanner *HTTPScanner
} // NewScanner creates a new Scanner instance
func NewScanner() *Scanner {
	return &Scanner{
		tlsScanner:  &TLSScanner{},
		sshScanner:  &SSHScanner{},
		httpScanner: &HTTPScanner{},
	}
}

// ScanAll concurrently scans all provided targets and returns a ScanResult
func (s *Scanner) ScanAll(ctx context.Context, targets []Target) (*ScanResult, error) {
	result := &ScanResult{
		ScanID:    uuid.New().String(),
		StartedAt: time.Now(),
		Targets:   targets,
	}

	var (
		mu         sync.Mutex
		wg         sync.WaitGroup
		findings   []Finding
		components []CBOMComponent
		scanned    int
	)

	for _, t := range targets {
		wg.Add(1)
		go func(target Target) {
			defer wg.Done()

			targetFindings, targetComponents, err := s.scanTarget(ctx, target)

			mu.Lock()
			defer mu.Unlock()
			scanned++
			if err == nil {
				findings = append(findings, targetFindings...)
				components = append(components, targetComponents...)
			}
		}(t)
	}

	wg.Wait()

	result.CompletedAt = time.Now()
	result.Findings = findings
	result.Components = dedupeComponents(components)
	result.Summary = computeSummary(targets, scanned, findings, result.Components)

	return result, nil
}

// scanTarget dispatches a single target to the appropriate scanner. Network
// scanners also yield CBOM components derived from their findings.
func (s *Scanner) scanTarget(ctx context.Context, target Target) ([]Finding, []CBOMComponent, error) {
	switch target.Protocol {
	case "tls":
		findings, err := s.tlsScanner.Scan(ctx, target)
		return findings, componentsFromFindings(findings), err
	case "ssh":
		findings, err := s.sshScanner.Scan(ctx, target)
		return findings, componentsFromFindings(findings), err
	case "http":
		findings, err := s.httpScanner.Scan(ctx, target)
		return findings, componentsFromFindings(findings), err
	case "sbom":
		return s.scanSBOM(ctx, target)
	default:
		return nil, nil, nil
	}
}

// scanSBOM scans a local filesystem path for dependency manifests and maps any
// cryptographic libraries it finds into CBOM components.
func (s *Scanner) scanSBOM(ctx context.Context, target Target) ([]Finding, []CBOMComponent, error) {
	select {
	case <-ctx.Done():
		return nil, nil, ctx.Err()
	default:
	}

	sbom, err := ScanDirectoryForSBOM(target.Path)
	if err != nil {
		return nil, nil, err
	}

	components := CBOMComponentsFromSBOM(sbom)

	findings := make([]Finding, 0, len(components))
	now := time.Now()
	for _, c := range components {
		severity := c.RiskLevel
		if c.RiskLevel == "" {
			severity = SeverityLow
		}
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "sbom",
			FindingType: "CRYPTO_LIBRARY",
			Title:       "Cryptographic library: " + c.Library,
			Description: "Cryptographic library detected during repository scan. Refer to the CBOM component for quantum-readiness assessment.",
			Evidence:    evidenceForLibrary(c.Library, c.Version),
			Severity:    severity,
			Algorithm:   c.Algorithm,
			Remediation: "Review the algorithm usage and plan PQC migration before Q-Day.",
			BSIRef:      c.BSIRef,
			DORARef:     "DORA Art. 9(2) – ICT risk management",
			EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
			QuantumSafe: c.QuantumSafe,
			ScannedAt:   now,
		})
	}

	return findings, components, nil
}

func evidenceForLibrary(name, version string) string {
	evidence := "Library: " + name
	if version != "" {
		evidence += " v" + version
	}
	return evidence
}

// componentsFromFindings derives CBOM components from scan findings, collapsing
// repeated algorithms across targets.
func componentsFromFindings(findings []Finding) []CBOMComponent {
	components := make([]CBOMComponent, 0, len(findings))
	seen := map[string]bool{}
	for _, f := range findings {
		if f.Algorithm == "" {
			continue
		}
		key := f.Algorithm + "|" + string(f.Severity)
		if seen[key] {
			continue
		}
		seen[key] = true
		pqc := "migration_required"
		if f.QuantumSafe {
			pqc = "safe"
		}
		components = append(components, CBOMComponent{
			Algorithm:   f.Algorithm,
			KeySize:     f.KeyLength,
			Library:     "",
			Version:     "",
			RiskLevel:   f.Severity,
			QuantumSafe: f.QuantumSafe,
			PQCStatus:   pqc,
			Location:    f.TargetLabel,
			BSIRef:      f.BSIRef,
		})
	}
	return components
}

// dedupeComponents removes duplicate CBOM components while preserving order.
func dedupeComponents(components []CBOMComponent) []CBOMComponent {
	if len(components) == 0 {
		return components
	}
	seen := map[string]bool{}
	out := make([]CBOMComponent, 0, len(components))
	for _, c := range components {
		key := c.Algorithm + "@" + c.Library + "@" + c.Version + "|" + string(c.RiskLevel)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, c)
	}
	return out
}

func computeSummary(targets []Target, scanned int, findings []Finding, components []CBOMComponent) ScanSummary {
	s := ScanSummary{
		TotalTargets:    len(targets),
		ScannedTargets:  scanned,
		TotalFindings:   len(findings),
		TotalComponents: len(components),
	}

	for _, f := range findings {
		switch f.Severity {
		case SeverityCritical:
			s.Critical++
		case SeverityHigh:
			s.High++
		case SeverityMedium:
			s.Medium++
		case SeverityLow:
			s.Low++
		}
		if !f.QuantumSafe {
			s.QuantumUnsafe++
		}
		if f.BSIRef != "" {
			s.BSIReferenced++
		}
	}

	for _, c := range components {
		switch c.RiskLevel {
		case SeverityCritical, SeverityHigh:
			s.AtRisk++
		}
		if c.QuantumSafe {
			s.QuantumSafe++
		}
		if c.PQCStatus == "pqc_ready" {
			s.PQCReady++
		}
	}

	return s
}
