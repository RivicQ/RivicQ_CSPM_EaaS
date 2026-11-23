package platform

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"

	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/authn"
)

const readinessTestPassword = "ReadinessPass123!"

func setupReadiness(t *testing.T) (*gin.Engine, string) {
	t.Helper()
	for _, key := range readinessEnvSources {
		t.Setenv(key, "")
	}
	t.Setenv("AUTH_JWT_SECRET", "readiness-test-signing-secret-0123456789")
	t.Setenv("AUTH_BOOTSTRAP_PASSWORD", readinessTestPassword)
	gin.SetMode(gin.TestMode)

	svc, err := authn.NewService(authn.Config{
		Secret:            "readiness-test-signing-secret-0123456789",
		Issuer:            "rivicq-readiness-test",
		Audience:          "rivicq-readiness-test",
		AccessTTL:         15 * time.Minute,
		RefreshTTL:        24 * time.Hour,
		BootstrapEmail:    "admin@rivicq.local",
		BootstrapPassword: readinessTestPassword,
		BootstrapRole:     authn.RoleAdmin,
		DefaultTenantID:   "tenant-1",
	}, authn.NewMemStore())
	require.NoError(t, err)
	require.NoError(t, svc.SeedBootstrap(context.Background()))
	res, err := svc.Login(context.Background(), "admin@rivicq.local", readinessTestPassword, "", "test", "127.0.0.1")
	require.NoError(t, err)
	require.False(t, res.MFARequired)
	require.NotEmpty(t, res.AccessToken)

	r := gin.New()
	g := r.Group(auth.APIPrefix)
	SetupRoutes(g, logrus.New(), svc, nil)
	return r, res.AccessToken
}

func requestReadiness(t *testing.T, router *gin.Engine, token string) (*httptest.ResponseRecorder, readinessResponse) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, auth.APIPrefix+"/platform/readiness", nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	var payload readinessResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	return w, payload
}

func readinessCheckByID(payload readinessResponse, id string) (readinessCheck, bool) {
	for _, group := range payload.Groups {
		for _, check := range group.Checks {
			if check.ID == id {
				return check, true
			}
		}
	}
	return readinessCheck{}, false
}

func TestReadinessRouteRequiresAdmin(t *testing.T) {
	router, token := setupReadiness(t)

	unauth, _ := requestReadiness(t, router, "")
	require.Equal(t, http.StatusUnauthorized, unauth.Code)

	w, payload := requestReadiness(t, router, token)
	require.Equal(t, http.StatusOK, w.Code)
	require.False(t, payload.CheckedAt.IsZero())
	require.False(t, auth.IsPublicRoute(http.MethodGet, auth.APIPrefix+"/platform/readiness"))
}

func TestReadinessGroupsAreConcreteAndHonest(t *testing.T) {
	router, token := setupReadiness(t)
	w, payload := requestReadiness(t, router, token)
	require.Equal(t, http.StatusOK, w.Code)
	require.Contains(t, []readinessStatus{readinessPartial, readinessNotReady}, payload.Overall)
	require.Len(t, payload.Groups, 7)

	wantGroups := []string{"core", "auth", "cloud", "quantum", "hardware", "eaas", "security"}
	for i, group := range payload.Groups {
		require.Equal(t, wantGroups[i], group.ID)
		require.NotEmpty(t, group.Label)
		require.Contains(t, []readinessStatus{readinessReady, readinessPartial, readinessNotReady}, group.Status)
		require.NotEmpty(t, group.Checks)
		for _, check := range group.Checks {
			require.NotEmpty(t, check.ID)
			require.NotEmpty(t, check.Label)
			require.NotEmpty(t, check.Detail)
			require.NotEmpty(t, check.Source)
			require.NotEmpty(t, check.Maturity)
			require.Contains(t, []readinessStatus{
				readinessReady, readinessPartial, readinessNotReady,
				readinessNotSupported, readinessPlanned,
			}, check.Status)
			require.Contains(t, payload.Sources, check.Source)
		}
	}

	cases := map[string]readinessStatus{
		"core.jwt_secret":                  readinessReady,
		"core.database_live":               readinessNotReady,
		"core.enterprise_license":          readinessNotReady,
		"auth.sso_flag":                    readinessNotReady,
		"cloud.aws":                        readinessNotReady,
		"quantum.local_pqc":                readinessReady,
		"quantum.ibm_credentials":          readinessNotReady,
		"hardware.wireless":                readinessNotSupported,
		"hardware.qkd_qrng":                readinessPlanned,
		"eaas.admin_token":                 readinessNotReady,
		"security.csp_caveat":              readinessPartial,
		"security.rls":                     readinessNotSupported,
		"security.postgres_migration_test": readinessNotReady,
	}
	for id, want := range cases {
		check, ok := readinessCheckByID(payload, id)
		require.True(t, ok, "missing check %s", id)
		require.Equal(t, want, check.Status, "check %s", id)
	}
}

func TestReadinessRedactsConfiguredSecretValues(t *testing.T) {
	router, token := setupReadiness(t)
	const secret = "readiness-sentinel-do-not-disclose-7f3a9c21"
	t.Setenv("AUTH_JWT_SECRET", secret)
	t.Setenv("EAAS_ADMIN_TOKEN", secret)
	t.Setenv("AWS_SECRET_ACCESS_KEY", secret)
	t.Setenv("STRIPE_SECRET_KEY", secret)
	t.Setenv("CRYPTOBOM_DB_PASSWORD", secret)
	t.Setenv("IBMQ_API_KEY", secret)

	w, payload := requestReadiness(t, router, token)
	require.Equal(t, http.StatusOK, w.Code)
	require.NotContains(t, w.Body.String(), secret)
	require.Equal(t, "configured", payload.Sources["AUTH_JWT_SECRET"])
	require.Equal(t, "configured", payload.Sources["EAAS_ADMIN_TOKEN"])
	require.Equal(t, "configured", payload.Sources["IBMQ_API_KEY"])

	jwt, ok := readinessCheckByID(payload, "core.jwt_secret")
	require.True(t, ok)
	require.Equal(t, readinessReady, jwt.Status)
	adminToken, ok := readinessCheckByID(payload, "eaas.admin_token")
	require.True(t, ok)
	require.Equal(t, readinessPartial, adminToken.Status)
	ibm, ok := readinessCheckByID(payload, "quantum.ibm_credentials")
	require.True(t, ok)
	require.Equal(t, readinessPartial, ibm.Status)
}
