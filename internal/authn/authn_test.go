package authn

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/pquerna/otp/totp"
)

const testSecret = "test-signing-secret-please-change-0123456789"

func newTestService(t *testing.T, mutate func(*Config)) (*Service, *memStore, *time.Time) {
	t.Helper()
	cfg := Config{
		Secret:              testSecret,
		Issuer:              "rivicq-test",
		Audience:            "rivicq-test",
		AccessTTL:           15 * time.Minute,
		RefreshTTL:          24 * time.Hour,
		ResetTTL:            30 * time.Minute,
		VerifyTTL:           24 * time.Hour,
		MFASessionTTL:       10 * time.Minute,
		AllowRegistration:   true,
		RequireVerification: false,
		BootstrapEmail:      "admin@rivicq.local",
		BootstrapPassword:   "BootstrapPass123!",
		BootstrapName:       "Admin",
		BootstrapRole:       RoleAdmin,
		DefaultTenantID:     "tenant-1",
	}
	if mutate != nil {
		mutate(&cfg)
	}
	svc, err := NewService(cfg, NewMemStore())
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}
	now := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
	svc.now = func() time.Time { return now }
	return svc, svc.store.(*memStore), &now
}

func TestNewServiceRefusesShortSecret(t *testing.T) {
	if _, err := NewService(Config{Secret: "too-short"}, NewMemStore()); err == nil {
		t.Fatal("expected error for short secret")
	}
}

func TestPasswordPolicy(t *testing.T) {
	cases := []struct {
		name    string
		pw      string
		wantErr bool
	}{
		{"valid", "Tr0ub4dor&3xZ!", false},
		{"too short", "Aa1!short", true},
		{"too common", "password123", true},
		{"two classes only", "abcdefghijkl", true},
		{"contains email local", "alice-Str0ng!Pass", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidatePasswordFor(tc.pw, "alice@example.com", "RivicQ")
			if tc.wantErr && err == nil {
				t.Fatalf("expected error for %q", tc.pw)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error for %q: %v", tc.pw, err)
			}
		})
	}
}

func TestHashAndCheckPassword(t *testing.T) {
	h, err := HashPassword("Tr0ub4dor&3xZ!")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword("Tr0ub4dor&3xZ!", h) {
		t.Fatal("valid password should verify")
	}
	if CheckPassword("wrong", h) {
		t.Fatal("wrong password must not verify")
	}
}

func TestRegisterLoginRefreshLogout(t *testing.T) {
	svc, _, _ := newTestService(t, nil)
	ctx := context.Background()

	user, verifyToken, err := svc.Register(ctx, "Alice", "alice@example.com", "Tr0ub4dor&3xZ!", "Acme")
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if !user.EmailVerified {
		t.Fatal("with verification off, registration should auto-verify")
	}
	if verifyToken != "" {
		t.Fatal("no verification token expected when verification is off")
	}

	res, err := svc.Login(ctx, "alice@example.com", "Tr0ub4dor&3xZ!", "", "ua", "1.2.3.4")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	if res.MFARequired || res.AccessToken == "" || res.RefreshToken == "" {
		t.Fatalf("expected a token pair, got %+v", res)
	}

	claims, err := svc.Authenticate(res.AccessToken)
	if err != nil {
		t.Fatalf("Authenticate: %v", err)
	}
	if claims.Email != "alice@example.com" || claims.Role != string(RoleViewer) {
		t.Fatalf("unexpected claims: %+v", claims)
	}
	if len(claims.Permissions) == 0 {
		t.Fatal("expected permissions in claims")
	}

	refreshed, err := svc.Refresh(ctx, res.RefreshToken, "ua", "1.2.3.4")
	if err != nil {
		t.Fatalf("Refresh: %v", err)
	}
	if refreshed.RefreshToken == res.RefreshToken {
		t.Fatal("refresh token must rotate")
	}

	// Reusing the retired token must fail and revoke the whole family.
	if _, err := svc.Refresh(ctx, res.RefreshToken, "ua", "1.2.3.4"); !errors.Is(err, ErrReuseDetected) {
		t.Fatalf("expected ErrReuseDetected, got %v", err)
	}
	// The successor is revoked by the reuse response.
	if _, err := svc.Refresh(ctx, refreshed.RefreshToken, "ua", "1.2.3.4"); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("expected successor to be invalidated, got %v", err)
	}
}

func TestLoginRejectsBadPasswordAndUnknownUser(t *testing.T) {
	svc, _, _ := newTestService(t, nil)
	ctx := context.Background()
	if _, _, err := svc.Register(ctx, "Bob", "bob@example.com", "Tr0ub4dor&3xZ!", ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Login(ctx, "bob@example.com", "nope", "", "", ""); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials, got %v", err)
	}
	if _, err := svc.Login(ctx, "missing@example.com", "nope", "", "", ""); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials for unknown user, got %v", err)
	}
}

