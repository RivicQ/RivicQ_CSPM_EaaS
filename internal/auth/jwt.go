package auth

import (
	"errors"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// JWT Claims structure
type Claims struct {
	UserID      string   `json:"user_id"`
	TenantID    string   `json:"tenant_id"`
	Email       string   `json:"email"`
	Role        string   `json:"role"`
	Edition     string   `json:"edition"`
	Permissions []string `json:"permissions"`
	jwt.RegisteredClaims
}

// User data structure
type User struct {
	ID             string `json:"id"`
	TenantID       string `json:"tenant_id"`
	Email          string `json:"email"`
	Name           string `json:"name"`
	Role           string `json:"role"`
	Password       string `json:"-"`
	MFAEnabled     bool   `json:"mfa_enabled"`
	MFASecret      string `json:"-"`
}

// TokenBlacklist stores revoked tokens for refresh rotation.
type TokenBlacklist struct {
	mu     sync.RWMutex
	tokens map[string]time.Time // token jti -> expiry
}

func NewTokenBlacklist() *TokenBlacklist {
	return &TokenBlacklist{ tokens: make(map[string]time.Time) }
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

// TokenManager handles JWT token generation and validation
type TokenManager struct {
	secretKey      string
	accessTokenTTL time.Duration
	refreshTTL     time.Duration
	issuer         string
	blacklist      *TokenBlacklist
}

// NewTokenManager creates a new token manager
func NewTokenManager(secretKey string) *TokenManager {
	return &TokenManager{
		secretKey:      secretKey,
		accessTokenTTL: 1 * time.Hour,  // 1 hour access token
		refreshTTL:     30 * 24 * time.Hour, // 30 day refresh
		issuer:         "cryptobom-saas",
		blacklist:      NewTokenBlacklist(),
	}
}

// GenerateToken creates a new JWT access token for a user
func (tm *TokenManager) GenerateToken(user *User, edition string) (string, error) {
	permissions := tm.getPermissionsForRole(user.Role, edition)

	claims := Claims{
		UserID:      user.ID,
		TenantID:    user.TenantID,
		Email:       user.Email,
		Role:        user.Role,
		Edition:     edition,
		Permissions: permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(tm.accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    tm.issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(tm.secretKey))
}

// GenerateRefreshToken creates a long-lived refresh token.
func (tm *TokenManager) GenerateRefreshToken(user *User) (string, error) {
	claims := Claims{
		UserID:   user.ID,
		TenantID: user.TenantID,
		Email:    user.Email,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(tm.refreshTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    tm.issuer + "-refresh",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(tm.secretKey))
}

// ValidateToken validates a JWT token and returns claims
func (tm *TokenManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(tm.secretKey), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		// Check token blacklist (revoked during rotation)
		if claims.ID != "" && tm.blacklist.IsRevoked(claims.ID) {
			return nil, errors.New("token has been revoked")
		}
		return claims, nil
	}

	return nil, errors.New("invalid token")
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

// RefreshAccessToken generates a new access token and revokes the old one (rotation).
func (tm *TokenManager) RefreshAccessToken(oldTokenString string) (string, string, error) {
	claims, err := tm.ValidateToken(oldTokenString)
	if err != nil {
		return "", "", err
	}

	// Revoke the old token
	if claims.ID != "" {
		tm.blacklist.Revoke(claims.ID, claims.ExpiresAt.Time)
	}

	user := &User{
		ID:       claims.UserID,
		TenantID: claims.TenantID,
		Email:    claims.Email,
		Role:     claims.Role,
	}
	edition := claims.Edition

	newToken, err := tm.GenerateToken(user, edition)
	if err != nil {
		return "", "", err
	}

	refreshToken, err := tm.GenerateRefreshToken(user)
	if err != nil {
		return "", "", err
	}

	return newToken, refreshToken, nil
}

// RefreshToken generates a new token from an existing valid token (deprecated, use RefreshAccessToken).
func (tm *TokenManager) RefreshToken(tokenString string) (string, error) {
	accessToken, _, err := tm.RefreshAccessToken(tokenString)
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

// getPermissionsForRole returns permissions based on user role and edition
func (tm *TokenManager) getPermissionsForRole(role, edition string) []string {
	basePermissions := map[string][]string{
		"admin":    {"cbom:read", "cbom:write", "cbom:delete", "assets:read", "assets:write", "security:read", "security:write", "k8s:read", "k8s:write", "users:manage"},
		"operator": {"cbom:read", "cbom:write", "assets:read", "assets:write", "security:read", "k8s:read", "k8s:write"},
		"analyst":  {"cbom:read", "assets:read", "security:read", "k8s:read"},
		"viewer":   {"cbom:read", "assets:read"},
	}

	// Add enterprise-specific permissions
	if edition == "enterprise" {
		enterprisePermissions := map[string][]string{
			"admin":    {"ibmq:attest", "ibmq:emergency", "ml:analyze", "cloud:manage", "sso:manage"},
			"operator": {"ibmq:attest", "ml:analyze", "cloud:read"},
			"analyst":  {"ibmq:read", "ml:read"},
			"viewer":   {"ibmq:read"},
		}

		// Merge enterprise permissions
		for role, perms := range enterprisePermissions {
			if basePerms, exists := basePermissions[role]; exists {
				basePermissions[role] = append(basePerms, perms...)
			}
		}
	}

	if perms, exists := basePermissions[role]; exists {
		return perms
	}
	return []string{}
}

// UserStore interface for user authentication
type UserStore interface {
	GetUserByEmail(email string) (*User, error)
	GetUserByID(id string) (*User, error)
	CreateUser(user *User) error
	UpdateUser(user *User) error
}

// AuthService handles authentication logic
type AuthService struct {
	tokenManager *TokenManager
	userStore    UserStore
}

// NewAuthService creates a new authentication service
func NewAuthService(secretKey string, userStore UserStore) *AuthService {
	return &AuthService{
		tokenManager: NewTokenManager(secretKey),
		userStore:    userStore,
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
		mfaSession := uuid.New().String()
		return &LoginResponse{
			MFARequired: true,
			MFASession:  mfaSession,
		}, nil
	}

	if edition == "" {
		edition = "oss"
		if user.Role == "admin" || user.Role == "operator" {
			edition = "enterprise"
		}
	}

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

// Register creates a new user and returns their ID
func (as *AuthService) Register(user *User) error {
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
