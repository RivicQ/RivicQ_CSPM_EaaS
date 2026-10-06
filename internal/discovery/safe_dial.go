package discovery

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

// Connect-time enforcement of the target policy.
//
// ValidateTarget resolves a hostname and checks the answers, but that check
// happens before the socket is opened. Between the two there is a window in
// which DNS can be rebound: the name that passed the policy resolves to
// 127.0.0.1 or a cloud metadata address at connect time, and the scanner fetches
// it. Validating the resolved address is only a mitigation unless the
// connection is pinned to the very address that was checked.
//
// DialContext closes the window: it resolves the host itself, rejects any answer
// that is not globally routable, and dials the validated IP literal. The name is
// never handed to the transport's own resolver, so the address that passed the
// policy is the address that gets connected to.

// errNoRoutableAddress reports that every resolved address was rejected. It is
// distinct from a DNS failure: the host exists but points somewhere the scanner
// may not go.
var errNoRoutableAddress = errors.New("no permitted address for host")

// dialTimeout bounds a single connect attempt.
const dialTimeout = 10 * time.Second

// ipLookup is the slice of net.Resolver the policy needs. Naming it as an
// interface lets tests supply deterministic answers instead of depending on
// whatever the machine's DNS returns.
type ipLookup interface {
	LookupIPAddr(ctx context.Context, host string) ([]net.IPAddr, error)
}

// resolver is overridable for tests.
var resolver = func() ipLookup { return net.DefaultResolver }

// hostPermitted reports whether the policy allows this hostname at all,
// ignoring its resolved addresses. It mirrors the hostname rules in
// validateNetworkTarget so connect-time and validation-time decisions agree.
func (p TargetPolicy) hostPermitted(host string) bool {
	if host == "" {
		return false
	}
	if len(p.AllowedHosts) > 0 {
		for _, h := range p.AllowedHosts {
			if strings.EqualFold(h, host) {
				return true
			}
		}
		return false
	}
	return true
}

// DialContext opens a connection to addr only if the address it resolves to is
// permitted, pinning the socket to the validated address.
//
// When the policy permits private networks the check is skipped: that is the
// operator explicitly opting into internal scanning, not a gap.
func (p TargetPolicy) DialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, fmt.Errorf("%w: cannot parse address %q", ErrTargetBlocked, addr)
	}
	if !p.hostPermitted(host) {
		return nil, fmt.Errorf("%w: host %q is not in RIVICQ_SCAN_ALLOWED_HOSTS", ErrTargetBlocked, host)
	}
	if p.AllowPrivateNetworks {
		return p.dial(ctx, network, addr)
	}

	// A literal IP needs no resolution, but it still has to be permitted.
	if ip := net.ParseIP(host); ip != nil {
		if isBlockedIP(ip) {
			return nil, fmt.Errorf("%w: address %s is not a permitted destination", ErrTargetBlocked, ip)
		}
		return p.dial(ctx, network, addr)
	}

	ips, err := resolver().LookupIPAddr(ctx, host)
	if err != nil {
		return nil, fmt.Errorf("resolve %q: %w", host, err)
	}

	var blocked []string
	for _, resolved := range ips {
		if isBlockedIP(resolved.IP) {
			blocked = append(blocked, resolved.IP.String())
			continue
		}
		// Dial the literal so nothing re-resolves the name between the check
		// and the connection. This is the pin.
		return p.dial(ctx, network, net.JoinHostPort(resolved.IP.String(), port))
	}

	if len(blocked) > 0 {
		return nil, fmt.Errorf("%w: host %q resolves to non-public address(s) %s",
			ErrTargetBlocked, host, strings.Join(blocked, ", "))
	}
	return nil, fmt.Errorf("%w: %v for host %q", errNoRoutableAddress, ErrTargetBlocked, host)
}

// dial performs the actual connect with a bounded timeout.
func (p TargetPolicy) dial(ctx context.Context, network, addr string) (net.Conn, error) {
	dialer := &net.Dialer{Timeout: dialTimeout}
	//nolint:wrapcheck // dial errors are returned unwrapped deliberately
	return dialer.DialContext(ctx, network, addr)
}

// SafeTransport returns an HTTP transport that enforces the policy at connect
// time. Using this instead of the default transport is what makes the
// protection effective: a transport with a plain dialer would resolve the name
// again and reopen the window the policy dialer just closed.
//
// insecureTLS is passed through so the scanner can still read response headers
// from hosts with untrusted certificates; the TLS scanner reports those.
func (p TargetPolicy) SafeTransport(insecureTLS bool) *http.Transport {
	return &http.Transport{
		DialContext: p.DialContext,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: insecureTLS, //nolint:gosec // the scanner reports certificate problems separately
			MinVersion:         tls.VersionTLS12,
		},
		TLSHandshakeTimeout: dialTimeout,
	}
}

// SafeHTTPClient returns an HTTP client that enforces the policy at connect
// time and bounds how many redirects it will follow. Redirects are re-checked
// because each hop is a fresh request that could point somewhere new.
func (p TargetPolicy) SafeHTTPClient(insecureTLS bool) *http.Client {
	return &http.Client{
		Timeout:   10 * time.Second,
		Transport: p.SafeTransport(insecureTLS),
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return http.ErrUseLastResponse
			}
			// A redirect target is attacker-influenced, so it goes through the
			// same gate as the original URL.
			if err := p.ValidateTarget(req.URL.Hostname()); err != nil {
				return fmt.Errorf("redirect blocked: %w", err)
			}
			return nil
		},
	}
}

// loopbackTestPolicy permits private addresses for tests that deliberately scan
// a local test server. Production scanners never use it: the default policy
// blocks loopback, and a test that needs loopback has to say so explicitly
// rather than inheriting a permissive default.
func loopbackTestPolicy() TargetPolicy {
	return TargetPolicy{AllowPrivateNetworks: true}
}
