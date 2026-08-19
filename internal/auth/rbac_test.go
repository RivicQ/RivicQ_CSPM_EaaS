package auth

import "testing"

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
