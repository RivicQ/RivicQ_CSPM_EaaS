package auth

import "testing"

func TestAllowedDomainsFromEnvIncludesGmail(t *testing.T) {
	t.Setenv("AUTH_ALLOWED_DOMAINS", "rivicq.com")
	t.Setenv("AUTH_ALLOW_GMAIL", "true")

	domains := AllowedDomainsFromEnv()
	if !containsDomain(domains, "rivicq.com") {
		t.Fatalf("expected rivicq.com in %#v", domains)
	}
	if !containsDomain(domains, "gmail.com") {
		t.Fatalf("expected gmail.com in %#v", domains)
	}
	if !containsDomain(domains, "googlemail.com") {
		t.Fatalf("expected googlemail.com in %#v", domains)
	}
}

func TestAllowedDomainsFromEnvCanDisableGmail(t *testing.T) {
	t.Setenv("AUTH_ALLOWED_DOMAINS", "rivicq.com")
	t.Setenv("AUTH_ALLOW_GMAIL", "false")

	domains := AllowedDomainsFromEnv()
	if containsDomain(domains, "gmail.com") {
		t.Fatalf("did not expect gmail.com in %#v", domains)
	}
}

func TestEmailDomainAllowedOpenWhenUnset(t *testing.T) {
	if !EmailDomainAllowed("user@gmail.com", nil) {
		t.Fatal("expected open registration when domain list is empty")
	}
}

func containsDomain(domains []string, target string) bool {
	for _, domain := range domains {
		if domain == target {
			return true
		}
	}
	return false
}
