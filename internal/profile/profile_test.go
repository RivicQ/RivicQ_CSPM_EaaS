package profile

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultRegistryHasBuiltins(t *testing.T) {
	r := Default()
	for _, id := range []string{"embedded/generic", "embedded/infineon", "identity/generic", "identity/gd"} {
		if _, ok := r.Get(id); !ok {
			t.Fatalf("missing builtin profile %q", id)
		}
	}
}

func TestResolveExplicitID(t *testing.T) {
	r := Default()
	p := Resolve(r, "embedded/infineon", DomainEmbedded)
	if p.ID != "embedded/infineon" {
		t.Fatalf("got %q", p.ID)
	}
}

func TestResolveFallsBackToDomainGeneric(t *testing.T) {
	r := Default()
	p := Resolve(r, "does/not-exist", DomainIdentity)
	if p.ID != "identity/generic" {
		t.Fatalf("got %q want identity/generic", p.ID)
	}
}

func TestResolveEmptyDomainFallsBackToEmbedded(t *testing.T) {
	r := Default()
	p := Resolve(r, "", Domain("unknown-domain"))
	if p.ID != "embedded/generic" {
		t.Fatalf("got %q want embedded/generic", p.ID)
	}
}

func TestBuiltinProfilesAreVendorNeutralData(t *testing.T) {
	for _, p := range Builtin() {
		if p.ID == "" || p.Domain == "" {
			t.Fatalf("incomplete profile: %+v", p)
		}
		if p.Provenance == "" {
			t.Fatalf("profile %q missing provenance", p.ID)
		}
	}
}

func TestLoadFileMergesProfile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "custom.json")
	body := `{"id":"custom/partner","domain":"embedded","name":"Custom","libraries":[{"library":"X","markers":["x_marker"]}]}`
	if err := os.WriteFile(path, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	r := Default()
	if err := r.LoadFile(path); err != nil {
		t.Fatal(err)
	}
	p, ok := r.Get("custom/partner")
	if !ok {
		t.Fatalf("profile not loaded")
	}
	if p.Provenance == "" {
		t.Fatalf("provenance not set")
	}
}

func TestLoadFileRejectsBadJSON(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "bad.json")
	if err := os.WriteFile(path, []byte("{not json"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := Default().LoadFile(path); err == nil {
		t.Fatalf("expected error for malformed profile")
	}
}

func TestRegisterRequiresID(t *testing.T) {
	r := NewRegistry()
	if err := r.Register(Profile{Domain: DomainEmbedded}); err == nil {
		t.Fatalf("expected error registering profile without ID")
	}
}
