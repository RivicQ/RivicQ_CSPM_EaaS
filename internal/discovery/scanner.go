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
}

// NewScanner creates a new Scanner instance
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
		mu       sync.Mutex
		wg       sync.WaitGroup
		findings []Finding
		scanned  int
	)

	for _, t := range targets {
		wg.Add(1)
		go func(target Target) {
			defer wg.Done()

			var targetFindings []Finding
			var err error

			switch target.Protocol {
			case "tls":
				targetFindings, err = s.tlsScanner.Scan(ctx, target)
			case "ssh":
				targetFindings, err = s.sshScanner.Scan(ctx, target)
			case "http":
				targetFindings, err = s.httpScanner.Scan(ctx, target)
			}

			mu.Lock()
			defer mu.Unlock()
			scanned++
			if err == nil {
				findings = append(findings, targetFindings...)
			}
		}(t)
	}

	wg.Wait()

	result.CompletedAt = time.Now()
	result.Findings = findings
	result.Summary = computeSummary(targets, scanned, findings)

	return result, nil
}

func computeSummary(targets []Target, scanned int, findings []Finding) ScanSummary {
	s := ScanSummary{
		TotalTargets:   len(targets),
		ScannedTargets: scanned,
		TotalFindings:  len(findings),
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
			s.BSICompliant++
		}
	}

	return s
}
