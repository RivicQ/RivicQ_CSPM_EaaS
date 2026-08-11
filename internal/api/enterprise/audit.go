package enterprise

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rivic-q/cryptobom-saas/internal/database"
	"github.com/sirupsen/logrus"
)

type AuditViewer struct {
	db     *database.EnterpriseDB
	logger *logrus.Logger
}

func NewAuditViewer(db *database.EnterpriseDB, logger *logrus.Logger) *AuditViewer {
	return &AuditViewer{db: db, logger: logger}
}

type AuditEvent struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	EventType string    `json:"event_type"`
	RequestID string    `json:"request_id"`
	Method    string    `json:"method"`
	Path      string    `json:"path"`
	Status    int       `json:"status"`
	LatencyMs int       `json:"latency_ms"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"user_agent"`
	ActorID   string    `json:"actor_id"`
	Metadata  string    `json:"metadata,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func (v *AuditViewer) SetupRoutes(router *gin.RouterGroup, authMW gin.HandlerFunc) {
	audit := router.Group("/audit")
	audit.Use(authMW)
	{
		audit.GET("/events", v.ListEvents)
		audit.GET("/events/:id", v.GetEvent)
		audit.GET("/events/summary", v.GetSummary)
		audit.POST("/events/export", v.ExportEvents)
	}
}

func (v *AuditViewer) ListEvents(c *gin.Context) {
	if v.db == nil {
		c.JSON(http.StatusOK, gin.H{"events": []AuditEvent{}, "total": 0})
		return
	}
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		tenantID = c.GetHeader("X-Tenant-ID")
	}

	eventType := c.Query("event_type")
	statusFilter := c.Query("status")
	method := c.Query("method")
	actorID := c.Query("actor_id")
	days := c.DefaultQuery("days", "7")
	since := time.Now().AddDate(0, 0, -parseInt(days, 7))

	query := `SELECT id, tenant_id, event_type, request_id, method, path, status, latency_ms, ip, user_agent, actor_id, metadata, created_at
		FROM audit_events WHERE tenant_id = $1 AND created_at >= $2`
	args := []interface{}{tenantID, since}
	argIdx := 3

	if eventType != "" {
		query += ` AND event_type = $` + string(rune('0'+argIdx))
		args = append(args, eventType)
		argIdx++
	}
	if statusFilter != "" {
		query += ` AND status::text LIKE $` + string(rune('0'+argIdx))
		args = append(args, statusFilter+"%")
		argIdx++
	}
	if method != "" {
		query += ` AND method = $` + string(rune('0'+argIdx))
		args = append(args, method)
		argIdx++
	}
	if actorID != "" {
		query += ` AND actor_id = $` + string(rune('0'+argIdx))
		args = append(args, actorID)
	}
	query += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := v.db.Query(query, args...)
	if err != nil {
		v.logger.Error("Failed to query audit events: ", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query audit events"})
		return
	}
	defer func() { _ = rows.Close() }()

	var events []AuditEvent
	for rows.Next() {
		var e AuditEvent
		var metadata *string
		if err := rows.Scan(&e.ID, &e.TenantID, &e.EventType, &e.RequestID, &e.Method, &e.Path,
			&e.Status, &e.LatencyMs, &e.IP, &e.UserAgent, &e.ActorID, &metadata, &e.CreatedAt); err != nil {
			continue
		}
		if metadata != nil {
			e.Metadata = *metadata
		}
		events = append(events, e)
	}

	c.JSON(http.StatusOK, gin.H{
		"events": events,
		"total":  len(events),
		"since":  since,
	})
}

func (v *AuditViewer) GetEvent(c *gin.Context) {
	if v.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
		return
	}
	id := c.Param("id")
	var e AuditEvent
	var metadata *string
	err := v.db.QueryRow(`
		SELECT id, tenant_id, event_type, request_id, method, path, status, latency_ms, ip, user_agent, actor_id, metadata, created_at
		FROM audit_events WHERE id = $1
	`, id).Scan(&e.ID, &e.TenantID, &e.EventType, &e.RequestID, &e.Method, &e.Path,
		&e.Status, &e.LatencyMs, &e.IP, &e.UserAgent, &e.ActorID, &metadata, &e.CreatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	if metadata != nil {
		e.Metadata = *metadata
	}
	c.JSON(http.StatusOK, e)
}

func (v *AuditViewer) GetSummary(c *gin.Context) {
	if v.db == nil {
		c.JSON(http.StatusOK, gin.H{"total_events": 0, "errors_4xx": 0, "errors_5xx": 0})
		return
	}
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		tenantID = c.GetHeader("X-Tenant-ID")
	}
	days := c.DefaultQuery("days", "30")
	since := time.Now().AddDate(0, 0, -parseInt(days, 30))

	var totalEvents, errors4xx, errors5xx int
	if err := v.db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id = $1 AND created_at >= $2`, tenantID, since).Scan(&totalEvents); err != nil {
		v.logger.Error("Failed to summarize audit events: ", err)
	}
	if err := v.db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id = $1 AND status >= 400 AND status < 500 AND created_at >= $2`, tenantID, since).Scan(&errors4xx); err != nil {
		v.logger.Error("Failed to summarize audit events: ", err)
	}
	if err := v.db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id = $1 AND status >= 500 AND created_at >= $2`, tenantID, since).Scan(&errors5xx); err != nil {
		v.logger.Error("Failed to summarize audit events: ", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"total_events": totalEvents,
		"errors_4xx":   errors4xx,
		"errors_5xx":   errors5xx,
		"since":        since,
	})
}

func (v *AuditViewer) ExportEvents(c *gin.Context) {
	if v.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Enterprise database not available"})
		return
	}
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		tenantID = c.GetHeader("X-Tenant-ID")
	}
	var req struct {
		Format string `json:"format"`
		Days   int    `json:"days"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.Days <= 0 || req.Days > 365 {
		req.Days = 7
	}
	if req.Format == "" {
		req.Format = "json"
	}

	since := time.Now().AddDate(0, 0, -req.Days)
	rows, err := v.db.Query(`
		SELECT event_type, method, path, status, latency_ms, ip, actor_id, created_at
		FROM audit_events WHERE tenant_id = $1 AND created_at >= $2 ORDER BY created_at DESC
	`, tenantID, since)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to export events"})
		return
	}
	defer func() { _ = rows.Close() }()

	var events []map[string]interface{}
	for rows.Next() {
		var eventType, method, path, ip, actorID string
		var status, latencyMs int
		var createdAt time.Time
		if err := rows.Scan(&eventType, &method, &path, &status, &latencyMs, &ip, &actorID, &createdAt); err != nil {
			v.logger.Error("Failed to scan audit export row: ", err)
			continue
		}
		events = append(events, map[string]interface{}{
			"event_type": eventType, "method": method, "path": path,
			"status": status, "latency_ms": latencyMs, "ip": ip,
			"actor_id": actorID, "created_at": createdAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"format":      req.Format,
		"events":      events,
		"total":       len(events),
		"exported_at": time.Now(),
	})
}

func parseInt(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	var n int
	if _, err := fmt.Sscanf(s, "%d", &n); err == nil {
		return n
	}
	return defaultVal
}
