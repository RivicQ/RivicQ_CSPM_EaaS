package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type visitor struct {
	count    int
	lastSeen time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		limit:    limit,
		window:   window,
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(10 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, v := range rl.visitors {
			if now.Sub(v.lastSeen) > rl.window {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	now := time.Now()

	if !exists {
		rl.visitors[ip] = &visitor{count: 1, lastSeen: now}
		return true
	}

	if now.Sub(v.lastSeen) > rl.window {
		v.count = 1
		v.lastSeen = now
		return true
	}

	v.lastSeen = now
	v.count++
	return v.count <= rl.limit
}

func RateLimit(limit int) gin.HandlerFunc {
	if limit < 0 {
		return func(c *gin.Context) { c.Next() }
	}
	rl := NewRateLimiter(limit, 1*time.Minute)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !rl.Allow(ip) {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded, try again in 1 minute",
			})
			return
		}
		c.Next()
	}
}

// LoginRateLimit enforces per-IP and per-account login attempt limits.
func LoginRateLimit(ipLimit, accountLimit int, window time.Duration) gin.HandlerFunc {
	if ipLimit < 0 && accountLimit < 0 {
		return func(c *gin.Context) { c.Next() }
	}
	ipRL := NewRateLimiter(ipLimit, window)
	acctRL := NewRateLimiter(accountLimit, window)
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if ipLimit >= 0 && !ipRL.Allow(ip) {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded, try again later"})
			return
		}
		email := ""
		if v, ok := c.Get("login_email"); ok {
			if s, ok := v.(string); ok {
				email = s
			}
		}
		if email == "" {
			email = c.PostForm("email")
		}
		if email == "" {
			email = c.Query("email")
		}
		if email != "" {
			key := "acct:" + email
			if accountLimit >= 0 && !acctRL.Allow(key) {
				c.Header("Retry-After", "60")
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded, try again later"})
				return
			}
		}
		c.Next()
	}
}

// AllowKey reports whether a key is within limit; useful for handler-level checks.
func (rl *RateLimiter) AllowKey(key string) bool { return rl.Allow(key) }
