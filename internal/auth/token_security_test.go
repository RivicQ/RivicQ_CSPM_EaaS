package auth_test

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
)

const tokenTestSecret = "token-manager-test-secret-at-least-32-bytes"

func testUser() *auth.User {
	return &auth.User{
		ID:           "user-1",
		TenantID:     "tenant-1",
		Email:        "operator@example.com",
		Name:         "Operator",
		Role:         "operator",
		Organisation: "Example Org",
	}
}

func TestAccessTokenCarriesExpectedClaims(t *testing.T) {
	tm := auth.NewTokenManager(tokenTestSecret)
	token, err := tm.GenerateToken(testUser(), "enterprise")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	claims, err := tm.ValidateToken(token)
	if err != nil {
		t.Fatalf("validate: %v", err)
	}
	if claims.TokenUse != auth.TokenUseAccess {
		t.Errorf("token_use = %q", claims.TokenUse)
	}
	if claims.TenantID != "tenant-1" || claims.UserID != "user-1" {
		t.Errorf("identity claims wrong: %+v", claims)
	}
	if claims.Edition != "enterprise" {
		t.Errorf("edition = %q", claims.Edition)
	}
	if len(claims.Permissions) == 0 {
		t.Error("expected role-derived permissions in the token")
	}
	if claims.Issuer != auth.DefaultTokenIssuer {
		t.Errorf("issuer = %q", claims.Issuer)
	}
}

// TestRefreshTokenCannotBeUsedAsAccessToken is the token-confusion guard: a
// stolen refresh token must not authenticate ordinary API calls.
func TestRefreshTokenCannotBeUsedAsAccessToken(t *testing.T) {
	tm := auth.NewTokenManager(tokenTestSecret)
	refresh, err := tm.GenerateRefreshToken(testUser())
	if err != nil {
		t.Fatalf("generate refresh: %v", err)
	}
	if _, err := tm.ValidateToken(refresh); err == nil {
		t.Fatal("refresh token must be rejected by ValidateToken")
	}
	if _, err := tm.ValidateRefreshToken(refresh); err != nil {
		t.Fatalf("refresh token must validate as a refresh token: %v", err)
	}
}

func TestAccessTokenCannotBeUsedAsRefreshToken(t *testing.T) {
	tm := auth.NewTokenManager(tokenTestSecret)
	access, err := tm.GenerateToken(testUser(), "oss")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if _, _, err := tm.RefreshAccessToken(access); err == nil {
		t.Fatal("access token must not be accepted at the refresh endpoint")
	}
}

// TestRefreshTokenCarriesNoAuthority guards against privilege being baked into
// a long-lived token.
func TestRefreshTokenCarriesNoAuthority(t *testing.T) {
	tm := auth.NewTokenManager(tokenTestSecret)
	refresh, err := tm.GenerateRefreshToken(testUser())
	if err != nil {
		t.Fatalf("generate refresh: %v", err)
	}
	claims, err := tm.ValidateRefreshToken(refresh)
	if err != nil {
		t.Fatalf("validate: %v", err)
	}
	if len(claims.Permissions) != 0 {
		t.Errorf("refresh token must not carry permissions, got %v", claims.Permissions)
	}
	if claims.Edition != "" {
		t.Errorf("refresh token must not carry an edition, got %q", claims.Edition)
	}
}

func TestRefreshTokenIsSingleUse(t *testing.T) {
	tm := auth.NewTokenManager(tokenTestSecret)
	refresh, err := tm.GenerateRefreshToken(testUser())
	if err != nil {
		t.Fatalf("generate refresh: %v", err)
	}
	if _, _, err := tm.RefreshAccessToken(refresh); err != nil {
		t.Fatalf("first refresh: %v", err)
	}
	if _, _, err := tm.RefreshAccessToken(refresh); err == nil {
		t.Fatal("replaying a refresh token must fail")
	}
}

