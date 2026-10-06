package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"github.com/rivic-q/cryptobom-saas/internal/tenant"
	"golang.org/x/crypto/bcrypt"
)

// TokenUse distinguishes an access token from a refresh token. Without it a
// stolen access token can be exchanged at /auth/refresh for a 30-day session.
const (
	TokenUseAccess  = "access"
	TokenUseRefresh = "refresh"
)

// JWT Claims structure
type Claims struct {
	UserID      string   `json:"user_id"`
	TenantID    string   `json:"tenant_id"`
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	Edition     string   `json:"edition"`
	Permissions []string `json:"permissions"`
	TokenUse    string   `json:"token_use"`
	jwt.RegisteredClaims
}

// User data structure
type User struct {
	ID           string `json:"id"`
	TenantID     string `json:"tenant_id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	Organisation string `json:"organisation,omitempty"`
	Password     string `json:"-"`
	MFAEnabled   bool   `json:"mfa_enabled"`
	MFASecret    string `json:"-"`
}

// TokenBlacklist stores revoked tokens for refresh rotation.
type TokenBlacklist struct {
	mu     sync.RWMutex
	tokens map[string]time.Time // token jti -> expiry
}

func NewTokenBlacklist() *TokenBlacklist {
	return &TokenBlacklist{tokens: make(map[string]time.Time)}
}

func (b *TokenBlacklist) Revoke(jti string, expiry time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.tokens[jti] = expiry
}

func (b *TokenBlacklist) IsRevoked(jti string) bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	_, ok := b.tokens[jti]
	return ok
}

// MFASession is a server-side, single-use MFA challenge created at login time.
type MFASession struct {
	UserID  string
	Email   string
	Expires time.Time
}

// MFASessionStore keeps in-flight MFA challenges in memory so that arbitrary
// session values cannot be used to bypass the second factor.
type MFASessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*MFASession
}

func NewMFASessionStore() *MFASessionStore {
	return &MFASessionStore{sessions: make(map[string]*MFASession)}
}

// Create issues a new single-use MFA challenge for a user and returns its ID.
func (s *MFASessionStore) Create(user *User) string {
	id := uuid.New().String()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[id] = &MFASession{
		UserID:  user.ID,
		Email:   strings.ToLower(strings.TrimSpace(user.Email)),
		Expires: time.Now().Add(10 * time.Minute),
	}
	return id
}

// Validate consumes the challenge: it must exist, match the requesting user,
// and not be expired. Challenges are single-use.
func (s *MFASessionStore) Validate(id, email string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[id]
	if !ok {
		return false
	}
	delete(s.sessions, id)

	return sess.Email == strings.ToLower(strings.TrimSpace(email)) && time.Now().Before(sess.Expires)
}

// PasswordResetSession is a single-use reset challenge. Tokens are stored hashed.
type PasswordResetSession struct {
	Email   string
	Expires time.Time
}

// PasswordResetStore keeps in-memory reset tokens (no mailbox product).
type PasswordResetStore struct {
	mu       sync.RWMutex
	sessions map[string]*PasswordResetSession
}

func NewPasswordResetStore() *PasswordResetStore {
	return &PasswordResetStore{sessions: make(map[string]*PasswordResetSession)}
}

func hashResetToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// Create issues a raw token (caller may return it only in DEMO_MODE).
func (s *PasswordResetStore) Create(email string) (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	raw := hex.EncodeToString(buf)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[hashResetToken(raw)] = &PasswordResetSession{
		Email:   strings.ToLower(strings.TrimSpace(email)),
		Expires: time.Now().Add(30 * time.Minute),
	}
	return raw, nil
}

// Peek returns the email bound to a reset token without invalidating it, so a
// password-policy failure does not burn the token.
func (s *PasswordResetStore) Peek(raw string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[hashResetToken(strings.TrimSpace(raw))]
	if !ok || time.Now().After(sess.Expires) {
		return "", false
	}
	return sess.Email, true
}

// Consume validates and deletes a reset token. Returns the bound email.
func (s *PasswordResetStore) Consume(raw string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := hashResetToken(strings.TrimSpace(raw))
	sess, ok := s.sessions[key]
	if !ok {
		return "", false
	}
	delete(s.sessions, key)
	if time.Now().After(sess.Expires) {
		return "", false
	}
	return sess.Email, true
}

// TokenManager handles JWT token generation and validation
type TokenManager struct {
	secretKey      string
	accessTokenTTL time.Duration
	refreshTTL     time.Duration
	issuer         string
	audience       string
	blacklist      *TokenBlacklist
}

// DefaultTokenIssuer is the only issuer RivicQ accepts.
const DefaultTokenIssuer = "rivicq"

// DefaultTokenAudience is the only audience RivicQ accepts.
const DefaultTokenAudience = "rivicq-api"

// NewTokenManager creates a new token manager.
//
// Access tokens live 1 hour. Refresh tokens live 7 days and are single-use:
// presenting one rotates it and revokes it, so replay is detectable.
func NewTokenManager(secretKey string) *TokenManager {
	refreshTTL := 7 * 24 * time.Hour
	if raw := strings.TrimSpace(os.Getenv("AUTH_REFRESH_TTL")); raw != "" {
		if d, err := time.ParseDuration(raw); err == nil && d > 0 {
			refreshTTL = d
		}
	}
	return &TokenManager{
		secretKey:      secretKey,
		accessTokenTTL: 1 * time.Hour,
		refreshTTL:     refreshTTL,
		issuer:         DefaultTokenIssuer,
		audience:       DefaultTokenAudience,
		blacklist:      NewTokenBlacklist(),
	}
}

// GenerateToken creates a new JWT access token for a user.
func (tm *TokenManager) GenerateToken(user *User, edition string) (string, error) {
	if IsLabeledDemoEmail(user.Email) {
		edition = "oss"
	}

	claims := Claims{
		UserID:      user.ID,
		TenantID:    user.TenantID,
		Email:       user.Email,
		Role:        NormalizeRole(user.Role),
		Edition:     edition,
		Permissions: PermissionsForRole(user.Role),
		TokenUse:    TokenUseAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(tm.accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    tm.issuer,
			Audience:  jwt.ClaimStrings{tm.audience},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(tm.secretKey))
}

// IsLabeledDemoEmail is the Community demo identity (operator, OSS edition).
func IsLabeledDemoEmail(email string) bool {
	e := strings.ToLower(strings.TrimSpace(email))
	return e == "demo@rivicq.local" || strings.HasSuffix(e, "@demo.rivicq.local")
}

// GenerateRefreshToken creates a single-use refresh token. It deliberately
// carries no edition and no permissions: authority is re-derived from the user
// record at refresh time, so a rotated token cannot carry stale privilege.
func (tm *TokenManager) GenerateRefreshToken(user *User) (string, error) {
	claims := Claims{
		UserID:   user.ID,
		TenantID: user.TenantID,
		Email:    user.Email,
		Role:     NormalizeRole(user.Role),
		TokenUse: TokenUseRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(tm.refreshTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    tm.issuer,
			Audience:  jwt.ClaimStrings{tm.audience},
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(tm.secretKey))
}

// parseAndValidate verifies signature, algorithm, issuer, audience and expiry,
// then returns the claims. It does not filter on token use.
func (tm *TokenManager) parseAndValidate(tokenString string) (*Claims, error) {
	tokenString = strings.TrimSpace(tokenString)
	if tokenString == "" {
		return nil, errors.New("token is required")
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(tm.secretKey), nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(tm.issuer),
		jwt.WithAudience(tm.audience),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.ID != "" && tm.blacklist.IsRevoked(claims.ID) {
		return nil, errors.New("token has been revoked")
	}
	return claims, nil
}

// ValidateToken validates a JWT **access** token and returns its claims.
// Refresh tokens are rejected here; use ValidateRefreshToken for those.
func (tm *TokenManager) ValidateToken(tokenString string) (*Claims, error) {
	claims, err := tm.parseAndValidate(tokenString)
	if err != nil {
		return nil, err
	}
	if claims.TokenUse != TokenUseAccess {
		return nil, errors.New("token is not an access token")
	}
	return claims, nil
}

// ValidateRefreshToken validates a JWT **refresh** token. Access tokens are
// rejected so a leaked 1-hour token cannot be exchanged for a long session.
func (tm *TokenManager) ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := tm.parseAndValidate(tokenString)
	if err != nil {
		return nil, err
	}
	if claims.TokenUse != TokenUseRefresh {
		return nil, errors.New("token is not a refresh token")
	}
	return claims, nil
}

// RevokeToken revokes a token by adding it to the blacklist.
func (tm *TokenManager) RevokeToken(tokenString string) error {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return err
	}
	if claims.ID != "" {
		tm.blacklist.Revoke(claims.ID, claims.ExpiresAt.Time)
	}
	return nil
}

// RefreshAccessToken rotates a refresh token: the presented token is revoked
// and a fresh access+refresh pair is issued. Presenting an already-revoked
// token fails, which is how refresh-token reuse is detected.
func (tm *TokenManager) RefreshAccessToken(refreshTokenString string) (string, string, error) {
	claims, err := tm.ValidateRefreshToken(refreshTokenString)
	if err != nil {
		return "", "", err
	}

	if claims.ID != "" {
		tm.blacklist.Revoke(claims.ID, claims.ExpiresAt.Time)
	}

	user := &User{
		ID:       claims.UserID,
		TenantID: claims.TenantID,
		Email:    claims.Email,
		Role:     claims.Role,
	}

	newToken, err := tm.GenerateToken(user, "")
	if err != nil {
		return "", "", err
	}

	nextRefresh, err := tm.GenerateRefreshToken(user)
	if err != nil {
		return "", "", err
	}

	return newToken, nextRefresh, nil
}

// RefreshToken is retained for callers that only need the new access token.
// It still requires a refresh token, not an access token.
func (tm *TokenManager) RefreshToken(refreshTokenString string) (string, error) {
	accessToken, _, err := tm.RefreshAccessToken(refreshTokenString)
	return accessToken, err
}

// MFARequired checks if the user has MFA enabled and returns a challenge requirement.
func (as *AuthService) MFARequired(userID string) bool {
	// Check user store for MFA flag
	user, err := as.userStore.GetUserByID(userID)
	if err != nil {
		return true // fail secure: require MFA if we can't check
	}
	return user.MFAEnabled
}

// ValidateMFASession verifies that a login MFA challenge is valid for the user.
func (as *AuthService) ValidateMFASession(sessionID, email string) bool {
	return as.mfaSessions.Validate(sessionID, email)
}

// GenerateMFASecret creates a new TOTP secret for a user and returns the
// provisioning URI for their authenticator app.
func (as *AuthService) GenerateMFASecret(email string) (string, string, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "RivicQ CryptoBOM",
		AccountName: email,
		Period:      30,
		SecretSize:  20,
	})
	if err != nil {
		return "", "", err
	}
	return key.Secret(), key.URL(), nil
}

// ValidateTOTP checks a TOTP code against a user's stored secret.
func (as *AuthService) ValidateTOTP(user *User, code string) bool {
	if user == nil || strings.TrimSpace(user.MFASecret) == "" {
		return false
	}
	return totp.Validate(strings.TrimSpace(code), user.MFASecret)
}

// UserStore interface for user authentication
type UserStore interface {
	GetUserByEmail(email string) (*User, error)
	GetUserByID(id string) (*User, error)
	CreateUser(user *User) error
	UpdateUser(user *User) error
	ListUsersByTenant(tenantID string) ([]*User, error)
}

const (
	// MinPasswordLength is the floor for workspace passwords.
	MinPasswordLength = 12
	// MaxPasswordLength bounds bcrypt input; bcrypt silently truncates at 72
	// bytes, so anything longer is rejected rather than quietly shortened.
	MaxPasswordLength = 72
)

// commonPasswords is a small deny list of the passwords that dominate
// credential-stuffing lists. It is a floor, not a breach-list service.
var commonPasswords = map[string]bool{
	"password":      true,
	"password1":     true,
	"password123":   true,
	"passw0rd":      true,
	"12345678":      true,
	"123456789":     true,
	"1234567890":    true,
	"qwerty123":     true,
	"letmein":       true,
	"welcome1":      true,
	"administrator": true,
	"changeme":      true,
	"demopass123":   true,
	"rivicq123":     true,
}

// ValidatePassword enforces the workspace password policy:
// 12-72 characters, at least three of {lowercase, uppercase, digit, symbol},
// not a common password, and not containing the local part of an email or the
// tenant name.
func ValidatePassword(password string) error {
	return ValidatePasswordFor(password, "", "")
}

// ValidatePasswordFor is ValidatePassword with identity context so a password
// cannot be built out of the account's own name.
func ValidatePasswordFor(password, email, tenant string) error {
	if len(password) < MinPasswordLength {
		return fmt.Errorf("password must be at least %d characters", MinPasswordLength)
	}
	if len(password) > MaxPasswordLength {
		return fmt.Errorf("password must be at most %d bytes", MaxPasswordLength)
	}
	if strings.TrimSpace(password) != password || password == "" {
		return errors.New("password must not begin or end with whitespace")
	}
	if commonPasswords[strings.ToLower(password)] {
		return errors.New("password is too common; choose a unique passphrase")
	}

	var lower, upper, digit, symbol bool
	for _, r := range password {
		switch {
		case r >= 'a' && r <= 'z':
			lower = true
		case r >= 'A' && r <= 'Z':
			upper = true
		case r >= '0' && r <= '9':
			digit = true
		default:
			symbol = true
		}
	}
	classes := 0
	for _, ok := range []bool{lower, upper, digit, symbol} {
		if ok {
			classes++
		}
	}
	if classes < 3 {
		return errors.New("password must mix at least three of: lowercase, uppercase, digits, symbols")
	}

	// Compare on a squashed alphanumeric form so "Rivicq-Example-Org-1" is
	// recognised as derived from "Example Org" despite separators and case.
	squash := func(in string) string {
		var b strings.Builder
		for _, r := range strings.ToLower(in) {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
				b.WriteRune(r)
			}
		}
		return b.String()
	}
	squashed := squash(password)

	if email != "" {
		if local, _, found := strings.Cut(email, "@"); found {
			if local = squash(local); len(local) >= 4 && strings.Contains(squashed, local) {
				return errors.New("password must not contain your email address")
			}
		}
	}
	if org := squash(tenant); len(org) >= 4 && strings.Contains(squashed, org) {
		return errors.New("password must not contain your organization name")
	}
	return nil
}

// AuthService handles authentication logic
type AuthService struct {
	tokenManager *TokenManager
	userStore    UserStore
	mfaSessions  *MFASessionStore
	resetTokens  *PasswordResetStore
}

// NewAuthService creates a new authentication service
func NewAuthService(secretKey string, userStore UserStore) *AuthService {
	return &AuthService{
		tokenManager: NewTokenManager(secretKey),
		userStore:    userStore,
		mfaSessions:  NewMFASessionStore(),
		resetTokens:  NewPasswordResetStore(),
	}
}

// TokenManager exposes the underlying token manager for refresh/revoke operations.
func (as *AuthService) TokenManager() *TokenManager {
	return as.tokenManager
}

// GetUserByEmail exposes the underlying lookup for API handlers.
func (as *AuthService) GetUserByEmail(email string) (*User, error) {
	return as.userStore.GetUserByEmail(email)
}

// GetUserByID exposes lookup by id for workspace administration.
func (as *AuthService) GetUserByID(id string) (*User, error) {
	return as.userStore.GetUserByID(id)
}

// ListUsersByTenant returns workspace members (no password or MFA secret in JSON).
func (as *AuthService) ListUsersByTenant(tenantID string) ([]*User, error) {
	return as.userStore.ListUsersByTenant(tenantID)
}

// UpdateUser persists a user (used for MFA enable/disable and profile).
func (as *AuthService) UpdateUser(user *User) error {
	return as.userStore.UpdateUser(user)
}

// RequestPasswordReset creates a reset token if the email exists.
// Callers must not reveal whether the account exists except in labeled demo mode.
func (as *AuthService) RequestPasswordReset(email string) (token string, found bool, err error) {
	user, lookupErr := as.userStore.GetUserByEmail(strings.ToLower(strings.TrimSpace(email)))
	if lookupErr != nil || user == nil {
		return "", false, nil
	}
	token, err = as.resetTokens.Create(user.Email)
	if err != nil {
		return "", true, err
	}
	return token, true, nil
}

// ResetPassword consumes a reset token and sets a new password.
func (as *AuthService) ResetPassword(token, newPassword string) error {
	// Peek first so the identity-aware policy check can reject a weak password
	// without consuming the token, then consume only once the password is
	// acceptable.
	email, ok := as.resetTokens.Peek(token)
	if !ok {
		return errors.New("invalid or expired reset token")
	}
	user, err := as.userStore.GetUserByEmail(email)
	if err != nil {
		return errors.New("invalid or expired reset token")
	}
	if err := ValidatePasswordFor(newPassword, user.Email, user.Organisation); err != nil {
		return err
	}
	if _, ok := as.resetTokens.Consume(token); !ok {
		return errors.New("invalid or expired reset token")
	}
	hashed, err := HashPassword(newPassword)
	if err != nil {
		return err
	}
	user.Password = hashed
	return as.userStore.UpdateUser(user)
}

// ChangePassword verifies the current password and sets a new one.
func (as *AuthService) ChangePassword(email, current, next string) error {
	// Verify the current password before policy checks so a caller cannot use
	// the error text to probe the policy for an account they do not own.
	user, err := as.userStore.GetUserByEmail(email)
	if err != nil {
		return errors.New("user not found")
	}
	if !checkPassword(current, user.Password) {
		return errors.New("current password is incorrect")
	}
	if err := ValidatePasswordFor(next, user.Email, user.Organisation); err != nil {
		return err
	}
	hashed, err := HashPassword(next)
	if err != nil {
		return err
	}
	user.Password = hashed
	return as.userStore.UpdateUser(user)
}

// Login authenticates a user and returns a LoginResponse.
func (as *AuthService) Login(email, password string) (*LoginResponse, error) {
	return as.LoginWithEdition(email, password, "")
}

// LoginResponse includes the access token and refresh token.
type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	MFARequired  bool   `json:"mfa_required,omitempty"`
	MFASession   string `json:"mfa_session,omitempty"`
}

// LoginWithEdition authenticates a user and returns a JWT token for a requested edition.
func (as *AuthService) LoginWithEdition(email, password, edition string) (*LoginResponse, error) {
	user, err := as.userStore.GetUserByEmail(email)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if !checkPassword(password, user.Password) {
		return nil, errors.New("invalid credentials")
	}

	// MFA enforcement: if user has MFA enabled, require second factor
	if user.MFAEnabled {
		return &LoginResponse{
			MFARequired: true,
			MFASession:  as.mfaSessions.Create(user),
		}, nil
	}

	edition = editionForRole(edition, user.Role)

	accessToken, err := as.tokenManager.GenerateToken(user, edition)
	if err != nil {
		return nil, err
	}

	refreshToken, err := as.tokenManager.GenerateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// editionForRole normalises an edition request, falling back to the edition
// implied by the user's role when none was requested.
//
// Refresh uses this so a rotated token carries the same edition the user
// originally logged in with instead of silently dropping to OSS.
func editionForRole(requested, role string) string {
	edition := strings.ToLower(strings.TrimSpace(requested))
	switch edition {
	case "community":
		edition = "oss"
	case "pro":
		edition = "professional"
	case "ent":
		edition = "enterprise"
	}
	if edition != "" {
		return edition
	}
	switch NormalizeRole(role) {
	case "admin":
		return "enterprise"
	case "operator", "analyst":
		return "professional"
	}
	return "oss"
}

// RefreshSession rotates a refresh token and issues a new access token.
//
// Unlike TokenManager.RefreshAccessToken, this re-reads the user record so the
// new access token carries the authoritative tenant, role and edition. If the
// user no longer exists, or the token's tenant no longer matches the account,
// the refresh is refused.
func (as *AuthService) RefreshSession(refreshTokenString string) (string, string, error) {
	claims, err := as.tokenManager.ValidateRefreshToken(refreshTokenString)
	if err != nil {
		return "", "", err
	}

	user, err := as.userStore.GetUserByID(claims.UserID)
	if err != nil {
		return "", "", errors.New("account no longer exists")
	}
	// A token issued for a tenant the account no longer belongs to must not
	// mint a token for the new tenant.
	if tenant.Normalize(user.TenantID) != tenant.Normalize(claims.TenantID) {
		return "", "", errors.New("account tenant changed; re-authentication required")
	}
	// Authority is re-derived from the store, so a demotion takes effect on the
	// next refresh rather than persisting until the access token expires.
	if claims.Role != NormalizeRole(user.Role) {
		return "", "", errors.New("account role changed; re-authentication required")
	}

	if claims.ID != "" {
		as.tokenManager.blacklist.Revoke(claims.ID, claims.ExpiresAt.Time)
	}

	accessToken, err := as.tokenManager.GenerateToken(user, editionForRole("", user.Role))
	if err != nil {
		return "", "", err
	}
	nextRefresh, err := as.tokenManager.GenerateRefreshToken(user)
	if err != nil {
		return "", "", err
	}
	return accessToken, nextRefresh, nil
}

// Register creates a new user and returns their ID
func (as *AuthService) Register(user *User) error {
	if err := ValidatePassword(user.Password); err != nil {
		return err
	}
	return as.userStore.CreateUser(user)
}

// HashPassword creates a bcrypt hash of the password (exported for OSS bootstrap)
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// checkPassword compares a plaintext password with a bcrypt hash
func checkPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Middleware function for JWT authentication
func (as *AuthService) JWTAuthMiddleware(permissions []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(401, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenString := authHeader
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		}

		claims, err := as.tokenManager.ValidateToken(tokenString)
		if err != nil {
			c.JSON(401, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Check if user has required permissions
		if !hasPermissions(claims.Permissions, permissions) {
			c.JSON(403, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		// Set user context
		c.Set("user_id", claims.UserID)
		c.Set("tenant_id", claims.TenantID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Set("edition", claims.Edition)
		c.Set("permissions", claims.Permissions)

		c.Next()
	}
}

// OptionalJWTAuthMiddleware binds JWT claims when a Bearer token is present.
// Missing Authorization continues as the public tenant (Home CBOM pilot).
// An invalid Bearer token is rejected so a failed login cannot fall into the public workspace.
func (as *AuthService) OptionalJWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if strings.TrimSpace(authHeader) == "" {
			c.Next()
			return
		}

		tokenString := authHeader
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		}

		claims, err := as.tokenManager.ValidateToken(tokenString)
		if err != nil {
			c.JSON(401, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("tenant_id", claims.TenantID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Set("edition", claims.Edition)
		c.Set("permissions", claims.Permissions)
		c.Next()
	}
}

// hasPermissions checks if user has all required permissions
func hasPermissions(userPermissions, requiredPermissions []string) bool {
	if len(requiredPermissions) == 0 {
		return true
	}

	permSet := make(map[string]bool)
	for _, perm := range userPermissions {
		permSet[perm] = true
	}

	for _, reqPerm := range requiredPermissions {
		if !permSet[reqPerm] {
			return false
		}
	}

	return true
}
