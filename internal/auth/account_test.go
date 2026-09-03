package auth_test

import (
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/auth"
)

func TestPasswordResetAndChange(t *testing.T) {
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "test-secure-password-1234")
	store, err := auth.NewMockUserStore()
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	svc := auth.NewAuthService("test-secret", store)

	token, found, err := svc.RequestPasswordReset("admin@rivicq.com")
	if err != nil {
		t.Fatalf("request reset: %v", err)
	}
	if !found || token == "" {
		t.Fatal("expected a reset token for an existing user")
	}

	missing, found, err := svc.RequestPasswordReset("nobody@example.com")
	if err != nil {
		t.Fatalf("missing reset: %v", err)
	}
	if found || missing != "" {
		t.Fatal("must not issue a token for an unknown email")
	}

	if err := svc.ResetPassword("bogus", "NewPass123!"); err == nil {
		t.Fatal("expected invalid token to fail")
	}
	if err := svc.ResetPassword(token, "short"); err == nil {
		t.Fatal("expected short password to fail")
	}
	if err := svc.ResetPassword(token, "NewPass123!"); err != nil {
		t.Fatalf("reset: %v", err)
	}
	if err := svc.ResetPassword(token, "NewPass123!"); err == nil {
		t.Fatal("reset token must be single-use")
	}

	if _, err := svc.Login("admin@rivicq.com", "NewPass123!"); err != nil {
		t.Fatalf("login after reset: %v", err)
	}

	if err := svc.ChangePassword("admin@rivicq.com", "wrong", "AnotherPass123!"); err == nil {
		t.Fatal("expected current-password mismatch")
	}
	if err := svc.ChangePassword("admin@rivicq.com", "NewPass123!", "AnotherPass123!"); err != nil {
		t.Fatalf("change password: %v", err)
	}
	if _, err := svc.Login("admin@rivicq.com", "AnotherPass123!"); err != nil {
		t.Fatalf("login after change: %v", err)
	}
}

func TestListUsersByTenant(t *testing.T) {
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "test-secure-password-1234")
	store, err := auth.NewMockUserStore()
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	users, err := store.ListUsersByTenant("tenant-1")
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(users) < 4 {
		t.Fatalf("expected seeded workspace users, got %d", len(users))
	}
	empty, err := store.ListUsersByTenant("tenant-missing")
	if err != nil {
		t.Fatalf("list missing tenant: %v", err)
	}
	if len(empty) != 0 {
		t.Fatalf("expected no users for unknown tenant, got %d", len(empty))
	}
}

func TestValidatePassword(t *testing.T) {
	if err := auth.ValidatePassword("1234567"); err == nil {
		t.Fatal("expected rejection of short password")
	}
	if err := auth.ValidatePassword("12345678"); err != nil {
		t.Fatalf("8 chars should pass: %v", err)
	}
}
