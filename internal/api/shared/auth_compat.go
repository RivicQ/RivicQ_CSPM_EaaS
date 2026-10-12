package shared

import (
	"strings"

	"github.com/rivic-q/cryptobom-saas/internal/authn"
)

// authUserResponse is the user shape the web client expects from /auth routes
// and OAuth callbacks.
type authUserResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role,omitempty"`
}

// editionForRole normalises a frontend edition request, falling back to the
// highest edition a role is entitled to.
func editionForRole(role, requested string) string {
	if strings.TrimSpace(requested) != "" {
		return normalizeAuthEdition(requested)
	}
	switch authn.Role(role) {
	case authn.RoleAdmin:
		return "enterprise"
	case authn.RoleOperator, authn.RoleAnalyst:
		return "professional"
	default:
		return "oss"
	}
}

// workEmailAllowed reports whether the email's domain is on the operator's
// allow-list. An empty list allows everyone.
func workEmailAllowed(email string, allowedDomains []string) bool {
	if len(allowedDomains) == 0 {
		return true
	}
	_, domain, found := strings.Cut(strings.ToLower(strings.TrimSpace(email)), "@")
	if !found {
		return false
	}
	for _, d := range allowedDomains {
		if strings.EqualFold(strings.TrimSpace(d), domain) {
			return true
		}
	}
	return false
}
