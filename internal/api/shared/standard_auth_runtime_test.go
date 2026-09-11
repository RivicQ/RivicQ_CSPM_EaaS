package shared

import "testing"

func TestResolveJWTSecret(t *testing.T) {
	t.Parallel()

	got, err := resolveJWTSecret("", false)
	if err != nil || got != defaultJWTSecret {
		t.Fatalf("dev empty secret: got %q err %v", got, err)
	}

	got, err = resolveJWTSecret(defaultJWTSecret, false)
	if err != nil || got != defaultJWTSecret {
		t.Fatalf("dev default secret: got %q err %v", got, err)
	}

	if _, err = resolveJWTSecret("", true); err == nil {
		t.Fatal("production empty secret should fail")
	}
	if _, err = resolveJWTSecret(defaultJWTSecret, true); err == nil {
		t.Fatal("production default secret should fail")
	}

	got, err = resolveJWTSecret("unique-production-secret-32chars", true)
	if err != nil || got != "unique-production-secret-32chars" {
		t.Fatalf("production unique secret: got %q err %v", got, err)
	}
}
