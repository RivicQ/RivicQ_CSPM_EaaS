package zoho

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/smtp"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	DefaultBookingsURL = "https://zoho141.zohobookings.eu/RivicQ"
	defaultAccountsURL = "https://accounts.zoho.eu"
	defaultSMTPHost    = "smtp.zoho.eu"
	defaultSMTPPort    = "587"
)

type Config struct {
	BookingsURL string
	Mail        MailConfig
	CRM         CRMConfig
}

type MailConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
	To       string
}

type CRMConfig struct {
	AccountsURL  string
	APIURL       string
	ClientID     string
	ClientSecret string
	RefreshToken string
}

type Lead struct {
	ID      string
	Name    string
	Email   string
	Company string
	Intent  string
	Source  string
	Stage   string
}

func ConfigFromEnv() Config {
	return Config{
		BookingsURL: envDefault("ZOHO_BOOKINGS_URL", DefaultBookingsURL),
		Mail: MailConfig{
			Host:     envDefault("ZOHO_MAIL_SMTP_HOST", defaultSMTPHost),
			Port:     envDefault("ZOHO_MAIL_SMTP_PORT", defaultSMTPPort),
			Username: envTrim("ZOHO_MAIL_USERNAME"),
			Password: os.Getenv("ZOHO_MAIL_PASSWORD"),
			From:     envDefault("ZOHO_MAIL_FROM", "noreply@rivicq.com"),
			To:       envDefault("ZOHO_MAIL_TO", "sales@rivicq.com"),
		},
		CRM: CRMConfig{
			AccountsURL:  envDefault("ZOHO_CRM_ACCOUNTS_URL", defaultAccountsURL),
			APIURL:       envTrim("ZOHO_CRM_API_URL"),
			ClientID:     envTrim("ZOHO_CRM_CLIENT_ID"),
			ClientSecret: envTrim("ZOHO_CRM_CLIENT_SECRET"),
			RefreshToken: envTrim("ZOHO_CRM_REFRESH_TOKEN"),
		},
	}
}

func (c Config) BookingsConfigured() bool {
	return strings.TrimSpace(c.BookingsURL) != ""
}

func (c MailConfig) Configured() bool {
	return strings.TrimSpace(c.Host) != "" &&
		strings.TrimSpace(c.Port) != "" &&
		strings.TrimSpace(c.Username) != "" &&
		strings.TrimSpace(c.Password) != "" &&
		strings.TrimSpace(c.From) != "" &&
		strings.TrimSpace(c.To) != ""
}

func (c CRMConfig) Configured() bool {
	return strings.TrimSpace(c.AccountsURL) != "" &&
		strings.TrimSpace(c.ClientID) != "" &&
		strings.TrimSpace(c.ClientSecret) != "" &&
		strings.TrimSpace(c.RefreshToken) != ""
}

type Mailer struct {
	cfg MailConfig
}

func NewMailer(cfg MailConfig) *Mailer {
	return &Mailer{cfg: cfg}
}

func (m *Mailer) Configured() bool {
	return m.cfg.Configured()
}

func (m *Mailer) Send(ctx context.Context, subject, body string) error {
	if !m.Configured() {
		return errors.New("zoho mail is not configured")
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	subject = strings.NewReplacer("\r", "", "\n", "").Replace(subject)
	recipients := splitRecipients(m.cfg.To)
	if len(recipients) == 0 {
		return errors.New("zoho mail recipient is not configured")
	}

	address := net.JoinHostPort(strings.TrimSpace(m.cfg.Host), strings.TrimSpace(m.cfg.Port))
	dialer := net.Dialer{Timeout: 10 * time.Second}
	conn, err := dialer.DialContext(ctx, "tcp", address)
	if err != nil {
		return fmt.Errorf("zoho mail dial failed: %w", err)
	}
	client, err := smtp.NewClient(conn, strings.TrimSpace(m.cfg.Host))
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("zoho mail client failed: %w", err)
	}
	defer func() { _ = client.Close() }()

	if ok, _ := client.Extension("STARTTLS"); !ok {
		return errors.New("zoho mail server did not offer STARTTLS")
	}
	if err := client.StartTLS(&tls.Config{ServerName: strings.TrimSpace(m.cfg.Host), MinVersion: tls.VersionTLS12}); err != nil {
		return fmt.Errorf("zoho mail STARTTLS failed: %w", err)
	}
	if ok, _ := client.Extension("AUTH"); !ok {
		return errors.New("zoho mail server did not offer AUTH")
	}
	if err := client.Auth(smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, strings.TrimSpace(m.cfg.Host))); err != nil {
		return fmt.Errorf("zoho mail authentication failed: %w", err)
	}
	if err := client.Mail(m.cfg.From); err != nil {
		return fmt.Errorf("zoho mail sender rejected: %w", err)
	}
	for _, recipient := range recipients {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("zoho mail recipient rejected: %w", err)
		}
	}
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("zoho mail data channel failed: %w", err)
	}
	message := bytes.Buffer{}
	message.WriteString("From: " + m.cfg.From + "\r\n")
	message.WriteString("To: " + strings.Join(recipients, ", ") + "\r\n")
	message.WriteString("Subject: " + subject + "\r\n")
	message.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	message.WriteString("\r\n")
	message.WriteString(body)
	message.WriteString("\r\n")
	if _, err := io.Copy(writer, &message); err != nil {
		_ = writer.Close()
		return fmt.Errorf("zoho mail write failed: %w", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("zoho mail close failed: %w", err)
	}
	if err := client.Quit(); err != nil {
		return fmt.Errorf("zoho mail quit failed: %w", err)
	}
	return nil
}

