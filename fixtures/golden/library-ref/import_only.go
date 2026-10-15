package goldenlib

import _ "crypto/rsa"

// Import-only RSA reference. Library presence, not confirmed key generation.
var _ = (*struct{})(nil)
