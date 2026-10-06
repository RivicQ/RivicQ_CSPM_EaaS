package discovery

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// ErrTargetBlocked is returned when a scan target is not permitted.
//
// The scanner accepts network hosts and local repository paths. Both are
// attacker-controlled inputs from an authenticated API caller, so each is
// validated before any socket or file is touched:
//
//   - Local paths are confined to an explicit allow-list of directories.
//   - Network targets must not resolve to loopback, link-local, private,
//     multicast, or cloud metadata addresses unless explicitly allowed.
var ErrTargetBlocked = fmt.Errorf("scan target is not permitted")

// ErrLocalPathDisabled is returned when a local path scan is attempted while
// filesystem scanning is disabled.
var ErrLocalPathDisabled = fmt.Errorf("local path scanning is disabled")

// TargetPolicy bounds what the scanner may reach.
type TargetPolicy struct {
	// AllowLocalPaths enables repository/filesystem scans.
	AllowLocalPaths bool
	// LocalPathRoots are the only directories a local scan may read. Empty
	// means the operator opted out of local scanning entirely.
	LocalPathRoots []string
	// AllowPrivateNetworks permits RFC1918 and other non-global addresses.
	AllowPrivateNetworks bool
	// AllowedHosts is an exact-match host allow-list. Empty means any host that
	// passes the address checks.
	AllowedHosts []string
}

// DefaultTargetPolicy is deliberately restrictive: no local filesystem access
// and no private/link-local destinations.
//
// Scanning 127.0.0.1 is therefore refused unless an operator opts in, which is
// the right default for a hosted deployment.
func DefaultTargetPolicy() TargetPolicy {
	return TargetPolicy{
		AllowLocalPaths:      false,
		LocalPathRoots:       nil,
		AllowPrivateNetworks: false,
		AllowedHosts:         nil,
	}
}

// PolicyFromEnv builds a policy from environment variables.
//
//	RIVICQ_SCAN_ALLOW_LOCAL_PATHS   "true" to enable filesystem scans
//	RIVICQ_SCAN_LOCAL_PATH_ROOTS    comma-separated absolute directory allow-list
//	RIVICQ_SCAN_ALLOW_PRIVATE_NETS  "true" to permit RFC1918/loopback targets
//	RIVICQ_SCAN_ALLOWED_HOSTS       comma-separated exact host allow-list
func PolicyFromEnv() TargetPolicy {
	p := DefaultTargetPolicy()
	if envBool("RIVICQ_SCAN_ALLOW_LOCAL_PATHS") {
		p.AllowLocalPaths = true
	}
	p.LocalPathRoots = splitList(os.Getenv("RIVICQ_SCAN_LOCAL_PATH_ROOTS"))
	if envBool("RIVICQ_SCAN_ALLOW_PRIVATE_NETS") {
		p.AllowPrivateNetworks = true
	}
	p.AllowedHosts = splitList(os.Getenv("RIVICQ_SCAN_ALLOWED_HOSTS"))
	return p
}

func envBool(key string) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(key))) {
	case "1", "true", "yes", "on":
		return true
	}
	return false
}

func splitList(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if v := strings.TrimSpace(part); v != "" {
			out = append(out, v)
		}
	}
	return out
}

// ValidateTarget checks a scan target against the policy without performing any
// network or filesystem access.
func (p TargetPolicy) ValidateTarget(target string) error {
	raw := strings.TrimSpace(target)
	if raw == "" {
		return fmt.Errorf("%w: target is empty", ErrTargetBlocked)
	}
	if len(raw) > 512 {
		return fmt.Errorf("%w: target is too long", ErrTargetBlocked)
	}

	if looksLikeLocalPath(raw) {
		return p.validateLocalPath(raw)
	}
	return p.validateNetworkTarget(raw)
}

// looksLikeLocalPath mirrors the classification in normalizeTarget so the
// policy check and the scanner agree on what a path is.
func looksLikeLocalPath(raw string) bool {
	switch {
	case raw == ".", raw == "..":
		return true
	case strings.HasPrefix(raw, "./"), strings.HasPrefix(raw, "../"),
		strings.HasPrefix(raw, "/"), strings.HasPrefix(raw, "~"):
		return true
	case strings.HasPrefix(raw, `\\`):
		return true
	}
	return false
}

