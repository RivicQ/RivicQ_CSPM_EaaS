package goldenrsa

import (
	"crypto/rand"
	"crypto/rsa"
)

// Compliant RSA-2048 usage. Classified, not automatically marked vulnerable.
func generateRSA2048() (*rsa.PrivateKey, error) {
	return rsa.GenerateKey(rand.Reader, 2048)
}
