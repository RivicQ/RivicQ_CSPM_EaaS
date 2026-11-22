package eaas

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"fmt"

	"github.com/cloudflare/circl/kem/mlkem/mlkem768"
	"github.com/cloudflare/circl/sign/mldsa/mldsa65"
)

const maxPayloadBytes = 1024 * 1024

// Operation declares a supported cryptographic operation and its maturity.
// Experimental PQC operations are labelled as such in every API response and
// in the developer portal.
type Operation struct {
	ID        string `json:"id"`
	Category  string `json:"category"`
	Algorithm string `json:"algorithm"`
	Maturity  string `json:"maturity"`
	Summary   string `json:"summary"`
}

var Operations = []Operation{
	{ID: "encrypt", Category: "symmetric", Algorithm: "AES-256-GCM", Maturity: "Beta implemented", Summary: "Authenticated encryption of up to 1 MiB with a server-held key."},
	{ID: "decrypt", Category: "symmetric", Algorithm: "AES-256-GCM", Maturity: "Beta implemented", Summary: "Authenticated decryption; fails closed on any modification."},
	{ID: "mac_sign", Category: "mac", Algorithm: "HMAC-SHA-256", Maturity: "Beta implemented", Summary: "Message authentication code (not a digital signature)."},
	{ID: "mac_verify", Category: "mac", Algorithm: "HMAC-SHA-256", Maturity: "Beta implemented", Summary: "Constant-time MAC verification."},
	{ID: "digest", Category: "hash", Algorithm: "SHA-256", Maturity: "Beta implemented", Summary: "Unkeyed SHA-256 digest."},
	{ID: "random", Category: "random", Algorithm: "crypto/rand", Maturity: "Beta implemented", Summary: "Cryptographically secure random bytes (1-1024)."},
	{ID: "mlkem768_keygen", Category: "pqc-kem", Algorithm: "ML-KEM-768 (FIPS 203)", Maturity: "Experimental", Summary: "Generate a server-held ML-KEM-768 key pair; only the public key is returned."},
	{ID: "mlkem768_encapsulate", Category: "pqc-kem", Algorithm: "ML-KEM-768 (FIPS 203)", Maturity: "Experimental", Summary: "Encapsulate a shared secret to a supplied public key."},
	{ID: "mlkem768_decapsulate", Category: "pqc-kem", Algorithm: "ML-KEM-768 (FIPS 203)", Maturity: "Experimental", Summary: "Recover a shared secret using a server-held private key."},
	{ID: "mldsa65_keygen", Category: "pqc-signature", Algorithm: "ML-DSA-65 (FIPS 204)", Maturity: "Experimental", Summary: "Generate a server-held ML-DSA-65 key pair; only the public key is returned."},
	{ID: "mldsa65_sign", Category: "pqc-signature", Algorithm: "ML-DSA-65 (FIPS 204)", Maturity: "Experimental", Summary: "Create a FIPS 204 digital signature."},
	{ID: "mldsa65_verify", Category: "pqc-signature", Algorithm: "ML-DSA-65 (FIPS 204)", Maturity: "Experimental", Summary: "Verify a FIPS 204 digital signature."},
}

func operationByID(id string) (Operation, bool) {
	for _, op := range Operations {
		if op.ID == id {
			return op, true
		}
	}
	return Operation{}, false
}

type opInput struct {
	Message    []byte
	AAD        []byte
	Ciphertext []byte
	Nonce      []byte
	Signature  []byte
	PublicKey  []byte
	Count      int
}