type CRMClient struct {
	cfg       CRMConfig
	client    *http.Client
	mu        sync.Mutex
	token     string
	expiresAt time.Time
	apiDomain string
}

func NewCRMClient(cfg CRMConfig, client *http.Client) *CRMClient {
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}
	return &CRMClient{cfg: cfg, client: client}
}

func (c *CRMClient) Configured() bool {
	return c.cfg.Configured()
}

func (c *CRMClient) CreateLead(ctx context.Context, lead Lead) error {
	if !c.Configured() {
		return errors.New("zoho crm is not configured")
	}
	token, err := c.accessToken(ctx)
	if err != nil {
		return err
	}

	name := strings.TrimSpace(lead.Name)
	if name == "" {
		name = strings.Split(lead.Email, "@")[0]
	}
	description := fmt.Sprintf("Intent: %s\nSource: %s\nStage: %s\nRivicQ lead ID: %s", lead.Intent, lead.Source, lead.Stage, lead.ID)
	payload, err := json.Marshal(map[string]any{
		"data": []map[string]string{{
			"Last_Name":   name,
			"Email":       lead.Email,
			"Company":     lead.Company,
			"Description": description,
		}},
	})
	if err != nil {
		return fmt.Errorf("zoho crm payload failed: %w", err)
	}

	endpoint := strings.TrimRight(strings.TrimSpace(c.cfg.APIURL), "/")
	if endpoint == "" {
		endpoint = strings.TrimRight(c.apiDomain, "/")
	}
	if endpoint == "" {
		return errors.New("zoho crm api domain is unavailable")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint+"/crm/v2/Leads", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("zoho crm request failed: %w", err)
	}
	req.Header.Set("Authorization", "Zoho-oauthtoken "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("zoho crm call failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("zoho crm returned status %d", resp.StatusCode)
	}

	var result struct {
		Data []struct {
			Status  string `json:"status"`
			Message string `json:"message"`
		} `json:"data"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&result); err != nil {
		return fmt.Errorf("zoho crm response decode failed: %w", err)
	}
	if len(result.Data) == 0 {
		return errors.New("zoho crm response contained no records")
	}
	if !strings.EqualFold(result.Data[0].Status, "success") {
		return fmt.Errorf("zoho crm rejected lead: %s", result.Data[0].Message)
	}
	return nil
}

func (c *CRMClient) accessToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && time.Now().Before(c.expiresAt) {
		return c.token, nil
	}

	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("client_id", c.cfg.ClientID)
	form.Set("client_secret", c.cfg.ClientSecret)
	form.Set("refresh_token", c.cfg.RefreshToken)

	endpoint := strings.TrimRight(c.cfg.AccountsURL, "/") + "/oauth/v2/token"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("zoho token request failed: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("zoho token call failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", fmt.Errorf("zoho token endpoint returned status %d", resp.StatusCode)
	}

	var result struct {
		AccessToken string          `json:"access_token"`
		ExpiresIn   json.RawMessage `json:"expires_in"`
		APIDomain   string          `json:"api_domain"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&result); err != nil {
		return "", fmt.Errorf("zoho token response decode failed: %w", err)
	}
	if strings.TrimSpace(result.AccessToken) == "" {
		return "", errors.New("zoho token response contained no access token")
	}

	expiresIn := 3600
	var seconds int
	if err := json.Unmarshal(result.ExpiresIn, &seconds); err == nil && seconds > 0 {
		expiresIn = seconds
	} else {
		var raw string
		if err := json.Unmarshal(result.ExpiresIn, &raw); err == nil {
			if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
				expiresIn = parsed
			}
		}
	}
	if expiresIn > 60 {
		expiresIn -= 60
	}

	c.token = result.AccessToken
	c.expiresAt = time.Now().Add(time.Duration(expiresIn) * time.Second)
	if strings.TrimSpace(result.APIDomain) != "" {
		c.apiDomain = strings.TrimSpace(result.APIDomain)
	}
	return c.token, nil
}

func splitRecipients(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if recipient := strings.TrimSpace(part); recipient != "" {
			out = append(out, recipient)
		}
	}
	return out
}

func envTrim(key string) string {
	return strings.TrimSpace(os.Getenv(key))
}

func envDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
