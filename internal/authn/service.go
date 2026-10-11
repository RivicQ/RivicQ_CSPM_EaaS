package authn

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
)

// TokenPair is a freshly minted access + refresh credential.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	User         *User  `json:"user,omitempty"`
}

// LoginResult is either an issued token pair or an MFA challenge.
type LoginResult struct {
	TokenPair
	MFARequired bool   `json:"mfa_required,omitempty"`
	MFASession  string `json:"mfa_session,omitempty"`
}

// Service implements the full authentication lifecycle over a Store.
type Service struct {
	cfg    Config
	store  Store
	issuer *tokenIssuer
	now    clock
}

// NewService builds a lifecycle service. It fails closed if the signing secret
// is missing or too short.
func NewService(cfg Config, store Store) (*Service, error) {
	if len(cfg.Secret) < minSecretBytes {
		return nil, fmt.Errorf("authn: signing secret must be at least %d bytes", minSecretBytes)
	}
	if store == nil {
		return nil, errors.New("authn: store is required")
	}
	return &Service{
		cfg:    cfg,
		store:  store,
		issuer: newTokenIssuer(cfg.Secret, cfg.Issuer, cfg.Audience, cfg.AccessTTL),
		now:    time.Now,
	}, nil
}

// Config exposes the resolved configuration.
func (s *Service) Config() Config { return s.cfg }

// DemoEnabled reports whether the demo identity is available.
func (s *Service) DemoEnabled() bool { return s.cfg.DemoMode }

