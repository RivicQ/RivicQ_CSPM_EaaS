// Package profile is the vendor-neutral domain profile registry. Domain and
// vendor knowledge (detection markers, crypto mappings, protocols) lives in
// data, never hardcoded in the engine. Partner profiles such as Infineon
// (embedded) and G+D (identity) are ordinary profiles here — the underlying
// firmware/identity engine stays vendor-neutral (partner spec §4).
package profile

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
)

// Domain is a top-level environment family.
type Domain string

const (
	DomainEmbedded   Domain = "embedded"
	DomainTelecom    Domain = "telecom"
	DomainIdentity   Domain = "identity"
	DomainAutomotive Domain = "automotive"
	DomainIndustrial Domain = "industrial"
	DomainCloud      Domain = "cloud"
	DomainGeneric    Domain = "generic"
)

// LibraryRule detects a crypto library by string evidence and lists the
// algorithm capabilities that library provides (mapping, not detection).
type LibraryRule struct {
	Library    string   `json:"library"`
	Markers    []string `json:"markers"`
	Algorithms []string `json:"algorithms,omitempty"`
	Risk       string   `json:"risk,omitempty"`
}

// APIRule detects a crypto API surface (PSA Crypto, TF-M, PKCS#11, ...).
type APIRule struct {
	API     string   `json:"api"`
	Markers []string `json:"markers"`
	Note    string   `json:"note,omitempty"`
}

// ProtocolRule detects a wire/transport protocol stack in an artifact.
type ProtocolRule struct {
	Protocol string   `json:"protocol"`
	Markers  []string `json:"markers"`
	Layer    string   `json:"layer,omitempty"` // transport | wireless | messaging | identity
}

// Rule is a generic detection rule (secure boot, RoT, device identity, ...).
type Rule struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Kind    string   `json:"kind"` // secure_boot | root_of_trust | device_identity | attestation | secure_storage
	Markers []string `json:"markers"`
	Note    string   `json:"note,omitempty"`
}

// Profile is one domain/vendor profile. It is fully data-driven.
type Profile struct {
	ID             string              `json:"id"`
	Domain         Domain              `json:"domain"`
	Name           string              `json:"name"`
	Description    string              `json:"description"`
	AssetTypes     []string            `json:"asset_types,omitempty"`
	Libraries      []LibraryRule       `json:"libraries,omitempty"`
	CryptoAPIs     []APIRule           `json:"crypto_apis,omitempty"`
	Protocols      []ProtocolRule      `json:"protocols,omitempty"`
	Rules          []Rule              `json:"rules,omitempty"`
	LifecycleHints map[string][]string `json:"lifecycle_hints,omitempty"`
	Evidence       string              `json:"evidence,omitempty"`
	Provenance     string              `json:"provenance"`
}

// Registry holds the loaded profiles.
type Registry struct {
	byID map[string]Profile
}

// NewRegistry returns an empty registry.
func NewRegistry() *Registry {
	return &Registry{byID: map[string]Profile{}}
}

// Register adds or replaces a profile.
func (r *Registry) Register(p Profile) error {
	if strings.TrimSpace(p.ID) == "" {
		return fmt.Errorf("profile: empty id")
	}
	if p.Provenance == "" {
		p.Provenance = "builtin"
	}
	r.byID[p.ID] = p
	return nil
}

// Get returns a profile by ID.
func (r *Registry) Get(id string) (Profile, bool) {
	p, ok := r.byID[id]
	return p, ok
}

// List returns all profiles sorted by ID.
func (r *Registry) List() []Profile {
	out := make([]Profile, 0, len(r.byID))
	for _, p := range r.byID {
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

// LoadFile merges a JSON profile file into the registry.
func (r *Registry) LoadFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	var p Profile
	if err := json.Unmarshal(data, &p); err != nil {
		return fmt.Errorf("profile %s: %w", path, err)
	}
	p.Provenance = "file:" + path
	return r.Register(p)
}

// Default returns a registry with the builtin profiles.
func Default() *Registry {
	r := NewRegistry()
	for _, p := range Builtin() {
		_ = r.Register(p)
	}
	return r
}

// Resolve returns the profile by ID, falling back to the generic profile for the
// given domain, and finally to the global generic profile.
func Resolve(r *Registry, id string, d Domain) Profile {
	if id != "" {
		if p, ok := r.Get(id); ok {
			return p
		}
	}
	if p, ok := r.Get(string(d) + "/generic"); ok {
		return p
	}
	if p, ok := r.Get("embedded/generic"); ok {
		return p
	}
	return Profile{ID: "generic", Domain: DomainGeneric, Name: "Generic"}
}
