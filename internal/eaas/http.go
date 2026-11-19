package eaas

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Router builds the EaaS HTTP API. It is independent of the legacy CSPM
// router so the product can be deployed on its own.
func Router(service *Service) *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(securityHeaders())
	router.Use(corsHeaders(service.cfg.AllowedOrigins))

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "RivicQ EaaS", "environment": service.cfg.Environment})
	})

	v1 := router.Group("/api/eaas/v1")
	{
		v1.GET("/plans", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"plans": PlanList(), "currency": "EUR", "billing_integration": "manual_not_configured"})
		})
		v1.GET("/operations", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"operations": Operations, "note": "PQC operations are experimental; classical operations use Go standard-library crypto."})
		})
		v1.POST("/auth/register", registerHandler(service))
		v1.POST("/auth/login", loginHandler(service))

		session := v1.Group("")
		session.Use(sessionAuth(service))
		{
			session.POST("/auth/verify", verifyHandler(service))
			session.POST("/auth/logout", logoutHandler(service))
			session.GET("/auth/me", meHandler(service))
			session.GET("/projects", listProjectsHandler(service))
			session.POST("/projects", createProjectHandler(service))
			session.GET("/projects/:id/keys", listKeysHandler(service))
			session.POST("/projects/:id/keys", createKeyHandler(service))
			session.POST("/projects/:id/crypto-keys", createCryptoKeyHandler(service))
			session.DELETE("/keys/:id", revokeKeyHandler(service))
			session.POST("/keys/:id/rotate", rotateKeyHandler(service))
			session.GET("/usage/summary", usageSummaryHandler(service))
			session.GET("/usage/events", usageEventsHandler(service))
			session.GET("/subscription", subscriptionHandler(service))
			session.POST("/subscription", subscriptionHandler(service))
		}

		operations := v1.Group("/operations")
		operations.Use(apiKeyAuth(service))
		{
			for _, op := range Operations {
				opID := op.ID
				operations.POST("/"+opID, executeHandler(service, opID))
			}
		}
	}

	beta := router.Group("/api/beta/v1")
	{
		beta.POST("/registrations", betaRegistrationHandler(service))
		beta.GET("/registrations", betaListHandler(service))
	}
	return router
}

func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "no-referrer")
		c.Header("Cache-Control", "no-store")
		c.Next()
	}
}

func corsHeaders(allowedOrigins []string) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, origin := range allowedOrigins {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			allowed[trimmed] = true
		}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
			c.Header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func writeError(c *gin.Context, e *apiError) {
	c.JSON(e.Status, gin.H{"error": gin.H{"code": e.Code, "message": e.Message, "request_id": c.GetString("request_id")}})
}

func bindJSON(c *gin.Context, dst any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 2<<20)
	if err := c.ShouldBindJSON(dst); err != nil {
		writeError(c, fail(http.StatusBadRequest, "E_INVALID_REQUEST", "request body is invalid JSON"))
		return false
	}
	return true
}

func sessionAuth(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if len(header) <= 7 || !strings.EqualFold(header[:7], "Bearer ") {
			writeError(c, fail(http.StatusUnauthorized, "E_UNAUTHORIZED", "bearer session token required"))
			c.Abort()
			return
		}
		userID, e := service.SessionUser(strings.TrimSpace(header[7:]))
		if e != nil {
			writeError(c, e)
			c.Abort()
			return
		}
		c.Set("user_id", userID)
		c.Next()
	}
}

func apiKeyAuth(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if len(header) <= 7 || !strings.EqualFold(header[:7], "Bearer ") {
			writeError(c, fail(http.StatusUnauthorized, "E_UNAUTHORIZED", "EaaS API key required in Authorization: Bearer <key>"))
			c.Abort()
			return
		}
		userID, keyID, projectID, e := service.AuthenticateAPIKey(strings.TrimSpace(header[7:]))
		if e != nil {
			writeError(c, e)
			c.Abort()
			return
		}
		c.Set("user_id", userID)
		c.Set("key_id", keyID)
		c.Set("project_id", projectID)
		c.Next()
	}
}

func registerHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest
		if !bindJSON(c, &req) {
			return
		}
		resp, e := service.Register(req)
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusCreated, resp)
	}
}

func loginHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if !bindJSON(c, &req) {
			return
		}
		resp, e := service.Login(req.Email, req.Password)
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusOK, resp)
	}
}

func verifyHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Code string `json:"code"`
		}
		if !bindJSON(c, &req) {
			return
		}
		if e := service.Verify(c.GetString("user_id"), strings.TrimSpace(req.Code)); e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusOK, gin.H{"verified": true})
	}
}

func logoutHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
		if e := service.Logout(token); e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "logged_out"})
	}
}

func meHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		out, e := service.Account(c.GetString("user_id"))
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusOK, out)
	}
}

func createProjectHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ProjectRequest
		if !bindJSON(c, &req) {
			return
		}
		out, e := service.CreateProject(c.GetString("user_id"), req)
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusCreated, out)
	}
}

func listProjectsHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"projects": service.ListProjects(c.GetString("user_id"))})
	}
}

func createCryptoKeyHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Algorithm string `json:"algorithm"`
		}
		if !bindJSON(c, &req) {
			return
		}
		out, e := service.CreateCryptoKey(c.GetString("user_id"), c.Param("id"), req.Algorithm)
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusCreated, out)
	}
}

func listKeysHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		out, e := service.ListAPIKeys(c.GetString("user_id"), c.Param("id"))
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusOK, gin.H{"api_keys": out})
	}
}

func createKeyHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		out, e := service.CreateAPIKey(c.GetString("user_id"), c.Param("id"))
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusCreated, out)
	}
}

func revokeKeyHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if e := service.RevokeAPIKey(c.GetString("user_id"), c.Param("id")); e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "revoked"})
	}
}

func rotateKeyHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		out, e := service.RotateAPIKey(c.GetString("user_id"), c.Param("id"))
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusOK, out)
	}
}

func executeHandler(service *Service, opID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		body := map[string]any{}
		if !bindJSON(c, &body) {
			return
		}
		out, e := service.Execute(
			c.GetString("user_id"), c.GetString("key_id"), c.GetString("project_id"), opID, body,
		)
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusOK, out)
	}
}

func usageSummaryHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, service.UsageSummary(c.GetString("user_id")))
	}
}

func usageEventsHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"events": service.UsageEvents(c.GetString("user_id"), 50)})
	}
}

func subscriptionHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodPost {
			var req struct {
				Plan string `json:"plan"`
			}
			if !bindJSON(c, &req) {
				return
			}
			out, e := service.ChangePlan(c.GetString("user_id"), req.Plan)
			if e != nil {
				writeError(c, e)
				return
			}
			c.JSON(http.StatusOK, out)
			return
		}
		c.JSON(http.StatusOK, service.Subscription(c.GetString("user_id")))
	}
}

func betaRegistrationHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req BetaRegistrationRequest
		if !bindJSON(c, &req) {
			return
		}
		out, e := service.CreateBetaRegistration(req)
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusCreated, out)
	}
}

func betaListHandler(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		out, e := service.ListBetaRegistrations(c.GetHeader("X-Admin-Token"))
		if e != nil {
			writeError(c, e)
			return
		}
		c.JSON(http.StatusOK, gin.H{"registrations": out})
	}
}
