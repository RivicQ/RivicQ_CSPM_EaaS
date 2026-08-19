package enterprise

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

type WebhookManager struct {
	db     *database.EnterpriseDB
	logger *logrus.Logger
	client *http.Client
}

func NewWebhookManager(db *database.EnterpriseDB, logger *logrus.Logger) *WebhookManager {
	return &WebhookManager{
		db:     db,
		logger: logger,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

type Webhook struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Secret    string    `json:"-"`
	Events    []string  `json:"events"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func (w *WebhookManager) SetupRoutes(router *gin.RouterGroup, authMW gin.HandlerFunc) {
	wh := router.Group("/webhooks")
	wh.Use(authMW)
	{
		wh.GET("", w.ListWebhooks)
		wh.POST("", auth.RequireRole("operator"), w.CreateWebhook)
		wh.PUT("/:id", auth.RequireRole("operator"), w.UpdateWebhook)
		wh.DELETE("/:id", auth.RequireRole("admin"), w.DeleteWebhook)
		wh.POST("/:id/test", auth.RequireRole("operator"), w.TestWebhook)
		wh.GET("/deliveries", w.ListDeliveries)
	}
}

func (w *WebhookManager) ListWebhooks(c *gin.Context) {
	if w.db == nil {
		c.JSON(http.StatusOK, gin.H{"webhooks": []Webhook{}})
		return
	}
	tenantID, ok := jwtTenantOrAbort(c)
	if !ok {
		return
	}

	rows, err := w.db.Query(`SELECT id, tenant_id, name, url, events, status, created_at FROM webhooks WHERE tenant_id = $1`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list webhooks"})
		return
	}
	defer func() { _ = rows.Close() }()

	var webhooks []Webhook
	for rows.Next() {
		var wh Webhook
		var eventsStr string
		if err := rows.Scan(&wh.ID, &wh.TenantID, &wh.Name, &wh.URL, &eventsStr, &wh.Status, &wh.CreatedAt); err != nil {
			continue
		}
		_ = json.Unmarshal([]byte(eventsStr), &wh.Events)
		webhooks = append(webhooks, wh)
	}
	c.JSON(http.StatusOK, gin.H{"webhooks": webhooks})
}

func (w *WebhookManager) CreateWebhook(c *gin.Context) {
	if w.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
		return
	}
	tenantID, ok := jwtTenantOrAbort(c)
	if !ok {
		return
	}

	var req struct {
		Name   string   `json:"name" binding:"required"`
		URL    string   `json:"url" binding:"required"`
		Events []string `json:"events" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	id := uuid.New().String()
	secret := uuid.New().String()
	eventsJSON, _ := json.Marshal(req.Events)

	_, err := w.db.Exec(`
		INSERT INTO webhooks (id, tenant_id, name, url, secret, events, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'active')
	`, id, tenantID, req.Name, req.URL, secret, string(eventsJSON))
	if err != nil {
		w.logger.Error("Failed to create webhook: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create webhook"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":      id,
		"name":    req.Name,
		"url":     req.URL,
		"events":  req.Events,
		"secret":  secret,
		"status":  "active",
		"message": "Save the secret for webhook signature verification",
	})
}

func (w *WebhookManager) UpdateWebhook(c *gin.Context) {
	if w.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
		return
	}
	tenantID, ok := jwtTenantOrAbort(c)
	if !ok {
		return
	}
	id := c.Param("id")
	var req struct {
		Name   string   `json:"name"`
		URL    string   `json:"url"`
		Events []string `json:"events"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	eventsJSON, _ := json.Marshal(req.Events)
	_, err := w.db.Exec(`
		UPDATE webhooks SET name = COALESCE(NULLIF($1,''), name), url = COALESCE(NULLIF($2,''), url),
		events = COALESCE(NULLIF($3,''), events::text) WHERE id = $4 AND tenant_id = $5
	`, req.Name, req.URL, string(eventsJSON), id, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update webhook"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Webhook updated"})
}

func (w *WebhookManager) DeleteWebhook(c *gin.Context) {
	if w.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
		return
	}
	tenantID, ok := jwtTenantOrAbort(c)
	if !ok {
		return
	}
	id := c.Param("id")
	_, err := w.db.Exec(`DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete webhook"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Webhook deleted"})
}

