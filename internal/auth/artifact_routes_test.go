package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// permContext builds a gin context carrying a role's permission set, mirroring
// what the JWT middleware installs in production.
func permContext(role string) *gin.Context {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Set("role", NormalizeRole(role))
	c.Set("permissions", PermissionsForRole(role))
	return c
}

// TestArtifactRoutesAreGoverned pins the authorization of the firmware/identity
// analysis routes: reads are CBOM metadata, and triggering an analysis requires
// the same capability as starting a scan. A POST that were unmapped would fail
// closed at runtime, so this keeps the route table and the product aligned.
func TestArtifactRoutesAreGoverned(t *testing.T) {
	cases := []struct {
		method string
		path   string
		want   Permission
	}{
		{http.MethodPost, APIPrefix + "/firmware/analyze", PermScansStart},
		{http.MethodPost, APIPrefix + "/firmware/compare", PermScansStart},
		{http.MethodPost, APIPrefix + "/identity/analyze", PermScansStart},
		{http.MethodGet, APIPrefix + "/firmware/profiles", PermCBOMRead},
		{http.MethodGet, APIPrefix + "/firmware/limits", PermCBOMRead},
		{http.MethodGet, APIPrefix + "/identity/profiles", PermCBOMRead},
		{http.MethodGet, APIPrefix + "/identity/limits", PermCBOMRead},
	}
	for _, tc := range cases {
		perm, governed := RequiredPermission(tc.method, tc.path)
		if !governed {
			t.Errorf("%s %s is ungoverned; a mutation would fail closed at runtime", tc.method, tc.path)
			continue
		}
		if perm != tc.want {
			t.Errorf("%s %s: got %q, want %q", tc.method, tc.path, perm, tc.want)
		}
	}

	// A viewer holds cbom:read but not scans:start: reads pass, mutations do not.
	if !HasPermission(permContext("viewer"), PermCBOMRead) {
		t.Error("viewer should hold cbom:read for artifact metadata reads")
	}
	if HasPermission(permContext("viewer"), PermScansStart) {
		t.Error("viewer must not hold scans:start")
	}
	if !HasPermission(permContext("analyst"), PermScansStart) {
		t.Error("analyst should be able to start an artifact analysis")
	}
}