func TestRefreshSessionKeepsEditionAndRejectsRoleChange(t *testing.T) {
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", strongPassword)
	store, err := auth.NewMockUserStore()
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	svc := auth.NewAuthService(tokenTestSecret, store)

	login, err := svc.Login("operator@rivicq.com", strongPassword)
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	access, nextRefresh, err := svc.RefreshSession(login.RefreshToken)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	claims, err := svc.TokenManager().ValidateToken(access)
	if err != nil {
		t.Fatalf("validate refreshed access: %v", err)
	}
	if claims.Edition != "professional" {
		t.Errorf("edition after refresh = %q, want professional", claims.Edition)
	}
	if claims.TenantID != "tenant-1" {
		t.Errorf("tenant after refresh = %q", claims.TenantID)
	}

	// Rotating again with the previous token must fail: it was consumed.
	if _, _, err := svc.RefreshSession(login.RefreshToken); err == nil {
		t.Fatal("consumed refresh token must not be reusable")
	}
	_ = nextRefresh
}

func TestRefreshSessionRejectsDemotedUser(t *testing.T) {
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", strongPassword)
	store, err := auth.NewMockUserStore()
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	svc := auth.NewAuthService(tokenTestSecret, store)

	login, err := svc.Login("analyst@rivicq.com", strongPassword)
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	user, err := store.GetUserByEmail("analyst@rivicq.com")
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	user.Role = "viewer"
	if err := store.UpdateUser(user); err != nil {
		t.Fatalf("update user: %v", err)
	}

	if _, _, err := svc.RefreshSession(login.RefreshToken); err == nil {
		t.Fatal("expected refresh to fail after the account role changed")
	}
}

func TestTokenRejectsForeignIssuerAndAudience(t *testing.T) {
	tm := auth.NewTokenManager(tokenTestSecret)

	// Correctly signed by the same key but claiming a different issuer.
	claims := jwt.MapClaims{
		"user_id":   "user-1",
		"tenant_id": "tenant-1",
		"email":     "operator@example.com",
		"role":      "operator",
		"token_use": auth.TokenUseAccess,
		"iss":       "somebody-else",
		"aud":       auth.DefaultTokenAudience,
		"exp":       time.Now().Add(time.Hour).Unix(),
	}
	token := mustSign(t, claims)
	if _, err := tm.ValidateToken(token); err == nil {
		t.Error("expected foreign issuer to be rejected")
	}

	claims["iss"] = auth.DefaultTokenIssuer
	claims["aud"] = "some-other-api"
	token = mustSign(t, claims)
	if _, err := tm.ValidateToken(token); err == nil {
		t.Error("expected foreign audience to be rejected")
	}
}

func TestTokenRejectsExpiredToken(t *testing.T) {
	tm := auth.NewTokenManager(tokenTestSecret)
	claims := jwt.MapClaims{
		"user_id":   "user-1",
		"tenant_id": "tenant-1",
		"email":     "operator@example.com",
		"role":      "operator",
		"token_use": auth.TokenUseAccess,
		"iss":       auth.DefaultTokenIssuer,
		"aud":       auth.DefaultTokenAudience,
		"exp":       time.Now().Add(-time.Minute).Unix(),
	}
	if _, err := tm.ValidateToken(mustSign(t, claims)); err == nil {
		t.Error("expected expired token to be rejected")
	}
}

func TestTokenRejectsAlgNoneAndForeignSigningKey(t *testing.T) {
	tm := auth.NewTokenManager(tokenTestSecret)

	// alg=none with an empty signature.
	claims := jwt.MapClaims{
		"user_id":   "user-1",
		"tenant_id": "tenant-1",
		"token_use": auth.TokenUseAccess,
		"iss":       auth.DefaultTokenIssuer,
		"aud":       auth.DefaultTokenAudience,
		"exp":       time.Now().Add(time.Hour).Unix(),
	}
	unsigned, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).
		SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("build alg=none token: %v", err)
	}
	if _, err := tm.ValidateToken(unsigned); err == nil {
		t.Error("alg=none token must be rejected")
	}

	// Correct claims signed with a different key.
	foreign, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).
		SignedString([]byte("a-different-signing-key-entirely"))
	if err != nil {
		t.Fatalf("sign with foreign key: %v", err)
	}
	if _, err := tm.ValidateToken(foreign); err == nil {
		t.Error("token signed with a foreign key must be rejected")
	}
}

