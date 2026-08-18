package cryptotest

import (
	"crypto/md5"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/tls"
)

// Known cryptographic patterns for deterministic CBOM tests.
// These are fixtures, not production code.

func generateWeakRSA() (*rsa.PrivateKey, error) {
	return rsa.GenerateKey(rand.Reader, 1024)
}

func md5sum(b []byte) []byte {
	h := md5.New()
	h.Write(b)
	return h.Sum(nil)
}

func sha1sum(b []byte) []byte {
	h := sha1.New()
	h.Write(b)
	return h.Sum(nil)
}

func insecureTLS() *tls.Config {
	return &tls.Config{MinVersion: tls.VersionTLS10}
}

const legacyCipher = "des-ede3-cbc"
