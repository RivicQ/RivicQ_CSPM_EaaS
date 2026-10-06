package discovery

import (
	"errors"
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/tenant"
)

// permissivePolicy lets these tests address loopback without weakening the
// production default, which blocks private and loopback destinations.
func permissivePolicy() TargetPolicy {
	return TargetPolicy{
		AllowLocalPaths:      false,
		AllowPrivateNetworks: true,
	}
}

func TestScanManagerIsolatesTenants(t *testing.T) {
	sm := NewScanManager()
	a, err := sm.StartScanForTenant("tenant-a", "example.com", "website")
	if err != nil {
		t.Fatalf("tenant-a scan: %v", err)
	}
	b, err := sm.StartScanForTenant("tenant-b", "example.com", "website")
	if err != nil {
		t.Fatalf("tenant-b scan: %v", err)
	}

	if a.ID == b.ID {
		t.Fatal("scan IDs must be unique")
	}
	if _, ok := sm.GetScanForTenant("tenant-a", b.ID); ok {
		t.Fatal("tenant-a must not read tenant-b scan")
	}
	if _, ok := sm.GetScanForTenant("tenant-b", a.ID); ok {
		t.Fatal("tenant-b must not read tenant-a scan")
	}
	got, ok := sm.GetScanForTenant("tenant-a", a.ID)
	if !ok || got.ID != a.ID {
		t.Fatal("tenant-a must read its own scan")
	}
	if _, ok := sm.GetScanForTenant(tenant.PublicTenantID, a.ID); ok {
		t.Fatal("public tenant must not read tenant-a scan")
	}

	listA := sm.ListScansForTenant("tenant-a")
	if len(listA) != 1 || listA[0].ID != a.ID {
		t.Fatalf("tenant-a list = %#v", listA)
	}
	listPub := sm.ListScansForTenant(tenant.PublicTenantID)
	for _, job := range listPub {
		if job.ID == a.ID || job.ID == b.ID {
			t.Fatal("public list leaked a private scan")
		}
	}
}

func TestScanManagerPublicStartScan(t *testing.T) {
	sm := NewScanManager()
	sm.SetPolicy(permissivePolicy())
	job, err := sm.StartScan("127.0.0.1", "quick")
	if err != nil {
		t.Fatalf("start: %v", err)
	}
	if tenant.Normalize(job.TenantID) != tenant.PublicTenantID {
		t.Fatalf("StartScan tenant %q", job.TenantID)
	}
	if _, ok := sm.GetScanForTenant(tenant.PublicTenantID, job.ID); !ok {
		t.Fatal("public GetScanForTenant missed job")
	}
}

func TestScanManagerIgnoresEmptyTenantAsPublic(t *testing.T) {
	sm := NewScanManager()
	sm.SetPolicy(permissivePolicy())
	job, err := sm.StartScanForTenant("", "127.0.0.1", "quick")
	if err != nil {
		t.Fatalf("start: %v", err)
	}
	if _, ok := sm.GetScanForTenant(tenant.PublicTenantID, job.ID); !ok {
		t.Fatal("empty tenant must normalize to public")
	}
}

// TestScanManagerBlocksLoopbackByDefault pins the SSRF guard: a caller cannot
// use the scanner to reach services bound to the host's own loopback.
func TestScanManagerBlocksLoopbackByDefault(t *testing.T) {
	sm := NewScanManager()
	for _, target := range []string{
		"127.0.0.1",
		"localhost",
		"http://127.0.0.1:8080",
		"169.254.169.254",
		"10.0.0.5",
		"192.168.1.10",
		"/etc",
		"~/.ssh",
		"../../etc/passwd",
	} {
		if _, err := sm.StartScanForTenant("tenant-a", target, "quick"); !errors.Is(err, ErrTargetBlocked) {
			t.Errorf("target %q: expected ErrTargetBlocked, got %v", target, err)
		}
	}
}
