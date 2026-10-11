package firmware

import "github.com/rivic-q/cryptobom-saas/internal/cryptoscan"

// Type aliases keep the firmware report API stable while the vendor-neutral
// detection core lives in internal/cryptoscan (shared with identity/config).
type (
	LibraryFinding   = cryptoscan.LibraryFinding
	AlgorithmFinding = cryptoscan.AlgorithmFinding
	APIFinding       = cryptoscan.APIFinding
	ProtocolFinding  = cryptoscan.ProtocolFinding
	RuleFinding      = cryptoscan.RuleFinding
	Detection        = cryptoscan.Detection
	Surface          = cryptoscan.Surface
)

// ExtractStrings re-exports the shared printable-string extractor.
func ExtractStrings(data []byte, minLen, max int) []string {
	return cryptoscan.ExtractStrings(data, minLen, max)
}

// NewSurface re-exports the shared search surface.
func NewSurface(strs []string) *Surface { return cryptoscan.NewSurface(strs) }

func riskFromPQC(status string) string { return cryptoscan.RiskFromPQC(status) }
