package eaas

import "sort"

// Plan describes the transparent, enforced entitlements of a subscription.
// Values are defined here and reused by both quota enforcement and the
// developer portal, so the displayed limits are the limits actually applied.
type Plan struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Target             string  `json:"target"`
	MonthlyOperations  int     `json:"monthly_operations"`
	RequestsPerMinute  int     `json:"requests_per_minute"`
	Projects           int     `json:"projects"`
	KeysPerProject     int     `json:"keys_per_project"`
	ProductionEligible bool    `json:"production_eligible"`
	AdvancedAnalytics  bool    `json:"advanced_analytics"`
	AuditLog           bool    `json:"audit_log"`
	SSO                bool    `json:"sso"`
	HSM                bool    `json:"hsm"`
	Support            string  `json:"support"`
	PriceMonthlyEUR    int     `json:"price_monthly_eur"`
	OverageEURPer1K    float64 `json:"overage_eur_per_1k_operations"`
	PQCExperimental    bool    `json:"pqc_experimental"`
	BillingIntegration string  `json:"billing_integration"`
}

// Plans is the single source of truth for freemium entitlements.
var Plans = map[string]Plan{
	"free": {
		ID: "free", Name: "Free / Developer", Target: "Developers, students, researchers",
		MonthlyOperations: 10000, RequestsPerMinute: 60, Projects: 1, KeysPerProject: 2,
		ProductionEligible: false, AdvancedAnalytics: false, AuditLog: false,
		Support: "Community", PriceMonthlyEUR: 0, OverageEURPer1K: 0,
		PQCExperimental: true, BillingIntegration: "not_required",
	},
	"startup": {
		ID: "startup", Name: "Startup", Target: "Early-stage companies",
		MonthlyOperations: 250000, RequestsPerMinute: 600, Projects: 5, KeysPerProject: 10,
		ProductionEligible: true, AdvancedAnalytics: false, AuditLog: false,
		Support: "Email", PriceMonthlyEUR: 490, OverageEURPer1K: 0.40,
		PQCExperimental: true, BillingIntegration: "manual_not_configured",
	},
	"professional": {
		ID: "professional", Name: "Professional", Target: "Growing engineering teams",
		MonthlyOperations: 1000000, RequestsPerMinute: 3000, Projects: 25, KeysPerProject: 50,
		ProductionEligible: true, AdvancedAnalytics: true, AuditLog: true,
		Support: "Business hours", PriceMonthlyEUR: 1490, OverageEURPer1K: 0.25,
		PQCExperimental: true, BillingIntegration: "manual_not_configured",
	},
	"enterprise": {
		ID: "enterprise", Name: "Enterprise", Target: "Regulated organisations",
		MonthlyOperations: -1, RequestsPerMinute: -1, Projects: -1, KeysPerProject: -1,
		ProductionEligible: true, AdvancedAnalytics: true, AuditLog: true, SSO: true, HSM: true,
		Support: "Dedicated", PriceMonthlyEUR: 0, OverageEURPer1K: 0,
		PQCExperimental: true, BillingIntegration: "enterprise_contract",
	},
}

func PlanList() []Plan {
	out := make([]Plan, 0, len(Plans))
	for _, p := range Plans {
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool {
		order := map[string]int{"free": 0, "startup": 1, "professional": 2, "enterprise": 3}
		return order[out[i].ID] < order[out[j].ID]
	})
	return out
}

func getPlan(id string) (Plan, bool) {
	p, ok := Plans[id]
	return p, ok
}

func planAllowsProduction(p Plan) bool    { return p.ProductionEligible }
func planAllowsUnlimited(p Plan) bool     { return p.MonthlyOperations < 0 }
func planCountLimit(limit, used int) bool { return limit < 0 || used < limit }