func (w *WebhookManager) TestWebhook(c *gin.Context) {
	if w.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
		return
	}
	tenantID, ok := jwtTenantOrAbort(c)
	if !ok {
		return
	}
	id := c.Param("id")
	var wh Webhook
	var eventsStr string
	err := w.db.QueryRow(`SELECT id, tenant_id, name, url, secret, events FROM webhooks WHERE id = $1 AND tenant_id = $2`, id, tenantID).
		Scan(&wh.ID, &wh.TenantID, &wh.Name, &wh.URL, &wh.Secret, &eventsStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Webhook not found"})
		return
	}

	payload := map[string]interface{}{
		"event":     "test",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"data":      map[string]string{"message": "This is a test webhook from CryptoBOM SaaS"},
	}

	if err := w.deliver(wh, "test", payload); err != nil {
		c.JSON(http.StatusOK, gin.H{"status": "failed", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "delivered"})
}

func (w *WebhookManager) ListDeliveries(c *gin.Context) {
	if w.db == nil {
		c.JSON(http.StatusOK, gin.H{"deliveries": []interface{}{}})
		return
	}
	tenantID, ok := jwtTenantOrAbort(c)
	if !ok {
		return
	}

	rows, err := w.db.Query(`
		SELECT wd.id, wd.webhook_id, w.name, wd.event_type, wd.status, wd.status_code, wd.response_body, wd.delivered_at
		FROM webhook_deliveries wd
		JOIN webhooks w ON wd.webhook_id = w.id
		WHERE w.tenant_id = $1
		ORDER BY wd.delivered_at DESC LIMIT 50
	`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list deliveries"})
		return
	}
	defer func() { _ = rows.Close() }()

	type Delivery struct {
		ID           string    `json:"id"`
		WebhookID    string    `json:"webhook_id"`
		Name         string    `json:"webhook_name"`
		EventType    string    `json:"event_type"`
		Status       string    `json:"status"`
		StatusCode   int       `json:"status_code"`
		ResponseBody string    `json:"response_body"`
		DeliveredAt  time.Time `json:"delivered_at"`
	}
	var deliveries []Delivery
	for rows.Next() {
		var d Delivery
		if err := rows.Scan(&d.ID, &d.WebhookID, &d.Name, &d.EventType, &d.Status, &d.StatusCode, &d.ResponseBody, &d.DeliveredAt); err != nil {
			continue
		}
		deliveries = append(deliveries, d)
	}
	c.JSON(http.StatusOK, gin.H{"deliveries": deliveries})
}

// DispatchEvent sends an event to all active webhooks subscribed to the event type.
func (w *WebhookManager) DispatchEvent(tenantID, eventType string, data interface{}) {
	if w.db == nil {
		return
	}

	rows, err := w.db.Query(`
		SELECT id, url, secret FROM webhooks
		WHERE tenant_id = $1 AND status = 'active' AND events::jsonb ? $2
	`, tenantID, eventType)
	if err != nil {
		w.logger.WithError(err).Error("Failed to query webhooks for dispatch")
		return
	}
	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var wh Webhook
		if err := rows.Scan(&wh.ID, &wh.URL, &wh.Secret); err != nil {
			continue
		}
		payload := map[string]interface{}{
			"event":     eventType,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"data":      data,
		}
		go func(wID, wURL, wSecret string, p map[string]interface{}) {
			wh := Webhook{ID: wID, URL: wURL, Secret: wSecret}
			if err := w.deliver(wh, eventType, p); err != nil {
				w.logger.WithError(err).WithField("webhook_id", wID).Error("Webhook delivery failed")
			}
		}(wh.ID, wh.URL, wh.Secret, payload)
	}
}

func (w *WebhookManager) deliver(wh Webhook, eventType string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", wh.URL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	sig := computeHMAC(wh.Secret, body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CryptoBOM-Signature", "sha256="+sig)
	req.Header.Set("X-CryptoBOM-Event", eventType)
	req.Header.Set("X-CryptoBOM-Delivery", uuid.New().String())

	resp, err := w.client.Do(req)
	if err != nil {
		w.recordDelivery(wh.ID, eventType, "failed", 0, err.Error())
		return fmt.Errorf("delivery failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	status := "delivered"
	if resp.StatusCode >= 400 {
		status = "failed"
	}

	var respBuf bytes.Buffer
	_, _ = respBuf.ReadFrom(resp.Body)
	respBody := respBuf.String()
	if len(respBody) > 1000 {
		respBody = respBody[:1000]
	}

	w.recordDelivery(wh.ID, eventType, status, resp.StatusCode, respBody)
	return nil
}

func (w *WebhookManager) recordDelivery(webhookID, eventType, status string, statusCode int, responseBody string) {
	if w.db == nil {
		return
	}
	_, _ = w.db.Exec(`
		INSERT INTO webhook_deliveries (id, webhook_id, event_type, status, status_code, response_body, delivered_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`, uuid.New().String(), webhookID, eventType, status, statusCode, responseBody)
}

func computeHMAC(secret string, data []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(data)
	return hex.EncodeToString(mac.Sum(nil))
}
