package discovery

import (
	"context"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type ScanJob struct {
	ID        string      `json:"id"`
	AssetID   string      `json:"asset_id,omitempty"`
	Target    string      `json:"target"`
	ScanType  string      `json:"scan_type"`
	Status    string      `json:"status"`
	Progress  int         `json:"progress"`
	Result    *ScanResult `json:"result,omitempty"`
	Error     string      `json:"error,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

// PersistFunc persists a completed scan result and returns a stable asset ID
// for the scanned target. It is optional; when nil the result stays in memory.
type PersistFunc func(job *ScanJob, result *ScanResult) (string, error)

type ScanManager struct {
	mu        sync.RWMutex
	jobs      map[string]*ScanJob
	results   map[string]*ScanResult // assetID -> latest completed result
	scanner   *Scanner
	persistFn PersistFunc
}

func NewScanManager() *ScanManager {
	return &ScanManager{
		jobs:    make(map[string]*ScanJob),
		results: make(map[string]*ScanResult),
		scanner: NewScanner(),
	}
}

// SetPersistFunc installs a persistence callback invoked when a scan completes.
func (sm *ScanManager) SetPersistFunc(fn PersistFunc) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.persistFn = fn
}

// AssetIDFor returns a stable, deterministic asset identifier for a target.
func (sm *ScanManager) AssetIDFor(target string) string {
	return uuid.NewSHA1(uuid.NameSpaceURL, []byte(strings.TrimSpace(target))).String()
}

// GetResult returns the latest completed scan result for an asset.
func (sm *ScanManager) GetResult(assetID string) (*ScanResult, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	result, ok := sm.results[assetID]
	return result, ok
}

func (sm *ScanManager) StartScan(target, scanType string) *ScanJob {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	assetID := sm.AssetIDFor(target)
	job := &ScanJob{
		ID:        uuid.New().String(),
		AssetID:   assetID,
		Target:    target,
		ScanType:  scanType,
		Status:    "pending",
		Progress:  0,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	sm.jobs[job.ID] = job

	go sm.executeScan(job)
	return job
}

func (sm *ScanManager) executeScan(job *ScanJob) {
	sm.mu.Lock()
	job.Status = "running"
	job.Progress = 10
	sm.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	targets := buildTargets(job.Target, job.ScanType)

	sm.mu.Lock()
	job.Progress = 30
	sm.mu.Unlock()

	result, err := sm.scanner.ScanAll(ctx, targets)

	sm.mu.Lock()
	defer sm.mu.Unlock()

	job.UpdatedAt = time.Now()
	if err != nil {
		job.Status = "failed"
		job.Error = err.Error()
		job.Progress = 0
		return
	}

	job.Result = result
	job.Status = "completed"
	job.Progress = 100

	assetID := job.AssetID
	if assetID == "" {
		assetID = sm.AssetIDFor(job.Target)
		job.AssetID = assetID
	}

	if sm.persistFn != nil {
		if persisted, perr := sm.persistFn(job, result); perr == nil && persisted != "" {
			job.AssetID = persisted
		}
	}

	// Keep the latest result indexed by asset so GetAssetBOM can resolve it
	// even when persistence is unavailable (demo mode).
	sm.results[job.AssetID] = result
}

func (sm *ScanManager) GetScan(id string) (*ScanJob, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	job, ok := sm.jobs[id]
	if !ok {
		return nil, false
	}
	// Return a snapshot so callers can read mutable fields without the lock.
	snapshot := *job
	return &snapshot, true
}

func (sm *ScanManager) ListScans() []*ScanJob {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	scans := make([]*ScanJob, 0, len(sm.jobs))
	for _, j := range sm.jobs {
		scans = append(scans, j)
	}
	return scans
}

// buildTargets converts a scan target into the scanner work list. It supports
// local repositories / files (SBOM scan), hostnames, IP addresses, host:port
// endpoints, website URLs, declared Kubernetes pods, and declared hardware
// (HSM/TPM/QSIC). The scan type adjusts the target set:
//
//	quick       – TLS + SSH only (TLS + HTTPS when the target is a website)
//	website     – TLS + HTTP(S) on the URL port; SSH is skipped
//	host / ip / server – TLS + SSH + HTTP on the resolved address
//	pod / k8s   – declared Kubernetes inventory; TLS/HTTPS if a host is given
//	hardware    – declared HSM/TPM/QSIC inventory (not firmware RE)
//	cbom        – TLS + SSH + HTTP, or TLS + HTTP(S) for website URLs
//	full        – TLS + SSH + HTTP(S) (+ SBOM when the target is a local path)
//	compliance  – same resource set as cbom
//
// Website URLs (http(s)://, www.*, or scan_type=website) enable HTTPS header
// detection on port 443 instead of probing http://host:80. SSH is omitted
// unless scan_type is "full", so a public website scan does not wait on :22.
func buildTargets(target, scanType string) []Target {
	class := ClassifyTarget(target, scanType)
	var targets []Target
	idx := 0
	nextID := func() string {
		idx++
		return "target-" + strconv.Itoa(idx)
	}

	switch class {
	case ClassHardware:
		label := parseHardwareLabel(target)
		return []Target{{
			ID:       nextID(),
			Host:     "declared",
			Protocol: "hardware",
			Kind:     string(ClassHardware),
			Label:    "Hardware inventory: " + label,
			Path:     label,
		}}
	case ClassPod:
		spec := parsePodTarget(target)
		targets = append(targets, Target{
			ID:        nextID(),
			Host:      spec.Host,
			Protocol:  "k8s",
			Kind:      string(ClassPod),
			Label:     "K8s inventory: " + spec.Namespace + "/" + spec.Workload,
			Namespace: spec.Namespace,
			Workload:  spec.Workload,
		})
		if spec.Host != "" {
			nested := buildTargets(spec.Host, "website")
			targets = append(targets, nested...)
		}
		return targets
	}

	host, port, path := normalizeTarget(target)
	website := class == ClassWebsite || isWebsiteTarget(target, scanType)
	scheme := httpSchemeFor(target, port)
	rawLower := strings.ToLower(strings.TrimSpace(target))
	if website && !strings.HasPrefix(rawLower, "http://") && scheme != "https" {
		scheme = "https"
	}

	isLocal := path != "" && (isDir(path) || isFile(path))

	if isLocal {
		targets = append(targets, Target{
			ID:       nextID(),
			Host:     "local",
			Path:     path,
			Protocol: "sbom",
			Kind:     string(ClassPath),
			Label:    "SBOM Scan: " + target,
		})
		if scanType != "full" {
			return targets
		}
		host = "localhost"
		port = 0
		website = false
		scheme = "http"
	}

	if port == 0 {
		if scheme == "http" {
			port = 80
		} else {
			port = 443
		}
	}

	if host == "" {
		return targets
	}

	kind := string(class)
	if kind == "" {
		kind = string(ClassHost)
	}

	includeSSH := !website || strings.EqualFold(scanType, "full")
	if class == ClassHost || class == ClassIP || class == ClassServer {
		includeSSH = !strings.EqualFold(scanType, "website")
	}
	includeHTTP := website || !strings.EqualFold(scanType, "quick")

	tlsPort := port
	if website && scheme == "http" && port == 80 {
		tlsPort = 443
	}

	targets = append(targets, Target{
		ID:       nextID(),
		Host:     host,
		Port:     tlsPort,
		Protocol: "tls",
		Kind:     kind,
		Label:    "TLS Scan: " + target,
	})
	if includeSSH {
		targets = append(targets, Target{
			ID:       nextID(),
			Host:     host,
			Port:     22,
			Protocol: "ssh",
			Kind:     kind,
			Label:    "SSH Scan: " + target,
		})
	}
	if includeHTTP {
		httpPort := 80
		httpScheme := "http"
		if website {
			httpPort = port
			httpScheme = scheme
			if httpScheme == "" {
				httpScheme = "https"
			}
		}
		targets = append(targets, Target{
			ID:       nextID(),
			Host:     host,
			Port:     httpPort,
			Protocol: "http",
			Scheme:   httpScheme,
			Kind:     kind,
			Label:    strings.ToUpper(httpScheme) + " Scan: " + target,
		})
	}

	return targets
}

func isWebsiteTarget(raw, scanType string) bool {
	if strings.EqualFold(strings.TrimSpace(scanType), "website") {
		return true
	}
	s := strings.ToLower(strings.TrimSpace(raw))
	if strings.Contains(s, "://") || strings.HasPrefix(s, "www.") {
		return true
	}
	return false
}

func httpSchemeFor(raw string, port int) string {
	s := strings.ToLower(strings.TrimSpace(raw))
	if strings.HasPrefix(s, "http://") {
		return "http"
	}
	if strings.HasPrefix(s, "https://") || port == 443 {
		return "https"
	}
	return "http"
}

// ResourcesFromTargets reports which discovery scanners were scheduled.
func ResourcesFromTargets(targets []Target) map[string]bool {
	out := map[string]bool{
		"tls": false, "http": false, "https": false, "ssh": false, "sbom": false,
		"k8s": false, "hardware": false,
	}
	for _, t := range targets {
		p := strings.ToLower(t.Protocol)
		out[p] = true
		if p == "http" && strings.EqualFold(t.Scheme, "https") {
			out["https"] = true
		}
	}
	return out
}

// normalizeTarget strips scheme / trailing slashes and resolves a host, port and
// local filesystem path from the raw scan target.
func normalizeTarget(target string) (host string, port int, path string) {
	raw := strings.TrimSpace(target)
	if raw == "" {
		return "localhost", 0, ""
	}

	// Local path (directory or file) – resolve relative to the working directory.
	if strings.HasPrefix(raw, "./") || strings.HasPrefix(raw, "../") || raw == "." || raw == ".." ||
		strings.HasPrefix(raw, "/") || strings.HasPrefix(raw, "~") {
		if strings.HasPrefix(raw, "~") {
			home, err := os.UserHomeDir()
			if err == nil {
				raw = filepath.Join(home, strings.TrimPrefix(raw, "~"))
			}
		}
		abs, err := filepath.Abs(raw)
		if err == nil {
			raw = abs
		}
		if isDir(raw) || isFile(raw) {
			return "local", 0, raw
		}
	}

	// URL (http/https).
	if strings.Contains(raw, "://") {
		if u, err := url.Parse(raw); err == nil && u.Hostname() != "" {
			h := u.Hostname()
			if p := u.Port(); p != "" {
				if n, perr := strconv.Atoi(p); perr == nil {
					return h, n, ""
				}
			}
			if u.Scheme == "https" {
				return h, 443, ""
			}
			return h, 80, ""
		}
	}

	if isIPHost(raw) {
		return strings.Trim(raw, "[]"), 0, ""
	}

	// host:port or [ipv6]:port.
	if h, p, err := splitHostPortFlexible(raw); err == nil {
		return h, p, ""
	}

	return raw, 0, ""
}

func parseTargetHostPort(hostPort string) (string, int, error) {
	parts := strings.Split(hostPort, ":")
	if len(parts) != 2 {
		return "", 0, os.ErrInvalid
	}
	port, err := strconv.Atoi(parts[1])
	if err != nil {
		return "", 0, err
	}
	return parts[0], port, nil
}

func isDir(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func isFile(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

var defaultScanManager = NewScanManager()

func GetScanManager() *ScanManager {
	return defaultScanManager
}
