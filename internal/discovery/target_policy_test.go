package discovery

import (
	"errors"
	"net"
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultPolicyBlocksLocalPaths(t *testing.T) {
	p := DefaultTargetPolicy()
	for _, target := range []string{
		"/etc/passwd",
		"/",
		".",
		"..",
		"./fixtures",
		"../fixtures",
		"~/.aws/credentials",
	} {
		if err := p.ValidateTarget(target); !errors.Is(err, ErrTargetBlocked) {
			t.Errorf("%q: expected blocked, got %v", target, err)
		}
	}
}

func TestPolicyBlocksTraversalOutsideRoots(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "repo")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}
	secretOutside := filepath.Join(root, "..", "outside-secret")
	if err := os.WriteFile(secretOutside, []byte("token"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Remove(secretOutside) })

	p := TargetPolicy{AllowLocalPaths: true, LocalPathRoots: []string{nested}}

	if err := p.ValidateTarget(nested); err != nil {
		t.Fatalf("root itself must be allowed: %v", err)
	}
	if err := p.ValidateTarget(filepath.Join(nested, "src")); err != nil {
		t.Fatalf("path under root must be allowed: %v", err)
	}
	if err := p.ValidateTarget(secretOutside); !errors.Is(err, ErrTargetBlocked) {
		t.Fatalf("path outside root must be blocked, got %v", err)
	}
	if err := p.ValidateTarget(filepath.Join(nested, "..", "..", "etc")); !errors.Is(err, ErrTargetBlocked) {
		t.Fatalf("traversal must be blocked, got %v", err)
	}
}

func TestPolicyBlocksSymlinkEscape(t *testing.T) {
	root := t.TempDir()
	allowed := filepath.Join(root, "allowed")
	if err := os.MkdirAll(allowed, 0o755); err != nil {
		t.Fatal(err)
	}
	outside := t.TempDir()
	secret := filepath.Join(outside, "id_rsa")
	if err := os.WriteFile(secret, []byte("PRIVATE KEY"), 0o600); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(allowed, "link")
	if err := os.Symlink(outside, link); err != nil {
		t.Skipf("symlinks unavailable: %v", err)
	}

	p := TargetPolicy{AllowLocalPaths: true, LocalPathRoots: []string{allowed}}
	if err := p.ValidateTarget(link); !errors.Is(err, ErrTargetBlocked) {
		t.Fatalf("symlink escape must be blocked, got %v", err)
	}
}

func TestLocalPathsRequireRoots(t *testing.T) {
	p := TargetPolicy{AllowLocalPaths: true}
	if err := p.ValidateTarget("/tmp"); !errors.Is(err, ErrTargetBlocked) {
		t.Fatalf("expected blocked without roots, got %v", err)
	}
}

func TestPolicyBlocksPrivateAndReservedAddresses(t *testing.T) {
	p := DefaultTargetPolicy()
	blocked := []string{
		"127.0.0.1",
		"localhost",
		"10.0.0.1",
		"172.16.5.4",
		"192.168.0.10",
		"169.254.169.254", // AWS IMDS
		"100.100.100.200", // Alibaba IMDS
		"metadata.google.internal",
		"0.0.0.0",
		"[::1]",
		"[fe80::1]",
		"100.64.1.1",  // CGNAT
		"198.18.0.5",  // benchmarking
		"203.0.113.9", // TEST-NET-3
	}
	for _, target := range blocked {
		if err := p.ValidateTarget(target); !errors.Is(err, ErrTargetBlocked) {
			t.Errorf("%q: expected blocked, got %v", target, err)
		}
	}
}

func TestPolicyAllowsPublicHostsAndPorts(t *testing.T) {
	p := DefaultTargetPolicy()
	for _, target := range []string{
		"example.com",
		"https://example.com",
		"example.com:443",
		"8.8.8.8",
		"1.1.1.1:8443",
	} {
		if err := p.ValidateTarget(target); err != nil {
			t.Errorf("%q: expected allowed, got %v", target, err)
		}
	}
}

func TestPolicyRejectsUnusualPortsOnPublicHosts(t *testing.T) {
	p := DefaultTargetPolicy()
	if err := p.ValidateTarget("1.1.1.1:4444"); !errors.Is(err, ErrTargetBlocked) {
		t.Fatalf("expected unusual port blocked, got %v", err)
	}
}

func TestPolicyHostAllowListWins(t *testing.T) {
	p := TargetPolicy{AllowedHosts: []string{"internal.example.org"}}
	if err := p.ValidateTarget("internal.example.org:443"); err != nil {
		t.Fatalf("allow-listed host must pass: %v", err)
	}
	if err := p.ValidateTarget("elsewhere.example.com"); !errors.Is(err, ErrTargetBlocked) {
		t.Fatalf("non allow-listed host must be blocked, got %v", err)
	}
	// The allow-list is explicit, so it permits private destinations the
	// operator has named on purpose.
	if err := p.ValidateTarget("10.1.2.3:443"); !errors.Is(err, ErrTargetBlocked) {
		t.Fatalf("only the named host may be allowed, got %v", err)
	}
}

func TestPolicyRejectsEmptyAndOversizedTargets(t *testing.T) {
	p := DefaultTargetPolicy()
	if err := p.ValidateTarget("   "); !errors.Is(err, ErrTargetBlocked) {
		t.Fatalf("empty target must be blocked, got %v", err)
	}
	long := make([]byte, 600)
	for i := range long {
		long[i] = 'a'
	}
	if err := p.ValidateTarget(string(long)); !errors.Is(err, ErrTargetBlocked) {
		t.Fatalf("oversized target must be blocked, got %v", err)
	}
}

func TestIsBlockedIPClassification(t *testing.T) {
	cases := map[string]bool{
		"8.8.8.8":     false,
		"1.1.1.1":     false,
		"127.0.0.1":   true,
		"10.1.2.3":    true,
		"172.20.1.1":  true,
		"192.168.0.1": true,
		"169.254.1.1": true,
		"::1":         true,
		"fd00::1":     true,
	}
	for raw, want := range cases {
		ip := net.ParseIP(raw)
		if ip == nil {
			t.Fatalf("bad test IP %q", raw)
		}
		if got := isBlockedIP(ip); got != want {
			t.Errorf("%s: got %v want %v", raw, got, want)
		}
	}
}
