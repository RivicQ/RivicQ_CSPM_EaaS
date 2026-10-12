package cryptotestec

import (
	"crypto/ecdh"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
)

// Known elliptic-curve / ECDH / PQC markers for deterministic CBOM tests.
// These are fixtures, not production code. No keys are generated at scan time.

func ecdsaP256() (*ecdsa.PrivateKey, error) {
	return ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
}

func ecdhX25519() (*ecdh.PrivateKey, error) {
	return ecdh.X25519().GenerateKey(rand.Reader)
}

func parsePublic(k any) (any, error) {
	return x509.ParsePKIXPublicKey(nil)
}

// PQC-era algorithm identifiers (declared, not executed).
const (
	kemLabel = "ML-KEM-768"
	sigLabel = "ML-DSA-65"
	slhLabel = "SLH-DSA-SHA2-128s"
)
