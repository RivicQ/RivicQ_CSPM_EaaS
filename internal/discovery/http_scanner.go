package discovery

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// HTTPScanner scans HTTP/HTTPS websites for weak cryptography usage and missing security headers.
type HTTPScanner struct{}

var md5Regex = regexp.MustCompile(`^[0-9a-f]{32}$`)

func httpScheme(target Target) string {
	if s := strings.ToLower(strings.TrimSpace(target.Scheme)); s == "http" || s == "https" {
		return s
	}
	if target.Port == 443 {
		return "https"
	}
	return "http"
}

// Scan connects to an HTTP or HTTPS endpoint and returns findings.
func (s *HTTPScanner) Scan(ctx context.Context, target Target) ([]Finding, error) {
	var findings []Finding
	now := time.Now()
	scheme := httpScheme(target)
	port := target.Port
	if port == 0 {
		if scheme == "https" {
			port = 443
		} else {
			port = 80
		}
	}
	baseURL := fmt.Sprintf("%s://%s:%d", scheme, target.Host, port)

	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec // scanner must still read headers on untrusted certs; TLS scanner reports cert issues
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/?data=test", nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("User-Agent", "RivicQ-CryptoBOM-Scanner/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http get %s: %w", baseURL, err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1024))
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	bodyStr := string(body)

	if md5Regex.MatchString(strings.TrimSpace(bodyStr)) {
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        port,
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

	findings = append(findings, s.checkSecurityHeaders(target, resp.Header, now, scheme, port)...)
	return findings, nil
}

func (s *HTTPScanner) checkSecurityHeaders(target Target, headers http.Header, now time.Time, scheme string, port int) []Finding {
	var findings []Finding
	add := func(findingType, title, desc, evidence, remediation string, sev SeverityLevel) {
		findings = append(findings, Finding{
			ID:          uuid.New().String(),
			TargetID:    target.ID,
			TargetLabel: target.Label,
			Host:        target.Host,
			Port:        port,
			Protocol:    "http",
			FindingType: findingType,
			Title:       title,
			Description: desc,
			Evidence:    evidence,
			Severity:    sev,
			Remediation: remediation,
			BSIRef:      "BSI TR-02102-2, Section 3.6",
			DORARef:     "DORA Art. 9(2)",
			QuantumSafe: false,
			ScannedAt:   now,
		})
	}

	if headers.Get("Strict-Transport-Security") == "" {
		add("MISSING_HSTS", "Missing HTTP Strict-Transport-Security Header",
			"The Strict-Transport-Security (HSTS) header is absent, allowing potential protocol downgrade attacks.",
			"HTTP response missing 'Strict-Transport-Security' header",
			"Add 'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload' to all HTTPS responses.",
			SeverityMedium)
	}
	if headers.Get("X-Content-Type-Options") == "" {
		add("MISSING_XCTO", "Missing X-Content-Type-Options Header",
			"The X-Content-Type-Options header is missing. This can allow MIME-sniffing attacks.",
			"HTTP response missing 'X-Content-Type-Options' header",
			"Add 'X-Content-Type-Options: nosniff' to all HTTP responses.",
			SeverityLow)
	}
	if headers.Get("X-Frame-Options") == "" && headers.Get("Content-Security-Policy") == "" {
		add("MISSING_XFO", "Missing X-Frame-Options Header",
			"The X-Frame-Options header is missing, which may allow clickjacking attacks.",
			"HTTP response missing 'X-Frame-Options' header",
			"Add 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN', or a CSP frame-ancestors directive.",
			SeverityLow)
	}
	if headers.Get("Content-Security-Policy") == "" {
		add("MISSING_CSP", "Missing Content-Security-Policy Header",
			"No Content-Security-Policy header was returned. CSP reduces injection and mixed-content risk on websites.",
			"HTTP response missing 'Content-Security-Policy' header",
			"Add a CSP that disables mixed content and restricts script sources.",
			SeverityLow)
	}
	if scheme == "https" {
		for _, c := range headers.Values("Set-Cookie") {
			low := strings.ToLower(c)
			if !strings.Contains(low, "secure") || !strings.Contains(low, "httponly") {
				add("INSECURE_COOKIE", "Cookie missing Secure or HttpOnly",
					"A Set-Cookie header on HTTPS is missing the Secure and/or HttpOnly flags.",
					truncate(c, 120),
					"Set cookies with Secure; HttpOnly; SameSite=Lax (or Strict) on HTTPS sites.",
					SeverityMedium)
				break
			}
		}
	}
	return findings
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
