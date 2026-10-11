package authn

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// Handlers exposes the lifecycle over HTTP. It keeps the JSON contract used by
// the web client (/auth/*), so the frontend does not need route changes.
type Handlers struct {
	svc    *Service
	logger *logrus.Logger
}

// NewHandlers builds the HTTP surface for a service.
func NewHandlers(svc *Service, logger *logrus.Logger) *Handlers {
	if logger == nil {
		logger = logrus.New()
	}
	return &Handlers{svc: svc, logger: logger}
}

// Service returns the underlying lifecycle service.
func (h *Handlers) Service() *Service { return h.svc }

// RegisterRoutes mounts every lifecycle route under the given group.
func (h *Handlers) RegisterRoutes(auth *gin.RouterGroup) {
	auth.POST("/login", h.Login)
	auth.POST("/register", h.Register)
	auth.POST("/refresh", h.Refresh)
	auth.POST("/logout", h.svc.AuthenticateMiddleware(), h.Logout)
	auth.GET("/me", h.svc.AuthenticateMiddleware(), h.Me)
	auth.PATCH("/me", h.svc.AuthenticateMiddleware(), h.PatchMe)
	auth.POST("/forgot-password", h.ForgotPassword)
	auth.POST("/reset-password", h.ResetPassword)
	auth.POST("/change-password", h.svc.AuthenticateMiddleware(), h.ChangePassword)
	auth.GET("/editions", h.Editions)
	auth.GET("/providers", h.Providers)

	auth.POST("/mfa/verify", h.MFAVerify)
	auth.POST("/mfa/setup", h.svc.AuthenticateMiddleware(), h.MFASetup)
	auth.POST("/mfa/confirm", h.svc.AuthenticateMiddleware(), h.MFAConfirm)
	auth.POST("/mfa/disable", h.svc.AuthenticateMiddleware(), h.MFADisable)

	auth.GET("/verify-email", h.VerifyEmail)
	auth.POST("/verify-email", h.VerifyEmail)

	auth.GET("/sessions", h.svc.AuthenticateMiddleware(), h.ListSessions)
	auth.DELETE("/sessions/:id", h.svc.AuthenticateMiddleware(), h.RevokeSession)

	auth.GET("/demo", h.svc.DemoOnly(), h.Demo)

	ws := auth.Group("/workspace")
	ws.Use(h.svc.AuthenticateMiddleware(), h.svc.RequireRole(RoleAdmin))
	{
		ws.GET("/users", h.ListWorkspaceUsers)
		ws.PATCH("/users/:id/role", h.PatchWorkspaceRole)
	}
}

type userResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role,omitempty"`
}

func toUserResponse(u *User) userResponse {
	if u == nil {
		return userResponse{}
	}
	return userResponse{ID: u.ID, Name: u.Name, Email: u.Email, Role: string(u.Role)}
}

// Login handles POST /auth/login.
func (h *Handlers) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Edition  string `json:"edition"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	res, err := h.svc.Login(c.Request.Context(), req.Email, req.Password, req.Edition, c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		h.logger.WithError(err).WithField("email", req.Email).Warn("authentication failed")
		c.JSON(statusForError(err), gin.H{"error": messageForError(err)})
		return
	}
	if res.MFARequired {
		c.JSON(http.StatusOK, gin.H{
			"mfa_required": true,
			"mfa_session":  res.MFASession,
			"message":      "MFA verification required",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"access_token":  res.AccessToken,
		"refresh_token": res.RefreshToken,
		"expires_in":    res.ExpiresIn,
		"user":          toUserResponse(res.User),
		"edition":       string(editionForRole(req.Edition, res.User.Role)),
	})
}

// Register handles POST /auth/register.
func (h *Handlers) Register(c *gin.Context) {
	var req struct {
		Name         string `json:"name"`
		FirstName    string `json:"first_name"`
		LastName     string `json:"last_name"`
		Email        string `json:"email"`
		Password     string `json:"password"`
		Edition      string `json:"edition"`
		Organisation string `json:"organisation"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.TrimSpace(req.FirstName + " " + req.LastName)
	}
	user, verifyToken, err := h.svc.Register(c.Request.Context(), name, req.Email, req.Password, req.Organisation)
	if err != nil {
		h.logger.WithError(err).WithField("email", req.Email).Warn("registration failed")
		c.JSON(statusForError(err), gin.H{"error": messageForError(err)})
		return
	}
	if !user.EmailVerified {
		resp := gin.H{
			"message": "Account created. Verify your email to sign in.",
			"user":    toUserResponse(user),
		}
		if h.svc.DemoEnabled() && verifyToken != "" {
			resp["demo_mode"] = true
			resp["verification_token"] = verifyToken
		}
		c.JSON(http.StatusCreated, resp)
		return
	}
	// Auto-verified (verification not required): sign the user in immediately.
	res, err := h.svc.Login(c.Request.Context(), req.Email, req.Password, req.Edition, c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusCreated, gin.H{
			"message": "Registration completed. Please log in with your new account.",
			"user":    toUserResponse(user),
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"access_token":  res.AccessToken,
		"refresh_token": res.RefreshToken,
		"expires_in":    res.ExpiresIn,
		"user":          toUserResponse(res.User),
		"edition":       string(editionForRole(req.Edition, user.Role)),
	})
}