// expandUser resolves a leading ~ using the current user's home directory.
func expandUser(raw string) string {
	if !strings.HasPrefix(raw, "~") {
		return raw
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return raw
	}
	if raw == "~" {
		return home
	}
	if strings.HasPrefix(raw, "~/") || strings.HasPrefix(raw, `~\`) {
		return filepath.Join(home, raw[2:])
	}
	return raw
}

func (p TargetPolicy) validateLocalPath(raw string) error {
	if !p.AllowLocalPaths {
		return fmt.Errorf("%w: %w (set RIVICQ_SCAN_ALLOW_LOCAL_PATHS=true to enable)", ErrTargetBlocked, ErrLocalPathDisabled)
	}
	if len(p.LocalPathRoots) == 0 {
		return fmt.Errorf("%w: local path scanning requires RIVICQ_SCAN_LOCAL_PATH_ROOTS", ErrTargetBlocked)
	}

	expanded := expandUser(raw)
	abs, err := filepath.Abs(expanded)
	if err != nil {
		return fmt.Errorf("%w: cannot resolve path", ErrTargetBlocked)
	}
	abs = resolveExistingPrefix(abs)

	for _, root := range p.LocalPathRoots {
		rootAbs, err := filepath.Abs(expandUser(root))
		if err != nil {
			continue
		}
		rootAbs = resolveExistingPrefix(rootAbs)
		if pathWithinRoot(rootAbs, abs) {
			return nil
		}
	}
	return fmt.Errorf("%w: path %q is outside the allowed roots", ErrTargetBlocked, raw)
}

// resolveExistingPrefix resolves symlinks on the deepest existing ancestor of
// path and re-appends the remainder.
//
// filepath.EvalSymlinks fails outright when the leaf does not exist, which
// would leave an unresolved prefix that can disagree with an equally unresolved
// root. Resolving the longest existing prefix keeps both sides comparable.
func resolveExistingPrefix(path string) string {
	remaining := ""
	current := path
	for {
		if resolved, err := filepath.EvalSymlinks(current); err == nil {
			if remaining == "" {
				return resolved
			}
			return filepath.Join(resolved, remaining)
		}
		parent := filepath.Dir(current)
		if parent == current {
			return path
		}
		remaining = filepath.Join(filepath.Base(current), remaining)
		current = parent
	}
}

// pathWithinRoot reports whether target is root or sits beneath it. Both are
// expected to be absolute and already symlink-resolved.
func pathWithinRoot(root, target string) bool {
	if root == target {
		return true
	}
	rel, err := filepath.Rel(root, target)
	if err != nil {
		return false
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return false
	}
	return !filepath.IsAbs(rel)
}

func (p TargetPolicy) validateNetworkTarget(raw string) error {
	host, port := hostAndPort(raw)
	if host == "" {
		return fmt.Errorf("%w: cannot determine host from %q", ErrTargetBlocked, raw)
	}

	if len(p.AllowedHosts) > 0 {
		allowed := false
		for _, h := range p.AllowedHosts {
			if strings.EqualFold(h, host) {
				allowed = true
				break
			}
		}
		if !allowed {
			return fmt.Errorf("%w: host %q is not in RIVICQ_SCAN_ALLOWED_HOSTS", ErrTargetBlocked, host)
		}
		return nil
	}

	if p.AllowPrivateNetworks {
		return nil
	}

	lower := strings.ToLower(host)
	// Known cloud metadata endpoints are blocked regardless of DNS so a
	// rebinding attacker cannot reach them.
	for _, meta := range []string{
		"169.254.169.254",
		"metadata.google.internal",
		"metadata.goog",
		"instance-data.ec2.internal",
		"100.100.100.200",
	} {
		if lower == meta {
			return fmt.Errorf("%w: cloud metadata endpoint %q", ErrTargetBlocked, meta)
		}
	}
	if strings.HasSuffix(lower, ".internal") || strings.HasSuffix(lower, ".local") {
		return fmt.Errorf("%w: internal hostname %q", ErrTargetBlocked, host)
	}

	// Bound egress regardless of whether the destination is a literal IP or a
	// resolved hostname.
	if port != 0 && !isCommonScanPort(port) {
		return fmt.Errorf("%w: port %d is not permitted", ErrTargetBlocked, port)
	}

	if ip := net.ParseIP(host); ip != nil {
		if isBlockedIP(ip) {
			return fmt.Errorf("%w: address %s is not a permitted destination", ErrTargetBlocked, ip)
		}
		return nil
	}

	// Hostname: resolve once and require every answer to be globally routable.
	// This is best effort — the scanner re-checks at connect time would be the
	// only complete defence against DNS rebinding.
	ips, err := net.LookupIP(host)
	if err != nil {
		// Unresolvable is not a policy violation; the scanner will report it.
		return nil
	}
	for _, ip := range ips {
		if isBlockedIP(ip) {
			return fmt.Errorf("%w: host %q resolves to non-public address %s", ErrTargetBlocked, host, ip)
		}
	}

	return nil
}

// isBlockedIP reports whether an address is outside the globally routable
// public space.
func isBlockedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsInterfaceLocalMulticast() || ip.IsMulticast() {
		return true
	}
	if ip.IsPrivate() {
		return true
	}
	// Carrier-grade NAT, benchmarking, documentation and reserved blocks are not
	// legitimate scan targets.
	for _, cidr := range []string{
		"100.64.0.0/10", // CGNAT
		"192.0.0.0/24",  // IETF protocol assignments
		"192.0.2.0/24",  // TEST-NET-1
		"198.18.0.0/15", // benchmarking
		"198.51.100.0/24",
		"203.0.113.0/24",
		"240.0.0.0/4", // reserved
		"::/128",
		"64:ff9b::/96", // NAT64
	} {
		if _, network, err := net.ParseCIDR(cidr); err == nil && network.Contains(ip) {
			return true
		}
	}
	return false
}

// isCommonScanPort bounds which TCP ports a caller may probe.
func isCommonScanPort(port int) bool {
	switch port {
	case 80, 443, 22, 2222, 8443, 4433, 4443, 9443, 8080, 8000, 5000, 9000, 8081, 8082:
		return true
	}
	return false
}

// hostAndPort extracts a host and optional numeric port from a scan target.
func hostAndPort(raw string) (string, int) {
	value := raw
	if strings.Contains(value, "://") {
		if u, err := url.Parse(value); err == nil && u.Hostname() != "" {
			value = u.Host
		}
	}
	if h, p, err := net.SplitHostPort(value); err == nil {
		port, _ := strconv.Atoi(p)
		return strings.Trim(h, "[]"), port
	}
	return strings.Trim(value, "[]"), 0
}
