package enterprise

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

type APIKeyManager struct {
	db     *database.EnterpriseDB
	logger *logrus.Logger
}

func NewAPIKeyManager(db *database.EnterpriseDB, logger *logrus.Logger) *APIKeyManager {
	return &APIKeyManager{db: db, logger: logger}
}

type APIKey struct {
	ID        string     `json:"id"`
	TenantID  string     `json:"tenant_id"`
	Name      string     `json:"name"`
	KeyPrefix string     `json:"key_prefix"`
	KeyHash   string     `json:"-"`
	Role      string     `json:"role"`
	Scopes    []string   `json:"scopes,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	LastUsed  *time.Time `json:"last_used_at,omitempty"`
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
}

func (m *APIKeyManager) SetupRoutes(router *gin.RouterGroup, authMW gin.HandlerFunc) {
	keys := router.Group("/api-keys")
	keys.Use(authMW)
	{
		keys.GET("", m.ListKeys)
		keys.POST("", m.CreateKey)
		keys.DELETE("/:id", m.RevokeKey)
		keys.PUT("/:id", m.UpdateKey)
	}
}

func (m *APIKeyManager) ListKeys(c *gin.Context) {
	if m.db == nil {
		c.JSON(http.StatusOK, gin.H{"api_keys": []APIKey{}})
		return
	}

	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		tenantID = c.GetHeader("X-Tenant-ID")
	}

	rows, err := m.db.Query(`
		SELECT id, tenant_id, name, key_prefix, role, scopes, expires_at, last_used_at, status, created_at
		FROM api_keys WHERE tenant_id = $1 ORDER BY created_at DESC
	`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list API keys"})
		return
	}
	defer func() { _ = rows.Close() }()

	var keys []APIKey
	for rows.Next() {
		var k APIKey
		var scopes []byte
		err := rows.Scan(&k.ID, &k.TenantID, &k.Name, &k.KeyPrefix, &k.Role, &scopes, &k.ExpiresAt, &k.LastUsed, &k.Status, &k.CreatedAt)
		if err != nil {
			continue
		}
		keys = append(keys, k)
	}
	c.JSON(http.StatusOK, gin.H{"api_keys": keys})
}

func (m *APIKeyManager) CreateKey(c *gin.Context) {
	if m.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
		return
	}

	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		tenantID = c.GetHeader("X-Tenant-ID")
	}

	var req struct {
		Name      string     `json:"name" binding:"required"`
		Role      string     `json:"role"`
		Scopes    []string   `json:"scopes"`
		ExpiresAt *time.Time `json:"expires_at"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if req.Role == "" {
		req.Role = "viewer"
	}

	rawKey, err := generateAPIKey()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate API key"})
		return
	}
	keyHash := hashAPIKey(rawKey)
	keyPrefix := rawKey[:8]

	id := uuid.New().String()
	_, err = m.db.Exec(`
		INSERT INTO api_keys (id, tenant_id, name, key_prefix, key_hash, role, scopes, expires_at, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
	`, id, tenantID, req.Name, keyPrefix, keyHash, req.Role, strings.Join(req.Scopes, ","), req.ExpiresAt)
	if err != nil {
		m.logger.Error("Failed to create API key: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create API key"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         id,
		"name":       req.Name,
		"key_prefix": keyPrefix,
		"api_key":    rawKey,
		"message":    "Save this API key now — it will not be shown again",
	})
}

func (m *APIKeyManager) RevokeKey(c *gin.Context) {
	if m.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
		return
	}
	id := c.Param("id")
	_, err := m.db.Exec(`UPDATE api_keys SET status = 'revoked' WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke key"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "API key revoked"})
}

func (m *APIKeyManager) UpdateKey(c *gin.Context) {
	if m.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
		return
	}
	id := c.Param("id")
	var req struct {
		Name   string   `json:"name"`
		Role   string   `json:"role"`
		Scopes []string `json:"scopes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := m.db.Exec(`
		UPDATE api_keys SET name = COALESCE(NULLIF($1,''), name), role = COALESCE(NULLIF($2,''), role),
		scopes = COALESCE(NULLIF($3,''), scopes) WHERE id = $4
	`, req.Name, req.Role, strings.Join(req.Scopes, ","), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update key"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "API key updated"})
}

// APIKeyAuthMiddleware validates API key from Authorization header.
func (m *APIKeyManager) APIKeyAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if m.db == nil {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer cb_") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid API key"})
			return
		}

		rawKey := strings.TrimPrefix(authHeader, "Bearer ")
		keyHash := hashAPIKey(rawKey)
		keyPrefix := rawKey[:8]

		var k APIKey
		var scopesStr string
		err := m.db.QueryRow(`
			SELECT id, tenant_id, name, role, scopes, expires_at, status FROM api_keys
			WHERE key_prefix = $1 AND key_hash = $2 AND status = 'active'
		`, keyPrefix, keyHash).Scan(&k.ID, &k.TenantID, &k.Name, &k.Role, &scopesStr, &k.ExpiresAt, &k.Status)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or revoked API key"})
			return
		}

		if k.ExpiresAt != nil && time.Now().After(*k.ExpiresAt) {
			_, _ = m.db.Exec(`UPDATE api_keys SET status = 'expired' WHERE id = $1`, k.ID)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "API key has expired"})
			return
		}

		_, _ = m.db.Exec(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, k.ID)

		c.Set("tenant_id", k.TenantID)
		c.Set("user_id", k.ID)
		c.Set("role", k.Role)
		c.Set("auth_method", "api_key")
		c.Next()
	}
}

func generateAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "cb_" + hex.EncodeToString(bytes), nil
}

func hashAPIKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:])
}

// APIKeyAuthService provides a middleware that checks JWT first, then API key.
func APIKeyAuthFallback(apiKeyMW gin.HandlerFunc, jwtMW gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer cb_") {
			apiKeyMW(c)
		} else {
			jwtMW(c)
		}
	}
}

// AuthenticateFromContext returns the tenant_id and user info from auth context.
func AuthenticateFromContext(c *gin.Context) (tenantID, userID, role string, isAPIKey bool) {
	tenantID = c.GetString("tenant_id")
	userID = c.GetString("user_id")
	role = c.GetString("role")
	isAPIKey = c.GetString("auth_method") == "api_key"
	return
}
