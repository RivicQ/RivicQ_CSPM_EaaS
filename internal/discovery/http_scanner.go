package discovery

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"time"

	"github.com/google/uuid"
)

// HTTPScanner scans HTTP endpoints for weak cryptography usage and missing security headers
type HTTPScanner struct{}

var md5Regex = regexp.MustCompile(`^[0-9a-f]{32}$`)

// Scan connects to an HTTP endpoint and returns findings
func (s *HTTPScanner) Scan(ctx context.Context, target Target) ([]Finding, error) {
	var findings []Finding
	now := time.Now()

	baseURL := fmt.Sprintf("http://%s:%d", target.Host, target.Port)

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Probe for MD5 usage
	md5URL := baseURL + "/?data=test"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, md5URL, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http get %s: %w", md5URL, err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1024))
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	bodyStr := string(body)

	// Check if response looks like an MD5 hash
	if md5Regex.MatchString(bodyStr) {
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "http",
			FindingType: "MD5_HASH_USAGE",
			Title:       "MD5 Hash Usage Detected in API Response",
			Description: "The API endpoint returns what appears to be an MD5 hash. MD5 is cryptographically broken and must not be used for security purposes.",
			Evidence:    fmt.Sprintf("API response body matches MD5 hash pattern (32 hex chars): %s", truncate(bodyStr, 64)),
			Severity:    SeverityCritical,
			Algorithm:   "MD5",
			Remediation: "Replace MD5 with SHA-256 or SHA-3-256. MD5 is prohibited for any security use per BSI TR-02102-1.",
			BSIRef:      "BSI TR-02102-1, Section 3.3",
			DORARef:     "DORA Art. 9(2)",
			EIDASRef:    "eIDAS 2.0 ETSI TS 119 312",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	// Check security headers
	headerFindings := s.checkSecurityHeaders(target, resp.Header, now)
	findings = append(findings, headerFindings...)

	return findings, nil
}

func (s *HTTPScanner) checkSecurityHeaders(target Target, headers http.Header, now time.Time) []Finding {
	var findings []Finding

	if headers.Get("Strict-Transport-Security") == "" {
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "http",
			FindingType: "MISSING_HSTS",
			Title:       "Missing HTTP Strict-Transport-Security Header",
			Description: "The Strict-Transport-Security (HSTS) header is absent, allowing potential protocol downgrade attacks.",
			Evidence:    "HTTP response missing 'Strict-Transport-Security' header",
			Severity:    SeverityMedium,
			Remediation: "Add 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload' to all HTTPS responses.",
			BSIRef:      "BSI TR-02102-2, Section 3.6",
			DORARef:     "DORA Art. 9(2)",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	if headers.Get("X-Content-Type-Options") == "" {
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "http",
			FindingType: "MISSING_XCTO",
			Title:       "Missing X-Content-Type-Options Header",
			Description: "The X-Content-Type-Options header is missing. This can allow MIME-sniffing attacks.",
			Evidence:    "HTTP response missing 'X-Content-Type-Options' header",
			Severity:    SeverityLow,
			Remediation: "Add 'X-Content-Type-Options: nosniff' to all HTTP responses.",
			BSIRef:      "BSI TR-03161, Section 4.1",
			DORARef:     "DORA Art. 9(2)",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	if headers.Get("X-Frame-Options") == "" {
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        target.Port,
			Protocol:    "http",
			FindingType: "MISSING_XFO",
			Title:       "Missing X-Frame-Options Header",
			Description: "The X-Frame-Options header is missing, which may allow clickjacking attacks.",
			Evidence:    "HTTP response missing 'X-Frame-Options' header",
			Severity:    SeverityLow,
			Remediation: "Add 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN' to all HTTP responses.",
			BSIRef:      "BSI TR-03161, Section 4.1",
			DORARef:     "DORA Art. 9(2)",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	return findings
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
