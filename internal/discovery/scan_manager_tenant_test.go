package discovery

import (
	"testing"

	"github.com/rivic-q/cryptobom-saas/internal/tenant"
)

func TestScanManagerIsolatesTenants(t *testing.T) {
	sm := NewScanManager()
	a := sm.StartScanForTenant("tenant-a", "example.com", "website")
	b := sm.StartScanForTenant("tenant-b", "example.com", "website")

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
	job := sm.StartScan("127.0.0.1", "quick")
	if tenant.Normalize(job.TenantID) != tenant.PublicTenantID {
		t.Fatalf("StartScan tenant %q", job.TenantID)
	}
	if _, ok := sm.GetScanForTenant(tenant.PublicTenantID, job.ID); !ok {
		t.Fatal("public GetScanForTenant missed job")
	}
}

func TestScanManagerIgnoresEmptyTenantAsPublic(t *testing.T) {
	sm := NewScanManager()
	job := sm.StartScanForTenant("", "127.0.0.1", "quick")
	if _, ok := sm.GetScanForTenant(tenant.PublicTenantID, job.ID); !ok {
		t.Fatal("empty tenant must normalize to public")
	}
}
