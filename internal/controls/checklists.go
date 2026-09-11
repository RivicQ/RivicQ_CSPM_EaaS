// Package controls is the operator mapping catalog (OWASP and quantum).
// Items are awareness mappings, not certifications or scored audits.
package controls

// Item is one control in a published checklist.
type Item struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	RivicQ string `json:"rivicq"`
}

// Checklist is a named published list with an honesty note.
type Checklist struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Source    string `json:"source"`
	SourceURL string `json:"source_url"`
	Honesty   string `json:"honesty"`
	Items     []Item `json:"items"`
}

// Catalog returns the checklists RivicQ maps into CBOM / governance views.
func Catalog() []Checklist {
	return []Checklist{
		{
			ID:        "owasp-api-2023",
			Name:      "OWASP API Security Top 10",
			Source:    "OWASP API Security Top 10:2023",
			SourceURL: "https://owasp.org/API-Security/editions/2023/en/0x11-t10/",
			Honesty:   "Published OWASP awareness list. RivicQ maps TLS/HTTPS scan evidence and inventory — it does not certify APIs.",
			Items: []Item{
				{ID: "API1:2023", Title: "Broken Object Level Authorization", RivicQ: "Enterprise identity inventory (IBOM). Community flags unauthenticated TLS surfaces."},
				{ID: "API2:2023", Title: "Broken Authentication", RivicQ: "JWT RBAC, MFA, demo-token refuse in production."},
				{ID: "API3:2023", Title: "Broken Object Property Level Authorization", RivicQ: "API responses omit emails/secrets on public lead create."},
				{ID: "API4:2023", Title: "Unrestricted Resource Consumption", RivicQ: "Public /leads rate limit. Scan jobs are tenant-scoped."},
				{ID: "API5:2023", Title: "Broken Function Level Authorization", RivicQ: "RequireRole on admin, CRM, API keys, webhooks."},
				{ID: "API6:2023", Title: "Unrestricted Access to Sensitive Business Flows", RivicQ: "Checkout stub — no live charge without a PSP adapter."},
				{ID: "API7:2023", Title: "Server-Side Request Forgery", RivicQ: "Scans target operator-supplied hosts; GitHub uses Contents API only."},
				{ID: "API8:2023", Title: "Security Misconfiguration", RivicQ: "Website scan: HSTS, CSP, protocol, certificate hygiene."},
				{ID: "API9:2023", Title: "Improper Inventory Management", RivicQ: "CBOM / SBOM / declared k8s and hardware inventory."},
				{ID: "API10:2023", Title: "Unsafe Consumption of APIs", RivicQ: "Partner connectors stay disconnected without customer credentials."},
			},
		},
		{
			ID:        "owasp-top10-2021",
			Name:      "OWASP Top 10 (application publication)",
			Source:    "OWASP Top 10:2021",
			SourceURL: "https://owasp.org/Top10/",
			Honesty:   "Release/publication mapping for software we ship. Not a pentest report.",
			Items: []Item{
				{ID: "A01:2021", Title: "Broken Access Control", RivicQ: "Tenant isolation on Community scans; admin routes RequireRole."},
				{ID: "A02:2021", Title: "Cryptographic Failures", RivicQ: "CBOM algorithm inventory and PQC replacement map."},
				{ID: "A03:2021", Title: "Injection", RivicQ: "Parameterized SQL; Gitleaks never stores secret values."},
				{ID: "A04:2021", Title: "Insecure Design", RivicQ: "Edition flags are server-side; UI switcher is not a license."},
				{ID: "A05:2021", Title: "Security Misconfiguration", RivicQ: "Production refuses default JWT secret and bootstrap password."},
				{ID: "A06:2021", Title: "Vulnerable and Outdated Components", RivicQ: "Optional Syft / Trivy / Grype / OSV when installed on PATH."},
				{ID: "A07:2021", Title: "Identification and Authentication Failures", RivicQ: "Password + JWT; demo session is Community operator only."},
				{ID: "A08:2021", Title: "Software and Data Integrity Failures", RivicQ: "CycloneDX CBOM/SBOM export; Cosign is PATH-probed, not assumed."},
				{ID: "A09:2021", Title: "Security Logging and Monitoring Failures", RivicQ: "Scan jobs and findings queue; Pages has no API telemetry."},
				{ID: "A10:2021", Title: "Server-Side Request Forgery", RivicQ: "No operator-controlled URL fetch into the control plane except scan targets."},
			},
		},
		{
			ID:        "owasp-wstg-network",
			Name:      "OWASP WSTG network hygiene",
			Source:    "OWASP Web Security Testing Guide — network & configuration chapters",
			SourceURL: "https://owasp.org/www-project-web-security-testing-guide/",
			Honesty:   "WSTG is a testing guide. RivicQ records TLS/SSH/HTTP discovery — it is not a packet capture or eBPF sensor.",
			Items: []Item{
				{ID: "WSTG-INFO", Title: "Information gathering", RivicQ: "Website / host / IP target classes and certificate inventory."},
				{ID: "WSTG-CONF", Title: "Configuration management", RivicQ: "HTTPS header and cookie findings on website scans."},
				{ID: "WSTG-IDNT", Title: "Identity management", RivicQ: "IBOM is Enterprise declared directory — Community still scans secrets into CBOM."},
				{ID: "WSTG-ATHN", Title: "Authentication testing", RivicQ: "Login, MFA, demo token disabled in production runtime."},
				{ID: "WSTG-ATHZ", Title: "Authorization testing", RivicQ: "RBAC viewer < analyst < operator < admin."},
				{ID: "WSTG-CRYP", Title: "Cryptography", RivicQ: "TLS protocol, cipher, key length, PQC taxonomy (local, not IBM Quantum hardware)."},
				{ID: "WSTG-APIT", Title: "API testing", RivicQ: "See OWASP API Top 10 mapping."},
			},
		},
		{
			ID:        "rivicq-quantum",
			Name:      "RivicQ quantum cryptography checklist",
			Source:    "NIST FIPS 203/204/205 · NIST IR 8547-aligned operator list",
			SourceURL: "https://csrc.nist.gov/projects/post-quantum-cryptography",
			Honesty:   "Not an OWASP publication. Local Shor/Grover/PQC taxonomy. Qiskit scores are classical profile math — not IBM Quantum jobs.",
			Items: []Item{
				{ID: "Q-INV", Title: "Cryptographic inventory", RivicQ: "CBOM of algorithms, certs, libraries from scans and optional PATH tools."},
				{ID: "Q-SHOR", Title: "Shor-class public-key exposure", RivicQ: "RSA/ECDSA/ECDH flagged for ML-KEM / ML-DSA replacement."},
				{ID: "Q-GROV", Title: "Grover-class symmetric length", RivicQ: "AES-128 vs AES-256 notes; not an automatic vulnerability on AES-256."},
				{ID: "Q-HYB", Title: "Hybrid cut-over", RivicQ: "PQC migration hub recommends hybrid classical + PQC. Engine does not rotate keys."},
				{ID: "Q-HNDL", Title: "Harvest-now-decrypt-later", RivicQ: "HNDL exposure field on scan intelligence when a scan exists."},
				{ID: "Q-HSM", Title: "Hardware modules", RivicQ: "Declared HSM/TPM/QSIC inventory. QSIC is a research ASIC, not shipped silicon."},
				{ID: "Q-FW", Title: "Firmware / semiconductor components", RivicQ: "Declared CycloneDX / hash inventory. No binary reverse-engineering or die inspection."},
			},
		},
	}
}