// generateKeyMaterial creates key material for one of the supported key
// algorithms. Private material is returned to the caller for server-side
// storage only and is never exposed through an API response.
func generateKeyMaterial(algorithm string) (private, public []byte, err error) {
	switch algorithm {
	case "aes-256-gcm", "hmac-sha-256":
		private = make([]byte, 32)
		if _, err = rand.Read(private); err != nil {
			return nil, nil, err
		}
		return private, nil, nil
	case "mlkem-768":
		scheme := mlkem768.Scheme()
		pk, sk, err := scheme.GenerateKeyPair()
		if err != nil {
			return nil, nil, err
		}
		private, err = sk.MarshalBinary()
		if err != nil {
			return nil, nil, err
		}
		public, err = pk.MarshalBinary()
		return private, public, err
	case "mldsa-65":
		pk, sk, err := mldsa65.GenerateKey(rand.Reader)
		if err != nil {
			return nil, nil, err
		}
		private, err = sk.MarshalBinary()
		if err != nil {
			return nil, nil, err
		}
		public, err = pk.MarshalBinary()
		return private, public, err
	default:
		return nil, nil, fmt.Errorf("unsupported key algorithm %q", algorithm)
	}
}

func newAEAD(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}

type operationError struct {
	Code string
	Err  error
}

func (e *operationError) Error() string { return e.Err.Error() }

func opErr(code, message string) *operationError {
	return &operationError{Code: code, Err: errors.New(message)}
}

