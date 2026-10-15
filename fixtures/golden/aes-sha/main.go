package goldenaes

import (
	"crypto/aes"
	"crypto/sha256"
)

// AES-256 and SHA-256 are inventoried. They must not BLOCK.
func sum(key, b []byte) ([]byte, error) {
	if _, err := aes.NewCipher(key); err != nil {
		return nil, err
	}
	h := sha256.Sum256(b)
	return h[:], nil
}
