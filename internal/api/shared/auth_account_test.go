package shared

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"

	"github.com/rivic-q/cryptobom-saas/internal/auth"
)

func setupAuthRouter(t *testing.T) (*gin.Engine, *auth.AuthService) {
	t.Helper()
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "test-secure-password-1234")
	t.Setenv("DEMO_MODE", "true")
	gin.SetMode(gin.TestMode)
	store, err := auth.NewMockUserStore()
	require.NoError(t, err)
	svc := auth.NewAuthService("test-secret", store)
	r := gin.New()
	g := r.Group("/api/v1")
	SetupAuthRoutes(g, logrus.New(), svc, nil)
	return r, svc
}

func loginAdmin(t *testing.T, r *gin.Engine) string {
	t.Helper()
	body, _ := json.Marshal(map[string]string{
		"email":    "admin@rivicq.com",
		"password": "test-secure-password-1234",
		"edition":  "enterprise",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	token, _ := resp["access_token"].(string)
	require.NotEmpty(t, token)
	return token
}

func TestForgotPasswordDoesNotRevealAccount(t *testing.T) {
	r, _ := setupAuthRouter(t)
	body, _ := json.Marshal(map[string]string{"email": "nobody@example.com"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.NotEmpty(t, resp["message"])
	_, hasToken := resp["reset_token"]
	require.False(t, hasToken, "unknown emails must not return a reset token")
}

func TestForgotAndResetPasswordDemoMode(t *testing.T) {
	r, _ := setupAuthRouter(t)
	body, _ := json.Marshal(map[string]string{"email": "admin@rivicq.com"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	token, _ := resp["reset_token"].(string)
	require.NotEmpty(t, token)
	require.Equal(t, true, resp["demo_mode"])

	resetBody, _ := json.Marshal(map[string]string{"token": token, "password": "ResetPass123!"})
	resetReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/reset-password", bytes.NewReader(resetBody))
	resetReq.Header.Set("Content-Type", "application/json")
	resetW := httptest.NewRecorder()
	r.ServeHTTP(resetW, resetReq)
	require.Equal(t, http.StatusOK, resetW.Code)

	loginBody, _ := json.Marshal(map[string]string{
		"email":    "admin@rivicq.com",
		"password": "ResetPass123!",
		"edition":  "enterprise",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	r.ServeHTTP(loginW, loginReq)
	require.Equal(t, http.StatusOK, loginW.Code)
}

func TestMePatchAndWorkspaceAdmin(t *testing.T) {
	r, _ := setupAuthRouter(t)
	token := loginAdmin(t, r)

	meReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	meReq.Header.Set("Authorization", "Bearer "+token)
	meW := httptest.NewRecorder()
	r.ServeHTTP(meW, meReq)
	require.Equal(t, http.StatusOK, meW.Code)
	var me map[string]any
	require.NoError(t, json.Unmarshal(meW.Body.Bytes(), &me))
	require.Equal(t, "admin@rivicq.com", me["email"])
	require.Equal(t, "admin", me["role"])

	patchBody, _ := json.Marshal(map[string]string{"name": "Workspace Admin"})
	patchReq := httptest.NewRequest(http.MethodPatch, "/api/v1/auth/me", bytes.NewReader(patchBody))
	patchReq.Header.Set("Authorization", "Bearer "+token)
	patchReq.Header.Set("Content-Type", "application/json")
	patchW := httptest.NewRecorder()
	r.ServeHTTP(patchW, patchReq)
	require.Equal(t, http.StatusOK, patchW.Code)

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/workspace/users", nil)
	listReq.Header.Set("Authorization", "Bearer "+token)
	listW := httptest.NewRecorder()
	r.ServeHTTP(listW, listReq)
	require.Equal(t, http.StatusOK, listW.Code)
	var listed struct {
		Users []struct {
			ID    string `json:"id"`
			Email string `json:"email"`
			Role  string `json:"role"`
		} `json:"users"`
	}
	require.NoError(t, json.Unmarshal(listW.Body.Bytes(), &listed))
	require.GreaterOrEqual(t, len(listed.Users), 4)

	var analystID string
	for _, u := range listed.Users {
		if u.Email == "analyst@rivicq.com" {
			analystID = u.ID
		}
	}
	require.NotEmpty(t, analystID)

	roleBody, _ := json.Marshal(map[string]string{"role": "operator"})
	roleReq := httptest.NewRequest(http.MethodPatch, "/api/v1/auth/workspace/users/"+analystID+"/role", bytes.NewReader(roleBody))
	roleReq.Header.Set("Authorization", "Bearer "+token)
	roleReq.Header.Set("Content-Type", "application/json")
	roleW := httptest.NewRecorder()
	r.ServeHTTP(roleW, roleReq)
	require.Equal(t, http.StatusOK, roleW.Code)
}

func TestWorkspaceUsersForbiddenForViewer(t *testing.T) {
	r, _ := setupAuthRouter(t)
	body, _ := json.Marshal(map[string]string{
		"email":    "sales@rivicq.com",
		"password": "test-secure-password-1234",
		"edition":  "community",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	token, _ := resp["access_token"].(string)

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/workspace/users", nil)
	listReq.Header.Set("Authorization", "Bearer "+token)
	listW := httptest.NewRecorder()
	r.ServeHTTP(listW, listReq)
	require.Equal(t, http.StatusForbidden, listW.Code)
}

func TestForgotPasswordHidesTokenOutsideDemoMode(t *testing.T) {
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "test-secure-password-1234")
	t.Setenv("DEMO_MODE", "false")
	gin.SetMode(gin.TestMode)
	store, err := auth.NewMockUserStore()
	require.NoError(t, err)
	svc := auth.NewAuthService("test-secret", store)
	r := gin.New()
	g := r.Group("/api/v1")
	SetupAuthRoutes(g, logrus.New(), svc, nil)

	body, _ := json.Marshal(map[string]string{"email": "admin@rivicq.com"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	_, hasToken := resp["reset_token"]
	require.False(t, hasToken, "reset tokens must not leak when DEMO_MODE is false")
}

func TestRegisterRejectsShortPassword(t *testing.T) {
	r, _ := setupAuthRouter(t)
	body, _ := json.Marshal(map[string]any{
		"email":    "newuser@rivicq.com",
		"password": "short",
		"name":     "New User",
		"edition":  "community",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusBadRequest, w.Code)
}
