package platform

import (
	"database/sql"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/middleware"
	"github.com/sirupsen/logrus"
)

// Service is the in-process commercial/ops layer. It is empty until operators
// or public forms write real records. It does not invent IBM or Stripe state.
type Service struct {
	Leads    *LeadStore
	IBM      *IBMWorkspace
	Payments PaymentAdapter
	Logger   *logrus.Logger
	DB       *sql.DB
}

func NewService(logger *logrus.Logger) *Service {
	return &Service{
		Leads:    NewLeadStore(),
		IBM:      NewIBMWorkspace(),
		Payments: NewStubPayments(),
		Logger:   logger,
	}
}

// SetupRoutes registers versioned commercial endpoints on /api/v1.
func SetupRoutes(router *gin.RouterGroup, logger *logrus.Logger, authService *auth.AuthService, db *sql.DB) {
	svc := NewService(logger)
	svc.DB = db
	leadLimit := middleware.RateLimit(8)

	router.GET("/platform/status", svc.status)
	router.GET("/platform/plans", svc.plans)
	router.GET("/platform/funnel", svc.funnel)
	router.GET("/platform/contacts", svc.contacts)
	router.POST("/leads", leadLimit, svc.createLead)
	router.GET("/ibm", svc.ibmSnapshot)
	router.GET("/billing/status", svc.billingStatus)
	router.POST("/billing/checkout", svc.checkout)
	router.POST("/billing/webhooks", svc.paymentWebhook)

	if authService != nil {
		admin := router.Group("")
		admin.Use(authService.JWTAuthMiddleware(nil), auth.RequireRole("admin"))
		admin.GET("/leads", svc.listLeads)
		admin.GET("/opportunities", svc.listOpportunities)
		admin.POST("/integrations/discord/test", svc.discordTest)
	}
}

func (s *Service) status(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"product":             "RivicQ Enterprise Platform",
		"source_of_truth":     "this API process (Postgres when configured; otherwise in-memory)",
		"pages_is_static":     true,
		"leads":               s.Leads.Count(),
		"opportunities":       0,
		"ibm_apis_connected":  false,
		"payments_configured": s.Payments.Configured(),
		"discord_configured":  DiscordConfigured(),
		"stores_card_data":    false,
		"public_desks":        []string{"hello@", "sales@", "support@", "security@", "privacy@"},
	})
}

func (s *Service) plans(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"currency": "EUR",
		"note":     "List prices are configuration. Checkout is not live. Control mappings are not certifications.",
		"plans":    Catalog(),
	})
}

func (s *Service) funnel(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"stages":        FunnelStages(),
		"opportunities": []any{},
		"note":          "Empty until a real opportunity is created. No sample pipeline.",
	})
}

func (s *Service) contacts(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"desks": PublicContactDesks(),
		"note":  "admin@ is private. Finance, fundraising, research, and staff addresses are not listed.",
	})
}

type leadRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Company string `json:"company"`
	Intent  string `json:"intent"`
	Source  string `json:"source"`
}

func (s *Service) createLead(c *gin.Context) {
	var req leadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	lead, err := s.Leads.Create(req.Name, req.Email, req.Company, req.Intent, req.Source)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	s.persistLead(lead)
	NotifyDiscord(s.Logger, "new_lead", map[string]string{
		"company": lead.Company,
		"intent":  lead.Intent,
		"source":  lead.Source,
		"stage":   lead.Stage,
	})
	c.JSON(http.StatusCreated, PublicLead(lead))
}

func (s *Service) persistLead(lead *Lead) {
	if s.DB == nil || lead == nil {
		return
	}
	_, err := s.DB.Exec(
		`INSERT INTO commercial_leads (id, name, email, company, intent, source, stage, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
		lead.ID, lead.Name, lead.Email, lead.Company, lead.Intent, lead.Source, lead.Stage, lead.CreatedAt,
	)
	if err != nil && s.Logger != nil {
		s.Logger.WithError(err).Warn("lead persist skipped — in-memory copy remains")
	}
}

func (s *Service) listLeads(c *gin.Context) {
	leads := s.Leads.List()
	if s.DB != nil {
		rows, err := s.DB.Query(`SELECT id, name, email, company, intent, source, stage, created_at FROM commercial_leads ORDER BY created_at DESC`)
		if err == nil {
			defer func() { _ = rows.Close() }()
			seen := map[string]struct{}{}
			for _, l := range leads {
				seen[l.ID] = struct{}{}
			}
			for rows.Next() {
				var l Lead
				if scanErr := rows.Scan(&l.ID, &l.Name, &l.Email, &l.Company, &l.Intent, &l.Source, &l.Stage, &l.CreatedAt); scanErr != nil {
					continue
				}
				if _, ok := seen[l.ID]; ok {
					continue
				}
				cp := l
				leads = append(leads, &cp)
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"leads": leads,
		"count": len(leads),
	})
}

func (s *Service) listOpportunities(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"opportunities": []any{},
		"stages":        FunnelStages(),
		"note":          "No invented deals. Promote a lead after a real conversation.",
	})
}

func (s *Service) ibmSnapshot(c *gin.Context) {
	c.JSON(http.StatusOK, s.IBM.Snapshot())
}

func (s *Service) billingStatus(c *gin.Context) {
	c.JSON(http.StatusOK, PaymentStatus(s.Payments))
}

func (s *Service) checkout(c *gin.Context) {
	var req struct {
		PlanID string `json:"plan_id"`
		Email  string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	result, err := s.Payments.Checkout(req.PlanID, req.Email)
	if err != nil {
		c.JSON(http.StatusNotImplemented, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (s *Service) paymentWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unable to read body"})
		return
	}
	eventID := strings.TrimSpace(c.GetHeader("X-Webhook-Event-Id"))
	if eventID == "" {
		eventID = strings.TrimSpace(c.Query("event_id"))
	}
	sig := strings.TrimSpace(c.GetHeader("X-Webhook-Signature"))
	result, err := s.Payments.HandleWebhook(eventID, sig, body)
	if err == errDuplicateEvent {
		c.JSON(http.StatusOK, gin.H{"status": "duplicate", "event_id": eventID})
		return
	}
	if err == errPaymentNotLive {
		c.JSON(http.StatusNotImplemented, gin.H{"error": err.Error()})
		return
	}
	if err == errBadSignature {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (s *Service) discordTest(c *gin.Context) {
	if !DiscordConfigured() {
		c.JSON(http.StatusOK, gin.H{
			"configured": false,
			"message":    "DISCORD_WEBHOOK_URL is not set. Discord is not a system of record.",
		})
		return
	}
	NotifyDiscord(s.Logger, "system_alert", map[string]string{"source": "admin_test"})
	c.JSON(http.StatusAccepted, gin.H{"configured": true, "message": "Test notification dispatched without customer PII."})
}