func mustSign(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	s, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).
		SignedString([]byte(tokenTestSecret))
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return s
}

func TestPermissionMatrixIsMonotonicWithRole(t *testing.T) {
	viewer := auth.PermissionsForRole(auth.RoleViewer)
	analyst := auth.PermissionsForRole(auth.RoleAnalyst)
	operator := auth.PermissionsForRole(auth.RoleOperator)
	admin := auth.PermissionsForRole(auth.RoleAdmin)

	assertSuperset(t, "analyst", analyst, viewer)
	assertSuperset(t, "operator", operator, analyst)
	assertSuperset(t, "admin", admin, operator)

	if len(admin) == 0 {
		t.Fatal("admin must hold administrative permissions")
	}
	if permissionSetContains(viewer, string(auth.PermAssetsWrite)) {
		t.Error("viewer must not hold asset write permission")
	}
	if !permissionSetContains(admin, string(auth.PermPQCAdminister)) {
		t.Error("admin must hold pqc:administer")
	}
	if permissionSetContains(auth.PermissionsForRole("nonsense-role"), string(auth.PermAssetsWrite)) {
		t.Error("an unknown role must not inherit permissions")
	}
	// An unknown role must collapse to the viewer set, not to nothing.
	if len(auth.PermissionsForRole("nonsense-role")) != len(viewer) {
		t.Error("unknown role must fall back to the viewer permission set")
	}
	// Destructive capabilities must not be reachable by read-only roles.
	for _, forbidden := range []auth.Permission{
		auth.PermCBOMDelete, auth.PermUsersManage, auth.PermSSOManage,
		auth.PermAPIKeysWrite, auth.PermWebhooksWrite, auth.PermCloudManage,
	} {
		if permissionSetContains(viewer, string(forbidden)) {
			t.Errorf("viewer must not hold %s", forbidden)
		}
		if permissionSetContains(analyst, string(forbidden)) {
			t.Errorf("analyst must not hold %s", forbidden)
		}
	}
}

func assertSuperset(t *testing.T, name string, superset, subset []string) {
	t.Helper()
	have := make(map[string]bool, len(superset))
	for _, p := range superset {
		have[p] = true
	}
	for _, p := range subset {
		if !have[p] {
			t.Errorf("%s must include %s", name, p)
		}
	}
}

func permissionSetContains(set []string, want string) bool {
	for _, p := range set {
		if p == want {
			return true
		}
	}
	return false
}

func TestPermissionsForRoleIsSortedAndDeduplicated(t *testing.T) {
	for _, role := range []string{auth.RoleViewer, auth.RoleAnalyst, auth.RoleOperator, auth.RoleAdmin} {
		perms := auth.PermissionsForRole(role)
		if len(perms) == 0 {
			t.Fatalf("%s has no permissions", role)
		}
		seen := map[string]bool{}
		for i, p := range perms {
			if seen[p] {
				t.Errorf("%s lists %s twice", role, p)
			}
			seen[p] = true
			if i > 0 && perms[i-1] > p {
				t.Errorf("%s permissions are not sorted: %q before %q", role, perms[i-1], p)
			}
		}
	}
}

func TestPasswordPolicyRejectsPublishedDemoPassword(t *testing.T) {
	// The published demo password must be refused as a bootstrap credential,
	// regardless of how the length and character-class rules evaluate it.
	t.Setenv("AUTH_BOOTSTRAP_PASSWORD", "DemoPass123!")
	if _, err := auth.NewWorkDomainUserStore(); err == nil {
		t.Fatal("store must refuse the published demo password")
	}
}

