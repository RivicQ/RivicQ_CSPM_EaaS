package auth_test

import (
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/auth"
)

// TestNewMockUserStore_ErrorWhenNoEnvVar verifies that NewMockUserStore returns an error
// when CRYPTOBOM_BOOTSTRAP_PASSWORD is not set, preventing use of hardcoded credentials.
func TestNewMockUserStore_ErrorWhenNoEnvVar(t *testing.T) {
	// Ensure the env var is unset for this test.
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "")

	_, err := auth.NewMockUserStore()
	if err == nil {
		t.Error("expected error when CRYPTOBOM_BOOTSTRAP_PASSWORD is not set, got nil")
	}
}

// TestNewMockUserStore_SucceedsWithEnvVar verifies that NewMockUserStore succeeds when
// CRYPTOBOM_BOOTSTRAP_PASSWORD is set.
func TestNewMockUserStore_SucceedsWithEnvVar(t *testing.T) {
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "test-secure-password-1234")

	store, err := auth.NewMockUserStore()
	if err != nil {
		t.Fatalf("expected no error when CRYPTOBOM_BOOTSTRAP_PASSWORD is set, got: %v", err)
	}
	if store == nil {
		t.Fatal("expected non-nil store, got nil")
	}
}

// TestNewMockUserStore_AdminUserExists verifies that the admin user can be retrieved
// after providing a valid bootstrap password.
func TestNewMockUserStore_AdminUserExists(t *testing.T) {
	t.Setenv("CRYPTOBOM_BOOTSTRAP_PASSWORD", "test-secure-password-1234")

	store, err := auth.NewMockUserStore()
	if err != nil {
		t.Fatalf("NewMockUserStore returned error: %v", err)
	}

	user, err := store.GetUserByEmail("revansai.ande@rivicq.com")
	if err != nil {
		t.Fatalf("GetUserByEmail returned error: %v", err)
	}
	if user == nil {
		t.Fatal("expected admin user, got nil")
	}
	if user.Role != "admin" {
		t.Errorf("expected role %q, got %q", "admin", user.Role)
	}
}

func TestNewWorkDomainUserStore_UsesDefaultsWhenUnset(t *testing.T) {
	t.Setenv("AUTH_ALLOWED_DOMAINS", "")
	t.Setenv("AUTH_BOOTSTRAP_EMAIL", "")
	t.Setenv("AUTH_BOOTSTRAP_PASSWORD", "")
	t.Setenv("AUTH_BOOTSTRAP_NAME", "")
	t.Setenv("AUTH_BOOTSTRAP_ROLE", "")

	store, err := auth.NewWorkDomainUserStore()
	if err != nil {
		t.Fatalf("expected default work-domain store to initialize, got error: %v", err)
	}

	user, err := store.GetUserByEmail("admin@rivicq.local")
	if err != nil {
		t.Fatalf("expected default admin user, got error: %v", err)
	}
	if user.Name != "OSS Admin" {
		t.Fatalf("expected default name OSS Admin, got %q", user.Name)
	}
	if user.Role != "admin" {
		t.Fatalf("expected default role admin, got %q", user.Role)
	}
}

func TestNewWorkDomainUserStore_UsesAllowedDomainPrefix(t *testing.T) {
	t.Setenv("AUTH_ALLOWED_DOMAINS", "example.com")
	t.Setenv("AUTH_BOOTSTRAP_EMAIL", "")
	t.Setenv("AUTH_BOOTSTRAP_PASSWORD", "")
	t.Setenv("AUTH_BOOTSTRAP_NAME", "")
	t.Setenv("AUTH_BOOTSTRAP_ROLE", "")

	store, err := auth.NewWorkDomainUserStore()
	if err != nil {
		t.Fatalf("expected store with allowed domain prefix to initialize, got error: %v", err)
	}

	user, err := store.GetUserByEmail("admin@example.com")
	if err != nil {
		t.Fatalf("expected default admin at allowed domain, got error: %v", err)
	}
	if user.Email != "admin@example.com" {
		t.Fatalf("expected email admin@example.com, got %q", user.Email)
	}
}
