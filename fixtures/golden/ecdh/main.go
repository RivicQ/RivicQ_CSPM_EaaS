package goldenecdh

import (
	"crypto/ecdh"
	"crypto/rand"
)

// ECDH / X25519 library usage for CBOM inventory tests. Declared, not executed at scan time.
func x25519Key() (*ecdh.PrivateKey, error) {
	return ecdh.X25519().GenerateKey(rand.Reader)
}
