package provider

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// PluginSchemaVersion is the current plugin manifest schema version.
const PluginSchemaVersion = "1.0"

// RBAC scope constants for the Plugin SDK. Providers and plugins must declare
// the scopes they need; the platform's RBAC layer enforces them per tenant.
const (
	ScopeQuantumRead   = "quantum:read"
	ScopeQuantumWrite  = "quantum:write"
	ScopeQuantumAdmin  = "quantum:admin"
	ScopePluginInstall = "plugin:install"
	ScopePluginManage  = "plugin:manage"
)

// LifecycleHooks names the optional lifecycle hook entry points a plugin
// declares. For builtin (Go) plugins the hooks are methods on the provider;
// for external plugins they are process entry points invoked by the loader.
type LifecycleHooks struct {
	OnStart  string `json:"on_start,omitempty"`
	OnStop   string `json:"on_stop,omitempty"`
	OnConfig string `json:"on_config,omitempty"`
}

// PluginManifest is the signed metadata describing a quantum provider plugin.
// The manifest is the unit of distribution for the Plugin SDK: it declares the
// plugin identity, its provider factory entry point, capabilities, config
// schema and required RBAC scopes.
type PluginManifest struct {
	SchemaVersion string          `json:"schema_version"`
	ID            string          `json:"id"`          // globally unique plugin id, e.g. "org.ibm.quantum"
	Name          string          `json:"name"`        // registry provider name, e.g. "ibm-quantum"
	Version       string          `json:"version"`     // semantic version, e.g. "1.4.0"
	Kind          string          `json:"kind"`        // quantum_computing | pqc_engine | attestation | validation | hybrid
	Provider      string          `json:"provider"`    // vendor, e.g. "IBM"
	EntryPoint    string          `json:"entry_point"` // registered factory key this plugin attaches to
	Capabilities  []Capability    `json:"capabilities"`
	ConfigSchema  json.RawMessage `json:"config_schema,omitempty"`
	RBACScopes    []string        `json:"rbac_scopes"`
	Requires      []string        `json:"requires,omitempty"` // required sibling plugins, e.g. ["oqs-engine"]
	Hooks         LifecycleHooks  `json:"lifecycle,omitempty"`
	Signature     string          `json:"signature,omitempty"` // base64 ed25519 signature over manifestPayload()
}

// manifestPayload returns the canonical JSON payload that is signed: the
// manifest with its signature field stripped.
func (m PluginManifest) manifestPayload() ([]byte, error) {
	clone := m
	clone.Signature = ""
	return json.Marshal(clone)
}

// Sign signs the manifest with an ed25519 private key and stores the signature
// on the manifest. Returns the signature bytes for storage/audit.
func (m *PluginManifest) Sign(priv ed25519.PrivateKey) ([]byte, error) {
	payload, err := m.manifestPayload()
	if err != nil {
		return nil, fmt.Errorf("sign plugin manifest: %w", err)
	}
	sig := ed25519.Sign(priv, payload)
	m.Signature = base64.StdEncoding.EncodeToString(sig)
	return sig, nil
}

// Verify checks the manifest signature against a trusted ed25519 public key.
// It returns ErrUnsigned when the manifest carries no signature.
func (m PluginManifest) Verify(pub ed25519.PublicKey) error {
	if m.Signature == "" {
		return ErrUnsigned
	}
	payload, err := m.manifestPayload()
	if err != nil {
		return fmt.Errorf("verify plugin manifest: %w", err)
	}
	sig, err := base64.StdEncoding.DecodeString(m.Signature)
	if err != nil {
		return fmt.Errorf("verify plugin manifest: decode signature: %w", err)
	}
	if !ed25519.Verify(pub, payload, sig) {
		return ErrInvalidSignature
	}
	return nil
}

var (
	// ErrUnsigned is returned when a plugin manifest carries no signature.
	ErrUnsigned = errors.New("plugin manifest is not signed")
	// ErrInvalidSignature is returned when a plugin manifest signature fails
	// verification.
	ErrInvalidSignature = errors.New("plugin manifest has an invalid signature")
	// ErrSchemaMismatch is returned when the manifest schema version is not
	// supported by this SDK.
	ErrSchemaMismatch = errors.New("unsupported plugin manifest schema version")
)

// ManifestLoader loads, verifies and validates plugin manifests from disk.
type ManifestLoader struct {
	// trustRoot, when non-nil, is the ed25519 public key used to verify every
	// loaded manifest. When nil, verification is skipped (development mode).
	trustRoot ed25519.PublicKey
	// requireSignature forces a signature check even without a trust root.
	requireSignature bool
}

// NewManifestLoader creates a manifest loader. trustRoot may be nil to skip
// verification; requireSignature forces manifests to carry a signature.
func NewManifestLoader(trustRoot ed25519.PublicKey, requireSignature bool) *ManifestLoader {
	return &ManifestLoader{
		trustRoot:        trustRoot,
		requireSignature: requireSignature,
	}
}

// LoadFile reads and verifies a single manifest file.
func (l *ManifestLoader) LoadFile(path string) (*PluginManifest, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("load plugin manifest %s: %w", path, err)
	}
	var m PluginManifest
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, fmt.Errorf("parse plugin manifest %s: %w", path, err)
	}
	if err := l.validate(&m); err != nil {
		return nil, fmt.Errorf("plugin manifest %s: %w", path, err)
	}
	return &m, nil
}

// Load reads and verifies every *.json manifest in dir, then registers each
// plugin's entry point factory into reg under the manifest's Name. Returns the
// verified manifests.
func (l *ManifestLoader) Load(ctx context.Context, dir string, reg *Registry) ([]PluginManifest, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read plugin dir %s: %w", dir, err)
	}

	var loaded []PluginManifest
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(strings.ToLower(e.Name()), ".json") {
			continue
		}
		m, err := l.LoadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			return nil, err
		}
		if reg != nil {
			if factory, ok := reg.Factory(m.EntryPoint); ok {
				reg.Register(m.Name, factory)
			}
			reg.emit(EventPluginLoaded, m.Name, m.Version)
		}
		loaded = append(loaded, *m)
	}
	return loaded, nil
}

func (l *ManifestLoader) validate(m *PluginManifest) error {
	if m.SchemaVersion != PluginSchemaVersion {
		return ErrSchemaMismatch
	}
	if m.ID == "" || m.Name == "" || m.Version == "" {
		return errors.New("id, name and version are required")
	}
	if m.Signature == "" && (l.trustRoot != nil || l.requireSignature) {
		return ErrUnsigned
	}
	if m.Signature != "" && l.trustRoot != nil {
		if err := m.Verify(l.trustRoot); err != nil {
			return err
		}
	}
	return nil
}
