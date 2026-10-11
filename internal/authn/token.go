package authn

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
)

// AccessClaims is the signed payload of a short-lived access token.
type AccessClaims struct {
	UserID      string   `json:"user_id"`
	TenantID    string   `json:"tenant_id"`
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	Edition     string   `json:"edition"`
	Permissions []string `json:"permissions"`
	jwt.RegisteredClaims
}

// tokenIssuer signs and verifies access tokens.
type tokenIssuer struct {
	secret    []byte
	issuer    string
	audience  string
	accessTTL time.Duration
}

func newTokenIssuer(secret, issuer, audience string, accessTTL time.Duration) *tokenIssuer {
	return &tokenIssuer{secret: []byte(secret), issuer: issuer, audience: audience, accessTTL: accessTTL}
}

// sign builds a signed access token for the user at the given edition. The
// supplied now is the authority for issued-at and expiry.
func (ti *tokenIssuer) sign(u *User, edition Edition, now time.Time) (string, error) {
	claims := AccessClaims{
		UserID:      u.ID,
		TenantID:    u.TenantID,
		Email:       u.Email,
		Role:        string(u.Role),
		Edition:     string(edition),
		Permissions: auth.PermissionsForRole(string(u.Role)),
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.NewString(),
			Subject:   u.ID,
			ExpiresAt: jwt.NewNumericDate(now.Add(ti.accessTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    ti.issuer,
			Audience:  jwt.ClaimStrings{ti.audience},
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(ti.secret)
}

// verify parses and validates an access token. It rejects any algorithm other
// than HS256 and requires a valid issuer, audience and expiry. The supplied now
// is the authority for expiry checks.
func (ti *tokenIssuer) verify(raw string, now time.Time) (*AccessClaims, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, ErrInvalidToken
	}
	claims := &AccessClaims{}
	tok, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return ti.secret, nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(ti.issuer),
		jwt.WithAudience(ti.audience),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(func() time.Time { return now }),
	)
	if err != nil || !tok.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// bearerToken extracts the token from an Authorization header.
func bearerToken(header string) string {
	h := strings.TrimSpace(header)
	if len(h) > 7 && strings.EqualFold(h[:7], "Bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return h
}

// newOpaqueToken returns a raw random token and its SHA-256 hex digest. Only the
// digest is ever persisted.
func newOpaqueToken() (raw, hash string, err error) {
	buf := make([]byte, 32)
	if _, err = rand.Read(buf); err != nil {
		return "", "", err
	}
	raw = hex.EncodeToString(buf)
	return raw, hashToken(raw), nil
}

// hashToken returns the stable SHA-256 hex digest of a raw token.
func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
	return hex.EncodeToString(sum[:])
}
