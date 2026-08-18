package intelligence

import (
	"path/filepath"
	"strings"
)

type Action string

const (
	ActionBlock  Action = "BLOCK"
	ActionWarn   Action = "WARN"
	ActionAllow  Action = "ALLOW"
	ActionInform Action = "INFORM"
)

type Policy struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Action      Action `json:"action"`
	Description string `json:"description"`
	match       func(Finding) bool
}

type PolicyHit struct {
	PolicyID    string `json:"policy_id"`
	PolicyName  string `json:"policy_name"`
	Action      Action `json:"action"`
	FindingID   string `json:"finding_id"`
	Title       string `json:"title"`
	Location    string `json:"location"`
	Description string `json:"description"`
}

type GateResult struct {
	Passed    bool        `json:"passed"`
	Failed    bool        `json:"failed"`
	Action    Action      `json:"action"`
	Decision  string      `json:"decision"`
	Blocked   int         `json:"blocked"`
	Warned    int         `json:"warned"`
	Hits      []PolicyHit `json:"hits"`
	Reasons   []string    `json:"reasons,omitempty"`
	Warnings  []string    `json:"warnings,omitempty"`
}

func DefaultPolicies() []Policy {
	return []Policy{
		{
			ID:          "crypto-rsa-min-2048",
			Name:        "RSA key length >= 2048",
			Action:      ActionBlock,
			Description: "BLOCK if RSA modulus is below 2048 bits.",
			match: func(f Finding) bool {
				a := strings.ToUpper(f.Algorithm + f.Evidence)
				return strings.Contains(a, "RSA") && f.KeyLength > 0 && f.KeyLength < 2048
			},
		},
		{
			ID:          "crypto-legacy-hash",
			Name:        "No MD5 or SHA-1 for security functions",
			Action:      ActionBlock,
			Description: "BLOCK if MD5 or SHA-1 is used as a cryptographic hash/signature.",
			match: func(f Finding) bool {
				a := strings.ToUpper(f.Algorithm + " " + f.Evidence + " " + f.Location)
				return strings.Contains(a, "MD5") || strings.Contains(a, "SHA-1") || strings.Contains(a, "SHA1")
			},
		},
		{
			ID:          "crypto-tls-min-1.2",
			Name:        "TLS 1.2 minimum",
			Action:      ActionBlock,
			Description: "BLOCK if TLS below 1.2 is negotiated or configured.",
			match: func(f Finding) bool {
				a := strings.ToUpper(f.Algorithm + " " + f.Evidence + " " + f.FindingLabel())
				return strings.Contains(a, "TLS 1.0") || strings.Contains(a, "TLS1.0") || strings.Contains(a, "TLS 1.1")
			},
		},
		{
			ID:          "crypto-3des-rc4",
			Name:        "No 3DES or RC4",
			Action:      ActionBlock,
			Description: "BLOCK broken ciphers 3DES and RC4.",
			match: func(f Finding) bool {
				a := strings.ToUpper(f.Algorithm + " " + f.Evidence)
				return strings.Contains(a, "3DES") || strings.Contains(a, "RC4")
			},
		},
		{
			ID:          "vuln-kev-critical",
			Name:        "CISA KEV + critical CVE",
			Action:      ActionBlock,
			Description: "BLOCK when a finding maps to a CISA Known Exploited Vulnerability.",
			match: func(f Finding) bool {
				return f.KEV && (f.CVE != "")
			},
		},
		{
			ID:          "pqc-warn-auth",
			Name:        "PQC migration warning for auth crypto",
			Action:      ActionWarn,
			Description: "WARN if RSA/ECC is used for authentication without a PQC-ready mark.",
			match: func(f Finding) bool {
				if f.QuantumSafe {
					return false
				}
				a := strings.ToUpper(f.Algorithm)
				auth := strings.Contains(strings.ToLower(f.Usage), "auth") || strings.Contains(strings.ToLower(f.Usage), "signature") || strings.Contains(strings.ToLower(f.Usage), "transport")
				return auth && (strings.Contains(a, "RSA") || strings.Contains(a, "ECDSA") || strings.Contains(a, "ECDH"))
			},
		},
		{
			ID:          "secrets-material",
			Name:        "High-confidence secret material",
			Action:      ActionBlock,
			Description: "BLOCK if AWS keys, GitHub PATs, or private keys are present outside fixtures.",
			match: func(f Finding) bool {
				a := strings.ToLower(f.Algorithm + " " + f.Evidence + " " + f.Component)
				return strings.Contains(a, "aws_access") ||
					strings.Contains(a, "github_token") ||
					strings.Contains(a, "private_key") ||
					strings.Contains(a, "akia") ||
					(strings.Contains(a, "begin ") && strings.Contains(a, "private"))
			},
		},
		{
			ID:          "secrets-generic",
			Name:        "Generic secret pattern",
			Action:      ActionWarn,
			Description: "WARN on generic password/token assignments (placeholders are ignored at detection time).",
			match: func(f Finding) bool {
				a := strings.ToLower(f.Algorithm + " " + f.Usage)
				return strings.Contains(a, "generic_secret") || strings.Contains(a, "credential material")
			},
		},
	}
}

func (f Finding) FindingLabel() string {
	return f.Algorithm + " " + f.Component
}

func Evaluate(findings []Finding, policies []Policy) GateResult {
	if policies == nil {
		policies = DefaultPolicies()
	}
	gate := GateResult{Passed: true, Action: ActionAllow}
	for _, f := range findings {
		if excludedPath(f.Location) {
			continue
		}
		for _, p := range policies {
			if p.match == nil || !p.match(f) {
				continue
			}
			hit := PolicyHit{
				PolicyID:    p.ID,
				PolicyName:  p.Name,
				Action:      p.Action,
				FindingID:   f.ID,
				Title:       firstNonEmpty(f.Algorithm, f.Component, f.CVE, p.Name),
				Location:    f.Location,
				Description: p.Description,
			}
			gate.Hits = append(gate.Hits, hit)
			msg := p.Name + " @ " + firstNonEmpty(f.Location, f.Component, f.ID)
			if p.Action == ActionBlock {
				gate.Blocked++
				gate.Passed = false
				gate.Action = ActionBlock
				gate.Reasons = append(gate.Reasons, msg)
			}
			if p.Action == ActionWarn {
				gate.Warned++
				gate.Warnings = append(gate.Warnings, msg)
				if gate.Action != ActionBlock {
					gate.Action = ActionWarn
				}
			}
		}
	}
	gate.Failed = !gate.Passed
	gate.Decision = string(gate.Action)
	return gate
}

// DefaultPolicy is an alias for DefaultPolicies (CLI / tests).
func DefaultPolicy() []Policy { return DefaultPolicies() }

var defaultExcludes = []string{
	"testdata", "fixtures", "node_modules", "vendor", "web/build",
	".git", "dist", "coverage",
}

func excludedPath(loc string) bool {
	if loc == "" {
		return false
	}
	norm := filepath.ToSlash(strings.ToLower(loc))
	for _, ex := range defaultExcludes {
		if strings.Contains(norm, "/"+ex+"/") || strings.Contains(norm, "/"+ex) || strings.HasPrefix(norm, ex+"/") {
			return true
		}
	}
	return false
}

func DefaultExcludes() []string { return append([]string{}, defaultExcludes...) }