// VerifyEmail handles GET/POST /auth/verify-email?token=... or {token}.
func (h *Handlers) VerifyEmail(c *gin.Context) {
	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		var req struct {
			Token string `json:"token"`
		}
		_ = c.ShouldBindJSON(&req)
		token = strings.TrimSpace(req.Token)
	}
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token is required"})
		return
	}
	if err := h.svc.VerifyEmail(c.Request.Context(), token); err != nil {
		c.JSON(statusForError(err), gin.H{"error": messageForError(err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Email verified. You can sign in."})
}

// Refresh handles POST /auth/refresh.
func (h *Handlers) Refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "refresh_token required"})
		return
	}
	pair, err := h.svc.Refresh(c.Request.Context(), req.RefreshToken, c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		h.logger.WithError(err).Warn("refresh token failed")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or revoked refresh token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
		"expires_in":    pair.ExpiresIn,
	})
}

// Logout handles POST /auth/logout.
func (h *Handlers) Logout(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.RefreshToken != "" {
		if err := h.svc.Logout(c.Request.Context(), req.RefreshToken); err != nil {
			h.logger.WithError(err).Warn("logout revocation failed")
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// Me handles GET /auth/me.
func (h *Handlers) Me(c *gin.Context) {
	u, err := h.svc.LookupByID(c.Request.Context(), CurrentUserID(c))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":           u.ID,
		"user_id":      u.ID,
		"tenant_id":    u.TenantID,
		"email":        u.Email,
		"name":         u.Name,
		"organisation": u.Organisation,
		"role":         string(u.Role),
		"edition":      c.GetString(ctxEdition),
		"mfa_enabled":  u.MFAEnabled,
		"permissions":  c.GetStringSlice(ctxPermissions),
	})
}

// PatchMe handles PATCH /auth/me.
func (h *Handlers) PatchMe(c *gin.Context) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}
	u, err := h.svc.LookupByID(c.Request.Context(), CurrentUserID(c))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}
	u.Name = name
	if err := h.svc.UpdateUser(c.Request.Context(), u); err != nil {
		h.logger.WithError(err).Error("profile update failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toUserResponse(u)})
}

// ForgotPassword handles POST /auth/forgot-password.
func (h *Handlers) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Email) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}
	token, found, err := h.svc.ForgotPassword(c.Request.Context(), req.Email)
	if err != nil {
		h.logger.WithError(err).Warn("password reset issue failed")
	}
	resp := gin.H{
		"message": "If an account exists for that email, a reset link was issued. This product does not send mailbox mail; use the reset page with a token from your operator, or demo mode.",
	}
	if h.svc.DemoEnabled() && found && token != "" {
		resp["demo_mode"] = true
		resp["reset_token"] = token
	}
	c.JSON(http.StatusOK, resp)
}

