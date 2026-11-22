package shared

import (
	"github.com/rivic-q/cryptobom-saas/internal/edition"
)

// serverAuthEdition returns the server-derived entitlement for this running build.
// Client-supplied edition values are intentionally ignored.
func serverAuthEdition() string {
	if edition.Detect().Edition == edition.Enterprise {
		return "enterprise"
	}
	return "oss"
}
