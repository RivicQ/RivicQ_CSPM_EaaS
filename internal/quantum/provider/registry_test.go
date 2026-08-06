package provider

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/rivic-q/cryptobom-saas/internal/quantum"
)

// stubProvider is a minimal QuantumProvider for exercising the registry.
type stubProvider struct {
	name      string
	statusErr error
	closed    bool
}

func (s *stubProvider) Info() ProviderInfo {
	return ProviderInfo{Name: s.name, Version: "1.0.0", Vendor: "test", Kind: "attestation"}
}

func (s *stubProvider) Status(ctx context.Context) ProviderStatus {
	state := "available"
	if s.statusErr != nil {
		state = "degraded"
	}
	return ProviderStatus{State: state, Version: "1.0.0", CheckedAt: time.Now().UTC()}
}

func (s *stubProvider) Attest(ctx context.Context, req quantum.AttestationRequest) (*quantum.AttestationResult, error) {
	return &quantum.AttestationResult{AssetID: req.AssetID, ProviderName: s.name, QuantumSafe: true, AttestedAt: time.Now().UTC()}, nil
}

func (s *stubProvider) Assess(ctx context.Context, asset quantum.CryptoAsset) (*quantum.QuantumRiskReport, error) {
	return &quantum.QuantumRiskReport{AssetID: asset.ID, RiskScore: 0}, nil
}

func (s *stubProvider) MigrationPath(ctx context.Context, fromAlgorithm string) ([]quantum.PostQuantumAlgorithm, error) {
	return nil, nil
}

func (s *stubProvider) Validate(ctx context.Context, algorithm string, keySize int) (*quantum.QuantumAttestationResponse, error) {
	return &quantum.QuantumAttestationResponse{ID: "stub", Status: "completed", QuantumSafe: true}, nil
}

func (s *stubProvider) Close() error {
	s.closed = true
	return nil
}

func stubFactory(name string, fail ...bool) Factory {
	return func(ctx context.Context, cfg map[string]any) (QuantumProvider, error) {
		if len(fail) > 0 && fail[0] {
			return nil, errors.New("boom")
		}
		return &stubProvider{name: name}, nil
	}
}

// compile-time check that the stub implements the contract.
var _ QuantumProvider = (*stubProvider)(nil)

func TestRegistry_ZeroValueIsUsable(t *testing.T) {
	var r Registry
	r.Register("local-pqc", stubFactory("local-pqc"))
	if got := len(r.Registered()); got != 1 {
		t.Fatalf("expected 1 registered factory, got %d", got)
	}
}

func TestRegistry_RegisterAndRegistered(t *testing.T) {
	r := NewRegistry()
	r.Register("b", stubFactory("b"))
	r.Register("a", stubFactory("a"))

	got := r.Registered()
	want := []string{"b", "a"} // registration order preserved
	if len(got) != len(want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, got)
		}
	}
}

func TestRegistry_RegisterEmptyNameIsIgnored(t *testing.T) {
	r := NewRegistry()
	r.Register("", stubFactory("x"))
	if len(r.Registered()) != 0 {
		t.Fatal("empty name must not be registered")
	}
}

func TestRegistry_RegisterReplacesFactory(t *testing.T) {
	r := NewRegistry()
	r.Register("p", stubFactory("p"))
	if _, ok := r.Factory("p"); !ok {
		t.Fatal("expected factory to be found")
	}
	r.Register("p", stubFactory("p"))
	if got := len(r.Registered()); got != 1 {
		t.Fatalf("re-register must not duplicate, got %d", got)
	}
}

func TestRegistry_Init(t *testing.T) {
	r := NewRegistry()
	r.Register("ok", stubFactory("ok"))
	r.Register("bad", stubFactory("bad", true))

	errs := r.Init(context.Background(), nil)
	if len(errs) != 1 {
		t.Fatalf("expected 1 init error, got %v", errs)
	}
	if !strings.Contains(errs[0].Error(), "bad") {
		t.Errorf("init error should name failing provider, got %v", errs[0])
	}

	if _, ok := r.Get("ok"); !ok {
		t.Fatal("expected ok provider to be initialised")
	}
	if _, ok := r.Get("bad"); ok {
		t.Fatal("expected bad provider to be skipped")
	}
}

func TestRegistry_InitWithConfigs(t *testing.T) {
	r := NewRegistry()
	gotCfg := make(chan map[string]any, 1)
	r.Register("cfg", func(ctx context.Context, cfg map[string]any) (QuantumProvider, error) {
		gotCfg <- cfg
		return &stubProvider{name: "cfg"}, nil
	})

	r.Init(context.Background(), map[string]map[string]any{"cfg": {"api_key": "secret"}})
	select {
	case cfg := <-gotCfg:
		if cfg["api_key"] != "secret" {
			t.Errorf("expected api_key config, got %v", cfg)
		}
	default:
		t.Fatal("factory did not receive config")
	}
}

