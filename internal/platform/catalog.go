package platform

// Plan is configuration-driven commercial packaging. Amounts are list prices
// in euro cents. They are not live Stripe products until a PSP adapter is
// configured and the operator publishes them.
type Plan struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Tier           string   `json:"tier"`
	Currency       string   `json:"currency"`
	AmountCents    int      `json:"amount_cents"`
	Interval       string   `json:"interval"`
	Public         bool     `json:"public"`
	Workspaces     int      `json:"workspaces"`
	ScansPerMonth  int      `json:"scans_per_month"`
	CloudAccounts  int      `json:"cloud_accounts"`
	CBOMs          int      `json:"cboms"`
	Users          int      `json:"users"`
	APICallsMonth  int      `json:"api_calls_per_month"`
	RetentionDays  int      `json:"retention_days"`
	Support        string   `json:"support"`
	EnterpriseOnly bool     `json:"enterprise_only"`
	Notes          []string `json:"notes"`
}

// Catalog is the in-process source of truth for list pricing.
func Catalog() []Plan {
	return []Plan{
		{
			ID: "trial", Name: "Trial", Tier: "free", Currency: "EUR", AmountCents: 0,
			Interval: "month", Public: true, Workspaces: 1, ScansPerMonth: 10,
			CloudAccounts: 0, CBOMs: 5, Users: 2, APICallsMonth: 1000, RetentionDays: 14,
			Support: "community",
			Notes:   []string{"GitHub Pages is static. Live scans need the CLI or a running API."},
		},
		{
			ID: "developer", Name: "Developer", Tier: "developer", Currency: "EUR", AmountCents: 0,
			Interval: "month", Public: true, Workspaces: 1, ScansPerMonth: 50,
			CloudAccounts: 0, CBOMs: 25, Users: 3, APICallsMonth: 5000, RetentionDays: 30,
			Support: "community",
			Notes:   []string{"Apache-2.0 Community engine. Not an Enterprise license."},
		},
		{
			ID: "startup", Name: "Startup", Tier: "startup", Currency: "EUR", AmountCents: 49000,
			Interval: "month", Public: true, Workspaces: 3, ScansPerMonth: 250,
			CloudAccounts: 2, CBOMs: 100, Users: 10, APICallsMonth: 25000, RetentionDays: 90,
			Support: "email",
			Notes:   []string{"List price. Checkout is disabled until a payment adapter is configured."},
		},
		{
			ID: "professional", Name: "Professional", Tier: "professional", Currency: "EUR", AmountCents: 149000,
			Interval: "month", Public: true, Workspaces: 10, ScansPerMonth: 1000,
			CloudAccounts: 10, CBOMs: 500, Users: 50, APICallsMonth: 100000, RetentionDays: 180,
			Support: "priority",
			Notes:   []string{"List price. Entitlements activate only after a verified payment webhook."},
		},
		{
			ID: "enterprise", Name: "Enterprise", Tier: "enterprise", Currency: "EUR", AmountCents: 0,
			Interval: "year", Public: true, Workspaces: -1, ScansPerMonth: -1,
			CloudAccounts: -1, CBOMs: -1, Users: -1, APICallsMonth: -1, RetentionDays: 365,
			Support: "named", EnterpriseOnly: true,
			Notes: []string{"Custom contract via sales@rivicq.com. Cloning GitHub does not grant this tier."},
		},
		{
			ID: "custom", Name: "Custom", Tier: "custom", Currency: "EUR", AmountCents: 0,
			Interval: "year", Public: true, Workspaces: -1, ScansPerMonth: -1,
			CloudAccounts: -1, CBOMs: -1, Users: -1, APICallsMonth: -1, RetentionDays: 365,
			Support: "named", EnterpriseOnly: true,
			Notes: []string{"PoC, government, and IBM co-sell packaging. Not a self-serve SKU."},
		},
	}
}

func PlanByID(id string) (Plan, bool) {
	for _, p := range Catalog() {
		if p.ID == id {
			return p, true
		}
	}
	return Plan{}, false
}

// FunnelStages is the CRM stage model. Opportunities are empty until a real
// lead is captured. Do not seed Acme deals.
func FunnelStages() []string {
	return []string{
		"identified",
		"qualified",
		"contacted",
		"response",
		"discovery",
		"demo",
		"technical_validation",
		"security_assessment",
		"poc",
		"poc_success",
		"commercial",
		"procurement",
		"contract",
		"customer",
		"expansion",
	}
}

func PublicContactDesks() []map[string]string {
	return []map[string]string{
		{"label": "General enquiries", "email": "hello@rivicq.com", "purpose": "Main public contact"},
		{"label": "Sales", "email": "sales@rivicq.com", "purpose": "Demos, paid assessments, enterprise pipeline"},
		{"label": "Customer support", "email": "support@rivicq.com", "purpose": "Community and Enterprise technical support"},
		{"label": "Security reporting", "email": "security@rivicq.com", "purpose": "Vulnerability disclosures and incidents"},
		{"label": "Privacy / GDPR", "email": "privacy@rivicq.com", "purpose": "Data-subject requests"},
	}
}
