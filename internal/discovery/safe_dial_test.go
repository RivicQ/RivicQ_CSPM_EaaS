package discovery

import (
	"context"
	"errors"
	"net"
	"strings"
	"testing"
	"time"
)

// The connect-time dialer is the only complete defence against DNS rebinding:
// the name is resolved once, checked, and the connection is pinned to the
// address that passed. These tests assert that property directly, using a
// stubbed resolver so they do not depend on real DNS.

func defaultPolicy() TargetPolicy {
	return TargetPolicy{}
}

// TestDialContextRejectsBlockedLiteralIP covers the easy case: an address that
// is already internal cannot be reached even without DNS involved.
func TestDialContextRejectsBlockedLiteralIP(t *testing.T) {
	blocked := []string{
		"127.0.0.1:80",       // loopback
		"10.0.0.5:443",       // private
		"192.168.1.1:22",     // private
		"169.254.169.254:80", // cloud metadata
		"172.16.0.1:3306",    // private
		"[::1]:80",           // IPv6 loopback
		"0.0.0.0:80",         // unspecified
	}
	for _, addr := range blocked {
		_, err := defaultPolicy().DialContext(context.Background(), "tcp", addr)
		if err == nil {
			t.Errorf("DialContext(%s) succeeded; a blocked literal must be refused", addr)
			continue
		}
		if !errors.Is(err, ErrTargetBlocked) {
			t.Errorf("DialContext(%s) error = %v, want ErrTargetBlocked", addr, err)
		}
	}
}

// TestDialContextRejectsRebindingToLoopback is the core DNS-rebinding case. The
// hostname looks innocuous and passes validation-time policy, but the answer the
// dialer sees is 127.0.0.1.
func TestDialContextRejectsRebindingToLoopback(t *testing.T) {
	stubbedResolver(t, map[string][]string{
		"innocent.example.com": {"127.0.0.1"},
	})

	_, err := defaultPolicy().DialContext(context.Background(), "tcp", "innocent.example.com:443")
	if err == nil {
		t.Fatal("a hostname resolving to loopback must be refused at connect time")
	}
	if !errors.Is(err, ErrTargetBlocked) {
		t.Errorf("error = %v, want ErrTargetBlocked", err)
	}
}

// TestDialContextRejectsRebindingToMetadata covers the highest-value target of a
// rebinding attack: the cloud instance metadata service, which hands out
// credentials to anything that can reach it.
func TestDialContextRejectsRebindingToMetadata(t *testing.T) {
	stubbedResolver(t, map[string][]string{
		"totally-legit.example.com": {"169.254.169.254"},
		"metadata.example.com":      {"169.254.169.254"},
	})

	for _, host := range []string{"totally-legit.example.com", "metadata.example.com"} {
		_, err := defaultPolicy().DialContext(context.Background(), "tcp", host+":80")
		if err == nil || !errors.Is(err, ErrTargetBlocked) {
			t.Errorf("DialContext(%s) error = %v, want ErrTargetBlocked", host, err)
		}
	}
}

// TestDialContextRejectsMixedAnswers covers a host that publishes one public and
// one internal address. Accepting the public answer while ignoring the internal
// one would leave the caller free to reach it on a later attempt.
func TestDialContextRejectsMixedAnswers(t *testing.T) {
	stubbedResolver(t, map[string][]string{
		"split.example.com": {"203.0.113.10", "127.0.0.1"},
	})

	_, err := defaultPolicy().DialContext(context.Background(), "tcp", "split.example.com:443")
	if err == nil {
		t.Fatal("a host with any blocked answer must be refused")
	}
	if !errors.Is(err, ErrTargetBlocked) {
		t.Errorf("error = %v, want ErrTargetBlocked", err)
	}
	if !strings.Contains(err.Error(), "127.0.0.1") {
		t.Errorf("error should name the offending address, got %v", err)
	}
}

// TestDialContextAllowsPrivateNetworksWhenOperatorOptsIn proves the protection
// is a policy decision rather than a hardcoded refusal: an operator scanning
// internal hosts must still be able to.
func TestDialContextAllowsPrivateNetworksWhenOperatorOptsIn(t *testing.T) {
	policy := TargetPolicy{AllowPrivateNetworks: true}

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer func() { _ = ln.Close() }()
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			_ = conn.Close()
		}
	}()

	conn, err := policy.DialContext(context.Background(), "tcp", ln.Addr().String())
	if err != nil {
		t.Fatalf("opt-in policy should permit loopback: %v", err)
	}
	_ = conn.Close()
}

