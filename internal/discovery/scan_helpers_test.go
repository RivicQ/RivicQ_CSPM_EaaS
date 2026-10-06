package discovery

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"testing"
)

// Test-scanner constructors for the protocol tests below.
//
// These tests run a real server on 127.0.0.1 and scan it, which the default
// target policy forbids. Rather than weakening the default, each test scanner is
// built with an explicit policy that permits private addresses, so the tests
// declare their intent and the production default stays restrictive.

// newTestHTTPScanner permits loopback for tests that scan an httptest server.
func newTestHTTPScanner() *HTTPScanner {
	return &HTTPScanner{policy: loopbackTestPolicy(), hasOwnPolicy: true}
}

// newTestSSHScanner permits loopback for tests that scan a local SSH listener.
func newTestSSHScanner() *SSHScanner {
	return &SSHScanner{policy: loopbackTestPolicy(), hasOwnPolicy: true}
}

// newTestTLSScanner permits loopback for tests that scan a local TLS listener.
func newTestTLSScanner() *TLSScanner {
	return &TLSScanner{policy: loopbackTestPolicy(), hasOwnPolicy: true}
}

// stubbedResolver replaces DNS for the duration of a test.
//
// Without this, a test that asserts a hostname is refused would depend on what
// the machine's resolver happens to return.
func stubbedResolver(t *testing.T, answers map[string][]string) {
	t.Helper()
	prev := resolver
	lookup := staticResolver(answers)
	resolver = func() ipLookup { return lookup }
	t.Cleanup(func() { resolver = prev })
}

// staticResolver returns canned answers for a fixed set of hostnames. A host
// with no entry fails the same way an unresolvable name does in production.
func staticResolver(answers map[string][]string) ipLookup {
	return fakeResolver{answers: answers}
}

type fakeResolver struct {
	answers map[string][]string
}

func (f fakeResolver) LookupIPAddr(_ context.Context, host string) ([]net.IPAddr, error) {
	raw, ok := f.answers[host]
	if !ok {
		return nil, fmt.Errorf("no such host: %s", host)
	}
	out := make([]net.IPAddr, 0, len(raw))
	for _, ip := range raw {
		parsed := net.ParseIP(ip)
		if parsed == nil {
			return nil, fmt.Errorf("bad test address %q", ip)
		}
		out = append(out, net.IPAddr{IP: parsed})
	}
	return out, nil
}

// newTestRequest builds a minimal GET request for redirect-policy checks.
func newTestRequest(rawURL string) (*http.Request, error) {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	return req, nil
}