func TestDisabledAccountCannotLogin(t *testing.T) {
	svc, store, _ := newTestService(t, nil)
	ctx := context.Background()
	if _, _, err := svc.Register(ctx, "Bob", "bob@example.com", "Tr0ub4dor&3xZ!", ""); err != nil {
		t.Fatal(err)
	}
	u, _ := store.GetUserByEmail(ctx, "bob@example.com")
	u.Disabled = true
	if err := store.UpdateUser(ctx, u); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Login(ctx, "bob@example.com", "Tr0ub4dor&3xZ!", "", "", ""); !errors.Is(err, ErrAccountDisabled) {
		t.Fatalf("expected ErrAccountDisabled, got %v", err)
	}
}

func TestVerificationRequiredFlow(t *testing.T) {
	svc, _, _ := newTestService(t, func(c *Config) { c.RequireVerification = true })
	ctx := context.Background()

	user, token, err := svc.Register(ctx, "Cara", "cara@example.com", "Tr0ub4dor&3xZ!", "")
	if err != nil {
		t.Fatal(err)
	}
	if user.EmailVerified || token == "" {
		t.Fatal("expected an unverified user and a verification token")
	}
	if _, err := svc.Login(ctx, "cara@example.com", "Tr0ub4dor&3xZ!", "", "", ""); !errors.Is(err, ErrEmailNotVerified) {
		t.Fatalf("expected ErrEmailNotVerified, got %v", err)
	}
	if err := svc.VerifyEmail(ctx, token); err != nil {
		t.Fatalf("VerifyEmail: %v", err)
	}
	if _, err := svc.Login(ctx, "cara@example.com", "Tr0ub4dor&3xZ!", "", "", ""); err != nil {
		t.Fatalf("login after verification: %v", err)
	}
	// A consumed verification token is single-use.
	if err := svc.VerifyEmail(ctx, token); !errors.Is(err, ErrTokenUsed) {
		t.Fatalf("expected ErrTokenUsed, got %v", err)
	}
}

func TestPasswordResetRevokesSessions(t *testing.T) {
	svc, _, _ := newTestService(t, nil)
	ctx := context.Background()
	if _, _, err := svc.Register(ctx, "Dana", "dana@example.com", "Tr0ub4dor&3xZ!", ""); err != nil {
		t.Fatal(err)
	}
	res, err := svc.Login(ctx, "dana@example.com", "Tr0ub4dor&3xZ!", "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	token, found, err := svc.ForgotPassword(ctx, "dana@example.com")
	if err != nil || !found {
		t.Fatalf("ForgotPassword: found=%v err=%v", found, err)
	}
	if err := svc.ResetPassword(ctx, token, "NewStrong&Pass9!"); err != nil {
		t.Fatalf("ResetPassword: %v", err)
	}
	if _, err := svc.Refresh(ctx, res.RefreshToken, "", ""); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("session should be revoked after reset, got %v", err)
	}
	if _, err := svc.Login(ctx, "dana@example.com", "NewStrong&Pass9!", "", "", ""); err != nil {
		t.Fatalf("login with new password: %v", err)
	}
	// Unknown accounts do not leak existence.
	if _, found, _ := svc.ForgotPassword(ctx, "nobody@example.com"); found {
		t.Fatal("unknown account must not report found")
	}
}

