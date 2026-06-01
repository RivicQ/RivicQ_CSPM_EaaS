package auth

import (
	"errors"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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
	ID       string `json:"id"`
	TenantID string `json:"tenant_id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	Password string `json:"-"`
}

// TokenManager handles JWT token generation and validation
type TokenManager struct {
	secretKey      string
	accessTokenTTL time.Duration
	issuer         string
}

// NewTokenManager creates a new token manager
func NewTokenManager(secretKey string) *TokenManager {
	return &TokenManager{
		secretKey:      secretKey,
		accessTokenTTL: 24 * time.Hour, // 24 hours
		issuer:         "cryptobom-saas",
	}
}

// GenerateToken creates a new JWT token for a user
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
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(tm.accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    tm.issuer,
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
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// RefreshToken generates a new token from an existing valid token
func (tm *TokenManager) RefreshToken(tokenString string) (string, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return "", err
	}

	// Create new token with extended expiration
	newClaims := Claims{
		UserID:      claims.UserID,
		TenantID:    claims.TenantID,
		Email:       claims.Email,
		Role:        claims.Role,
		Edition:     claims.Edition,
		Permissions: claims.Permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(tm.accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    tm.issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
	return token.SignedString([]byte(tm.secretKey))
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

// GetUserByEmail exposes the underlying lookup for API handlers.
func (as *AuthService) GetUserByEmail(email string) (*User, error) {
	return as.userStore.GetUserByEmail(email)
}

// Login authenticates a user and returns a JWT token
func (as *AuthService) Login(email, password string) (string, error) {
	return as.LoginWithEdition(email, password, "")
}

// LoginWithEdition authenticates a user and returns a JWT token for a requested edition.
func (as *AuthService) LoginWithEdition(email, password, edition string) (string, error) {
	user, err := as.userStore.GetUserByEmail(email)
	if err != nil {
		return "", errors.New("user not found")
	}

	if !checkPassword(password, user.Password) {
		return "", errors.New("invalid credentials")
	}

	if edition == "" {
		edition = "oss"
		if user.Role == "admin" || user.Role == "operator" {
			edition = "enterprise"
		}
	}

	return as.tokenManager.GenerateToken(user, edition)
}

// Register creates a new user and returns their ID
func (as *AuthService) Register(user *User) error {
	return as.userStore.CreateUser(user)
}

// hashPassword creates a bcrypt hash of the password
func hashPassword(password string) (string, error) {
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