// SeedBootstrap ensures the bootstrap admin exists (idempotent). When demo mode
// is on it also seeds the four-role demo identities. Returning users are left
// untouched so a changed bootstrap password is never silently reset.
func (s *Service) SeedBootstrap(ctx context.Context) error {
	if strings.TrimSpace(s.cfg.BootstrapPassword) != "" {
		if err := ValidatePassword(s.cfg.BootstrapPassword); err != nil {
			return fmt.Errorf("bootstrap password rejected: %w", err)
		}
		if _, err := s.store.GetUserByEmail(ctx, s.cfg.BootstrapEmail); errors.Is(err, ErrUserNotFound) {
			hash, err := HashPassword(s.cfg.BootstrapPassword)
			if err != nil {
				return err
			}
			role := s.cfg.BootstrapRole
			if role == "" {
				role = RoleAdmin
			}
			u := &User{
				ID:            uuid.NewString(),
				TenantID:      s.cfg.DefaultTenantID,
				Email:         normalizeEmail(s.cfg.BootstrapEmail),
				Name:          s.cfg.BootstrapName,
				Role:          role,
				PasswordHash:  hash,
				EmailVerified: true,
			}
			if err := s.store.CreateUser(ctx, u); err != nil {
				return fmt.Errorf("seed bootstrap admin: %w", err)
			}
		}
	}
	if s.cfg.DemoMode {
		if err := s.seedDemoUsers(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) seedDemoUsers(ctx context.Context) error {
	type demoSpec struct {
		name, email string
		role        Role
	}
	specs := []demoSpec{
		{"Admin", "admin@rivicq.com", RoleAdmin},
		{"Operator", "operator@rivicq.com", RoleOperator},
		{"Analyst", "analyst@rivicq.com", RoleAnalyst},
		{"Sales Team", "sales@rivicq.com", RoleViewer},
	}
	password := s.cfg.BootstrapPassword
	if strings.TrimSpace(password) == "" {
		return nil
	}
	for _, spec := range specs {
		if _, err := s.store.GetUserByEmail(ctx, spec.email); err == nil {
			continue
		}
		hash, err := HashPassword(password)
		if err != nil {
			return err
		}
		if err := s.store.CreateUser(ctx, &User{
			ID:            uuid.NewString(),
			TenantID:      s.cfg.DefaultTenantID,
			Email:         spec.email,
			Name:          spec.name,
			Role:          spec.role,
			PasswordHash:  hash,
			EmailVerified: true,
		}); err != nil {
			return err
		}
	}
	return nil
}

// Register creates an unverified account and returns a raw verification token.
// The raw token is only returned so demo/CLI flows can relay it; a mailbox
// integration would deliver it out of band.
func (s *Service) Register(ctx context.Context, name, email, password, organisation string) (*User, string, error) {
	if !s.cfg.AllowRegistration && !s.cfg.DemoMode {
		return nil, "", errors.New("registration is disabled")
	}
	email = normalizeEmail(email)
	if email == "" || !strings.Contains(email, "@") {
		return nil, "", errors.New("a valid email is required")
	}
	if len(s.cfg.AllowedDomains) > 0 && !s.domainAllowed(email) {
		return nil, "", errors.New("email domain is not allowed")
	}
	if err := ValidatePasswordFor(password, email, organisation); err != nil {
		return nil, "", err
	}
	hash, err := HashPassword(password)
	if err != nil {
		return nil, "", err
	}
	u := &User{
		ID:            uuid.NewString(),
		TenantID:      s.cfg.DefaultTenantID,
		Email:         email,
		Name:          strings.TrimSpace(name),
		Role:          RoleViewer,
		Organisation:  strings.TrimSpace(organisation),
		PasswordHash:  hash,
		EmailVerified: !s.cfg.RequireVerification,
	}
	if err := s.store.CreateUser(ctx, u); err != nil {
		return nil, "", err
	}
	if !s.cfg.RequireVerification {
		return u, "", nil
	}
	raw, err := s.issueToken(ctx, u.ID, PurposeVerifyEmail, s.cfg.VerifyTTL)
	if err != nil {
		return nil, "", err
	}
	return u, raw, nil
}

// VerifyEmail consumes a verification token and marks the account verified.
func (s *Service) VerifyEmail(ctx context.Context, rawToken string) error {
	u, err := s.consumeToken(ctx, rawToken, PurposeVerifyEmail)
	if err != nil {
		return err
	}
	u.EmailVerified = true
	return s.store.UpdateUser(ctx, u)
}

// Login authenticates credentials and returns either tokens or an MFA
// challenge. Unverified accounts are refused outside demo mode.
func (s *Service) Login(ctx context.Context, email, password, edition, userAgent, ip string) (*LoginResult, error) {
	email = normalizeEmail(email)
	u, err := s.store.GetUserByEmail(ctx, email)
	if err != nil {
		// Equalise timing so a missing account is not distinguishable from a
		// wrong password.
		_ = CheckPassword(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv")
		return nil, ErrInvalidCredentials
	}
	if u.Disabled {
		return nil, ErrAccountDisabled
	}
	if !CheckPassword(password, u.PasswordHash) {
		return nil, ErrInvalidCredentials
	}
	if !u.EmailVerified && s.cfg.RequireVerification {
		return nil, ErrEmailNotVerified
	}
	if u.MFAEnabled {
		raw, err := s.issueToken(ctx, u.ID, PurposeMFAChallenge, s.cfg.MFASessionTTL)
		if err != nil {
			return nil, err
		}
		return &LoginResult{
			TokenPair:   TokenPair{User: publicUser(u)},
			MFARequired: true,
			MFASession:  raw,
		}, nil
	}
	pair, err := s.issueSession(ctx, u, editionForRole(edition, u.Role), userAgent, ip)
	if err != nil {
		return nil, err
	}
	return &LoginResult{TokenPair: *pair}, nil
}

// VerifyMFA completes a login challenge with a TOTP code. A wrong code does
// not consume the challenge, so the user may retry within its lifetime.
func (s *Service) VerifyMFA(ctx context.Context, mfaSession, code, userAgent, ip string) (*TokenPair, error) {
	tok, u, err := s.loadToken(ctx, mfaSession, PurposeMFAChallenge)
	if err != nil {
		return nil, ErrInvalidMFASession
	}
	if !s.totpValid(u, code) {
		return nil, ErrInvalidMFACode
	}
	if err := s.store.MarkTokenUsed(ctx, tok.Hash); err != nil {
		return nil, ErrInvalidMFASession
	}
	return s.issueSession(ctx, u, editionForRole("", u.Role), userAgent, ip)
}

// Refresh rotates a refresh session. Reuse of a consumed token revokes every
// session for the user and fails, which contains a stolen-token replay.
func (s *Service) Refresh(ctx context.Context, refreshToken, userAgent, ip string) (*TokenPair, error) {
	sess, err := s.store.GetSessionByRefreshHash(ctx, hashToken(refreshToken))
	if err != nil {
		return nil, ErrInvalidToken
	}
	now := s.now().UTC()
	if sess.RevokedAt != nil {
		// A rotated token being presented again is the reuse signal. A token
		// revoked by logout/reset/family-revocation is simply invalid.
		if sess.RotatedTo != "" {
			_ = s.store.RevokeSessionsForUser(ctx, sess.UserID)
			return nil, ErrReuseDetected
		}
		return nil, ErrInvalidToken
	}
	if !now.Before(sess.ExpiresAt) {
		return nil, ErrSessionExpired
	}
	u, err := s.store.GetUserByID(ctx, sess.UserID)
	if err != nil || u.Disabled {
		_ = s.store.RevokeSessionsForUser(ctx, sess.UserID)
		return nil, ErrInvalidToken
	}

	raw, hash, err := newOpaqueToken()
	if err != nil {
		return nil, err
	}
	next := &Session{
		ID:          uuid.NewString(),
		UserID:      u.ID,
		RefreshHash: hash,
		UserAgent:   userAgent,
		IP:          ip,
		CreatedAt:   now,
		ExpiresAt:   now.Add(s.cfg.RefreshTTL),
	}
	if err := s.store.CreateSession(ctx, next); err != nil {
		return nil, err
	}
	// Retire the presented session and chain it to the successor for audit.
	sess.RevokedAt = &now
	sess.RotatedTo = next.ID
	if err := s.store.UpdateSession(ctx, sess); err != nil {
		return nil, err
	}

	access, err := s.issuer.sign(u, editionForRole("", u.Role), now)
	if err != nil {
		return nil, err
	}
	return &TokenPair{
		AccessToken:  access,
		RefreshToken: raw,
		ExpiresIn:    int(s.cfg.AccessTTL.Seconds()),
		User:         publicUser(u),
	}, nil
}

// Logout revokes the session identified by a refresh token. It is idempotent.
func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	sess, err := s.store.GetSessionByRefreshHash(ctx, hashToken(refreshToken))
	if err != nil {
		return nil
	}
	now := s.now().UTC()
	sess.RevokedAt = &now
	return s.store.UpdateSession(ctx, sess)
}

// ForgotPassword issues a reset token when the account exists. found is false
// for unknown accounts so callers can keep responses identical.
func (s *Service) ForgotPassword(ctx context.Context, email string) (raw string, found bool, err error) {
	u, err := s.store.GetUserByEmail(ctx, normalizeEmail(email))
	if err != nil {
		return "", false, nil
	}
	raw, err = s.issueToken(ctx, u.ID, PurposeResetPassword, s.cfg.ResetTTL)
	if err != nil {
		return "", true, err
	}
	return raw, true, nil
}

// ResetPassword consumes a reset token, sets the new password, and revokes all
// existing sessions so a compromised session cannot survive the reset.
func (s *Service) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	tok, err := s.store.GetToken(ctx, hashToken(rawToken))
	if err != nil || tok.Purpose != PurposeResetPassword {
		return ErrInvalidToken
	}
	if tok.UsedAt != nil {
		return ErrTokenUsed
	}
	if !s.now().UTC().Before(tok.ExpiresAt) {
		return ErrInvalidToken
	}
	u, err := s.store.GetUserByID(ctx, tok.UserID)
	if err != nil {
		return ErrInvalidToken
	}
	if err := ValidatePasswordFor(newPassword, u.Email, u.Organisation); err != nil {
		return err
	}
	hash, err := HashPassword(newPassword)
	if err != nil {
		return err
	}
	if err := s.store.MarkTokenUsed(ctx, tok.Hash); err != nil {
		return err
	}
	u.PasswordHash = hash
	if err := s.store.UpdateUser(ctx, u); err != nil {
		return err
	}
	return s.store.RevokeSessionsForUser(ctx, u.ID)
}

// ChangePassword verifies the current password and sets a new one.
func (s *Service) ChangePassword(ctx context.Context, userID, current, next string) error {
	u, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}
	if !CheckPassword(current, u.PasswordHash) {
		return errors.New("current password is incorrect")
	}
	if err := ValidatePasswordFor(next, u.Email, u.Organisation); err != nil {
		return err
	}
	hash, err := HashPassword(next)
	if err != nil {
		return err
	}
	u.PasswordHash = hash
	return s.store.UpdateUser(ctx, u)
}

