package auth_test

import (
	"strings"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/auth"
)

// strongPassword satisfies the current policy: 12-72 bytes with at least one
// uppercase, lowercase, digit and symbol.
const (
	strongPassword  = "Rivicq-Str0ng-Pass!"
	rotatedPassword = "Rivicq-Rotated-P4ss!"
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

	if err := svc.ResetPassword("bogus", strongPassword); err == nil {
		t.Fatal("expected invalid token to fail")
	}
	if err := svc.ResetPassword(token, "short"); err == nil {
		t.Fatal("expected short password to fail")
	}
	if err := svc.ResetPassword(token, strongPassword); err != nil {
		t.Fatalf("reset: %v", err)
	}
	if err := svc.ResetPassword(token, strongPassword); err == nil {
		t.Fatal("reset token must be single-use")
	}

	if _, err := svc.Login("admin@rivicq.com", strongPassword); err != nil {
		t.Fatalf("login after reset: %v", err)
	}

	if err := svc.ChangePassword("admin@rivicq.com", "wrong", rotatedPassword); err == nil {
		t.Fatal("expected current-password mismatch")
	}
	if err := svc.ChangePassword("admin@rivicq.com", strongPassword, rotatedPassword); err != nil {
		t.Fatalf("change password: %v", err)
	}
	if _, err := svc.Login("admin@rivicq.com", rotatedPassword); err != nil {
		t.Fatalf("login after change: %v", err)
	}

	// A password containing the user's email must be rejected.
	if err := svc.ChangePassword("admin@rivicq.com", rotatedPassword, "Rivicq-admin-Rivicq1"); err == nil {
		t.Fatal("expected password containing the account email to be rejected")
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
	cases := []struct {
		name string
		pw   string
		ok   bool
	}{
		{"empty", "", false},
		{"too short", "Aa1!aaaaa", false},
		{"minimum length", "Aa1!aaaaaaaa", true},
		{"leading whitespace", " Rivicq-Str0ng-Pass", false},
		{"trailing whitespace", "Rivicq-Str0ng-Pass ", false},
		{"two classes only", "rivicqsecurepass", false},
		{"too long", "Aa1!" + strings.Repeat("a", 70), false},
		{"common password", "demopass123", false},
		{"single character class", strings.Repeat("a", 20), false},
		{"lower+digit+symbol", "rivicq-secure-1", true},
		{"upper+lower+digit", "RivicqSecure123", true},
		{"strong passphrase", "correct-horse-Battery-7", true},
	}
	for _, tc := range cases {
		err := auth.ValidatePassword(tc.pw)
		if tc.ok && err != nil {
			t.Errorf("%s: expected accept, got %v", tc.name, err)
		}
		if !tc.ok && err == nil {
			t.Errorf("%s: expected rejection", tc.name)
		}
	}
}
