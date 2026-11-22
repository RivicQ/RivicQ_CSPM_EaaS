package zoho

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestConfigFromEnvDefaults(t *testing.T) {
	t.Setenv("ZOHO_BOOKINGS_URL", "")
	t.Setenv("ZOHO_MAIL_SMTP_HOST", "")
	t.Setenv("ZOHO_MAIL_SMTP_PORT", "")
	t.Setenv("ZOHO_MAIL_USERNAME", "")
	t.Setenv("ZOHO_MAIL_PASSWORD", "")
	t.Setenv("ZOHO_MAIL_FROM", "")
	t.Setenv("ZOHO_MAIL_TO", "")
	t.Setenv("ZOHO_CRM_ACCOUNTS_URL", "")
	t.Setenv("ZOHO_CRM_API_URL", "")
	t.Setenv("ZOHO_CRM_CLIENT_ID", "")
	t.Setenv("ZOHO_CRM_CLIENT_SECRET", "")
	t.Setenv("ZOHO_CRM_REFRESH_TOKEN", "")

	cfg := ConfigFromEnv()
	require.Equal(t, DefaultBookingsURL, cfg.BookingsURL)
	require.Equal(t, defaultSMTPHost, cfg.Mail.Host)
	require.Equal(t, defaultSMTPPort, cfg.Mail.Port)
	require.Equal(t, "noreply@rivicq.com", cfg.Mail.From)
	require.Equal(t, "sales@rivicq.com", cfg.Mail.To)
	require.False(t, cfg.Mail.Configured())
	require.False(t, cfg.CRM.Configured())
}

func TestCRMClientCreateLead(t *testing.T) {
	var gotAuthorization string
	var gotLead map[string]string
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/oauth/v2/token":
			require.NoError(t, r.ParseForm())
			require.Equal(t, "refresh_token", r.Form.Get("grant_type"))
			require.Equal(t, "client-id", r.Form.Get("client_id"))
			w.Header().Set("Content-Type", "application/json")
			_, _ = fmt.Fprintf(w, `{"access_token":"test-token","expires_in":"3600","api_domain":%q}`, server.URL)
		case "/crm/v2/Leads":
			gotAuthorization = r.Header.Get("Authorization")
			var payload struct {
				Data []map[string]string `json:"data"`
			}
			require.NoError(t, json.NewDecoder(r.Body).Decode(&payload))
			require.Len(t, payload.Data, 1)
			gotLead = payload.Data[0]
			w.Header().Set("Content-Type", "application/json")
			_, _ = fmt.Fprint(w, `{"data":[{"status":"success","message":"record created","details":{"id":"1"}}]}`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := NewCRMClient(CRMConfig{
		AccountsURL:  server.URL,
		APIURL:       server.URL,
		ClientID:     "client-id",
		ClientSecret: "client-secret",
		RefreshToken: "refresh-token",
	}, server.Client())

	err := client.CreateLead(context.Background(), Lead{
		ID:      "lead-1",
		Name:    "Dana",
		Email:   "dana@example.com",
		Company: "Example GmbH",
		Intent:  "poc",
		Source:  "request-demo",
		Stage:   "identified",
	})
	require.NoError(t, err)
	require.Equal(t, "Zoho-oauthtoken test-token", gotAuthorization)
	require.Equal(t, "Dana", gotLead["Last_Name"])
	require.Equal(t, "dana@example.com", gotLead["Email"])
	require.Contains(t, gotLead["Description"], "lead-1")
}

func TestCRMClientRequiresConfiguration(t *testing.T) {
	client := NewCRMClient(CRMConfig{}, nil)
	err := client.CreateLead(context.Background(), Lead{Email: "dana@example.com"})
	require.ErrorContains(t, err, "zoho crm is not configured")
}

func TestMailerRequiresConfiguration(t *testing.T) {
	err := NewMailer(MailConfig{}).Send(context.Background(), "Lead", "body")
	require.ErrorContains(t, err, "zoho mail is not configured")
}