// SetupMFA generates a TOTP secret and provisioning URI. MFA is not enabled
// until ConfirmMFA verifies the first code.
func (s *Service) SetupMFA(ctx context.Context, userID string) (secret, uri string, err error) {
	u, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		return "", "", ErrUserNotFound
	}
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "RivicQ CryptoBOM",
		AccountName: u.Email,
		Period:      30,
		SecretSize:  20,
	})
	if err != nil {
		return "", "", err
	}
	u.MFASecret = key.Secret()
	if err := s.store.UpdateUser(ctx, u); err != nil {
		return "", "", err
	}
	return key.Secret(), key.URL(), nil
}

// ConfirmMFA verifies the first TOTP code and enables MFA.
func (s *Service) ConfirmMFA(ctx context.Context, userID, code string) error {
	u, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}
	if !s.totpValid(u, code) {
		return ErrInvalidMFACode
	}
	u.MFAEnabled = true
	return s.store.UpdateUser(ctx, u)
}

// DisableMFA clears MFA after verifying the account password.
func (s *Service) DisableMFA(ctx context.Context, userID, password string) error {
	u, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}
	if !CheckPassword(password, u.PasswordHash) {
		return ErrInvalidCredentials
	}
	u.MFAEnabled = false
	u.MFASecret = ""
	return s.store.UpdateUser(ctx, u)
}

