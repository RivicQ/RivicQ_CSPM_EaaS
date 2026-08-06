package provider

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"
)

// EventType identifies registry lifecycle events surfaced on the registry's
// event stream (the SDK's lightweight event bus).
type EventType string

const (
	EventRegistered   EventType = "provider.registered"
	EventInitialized  EventType = "provider.initialized"
	EventDegraded     EventType = "provider.degraded"
	EventClosed       EventType = "provider.closed"
	EventPluginLoaded EventType = "plugin.loaded"
)

// Event is emitted by the Registry for every provider lifecycle change.
type Event struct {
	Type      EventType `json:"type"`
	Provider  string    `json:"provider"`
	Message   string    `json:"message,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// Registry is the provider registry of the Quantum SDK. It holds registered
// provider factories (plugin modules) and their live instances, and emits
// lifecycle events for telemetry and audit purposes.
//
// A zero-value Registry is ready to use.
type Registry struct {
	mu        sync.RWMutex
	factories map[string]Factory
	instances map[string]QuantumProvider
	order     []string
	events    chan Event
}

// NewRegistry returns an empty provider registry.
func NewRegistry() *Registry {
	return &Registry{
		factories: make(map[string]Factory),
		instances: make(map[string]QuantumProvider),
		events:    make(chan Event, 128),
	}
}

// ensureReady lazily initialises the registry's maps and event channel so a
// zero-value Registry is fully usable. Callers must hold r.mu.
func (r *Registry) ensureReady() {
	if r.factories == nil {
		r.factories = make(map[string]Factory)
	}
	if r.instances == nil {
		r.instances = make(map[string]QuantumProvider)
	}
	if r.events == nil {
		r.events = make(chan Event, 128)
	}
}

// Events returns the registry's event stream. The channel is buffered (128)
// and is never closed; consumers should drain or ignore it.
func (r *Registry) Events() <-chan Event {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.ensureReady()
	return r.events
}

func (r *Registry) emit(t EventType, name, msg string) {
	// Channel sends are goroutine-safe; a nil channel plus the default case is
	// also safe (event dropped), so no locking is needed here.
	select {
	case r.events <- Event{Type: t, Provider: name, Message: msg, Timestamp: time.Now().UTC()}:
	default:
	}
}

// Register adds a provider factory under the given name. Registering the same
// name twice replaces the previous factory; live instances are unaffected.
func (r *Registry) Register(name string, f Factory) {
	if name == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.ensureReady()
	if _, exists := r.factories[name]; !exists {
		r.order = append(r.order, name)
	}
	r.factories[name] = f
	r.emit(EventRegistered, name, "")
}

// Factory returns the factory registered under name, if any.
func (r *Registry) Factory(name string) (Factory, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	f, ok := r.factories[name]
	return f, ok
}

// Registered returns the names of all registered provider factories, in
// registration order.
func (r *Registry) Registered() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]string, 0, len(r.order))
	for _, n := range r.order {
		if _, ok := r.factories[n]; ok {
			out = append(out, n)
		}
	}
	return out
}

// Init instantiates every registered factory. configs maps provider name to
// its configuration; a missing entry instantiates the provider with an empty
// config (opt-in providers report themselves unavailable until configured).
//
// Initialisation is non-fatal: a failing provider emits a degraded event and
// is skipped so the rest of the SDK keeps working. The returned slice contains
// one error per failed provider.
func (r *Registry) Init(ctx context.Context, configs map[string]map[string]any) []error {
	if configs == nil {
		configs = map[string]map[string]any{}
	}
	var errs []error

	r.mu.Lock()
	names := make([]string, 0, len(r.order))
	for _, n := range r.order {
		if _, ok := r.factories[n]; ok {
			names = append(names, n)
		}
	}
	r.mu.Unlock()

	for _, name := range names {
		factory, ok := r.Factory(name)
		if !ok {
			continue
		}
		instance, err := factory(ctx, configs[name])
		if err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", name, err))
			r.emit(EventDegraded, name, err.Error())
			continue
		}
		if instance == nil {
			continue
		}
		r.mu.Lock()
		r.ensureReady()
		r.instances[name] = instance
		r.mu.Unlock()
		r.emit(EventInitialized, name, "")
	}
	return errs
}

// Get returns the live provider instance registered under name.
func (r *Registry) Get(name string) (QuantumProvider, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.instances[name]
	return p, ok
}

// List returns all live provider instances, in registration order.
func (r *Registry) List() []QuantumProvider {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]QuantumProvider, 0, len(r.instances))
	for _, n := range r.order {
		if p, ok := r.instances[n]; ok {
			out = append(out, p)
		}
	}
	return out
}

// Statuses returns the live status of every instantiated provider.
func (r *Registry) Statuses(ctx context.Context) map[string]ProviderStatus {
	out := make(map[string]ProviderStatus)
	for _, p := range r.List() {
		out[p.Info().Name] = p.Status(ctx)
	}
	return out
}

// Close shuts down every live provider and marks them closed. Close is
// idempotent.
func (r *Registry) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.ensureReady()
	var errs []error
	for name, p := range r.instances {
		if err := p.Close(); err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", name, err))
			continue
		}
		r.emit(EventClosed, name, "")
	}
	r.instances = make(map[string]QuantumProvider)
	if len(errs) > 0 {
		return fmt.Errorf("closing providers: %v", errs)
	}
	return nil
}

// SortedProviderNames returns the names of live providers sorted lexically
// (stable ordering for dashboards and audit trails).
func (r *Registry) SortedProviderNames() []string {
	names := make([]string, 0, len(r.instances))
	for n := range r.instances {
		names = append(names, n)
	}
	sort.Strings(names)
	return names
}