func TestTokenBlacklistRevocation(t *testing.T) {
	tm := auth.NewTokenManager(tokenTestSecret)
	token, err := tm.GenerateToken(testUser(), "oss")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if _, err := tm.ValidateToken(token); err != nil {
		t.Fatalf("token should be valid before revocation: %v", err)
	}
	if err := tm.RevokeToken(token); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if _, err := tm.ValidateToken(token); err == nil {
		t.Fatal("revoked token must be rejected")
	}
}

// TestEditionFollowsRoleAfterLogin pins the edition a role receives, including
// through a refresh, so a rotated token cannot silently drop edition claims.
func TestEditionFollowsRoleAfterLogin(t *testing.T) {
	cases := map[string]string{
		auth.RoleAdmin:    "enterprise",
		auth.RoleOperator: "professional",
		auth.RoleAnalyst:  "professional",
	}
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", strongPassword)
	store, err := auth.NewMockUserStore()
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	svc := auth.NewAuthService(tokenTestSecret, store)

	for role, want := range cases {
		email := role + "@rivicq.com"
		user, err := store.GetUserByEmail(email)
		if err != nil {
			t.Fatalf("get %s: %v", role, err)
		}
		login, err := svc.Login(email, strongPassword)
		if err != nil {
			t.Fatalf("login %s: %v", role, err)
		}
		claims, err := svc.TokenManager().ValidateToken(login.AccessToken)
		if err != nil {
			t.Fatalf("validate %s: %v", role, err)
		}
		if claims.Edition != want {
			t.Errorf("role %s edition = %q, want %q", role, claims.Edition, want)
		}

		refreshed, _, err := svc.RefreshSession(login.RefreshToken)
		if err != nil {
			t.Fatalf("refresh %s: %v", role, err)
		}
		after, err := svc.TokenManager().ValidateToken(refreshed)
		if err != nil {
			t.Fatalf("validate refreshed %s: %v", role, err)
		}
		if after.Edition != want {
			t.Errorf("role %s edition after refresh = %q, want %q", role, after.Edition, want)
		}
		if after.Role != user.Role {
			t.Errorf("role %s mismatch after refresh: %q", role, after.Role)
		}
	}
}

func TestNormalizeRoleAliases(t *testing.T) {
	cases := map[string]string{
		"":          auth.RoleViewer,
		"ADMIN":     auth.RoleAdmin,
		"Owner":     auth.RoleAdmin,
		"Analyst":   auth.RoleAnalyst,
		"Developer": auth.RoleOperator,
		"nonsense":  auth.RoleViewer,
	}
	for input, want := range cases {
		if got := auth.NormalizeRole(input); got != want {
			t.Errorf("NormalizeRole(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestValidatePasswordRejectsIdentityDerivatives(t *testing.T) {
	if err := auth.ValidatePasswordFor("Rivicq-Example-Org-1", "user@example.com", "Example Org"); err == nil {
		t.Error("expected organisation-derived password to be rejected")
	}
	if err := auth.ValidatePasswordFor("Operator-User-9", "operator@example.com", "Example Org"); err == nil {
		t.Error("expected email-derived password to be rejected")
	}
	if err := auth.ValidatePasswordFor("Zq7-Trailing-Matrix-4", "operator@example.com", "Example Org"); err != nil {
		t.Errorf("expected unrelated strong password to pass: %v", err)
	}
}

func TestPasswordPolicyMatchesDocumentedRules(t *testing.T) {
	// bcrypt ignores bytes past 72, so anything longer must be refused outright
	// rather than silently truncated.
	if err := auth.ValidatePassword("Aa1!" + strings.Repeat("b", 80)); err == nil {
		t.Error("expected >72 bytes to be rejected")
	}
	if err := auth.ValidatePassword("Aa1!aaaaaaaa"); err != nil {
		t.Errorf("expected 12 bytes to be accepted: %v", err)
	}
	if err := auth.ValidatePassword("Aa1!" + strings.Repeat("b", 68)); err != nil {
		t.Errorf("expected exactly 72 bytes to be accepted: %v", err)
	}
}
