//go:build enterprise

package enterprise

import (
	"os"
	"testing"
)

// TestMain provides the environment the auth store requires.
//
// The store has no default password in any mode, and demo mode has to be
// requested explicitly, so this package could not run at all without it. The
// enterprise test binary was therefore never exercising the routes it claims to
// cover.
func TestMain(m *testing.M) {
	os.Setenv("RIVICQ_ALLOW_DEMO_MODE", "true")
	os.Setenv("AUTH_BOOTSTRAP_PASSWORD", "Enterprise-Test-Passphrase-42!")
	os.Setenv("JWT_SECRET", testJWTSecret)
	code := m.Run()
	os.Exit(code)
}
