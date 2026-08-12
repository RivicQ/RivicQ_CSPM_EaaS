package auth

import (
	"os"
	"strings"
)

var personalGmailDomains = []string{"gmail.com", "googlemail.com"}

// AllowedDomainsFromEnv parses AUTH_ALLOWED_DOMAINS and, by default, also allows
// personal Gmail accounts alongside any configured work domains.
func AllowedDomainsFromEnv() []string {
	raw := strings.TrimSpace(os.Getenv("AUTH_ALLOWED_DOMAINS"))
	if raw == "" {
		return nil
	}
	domains := parseDomainList(raw)
	if allowPersonalGmail() {
		domains = appendUniqueDomains(domains, personalGmailDomains...)
	}
	return domains
}

func allowPersonalGmail() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("AUTH_ALLOW_GMAIL")))
	if value == "" {
		return true
	}
	switch value {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

// EmailDomainAllowed reports whether email is permitted for the given domain list.
// An empty list allows all domains.
func EmailDomainAllowed(email string, allowedDomains []string) bool {
	if len(allowedDomains) == 0 {
		return true
	}
	parts := strings.Split(strings.ToLower(strings.TrimSpace(email)), "@")
	if len(parts) != 2 {
		return false
	}
	domain := parts[1]
	for _, allowed := range allowedDomains {
		if domain == strings.ToLower(strings.TrimSpace(allowed)) {
			return true
		}
	}
	return false
}

func parseDomainList(raw string) []string {
	parts := strings.Split(raw, ",")
	domains := make([]string, 0, len(parts))
	for _, part := range parts {
		domain := strings.ToLower(strings.TrimSpace(part))
		if domain != "" {
			domains = append(domains, domain)
		}
	}
	return domains
}

func appendUniqueDomains(domains []string, extras ...string) []string {
	seen := make(map[string]struct{}, len(domains))
	for _, domain := range domains {
		seen[domain] = struct{}{}
	}
	for _, extra := range extras {
		extra = strings.ToLower(strings.TrimSpace(extra))
		if extra == "" {
			continue
		}
		if _, ok := seen[extra]; ok {
			continue
		}
		seen[extra] = struct{}{}
		domains = append(domains, extra)
	}
	return domains
}