// TestDialContextEnforcesHostAllowList checks RIVICQ_SCAN_ALLOWED_HOSTS still
// applies at connect time. A permissive network setting must not silently
// bypass an explicit host list.
func TestDialContextEnforcesHostAllowList(t *testing.T) {
	policy := TargetPolicy{
		AllowPrivateNetworks: true,
		AllowedHosts:         []string{"only-this.example.com"},
	}

	if _, err := policy.DialContext(context.Background(), "tcp", "other.example.com:443"); err == nil {
		t.Error("a host outside the allow-list must be refused")
	} else if !errors.Is(err, ErrTargetBlocked) {
		t.Errorf("error = %v, want ErrTargetBlocked", err)
	}
}

// TestDialContextPropagatesResolutionFailure keeps a DNS failure distinct from a
// policy refusal, so operators are not told "blocked" when the real problem is
// that the name does not resolve.
func TestDialContextPropagatesResolutionFailure(t *testing.T) {
	stubbedResolver(t, map[string][]string{})

	_, err := defaultPolicy().DialContext(context.Background(), "tcp", "nonexistent.example.com:443")
	if err == nil {
		t.Fatal("expected an error for an unresolvable host")
	}
	if errors.Is(err, ErrTargetBlocked) {
		t.Errorf("a DNS failure should not be reported as a policy block: %v", err)
	}
}

// TestDialContextRejectsMalformedAddress covers the parse failure path.
func TestDialContextRejectsMalformedAddress(t *testing.T) {
	if _, err := defaultPolicy().DialContext(context.Background(), "tcp", "not-an-address"); err == nil {
		t.Error("expected an error for a malformed address")
	}
}

// TestSafeHTTPClientBlocksRedirectToInternal proves the redirect check applies
// the policy. Following a redirect to an internal address would otherwise be a
// complete bypass of the dialer, since the dialer only sees the new request.
func TestSafeHTTPClientBlocksRedirectToInternal(t *testing.T) {
	policy := defaultPolicy()
	client := policy.SafeHTTPClient(true)

	req, err := newTestRequest("http://public.example.com/")
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	err = client.CheckRedirect(req, nil)
	if err != nil {
		t.Fatalf("a redirect to a public host should be allowed, got %v", err)
	}

	internal, err := newTestRequest("http://169.254.169.254/latest/meta-data/")
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if err := client.CheckRedirect(internal, nil); err == nil {
		t.Error("a redirect to the metadata endpoint must be blocked")
	}
}

// TestScanManagerPolicyChangeRebuildsScanner closes the gap where the manager
// and its scanners disagree. A widened policy that the scanners never learn
// about looks like the setting has no effect.
func TestScanManagerPolicyChangeRebuildsScanner(t *testing.T) {
	sm := NewScanManager()
	sm.SetPolicy(TargetPolicy{AllowPrivateNetworks: true})

	if got := sm.scanner.httpScanner.effectivePolicy(); !got.AllowPrivateNetworks {
		t.Error("SetPolicy did not reach the HTTP scanner's connect-time policy")
	}
	if got := sm.scanner.sshScanner.effectivePolicy(); !got.AllowPrivateNetworks {
		t.Error("SetPolicy did not reach the SSH scanner's connect-time policy")
	}
	if got := sm.scanner.tlsScanner.effectivePolicy(); !got.AllowPrivateNetworks {
		t.Error("SetPolicy did not reach the TLS scanner's connect-time policy")
	}
}

// TestDefaultScannerPolicyBlocksLoopback is a regression guard: a scanner built
// without an explicit policy must inherit the restrictive default rather than an
// empty policy that permits everything.
func TestDefaultScannerPolicyBlocksLoopback(t *testing.T) {
	t.Setenv("RIVICQ_SCAN_ALLOW_PRIVATE_NETS", "")

	s := NewScanner()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if _, err := s.httpScanner.policy.DialContext(ctx, "tcp", "127.0.0.1:80"); err == nil {
		t.Error("the default scanner policy must block loopback")
	}
}