func TestRegistry_ListAndSortedProviderNames(t *testing.T) {
	r := NewRegistry()
	r.Register("z", stubFactory("z"))
	r.Register("a", stubFactory("a"))
	r.Init(context.Background(), nil)

	if got := len(r.List()); got != 2 {
		t.Fatalf("expected 2 instances, got %d", got)
	}

	names := r.SortedProviderNames()
	sorted := append([]string(nil), names...)
	sort.Strings(sorted)
	if strings.Join(names, ",") != strings.Join(sorted, ",") {
		t.Errorf("SortedProviderNames not sorted: %v", names)
	}
	if len(names) != 2 {
		t.Errorf("expected 2 sorted names, got %d", len(names))
	}
}

func TestRegistry_Statuses(t *testing.T) {
	r := NewRegistry()
	r.Register("a", stubFactory("a"))
	r.Init(context.Background(), nil)

	statuses := r.Statuses(context.Background())
	if len(statuses) != 1 {
		t.Fatalf("expected 1 status, got %d", len(statuses))
	}
	if s := statuses["a"]; s.State != "available" {
		t.Errorf("expected available state, got %q", s.State)
	}
}

func TestRegistry_CloseIsIdempotent(t *testing.T) {
	r := NewRegistry()
	r.Register("a", stubFactory("a"))
	r.Init(context.Background(), nil)

	inst, ok := r.Get("a")
	if !ok {
		t.Fatal("expected instance")
	}
	stub := inst.(*stubProvider)

	if err := r.Close(); err != nil {
		t.Fatalf("first close: %v", err)
	}
	if !stub.closed {
		t.Fatal("provider not closed")
	}
	if _, ok := r.Get("a"); ok {
		t.Fatal("instance should be cleared after close")
	}
	if err := r.Close(); err != nil {
		t.Fatalf("second close must be idempotent: %v", err)
	}
}

func TestRegistry_ClosePropagatesErrors(t *testing.T) {
	r := NewRegistry()
	r.Register("fail", func(ctx context.Context, cfg map[string]any) (QuantumProvider, error) {
		return &stubProvider{name: "fail", statusErr: errors.New("x")}, nil
	})
	r.Init(context.Background(), nil)

	// stub.Close always succeeds; emulate a failing close via a wrapper.
	r.Register("fail", func(ctx context.Context, cfg map[string]any) (QuantumProvider, error) {
		return &closeErrorProvider{name: "fail"}, nil
	})
	r.Init(context.Background(), nil)

	if err := r.Close(); err == nil {
		t.Fatal("expected close error to propagate")
	}
}

type closeErrorProvider struct {
	name string
}

func (c *closeErrorProvider) Info() ProviderInfo { return ProviderInfo{Name: c.name} }
func (c *closeErrorProvider) Status(ctx context.Context) ProviderStatus {
	return ProviderStatus{State: "available"}
}
func (c *closeErrorProvider) Attest(ctx context.Context, req quantum.AttestationRequest) (*quantum.AttestationResult, error) {
	return nil, nil
}
func (c *closeErrorProvider) Assess(ctx context.Context, asset quantum.CryptoAsset) (*quantum.QuantumRiskReport, error) {
	return nil, nil
}
func (c *closeErrorProvider) MigrationPath(ctx context.Context, fromAlgorithm string) ([]quantum.PostQuantumAlgorithm, error) {
	return nil, nil
}
func (c *closeErrorProvider) Validate(ctx context.Context, algorithm string, keySize int) (*quantum.QuantumAttestationResponse, error) {
	return nil, nil
}
func (c *closeErrorProvider) Close() error { return errors.New("close failed") }

func TestRegistry_Events(t *testing.T) {
	r := NewRegistry()
	events := r.Events()

	r.Register("a", stubFactory("a"))
	r.Register("b", stubFactory("b", true))
	r.Init(context.Background(), nil)
	r.Close()

	types := map[EventType]int{}
	for i := 0; i < 5; i++ {
		select {
		case ev := <-events:
			types[ev.Type]++
		case <-time.After(2 * time.Second):
			t.Fatalf("timed out waiting for event %d", i)
		}
	}

	want := map[EventType]int{
		EventRegistered:  2,
		EventInitialized: 1,
		EventDegraded:    1,
		EventClosed:      1,
	}
	for evType, n := range want {
		if types[evType] != n {
			t.Errorf("expected %d %s events, got %d", n, evType, types[evType])
		}
	}
}

func TestRegistry_EventsChannelDoesNotBlock(t *testing.T) {
	r := NewRegistry()
	// Fill the buffer past capacity to prove emit is non-blocking.
	for i := 0; i < 200; i++ {
		r.Register("p", stubFactory("p"))
	}
	// Drain what we can; no goroutine should deadlock.
	if got := len(r.events); got > cap(r.events) {
		t.Fatalf("events buffered %d, cap %d", got, cap(r.events))
	}
}

func TestRegistry_ConcurrentAccess(t *testing.T) {
	r := NewRegistry()
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			name := "p"
			if i%2 == 0 {
				r.Register(name, stubFactory(name))
			} else {
				r.Registered()
				r.Factory(name)
				r.Get(name)
			}
		}(i)
	}
	wg.Wait()
}
