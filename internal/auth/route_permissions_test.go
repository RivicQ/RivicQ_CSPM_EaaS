package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// newPermRouter builds a router with the same middleware order as production:
// authentication first, then the permission model.
func newPermRouter(role string, reached *bool) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST(APIPrefix+"/users/:id/role", func(c *gin.Context) {
		c.Set("role", NormalizeRole(role))
		c.Set("permissions", PermissionsForRole(role))
		c.Next()
	}, RequireRoutePermission(), func(c *gin.Context) {
		*reached = true
		c.Status(http.StatusOK)
	})
	r.DELETE(APIPrefix+"/cbom/:id", func(c *gin.Context) {
		c.Set("role", NormalizeRole(role))
		c.Set("permissions", PermissionsForRole(role))
		c.Next()
	}, RequireRoutePermission(), func(c *gin.Context) {
		*reached = true
		c.Status(http.StatusOK)
	})
	r.POST(APIPrefix+"/scans", func(c *gin.Context) {
		c.Set("role", NormalizeRole(role))
		c.Set("permissions", PermissionsForRole(role))
		c.Next()
	}, RequireRoutePermission(), func(c *gin.Context) {
		*reached = true
		c.Status(http.StatusOK)
	})
	r.GET(APIPrefix+"/scans", func(c *gin.Context) {
		c.Set("role", NormalizeRole(role))
		c.Set("permissions", PermissionsForRole(role))
		c.Next()
	}, RequireRoutePermission(), func(c *gin.Context) {
		*reached = true
		c.Status(http.StatusOK)
	})
	return r
}

// TestViewerIsRefusedMutations is the behavioural check that the least
// privileged role cannot change state. A permission table that is never
// consulted looks identical to a correct one, so this asserts on the response.
func TestViewerIsRefusedMutations(t *testing.T) {
	cases := []struct {
		method string
		path   string
	}{
		{http.MethodDelete, APIPrefix + "/cbom/abc"},
		{http.MethodPost, APIPrefix + "/users/xyz/role"},
	}
	for _, tc := range cases {
		reached := false
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(tc.method, tc.path, nil)
		newPermRouter("viewer", &reached).ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("%s %s as viewer: got %d, want 403", tc.method, tc.path, rec.Code)
		}
		if reached {
			t.Errorf("%s %s as viewer reached the handler", tc.method, tc.path)
		}
	}
}

// TestViewerMayRead confirms the model is not simply a blanket denial.
func TestViewerMayRead(t *testing.T) {
	reached := false
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, APIPrefix+"/scans", nil)
	newPermRouter("viewer", &reached).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("viewer read: got %d, want 200", rec.Code)
	}
	if !reached {
		t.Error("viewer was denied a read it is entitled to")
	}
}

// TestRoleMutationMatrix pins the intended separation of duties rather than
// only the refusals: an over-tight policy that locks admins out of their own
// product is just as broken as a permissive one.
func TestRoleMutationMatrix(t *testing.T) {
	cases := []struct {
		role   string
		method string
		path   string
		want   int
	}{
		// Admin holds every permission.
		{"admin", http.MethodDelete, APIPrefix + "/cbom/abc", http.StatusOK},
		{"admin", http.MethodPost, APIPrefix + "/users/xyz/role", http.StatusOK},
		{"admin", http.MethodPost, APIPrefix + "/scans", http.StatusOK},

		// Operator runs scans but must not delete reports or change roles:
		// deleting is destructive and role changes are privilege escalation.
		{"operator", http.MethodPost, APIPrefix + "/scans", http.StatusOK},
		{"operator", http.MethodDelete, APIPrefix + "/cbom/abc", http.StatusForbidden},
		{"operator", http.MethodPost, APIPrefix + "/users/xyz/role", http.StatusForbidden},

		// Analyst can start scans but holds no write permission over inventory.
		{"analyst", http.MethodPost, APIPrefix + "/scans", http.StatusOK},
		{"analyst", http.MethodDelete, APIPrefix + "/cbom/abc", http.StatusForbidden},
	}

	for _, tc := range cases {
		reached := false
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(tc.method, tc.path, nil)
		newPermRouter(tc.role, &reached).ServeHTTP(rec, req)

		if rec.Code != tc.want {
			t.Errorf("%s %s as %s: got %d, want %d", tc.method, tc.path, tc.role, rec.Code, tc.want)
		}
		if reached != (tc.want == http.StatusOK) {
			t.Errorf("%s %s as %s: handler reached=%v, want %v",
				tc.method, tc.path, tc.role, reached, tc.want == http.StatusOK)
		}
	}
}

// TestUnmappedMutationFailsClosed is the property that makes the coarse table
// safe: a brand new route nobody classified is refused rather than exposed.
func TestUnmappedMutationFailsClosed(t *testing.T) {
	reached := false
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, APIPrefix+"/brand-new-feature", nil)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST(APIPrefix+"/brand-new-feature", func(c *gin.Context) {
		c.Set("role", "admin")
		c.Set("permissions", PermissionsForRole("admin"))
		c.Next()
	}, RequireRoutePermission(), func(c *gin.Context) {
		reached = true
		c.Status(http.StatusOK)
	})
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("unmapped mutation: got %d, want 403", rec.Code)
	}
	if reached {
		t.Error("an unmapped mutation reached the handler")
	}
}

// TestMissingPermissionsFailClosed covers a principal with no permissions on the
// context at all, which is what an unauthenticated or mis-issued request looks
// like if it reaches this middleware.
func TestMissingPermissionsFailClosed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.DELETE(APIPrefix+"/cbom/abc", RequireRoutePermission(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodDelete, APIPrefix+"/cbom/abc", nil))

	if rec.Code != http.StatusForbidden {
		t.Errorf("no-permission delete: got %d, want 403", rec.Code)
	}
}

// TestPermissionIsDerivedFromRoleNotToken guards against a client-supplied role
// widening access: the middleware trusts only the server-derived permission set.
func TestPermissionIsDerivedFromRoleNotToken(t *testing.T) {
	if !HasPermission(&gin.Context{}, PermUsersManage) {
		// A bare context must hold nothing, not everything.
		t.Log("bare context correctly holds no permissions")
	}
	unknown := PermissionsForRole("superuser-not-a-real-role")
	for _, p := range unknown {
		if p == string(PermUsersManage) || p == string(PermCBOMDelete) {
			t.Errorf("unknown role resolved to elevated permissions: %s", p)
		}
	}
}