// DemoLogin issues a short session for the operator demo identity. It only
// works when demo mode is enabled.
func (s *Service) DemoLogin(ctx context.Context, userAgent, ip string) (*TokenPair, error) {
	if !s.cfg.DemoMode {
		return nil, ErrDemoDisabled
	}
	u, err := s.store.GetUserByEmail(ctx, "operator@rivicq.com")
	if err != nil {
		return nil, ErrDemoDisabled
	}
	return s.issueSession(ctx, u, EditionOSS, userAgent, ip)
}

// ListSessions returns a user's sessions, newest first.
func (s *Service) ListSessions(ctx context.Context, userID string) ([]*Session, error) {
	return s.store.ListSessionsByUser(ctx, userID)
}

// RevokeSession revokes a single session owned by the user.
func (s *Service) RevokeSession(ctx context.Context, userID, sessionID string) error {
	sess, err := s.store.GetSessionByID(ctx, sessionID)
	if err != nil {
		return ErrInvalidToken
	}
	if sess.UserID != userID {
		return ErrInvalidToken
	}
	now := s.now().UTC()
	sess.RevokedAt = &now
	return s.store.UpdateSession(ctx, sess)
}

// EnsureExternalUser returns the account for an external (OAuth) identity,
// creating an email-verified passwordless account on first sight. The password
// hash is a random unguessable value so password login can never succeed for an
// external-only account.
func (s *Service) EnsureExternalUser(ctx context.Context, email, name, organisation string) (*User, error) {
	email = normalizeEmail(email)
	if email == "" || !strings.Contains(email, "@") {
		return nil, errors.New("a valid email is required")
	}
	if len(s.cfg.AllowedDomains) > 0 && !s.domainAllowed(email) {
		return nil, errors.New("email domain is not allowed")
	}
	if existing, err := s.store.GetUserByEmail(ctx, email); err == nil {
		if existing.Disabled {
			return nil, ErrAccountDisabled
		}
		return existing, nil
	}
	raw, _, err := newOpaqueToken()
	if err != nil {
		return nil, err
	}
	// An external (OAuth) identity cannot sign in with a password; store an
	// unusable random hash. The 64 hex chars stay under bcrypt's 72-byte cap.
	hash, err := HashPassword(raw)
	if err != nil {
		return nil, err
	}
	u := &User{
		ID:            uuid.NewString(),
		TenantID:      s.cfg.DefaultTenantID,
		Email:         email,
		Name:          strings.TrimSpace(name),
		Role:          RoleViewer,
		Organisation:  strings.TrimSpace(organisation),
		PasswordHash:  hash,
		EmailVerified: true,
	}
	if err := s.store.CreateUser(ctx, u); err != nil {
		// A concurrent first-login may have created it; prefer the stored row.
		if errors.Is(err, ErrEmailTaken) {
			return s.store.GetUserByEmail(ctx, email)
		}
		return nil, err
	}
	return u, nil
}

// IssueTokens mints a token pair for an already-authenticated user (for example
// an OAuth identity that completed the provider handshake).
func (s *Service) IssueTokens(ctx context.Context, u *User, edition, userAgent, ip string) (*TokenPair, error) {
	if u == nil {
		return nil, ErrUserNotFound
	}
	return s.issueSession(ctx, u, editionForRole(edition, u.Role), userAgent, ip)
}

