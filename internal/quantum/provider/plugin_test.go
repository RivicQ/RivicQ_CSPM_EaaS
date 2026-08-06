package provider

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func testManifest() *PluginManifest {
	return &PluginManifest{
		SchemaVersion: PluginSchemaVersion,
		ID:            "org.ibm.quantum",
		Name:          "ibm-quantum",
		Version:       "1.4.0",
		Kind:          "quantum_computing",
		Provider:      "IBM",
		EntryPoint:    "ibm-quantum-factory",
		Capabilities:  []Capability{CapAttest, CapNetworkInfo, CapValidation, CapMigration},
		RBACScopes:    []string{ScopeQuantumRead, ScopeQuantumWrite, ScopeQuantumAdmin},
		Requires:      []string{"oqs-engine"},
		Hooks: LifecycleHooks{
			OnStart:  "Start",
			OnStop:   "Stop",
			OnConfig: "Reconfigure",
		},
	}
}

func TestPluginManifest_SignAndVerify(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	m := testManifest()

	sig, err := m.Sign(priv)
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}
	if len(sig) != ed25519.SignatureSize {
		t.Fatalf("expected %d-byte signature, got %d", ed25519.SignatureSize, len(sig))
	}
	if m.Signature == "" {
		t.Fatal("manifest signature must be set after Sign")
	}
	if err := m.Verify(pub); err != nil {
		t.Fatalf("Verify with correct key: %v", err)
	}

	wrongPub, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate wrong key: %v", err)
	}
	if err := m.Verify(wrongPub); err != ErrInvalidSignature {
		t.Fatalf("expected ErrInvalidSignature with wrong key, got %v", err)
	}
}

func TestPluginManifest_VerifyUnsigned(t *testing.T) {
	pub, _, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	if err := m.Verify(pub); err != ErrUnsigned {
		t.Fatalf("expected ErrUnsigned, got %v", err)
	}
}

func TestPluginManifest_VerifyDetectsTampering(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	if _, err := m.Sign(priv); err != nil {
		t.Fatalf("Sign: %v", err)
	}
	m.Version = "2.0.0" // tamper after signing
	if err := m.Verify(pub); err != ErrInvalidSignature {
		t.Fatalf("expected ErrInvalidSignature after tampering, got %v", err)
	}
}

func TestPluginManifest_VerifyBadSignatureEncoding(t *testing.T) {
	pub, _, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	m.Signature = "not-base64!!"
	if err := m.Verify(pub); err == nil {
		t.Fatal("expected error decoding malformed signature")
	}
}

func TestPluginManifest_SignatureExcludedFromPayload(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	if _, err := m.Sign(priv); err != nil {
		t.Fatalf("Sign: %v", err)
	}
	sig1 := m.Signature

	// Re-signing must produce the same signature because the payload excludes
	// the signature field (canonical payload).
	if _, err := m.Sign(priv); err != nil {
		t.Fatalf("re-Sign: %v", err)
	}
	if m.Signature != sig1 {
		t.Error("re-signing should be deterministic on the canonical payload")
	}
	if err := m.Verify(pub); err != nil {
		t.Fatalf("Verify after re-sign: %v", err)
	}
}

func TestManifestLoader_LoadFileSigned(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	if _, err := m.Sign(priv); err != nil {
		t.Fatalf("Sign: %v", err)
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "ibm-quantum.json")
	writeJSON(t, path, m)

	loader := NewManifestLoader(pub, true)
	got, err := loader.LoadFile(path)
	if err != nil {
		t.Fatalf("LoadFile: %v", err)
	}
	if got.ID != m.ID || got.Version != m.Version {
		t.Errorf("loaded manifest mismatch: %+v", got)
	}
}

func TestManifestLoader_RejectsUnsignedWhenRequired(t *testing.T) {
	_, priv, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	if _, err := m.Sign(priv); err != nil {
		t.Fatalf("Sign: %v", err)
	}
	// Strip the signature to simulate an unsigned artifact.
	m.Signature = ""

	dir := t.TempDir()
	path := filepath.Join(dir, "unsigned.json")
	writeJSON(t, path, m)

	loader := NewManifestLoader(nil, true)
	if _, err := loader.LoadFile(path); !errors.Is(err, ErrUnsigned) {
		t.Fatalf("expected ErrUnsigned, got %v", err)
	}
}

