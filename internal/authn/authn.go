// Package authn implements the RivicQ authentication lifecycle from a single
// source of truth: registration, email verification, login, optional MFA,
// short-lived access tokens, rotating opaque refresh sessions (with reuse
// detection), logout, password reset/change, and per-session revocation.
//
// Design rules:
//   - No default or published secrets. A signing secret must be supplied.
//   - Refresh tokens are opaque and stored only as SHA-256 hashes.
//   - Every credential is single-use and time-boxed.
//   - Demo identity exists only when DemoMode is explicitly enabled.
package authn

import (
	"errors"
	"strings"
	"time"
)

// Role is a workspace role. Roles are ordered: admin > operator > analyst > viewer.
type Role string

const (
	RoleAdmin    Role = "admin"
	RoleOperator Role = "operator"
	RoleAnalyst  Role = "analyst"
	RoleViewer   Role = "viewer"
)

// Edition is the product surface a token is scoped to.
type Edition string

const (
	EditionOSS          Edition = "oss"
	EditionProfessional Edition = "professional"
	EditionEnterprise   Edition = "enterprise"
)

// Token purposes for single-use, out-of-band tokens.
type TokenPurpose string

const (
	PurposeVerifyEmail   TokenPurpose = "verify_email"
	PurposeResetPassword TokenPurpose = "reset_password"
	PurposeMFAChallenge  TokenPurpose = "mfa_challenge"
)

// Sentinel errors. Handlers translate these to HTTP status codes and the
// frontend relies on the stable wording for a handful of them.
var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound       = errors.New("user not found")
	ErrEmailTaken         = errors.New("email already registered")
	ErrEmailNotVerified   = errors.New("email not verified")
	ErrAccountDisabled    = errors.New("account disabled")
	ErrMFARequired        = errors.New("mfa required")
	ErrInvalidMFACode     = errors.New("invalid mfa code")
	ErrInvalidMFASession  = errors.New("invalid or expired mfa session")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrTokenUsed          = errors.New("token already used")
	ErrSessionRevoked     = errors.New("session revoked")
	ErrSessionExpired     = errors.New("session expired")
	ErrReuseDetected      = errors.New("refresh token reuse detected")
	ErrDemoDisabled       = errors.New("demo mode is disabled")
)

// User is an authenticatable principal.
type User struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	Role          Role      `json:"role"`
	Organisation  string    `json:"organisation,omitempty"`
	PasswordHash  string    `json:"-"`
	EmailVerified bool      `json:"email_verified"`
	MFAEnabled    bool      `json:"mfa_enabled"`
	MFASecret     string    `json:"-"`
	Disabled      bool      `json:"disabled"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Clone returns a shallow copy safe to hand to callers and mutate.
func (u *User) Clone() *User {
	if u == nil {
		return nil
	}
	c := *u
	return &c
}

// Session is a server-side refresh session. The raw refresh token is never
// stored; RefreshHash is its SHA-256. Rotation sets RotatedTo and RevokedAt,
// which is how reuse of a consumed token is detected.
type Session struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	RefreshHash string     `json:"-"`
	UserAgent   string     `json:"user_agent,omitempty"`
	IP          string     `json:"ip,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
	RotatedTo   string     `json:"-"`
	RevokedAt   *time.Time `json:"revoked_at,omitempty"`
}

// Active reports whether the session can still be refreshed.
func (s *Session) Active(now time.Time) bool {
	return s != nil && s.RevokedAt == nil && now.Before(s.ExpiresAt)
}

// Token is an out-of-band single-use token (verify email, reset password).
type Token struct {
	Hash      string       `json:"-"`
	UserID    string       `json:"-"`
	Purpose   TokenPurpose `json:"-"`
	ExpiresAt time.Time    `json:"-"`
	UsedAt    *time.Time   `json:"-"`
}

// Usable reports whether the token is within its lifetime and unused.
func (t *Token) Usable(now time.Time) bool {
	return t != nil && t.UsedAt == nil && now.Before(t.ExpiresAt)
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// normalizeRole clamps an unknown role to the least-privileged known role.
func normalizeRole(role string) Role {
	switch Role(strings.ToLower(strings.TrimSpace(role))) {
	case RoleAdmin:
		return RoleAdmin
	case RoleOperator:
		return RoleOperator
	case RoleAnalyst:
		return RoleAnalyst
	default:
		return RoleViewer
	}
}

// editionForRole derives the edition a role is entitled to.
func editionForRole(requested string, role Role) Edition {
	switch Edition(strings.ToLower(strings.TrimSpace(requested))) {
	case EditionEnterprise, "ent":
		return EditionEnterprise
	case EditionProfessional, "pro":
		return EditionProfessional
	case EditionOSS, "community":
		return EditionOSS
	}
	switch role {
	case RoleAdmin:
		return EditionEnterprise
	case RoleOperator, RoleAnalyst:
		return EditionProfessional
	default:
		return EditionOSS
	}
}
