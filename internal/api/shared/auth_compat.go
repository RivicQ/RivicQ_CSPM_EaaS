package shared

import (
	"strings"
)

// authUserResponse is the user shape the web client expects from /auth routes
// and OAuth callbacks.
type authUserResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role,omitempty"`
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