func TestManifestLoader_RejectsInvalidSignature(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	if _, err := m.Sign(priv); err != nil {
		t.Fatalf("Sign: %v", err)
	}
	// Tamper: replace signature with a signature from a different key.
	_, otherPriv, _ := ed25519.GenerateKey(rand.Reader)
	if _, err := m.Sign(otherPriv); err != nil {
		t.Fatalf("Sign: %v", err)
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "forged.json")
	writeJSON(t, path, m)

	loader := NewManifestLoader(pub, false)
	if _, err := loader.LoadFile(path); !errors.Is(err, ErrInvalidSignature) {
		t.Fatalf("expected ErrInvalidSignature, got %v", err)
	}
}

func TestManifestLoader_RejectsWrongSchema(t *testing.T) {
	_, priv, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	m.SchemaVersion = "9.9"
	if _, err := m.Sign(priv); err != nil {
		t.Fatalf("Sign: %v", err)
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "schema.json")
	writeJSON(t, path, m)

	loader := NewManifestLoader(nil, false)
	if _, err := loader.LoadFile(path); !errors.Is(err, ErrSchemaMismatch) {
		t.Fatalf("expected ErrSchemaMismatch, got %v", err)
	}
}

func TestManifestLoader_RejectsMissingRequiredFields(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "bad.json")
	if err := os.WriteFile(path, []byte(`{"schema_version":"1.0","id":"only-id"}`), 0o600); err != nil {
		t.Fatalf("write: %v", err)
	}
	loader := NewManifestLoader(nil, false)
	if _, err := loader.LoadFile(path); err == nil {
		t.Fatal("expected error for missing name/version")
	}
}

func TestManifestLoader_LoadRegistersEntryPoint(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	if _, err := m.Sign(priv); err != nil {
		t.Fatalf("Sign: %v", err)
	}

	dir := t.TempDir()
	writeJSON(t, filepath.Join(dir, "ibm-quantum.json"), m)

	reg := NewRegistry()
	reg.Register("ibm-quantum-factory", stubFactory("ibm-quantum"))
	loader := NewManifestLoader(pub, true)
	loaded, err := loader.Load(context.Background(), dir, reg)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(loaded) != 1 {
		t.Fatalf("expected 1 loaded manifest, got %d", len(loaded))
	}
	if _, ok := reg.Factory("ibm-quantum"); !ok {
		t.Fatal("expected plugin factory registered under manifest Name")
	}

	// Drain the registration event, then expect the plugin.loaded event.
	for {
		select {
		case ev := <-reg.Events():
			if ev.Type == EventPluginLoaded {
				return
			}
		default:
			t.Fatal("expected plugin.loaded event")
		}
	}
}

func TestManifestLoader_LoadSkipsNonJSON(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	m := testManifest()
	if _, err := m.Sign(priv); err != nil {
		t.Fatalf("Sign: %v", err)
	}

	dir := t.TempDir()
	writeJSON(t, filepath.Join(dir, "plugin.json"), m)
	if err := os.WriteFile(filepath.Join(dir, "notes.txt"), []byte("ignore me"), 0o600); err != nil {
		t.Fatalf("write: %v", err)
	}

	loader := NewManifestLoader(pub, true)
	loaded, err := loader.Load(context.Background(), dir, nil)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(loaded) != 1 {
		t.Fatalf("expected only JSON manifests loaded, got %d", len(loaded))
	}
}

func TestManifestLoader_LoadMissingDir(t *testing.T) {
	loader := NewManifestLoader(nil, false)
	if _, err := loader.Load(context.Background(), filepath.Join(t.TempDir(), "nope"), nil); err == nil {
		t.Fatal("expected error for missing plugin directory")
	}
}

func TestManifestLoader_LoadFileInvalidJSON(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "invalid.json")
	if err := os.WriteFile(path, []byte("{not json"), 0o600); err != nil {
		t.Fatalf("write: %v", err)
	}
	loader := NewManifestLoader(nil, false)
	if _, err := loader.LoadFile(path); err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestManifestLoader_MissingFile(t *testing.T) {
	loader := NewManifestLoader(nil, false)
	if _, err := loader.LoadFile(filepath.Join(t.TempDir(), "missing.json")); err == nil {
		t.Fatal("expected error for missing file")
	}
}

func TestManifestLoader_DevModeAllowsUnsigned(t *testing.T) {
	m := testManifest()
	dir := t.TempDir()
	writeJSON(t, filepath.Join(dir, "dev.json"), m)
	loader := NewManifestLoader(nil, false)
	if _, err := loader.LoadFile(filepath.Join(dir, "dev.json")); err != nil {
		t.Fatalf("dev mode should load unsigned manifests: %v", err)
	}
}

func writeJSON(t *testing.T, path string, v any) {
	t.Helper()
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		t.Fatalf("marshal %s: %v", path, err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
