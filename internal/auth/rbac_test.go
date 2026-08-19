package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRoleAtLeast(t *testing.T) {
	if !RoleAtLeast("admin", "viewer") {
		t.Fatal("admin should satisfy viewer")
	}
	if RoleAtLeast("viewer", "operator") {
		t.Fatal("viewer must not satisfy operator")
	}
	if !RoleAtLeast("analyst", "analyst") {
		t.Fatal("equal roles should pass")
	}
	if NormalizeRole("nope") != "viewer" {
		t.Fatal("unknown roles collapse to viewer")
	}
}

func TestRequireRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("role", c.Query("role"))
	})
	r.GET("/admin", RequireRole("admin"), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/admin?role=viewer", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("viewer: status %d", w.Code)
	}

	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/admin?role=admin", nil)
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusNoContent {
		t.Fatalf("admin: status %d", w2.Code)
	}
}