// ResetPassword handles POST /auth/reset-password.
func (h *Handlers) ResetPassword(c *gin.Context) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token and password are required"})
		return
	}
	if err := h.svc.ResetPassword(c.Request.Context(), req.Token, req.NewPassword); err != nil {
		h.logger.WithError(err).Warn("password reset failed")
		c.JSON(statusForError(err), gin.H{"error": messageForError(err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password updated. You can sign in with the new password."})
}

// ChangePassword handles POST /auth/change-password.
func (h *Handlers) ChangePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "current_password and new_password are required"})
		return
	}
	if err := h.svc.ChangePassword(c.Request.Context(), CurrentUserID(c), req.CurrentPassword, req.NewPassword); err != nil {
		h.logger.WithError(err).Warn("change password failed")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password changed"})
}

// MFAVerify handles POST /auth/mfa/verify.
func (h *Handlers) MFAVerify(c *gin.Context) {
	var req struct {
		MFASession string `json:"mfa_session" binding:"required"`
		MFACode    string `json:"mfa_code" binding:"required"`
		Edition    string `json:"edition"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	pair, err := h.svc.VerifyMFA(c.Request.Context(), req.MFASession, req.MFACode, c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		c.JSON(statusForError(err), gin.H{"error": messageForError(err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
		"expires_in":    pair.ExpiresIn,
		"mfa_verified":  true,
		"user":          toUserResponse(pair.User),
	})
}

// MFASetup handles POST /auth/mfa/setup.
func (h *Handlers) MFASetup(c *gin.Context) {
	secret, uri, err := h.svc.SetupMFA(c.Request.Context(), CurrentUserID(c))
	if err != nil {
		h.logger.WithError(err).Error("MFA setup failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate MFA secret"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"secret":           secret,
		"provisioning_uri": uri,
		"issuer":           "RivicQ CryptoBOM",
		"account":          CurrentEmail(c),
	})
}

// MFAConfirm handles POST /auth/mfa/confirm.
func (h *Handlers) MFAConfirm(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	if err := h.svc.ConfirmMFA(c.Request.Context(), CurrentUserID(c), req.Code); err != nil {
		c.JSON(statusForError(err), gin.H{"error": messageForError(err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mfa_enabled": true, "message": "MFA enabled successfully"})
}

// MFADisable handles POST /auth/mfa/disable.
func (h *Handlers) MFADisable(c *gin.Context) {
	var req struct {
		Password string `json:"password"`
		Code     string `json:"code"`
	}
	_ = c.ShouldBindJSON(&req)
	password := req.Password
	if password == "" {
		password = req.Code
	}
	if err := h.svc.DisableMFA(c.Request.Context(), CurrentUserID(c), password); err != nil {
		c.JSON(statusForError(err), gin.H{"error": messageForError(err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mfa_enabled": false, "message": "MFA disabled successfully"})
}

// ListSessions handles GET /auth/sessions.
func (h *Handlers) ListSessions(c *gin.Context) {
	sessions, err := h.svc.ListSessions(c.Request.Context(), CurrentUserID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list sessions"})
		return
	}
	type sessionView struct {
		ID        string `json:"id"`
		UserAgent string `json:"user_agent,omitempty"`
		IP        string `json:"ip,omitempty"`
		CreatedAt string `json:"created_at"`
		ExpiresAt string `json:"expires_at"`
		Active    bool   `json:"active"`
	}
	out := make([]sessionView, 0, len(sessions))
	now := h.svc.now().UTC()
	for _, s := range sessions {
		out = append(out, sessionView{
			ID:        s.ID,
			UserAgent: s.UserAgent,
			IP:        s.IP,
			CreatedAt: s.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
			ExpiresAt: s.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
			Active:    s.Active(now),
		})
	}
	c.JSON(http.StatusOK, gin.H{"sessions": out})
}

// RevokeSession handles DELETE /auth/sessions/:id.
func (h *Handlers) RevokeSession(c *gin.Context) {
	if err := h.svc.RevokeSession(c.Request.Context(), CurrentUserID(c), c.Param("id")); err != nil {
		c.JSON(statusForError(err), gin.H{"error": messageForError(err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Session revoked"})
}

// Demo handles GET /auth/demo. Guarded by DemoOnly middleware.
func (h *Handlers) Demo(c *gin.Context) {
	pair, err := h.svc.DemoLogin(c.Request.Context(), c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		c.JSON(statusForError(err), gin.H{"error": messageForError(err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
		"expires_in":    pair.ExpiresIn,
		"user":          toUserResponse(pair.User),
		"edition":       string(EditionOSS),
		"demo_mode":     true,
	})
}

// Editions handles GET /auth/editions.
func (h *Handlers) Editions(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"editions":     []string{"community", "professional", "enterprise"},
		"work_domains": h.svc.cfg.AllowedDomains,
	})
}

// Providers handles GET /auth/providers.
func (h *Handlers) Providers(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"password": true,
		"demo":     h.svc.DemoEnabled(),
		"mfa":      true,
	})
}

// ListWorkspaceUsers handles GET /auth/workspace/users.
func (h *Handlers) ListWorkspaceUsers(c *gin.Context) {
	users, err := h.svc.ListUsersByTenant(c.Request.Context(), CurrentTenantID(c))
	if err != nil {
		h.logger.WithError(err).Error("list workspace users failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list users"})
		return
	}
	out := make([]userResponse, 0, len(users))
	for _, u := range users {
		out = append(out, toUserResponse(u))
	}
	c.JSON(http.StatusOK, gin.H{"users": out, "tenant_id": CurrentTenantID(c)})
}

// PatchWorkspaceRole handles PATCH /auth/workspace/users/:id/role.
func (h *Handlers) PatchWorkspaceRole(c *gin.Context) {
	var req struct {
		Role string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role is required"})
		return
	}
	raw := strings.ToLower(strings.TrimSpace(req.Role))
	switch raw {
	case "viewer", "analyst", "operator", "admin":
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "role must be viewer, analyst, operator, or admin"})
		return
	}
	target, err := h.svc.LookupByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if target.TenantID != CurrentTenantID(c) {
		c.JSON(http.StatusForbidden, gin.H{"error": "User is not in this workspace"})
		return
	}
	role := normalizeRole(raw)
	if target.ID == CurrentUserID(c) && role != RoleAdmin {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot remove your own admin role"})
		return
	}
	target.Role = role
	if err := h.svc.UpdateUser(c.Request.Context(), target); err != nil {
		h.logger.WithError(err).Error("role update failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toUserResponse(target)})
}

func statusForError(err error) int {
	switch {
	case errors.Is(err, ErrInvalidCredentials),
		errors.Is(err, ErrInvalidToken),
		errors.Is(err, ErrTokenUsed),
		errors.Is(err, ErrSessionExpired),
		errors.Is(err, ErrSessionRevoked),
		errors.Is(err, ErrReuseDetected),
		errors.Is(err, ErrEmailNotVerified),
		errors.Is(err, ErrAccountDisabled),
		errors.Is(err, ErrInvalidMFASession),
		errors.Is(err, ErrInvalidMFACode):
		return http.StatusUnauthorized
	case errors.Is(err, ErrEmailTaken):
		return http.StatusConflict
	case errors.Is(err, ErrDemoDisabled):
		return http.StatusForbidden
	default:
		return http.StatusBadRequest
	}
}

func messageForError(err error) string {
	switch {
	case errors.Is(err, ErrInvalidCredentials):
		return "Invalid credentials"
	case errors.Is(err, ErrEmailTaken):
		return "An account with this email already exists. Please log in instead."
	case errors.Is(err, ErrEmailNotVerified):
		return "Please verify your email before signing in."
	case errors.Is(err, ErrAccountDisabled):
		return "This account is disabled."
	case errors.Is(err, ErrInvalidMFASession):
		return "Invalid or expired MFA session"
	case errors.Is(err, ErrInvalidMFACode):
		return "Invalid MFA code"
	case errors.Is(err, ErrInvalidToken), errors.Is(err, ErrTokenUsed):
		return "Invalid or expired token"
	case errors.Is(err, ErrDemoDisabled):
		return "Demo access is disabled."
	default:
		return err.Error()
	}
}