func TestMFAFlow(t *testing.T) {
	svc, _, _ := newTestService(t, nil)
	ctx := context.Background()
	user, _, err := svc.Register(ctx, "Eve", "eve@example.com", "Tr0ub4dor&3xZ!", "")
	if err != nil {
		t.Fatal(err)
	}
	secret, uri, err := svc.SetupMFA(ctx, user.ID)
	if err != nil {
		t.Fatalf("SetupMFA: %v", err)
	}
	if secret == "" || !strings.HasPrefix(uri, "otpauth://") {
		t.Fatalf("unexpected provisioning data: %q %q", secret, uri)
	}
	code, err := totp.GenerateCode(secret, time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ConfirmMFA(ctx, user.ID, code); err != nil {
		t.Fatalf("ConfirmMFA: %v", err)
	}

	res, err := svc.Login(ctx, "eve@example.com", "Tr0ub4dor&3xZ!", "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	if !res.MFARequired || res.MFASession == "" {
		t.Fatalf("expected MFA challenge, got %+v", res)
	}
	if _, err := svc.VerifyMFA(ctx, res.MFASession, "000000", "", ""); !errors.Is(err, ErrInvalidMFACode) {
		t.Fatalf("expected ErrInvalidMFACode, got %v", err)
	}
	code, _ = totp.GenerateCode(secret, time.Now())
	pair, err := svc.VerifyMFA(ctx, res.MFASession, code, "", "")
	if err != nil {
		t.Fatalf("VerifyMFA: %v", err)
	}
	if pair.AccessToken == "" {
		t.Fatal("expected an access token after MFA")
	}
}

func TestDemoLoginGated(t *testing.T) {
	svc, _, _ := newTestService(t, nil)
	if _, err := svc.DemoLogin(context.Background(), "", ""); !errors.Is(err, ErrDemoDisabled) {
		t.Fatalf("expected ErrDemoDisabled, got %v", err)
	}

	demoSvc, _, _ := newTestService(t, func(c *Config) { c.DemoMode = true })
	if err := demoSvc.SeedBootstrap(context.Background()); err != nil {
		t.Fatalf("SeedBootstrap: %v", err)
	}
	pair, err := demoSvc.DemoLogin(context.Background(), "", "")
	if err != nil {
		t.Fatalf("DemoLogin: %v", err)
	}
	if pair.User == nil || pair.User.Role != RoleOperator {
		t.Fatalf("expected operator demo identity, got %+v", pair.User)
	}
}

func TestSeedBootstrapIdempotent(t *testing.T) {
	svc, store, _ := newTestService(t, func(c *Config) { c.DemoMode = true })
	ctx := context.Background()
	if err := svc.SeedBootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	first, err := store.GetUserByEmail(ctx, "admin@rivicq.com")
	if err != nil {
		t.Fatalf("expected admin@rivicq.com to be seeded: %v", err)
	}
	if err := svc.SeedBootstrap(ctx); err != nil {
		t.Fatal(err)
	}
	users, _ := store.ListUsersByTenant(ctx, "tenant-1")
	count := 0
	for _, u := range users {
		if u.Email == "admin@rivicq.com" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("expected exactly one admin@rivicq.com, got %d", count)
	}
	// The bootstrap password must not have been reset on the second run.
	if !CheckPassword("BootstrapPass123!", first.PasswordHash) {
		t.Fatal("bootstrap password should be unchanged")
	}
}

func TestAccessTokenRejectsWrongSecret(t *testing.T) {
	svc, _, _ := newTestService(t, nil)
	ctx := context.Background()
	if _, _, err := svc.Register(ctx, "Fay", "fay@example.com", "Tr0ub4dor&3xZ!", ""); err != nil {
		t.Fatal(err)
	}
	res, err := svc.Login(ctx, "fay@example.com", "Tr0ub4dor&3xZ!", "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	other, err := NewService(Config{Secret: strings.Repeat("x", 40), Issuer: "rivicq-test", Audience: "rivicq-test"}, NewMemStore())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := other.Authenticate(res.AccessToken); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("token signed by another secret must be rejected, got %v", err)
	}
	if _, err := svc.Authenticate("not.a.jwt"); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("garbage token must be rejected, got %v", err)
	}
}

func TestAccessTokenExpiry(t *testing.T) {
	svc, _, now := newTestService(t, func(c *Config) { c.AccessTTL = time.Minute })
	ctx := context.Background()
	if _, _, err := svc.Register(ctx, "Gil", "gil@example.com", "Tr0ub4dor&3xZ!", ""); err != nil {
		t.Fatal(err)
	}
	res, err := svc.Login(ctx, "gil@example.com", "Tr0ub4dor&3xZ!", "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	*now = now.Add(2 * time.Minute)
	if _, err := svc.Authenticate(res.AccessToken); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("expired token must be rejected, got %v", err)
	}
}

func TestChangePassword(t *testing.T) {
	svc, _, _ := newTestService(t, nil)
	ctx := context.Background()
	user, _, err := svc.Register(ctx, "Hana", "hana@example.com", "Tr0ub4dor&3xZ!", "")
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.ChangePassword(ctx, user.ID, "wrong", "Another&Strong1!"); err == nil {
		t.Fatal("wrong current password must be rejected")
	}
	if err := svc.ChangePassword(ctx, user.ID, "Tr0ub4dor&3xZ!", "Another&Strong1!"); err != nil {
		t.Fatalf("ChangePassword: %v", err)
	}
	if _, err := svc.Login(ctx, "hana@example.com", "Another&Strong1!", "", "", ""); err != nil {
		t.Fatalf("login with changed password: %v", err)
	}
}

func TestSessionRevocation(t *testing.T) {
	svc, _, _ := newTestService(t, nil)
	ctx := context.Background()
	if _, _, err := svc.Register(ctx, "Ivy", "ivy@example.com", "Tr0ub4dor&3xZ!", ""); err != nil {
		t.Fatal(err)
	}
	res, err := svc.Login(ctx, "ivy@example.com", "Tr0ub4dor&3xZ!", "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	sessions, err := svc.ListSessions(ctx, res.User.ID)
	if err != nil || len(sessions) != 1 {
		t.Fatalf("expected one session, got %v (%v)", len(sessions), err)
	}
	if err := svc.RevokeSession(ctx, res.User.ID, sessions[0].ID); err != nil {
		t.Fatalf("RevokeSession: %v", err)
	}
	if _, err := svc.Refresh(ctx, res.RefreshToken, "", ""); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("revoked session must not refresh, got %v", err)
	}
}