// runOperation executes a single cryptographic operation. It never logs or
// returns key material, plaintext, or shared secrets beyond the documented
// response of the operation.
func runOperation(id string, private []byte, in opInput) (map[string]any, *operationError) {
	switch id {
	case "encrypt":
		aead, err := newAEAD(private)
		if err != nil {
			return nil, opErr("E_INTERNAL", "key initialisation failed")
		}
		nonce := make([]byte, aead.NonceSize())
		if _, err := rand.Read(nonce); err != nil {
			return nil, opErr("E_INTERNAL", "entropy source unavailable")
		}
		if len(in.Message) > maxPayloadBytes {
			return nil, opErr("E_INVALID_REQUEST", "payload exceeds 1 MiB")
		}
		out := aead.Seal(nil, nonce, in.Message, in.AAD)
		return map[string]any{"algorithm": "AES-256-GCM", "ciphertext": b64(out), "nonce": b64(nonce)}, nil

	case "decrypt":
		aead, err := newAEAD(private)
		if err != nil {
			return nil, opErr("E_INTERNAL", "key initialisation failed")
		}
		if len(in.Nonce) != aead.NonceSize() {
			return nil, opErr("E_INVALID_REQUEST", "invalid nonce length")
		}
		plain, err := aead.Open(nil, in.Nonce, in.Ciphertext, in.AAD)
		if err != nil {
			return nil, opErr("E_DECRYPT_FAILED", "decryption failed: ciphertext or associated data is invalid")
		}
		return map[string]any{"algorithm": "AES-256-GCM", "plaintext": b64(plain)}, nil

	case "mac_sign":
		if len(in.Message) > maxPayloadBytes {
			return nil, opErr("E_INVALID_REQUEST", "payload exceeds 1 MiB")
		}
		mac := hmac.New(sha256.New, private)
		_, _ = mac.Write(in.Message)
		return map[string]any{"algorithm": "HMAC-SHA-256", "mac": b64(mac.Sum(nil))}, nil

	case "mac_verify":
		mac := hmac.New(sha256.New, private)
		_, _ = mac.Write(in.Message)
		if !hmac.Equal(mac.Sum(nil), in.Signature) {
			return nil, opErr("E_MAC_INVALID", "message authentication code is invalid")
		}
		return map[string]any{"algorithm": "HMAC-SHA-256", "valid": true}, nil

	case "digest":
		if len(in.Message) > maxPayloadBytes {
			return nil, opErr("E_INVALID_REQUEST", "payload exceeds 1 MiB")
		}
		sum := sha256.Sum256(in.Message)
		return map[string]any{"algorithm": "SHA-256", "digest": b64(sum[:])}, nil

	case "random":
		if in.Count < 1 || in.Count > 1024 {
			return nil, opErr("E_INVALID_REQUEST", "bytes must be between 1 and 1024")
		}
		buf := make([]byte, in.Count)
		if _, err := rand.Read(buf); err != nil {
			return nil, opErr("E_INTERNAL", "entropy source unavailable")
		}
		return map[string]any{"algorithm": "crypto/rand", "bytes": b64(buf)}, nil

	case "mlkem768_keygen":
		scheme := mlkem768.Scheme()
		pk, sk, err := scheme.GenerateKeyPair()
		if err != nil {
			return nil, opErr("E_INTERNAL", "ML-KEM key generation failed")
		}
		pub, err := pk.MarshalBinary()
		if err != nil {
			return nil, opErr("E_INTERNAL", "ML-KEM public key encoding failed")
		}
		if _, err := sk.MarshalBinary(); err != nil {
			return nil, opErr("E_INTERNAL", "ML-KEM private key encoding failed")
		}
		return map[string]any{"public_key": b64(pub), "algorithm": "ML-KEM-768"}, nil

	case "mlkem768_encapsulate":
		scheme := mlkem768.Scheme()
		pk, err := scheme.UnmarshalBinaryPublicKey(in.PublicKey)
		if err != nil {
			return nil, opErr("E_INVALID_REQUEST", "invalid ML-KEM public key")
		}
		ct, ss, err := scheme.Encapsulate(pk)
		if err != nil {
			return nil, opErr("E_INTERNAL", "ML-KEM encapsulation failed")
		}
		return map[string]any{"algorithm": "ML-KEM-768", "ciphertext": b64(ct), "shared_secret": b64(ss)}, nil

	case "mlkem768_decapsulate":
		scheme := mlkem768.Scheme()
		if len(in.Ciphertext) != scheme.CiphertextSize() {
			return nil, opErr("E_INVALID_REQUEST", "invalid ML-KEM ciphertext length")
		}
		sk, err := scheme.UnmarshalBinaryPrivateKey(private)
		if err != nil {
			return nil, opErr("E_INTERNAL", "invalid stored ML-KEM private key")
		}
		ss, err := scheme.Decapsulate(sk, in.Ciphertext)
		if err != nil {
			return nil, opErr("E_DECAPSULATE_FAILED", "ML-KEM decapsulation failed")
		}
		return map[string]any{"algorithm": "ML-KEM-768", "shared_secret": b64(ss)}, nil

	case "mldsa65_keygen":
		pk, sk, err := mldsa65.GenerateKey(rand.Reader)
		if err != nil {
			return nil, opErr("E_INTERNAL", "ML-DSA key generation failed")
		}
		pub, err := pk.MarshalBinary()
		if err != nil {
			return nil, opErr("E_INTERNAL", "ML-DSA public key encoding failed")
		}
		if _, err := sk.MarshalBinary(); err != nil {
			return nil, opErr("E_INTERNAL", "ML-DSA private key encoding failed")
		}
		return map[string]any{"public_key": b64(pub), "algorithm": "ML-DSA-65"}, nil

	case "mldsa65_sign":
		if len(private) != mldsa65.PrivateKeySize {
			return nil, opErr("E_INTERNAL", "invalid stored ML-DSA private key")
		}
		var sk mldsa65.PrivateKey
		if err := sk.UnmarshalBinary(private); err != nil {
			return nil, opErr("E_INTERNAL", "invalid stored ML-DSA private key")
		}
		sig := make([]byte, mldsa65.SignatureSize)
		if err := mldsa65.SignTo(&sk, in.Message, nil, true, sig); err != nil {
			return nil, opErr("E_INTERNAL", "ML-DSA signing failed")
		}
		return map[string]any{"algorithm": "ML-DSA-65", "signature": b64(sig)}, nil

	case "mldsa65_verify":
		if len(in.Signature) != mldsa65.SignatureSize {
			return nil, opErr("E_INVALID_REQUEST", "invalid ML-DSA signature length")
		}
		var pk mldsa65.PublicKey
		if err := pk.UnmarshalBinary(in.PublicKey); err != nil {
			return nil, opErr("E_INVALID_REQUEST", "invalid ML-DSA public key")
		}
		if !mldsa65.Verify(&pk, in.Message, nil, in.Signature) {
			return nil, opErr("E_SIGNATURE_INVALID", "ML-DSA signature is invalid")
		}
		return map[string]any{"algorithm": "ML-DSA-65", "valid": true}, nil

	default:
		return nil, opErr("E_OPERATION_UNAVAILABLE", "operation is not implemented")
	}
}