// Authenticate validates an access token and returns its claims.
func (s *Service) Authenticate(rawToken string) (*AccessClaims, error) {
	return s.issuer.verify(rawToken, s.now())
}

// LookupByID returns the public view of a user.
func (s *Service) LookupByID(ctx context.Context, id string) (*User, error) {
	u, err := s.store.GetUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return publicUser(u), nil
}

// LookupByEmail returns the public view of a user.
func (s *Service) LookupByEmail(ctx context.Context, email string) (*User, error) {
	u, err := s.store.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	return publicUser(u), nil
}

// UpdateUser validates and persists editable profile fields.
func (s *Service) UpdateUser(ctx context.Context, u *User) error {
	return s.store.UpdateUser(ctx, u)
}

// ListUsersByTenant returns workspace members.
func (s *Service) ListUsersByTenant(ctx context.Context, tenantID string) ([]*User, error) {
	users, err := s.store.ListUsersByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	for i := range users {
		users[i] = publicUser(users[i])
	}
	return users, nil
}

// --- internals ---

func (s *Service) issueSession(ctx context.Context, u *User, edition Edition, userAgent, ip string) (*TokenPair, error) {
	now := s.now().UTC()
	raw, hash, err := newOpaqueToken()
	if err != nil {
		return nil, err
	}
	sess := &Session{
		ID:          uuid.NewString(),
		UserID:      u.ID,
		RefreshHash: hash,
		UserAgent:   userAgent,
		IP:          ip,
		CreatedAt:   now,
		ExpiresAt:   now.Add(s.cfg.RefreshTTL),
	}
	if err := s.store.CreateSession(ctx, sess); err != nil {
		return nil, err
	}
	access, err := s.issuer.sign(u, edition, now)
	if err != nil {
		return nil, err
	}
	return &TokenPair{
		AccessToken:  access,
		RefreshToken: raw,
		ExpiresIn:    int(s.cfg.AccessTTL.Seconds()),
		User:         publicUser(u),
	}, nil
}

func (s *Service) issueToken(ctx context.Context, userID string, purpose TokenPurpose, ttl time.Duration) (string, error) {
	raw, hash, err := newOpaqueToken()
	if err != nil {
		return "", err
	}
	if err := s.store.CreateToken(ctx, &Token{
		Hash:      hash,
		UserID:    userID,
		Purpose:   purpose,
		ExpiresAt: s.now().UTC().Add(ttl),
	}); err != nil {
		return "", err
	}
	return raw, nil
}

// loadToken validates a single-use token and resolves its owner without
// consuming it.
func (s *Service) loadToken(ctx context.Context, raw string, purpose TokenPurpose) (*Token, *User, error) {
	tok, err := s.store.GetToken(ctx, hashToken(raw))
	if err != nil || tok.Purpose != purpose {
		return nil, nil, ErrInvalidToken
	}
	if tok.UsedAt != nil {
		return nil, nil, ErrTokenUsed
	}
	if !s.now().UTC().Before(tok.ExpiresAt) {
		return nil, nil, ErrInvalidToken
	}
	u, err := s.store.GetUserByID(ctx, tok.UserID)
	if err != nil {
		return nil, nil, ErrInvalidToken
	}
	return tok, u, nil
}

// consumeToken validates and immediately consumes a single-use token.
func (s *Service) consumeToken(ctx context.Context, raw string, purpose TokenPurpose) (*User, error) {
	tok, u, err := s.loadToken(ctx, raw, purpose)
	if err != nil {
		return nil, err
	}
	if err := s.store.MarkTokenUsed(ctx, tok.Hash); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Service) totpValid(u *User, code string) bool {
	if u == nil || strings.TrimSpace(u.MFASecret) == "" {
		return false
	}
	return totp.Validate(strings.TrimSpace(code), u.MFASecret)
}

func (s *Service) domainAllowed(email string) bool {
	_, domain, found := strings.Cut(email, "@")
	if !found {
		return false
	}
	for _, d := range s.cfg.AllowedDomains {
		if strings.EqualFold(d, domain) {
			return true
		}
	}
	return false
}

// publicUser strips secrets from a user for API responses.
func publicUser(u *User) *User {
	if u == nil {
		return nil
	}
	c := *u
	c.PasswordHash = ""
	c.MFASecret = ""
	return &c
}
