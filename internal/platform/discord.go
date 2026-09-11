package platform

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

func isBlockedNotifyKey(k string) bool {
	switch k {
	case "email", "password", "token", "secret", "key", "card", "cvv", "pan",
		"authorization", "cookie", "webhook", "private", "ssn", "iban", "api_key", "apikey":
		return true
	}
	for _, b := range []string{"password", "secret", "token", "api_key", "apikey", "webhook", "authorization", "cvv", "_key"} {
		if strings.Contains(k, b) {
			return true
		}
	}
	return false
}

// SafeFields drops secrets and direct identifiers. Company + intent is enough
// for an operations channel.
func SafeFields(in map[string]string) map[string]string {
	out := map[string]string{}
	for k, v := range in {
		lk := strings.ToLower(strings.TrimSpace(k))
		if isBlockedNotifyKey(lk) {
			continue
		}
		val := strings.TrimSpace(v)
		if val == "" {
			continue
		}
		if strings.Contains(val, "@") {
			continue
		}
		if len(val) > 200 {
			val = val[:200]
		}
		out[k] = val
	}
	return out
}

func NotifyDiscord(logger *logrus.Logger, kind string, fields map[string]string) {
	url := strings.TrimSpace(os.Getenv("DISCORD_WEBHOOK_URL"))
	if url == "" {
		return
	}
	safe := SafeFields(fields)
	desc := kind
	if len(safe) > 0 {
		lines := make([]string, 0, len(safe))
		for k, v := range safe {
			lines = append(lines, k+": "+v)
		}
		desc = kind + "\n" + strings.Join(lines, "\n")
	}
	payload := map[string]any{
		"username": "RivicQ",
		"content":  "",
		"embeds": []map[string]any{
			{
				"title":       "RivicQ event",
				"description": desc,
				"color":       0x7C3AED,
			},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return
	}
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		if logger != nil {
			logger.WithError(err).Warn("discord notify failed")
		}
		return
	}
	_ = resp.Body.Close()
}

func DiscordConfigured() bool {
	return strings.TrimSpace(os.Getenv("DISCORD_WEBHOOK_URL")) != ""
}
