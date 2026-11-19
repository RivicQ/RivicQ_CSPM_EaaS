package eaas

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type testClient struct {
	t      *testing.T
	base   string
	client *http.Client
}

func newTestEnvironment(t *testing.T) (*Service, *testClient, string) {
	t.Helper()
	dataFile := filepath.Join(t.TempDir(), "store.json")
	service, err := NewService(Config{
		DataFile: dataFile, Environment: "development", AdminToken: "admin-test-token",
		AllowedOrigins: []string{"https://portal.example"},
	})
	if err != nil {
		t.Fatalf("NewService: %v", err)
	}
	server := httptest.NewServer(Router(service))
	t.Cleanup(server.Close)
	return service, &testClient{t: t, base: server.URL, client: server.Client()}, dataFile
}

func (tc *testClient) do(method, path, token string, body any) (int, map[string]any) {
	tc.t.Helper()
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			tc.t.Fatalf("marshal body: %v", err)
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, tc.base+path, reader)
	if err != nil {
		tc.t.Fatalf("new request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := tc.client.Do(req)
	if err != nil {
		tc.t.Fatalf("request %s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	out := map[string]any{}
	raw, _ := io.ReadAll(resp.Body)
	if len(raw) > 0 && json.Valid(raw) {
		if err := json.Unmarshal(raw, &out); err != nil {
			tc.t.Fatalf("decode response: %v", err)
		}
	}
	return resp.StatusCode, out
}

func registerAndVerify(t *testing.T, tc *testClient, email string) (string, string) {
	t.Helper()
	status, reg := tc.do(http.MethodPost, "/api/eaas/v1/auth/register", "", map[string]any{
		"name": "Test Developer", "email": email, "password": "correct-horse-battery",
	})
	if status != http.StatusCreated {
		t.Fatalf("register status=%d body=%v", status, reg)
	}
	session, _ := reg["session_token"].(string)
	code, _ := reg["dev_verification_code"].(string)
	if session == "" || code == "" {
		t.Fatalf("register response missing credentials: %v", reg)
	}
	status, out := tc.do(http.MethodPost, "/api/eaas/v1/auth/verify", session, map[string]any{"code": code})
	if status != http.StatusOK {
		t.Fatalf("verify status=%d body=%v", status, out)
	}
	return session, reg["user_id"].(string)
}

func createSandbox(t *testing.T, tc *testClient, session string) (string, string) {
	t.Helper()
	status, out := tc.do(http.MethodPost, "/api/eaas/v1/projects", session, map[string]any{
		"name": "Integration sandbox", "environment": "sandbox",
	})
	if status != http.StatusCreated {
		t.Fatalf("create project status=%d body=%v", status, out)
	}
	projectID := out["id"].(string)
	status, keyOut := tc.do(http.MethodPost, "/api/eaas/v1/projects/"+projectID+"/keys", session, map[string]any{})
	if status != http.StatusCreated {
		t.Fatalf("create API key status=%d body=%v", status, keyOut)
	}
	return projectID, keyOut["key"].(string)
}

func TestDeveloperJourneyEndToEnd(t *testing.T) {
	_, tc, _ := newTestEnvironment(t)

	status, reg := tc.do(http.MethodPost, "/api/eaas/v1/auth/register", "", map[string]any{
		"name": "Ada Lovelace", "email": "ada@example.com", "password": "correct-horse-battery",
	})
	if status != http.StatusCreated {
		t.Fatalf("register status=%d body=%v", status, reg)
	}
	session := reg["session_token"].(string)
	code := reg["dev_verification_code"].(string)
	userID := reg["user_id"].(string)
	if reg["verified"] != false {
		t.Fatal("new account must not be verified")
	}

	status, _ = tc.do(http.MethodPost, "/api/eaas/v1/projects", "", map[string]any{"name": "No auth"})
	if status != http.StatusUnauthorized {
		t.Fatalf("unauthenticated project creation status=%d", status)
	}
	status, _ = tc.do(http.MethodPost, "/api/eaas/v1/projects", session, map[string]any{"name": "Early", "environment": "sandbox"})
	if status != http.StatusForbidden {
		t.Fatalf("unverified project creation status=%d", status)
	}
	status, _ = tc.do(http.MethodPost, "/api/eaas/v1/auth/verify", session, map[string]any{"code": "000000"})
	if status != http.StatusBadRequest {
		t.Fatalf("wrong verification code status=%d", status)
	}
	status, _ = tc.do(http.MethodPost, "/api/eaas/v1/auth/verify", session, map[string]any{"code": code})
	if status != http.StatusOK {
		t.Fatalf("verify status=%d", status)
	}
	status, me := tc.do(http.MethodGet, "/api/eaas/v1/auth/me", session, nil)
	if status != http.StatusOK || me["user_id"] != userID {
		t.Fatalf("me status=%d body=%v", status, me)
	}

	status, project := tc.do(http.MethodPost, "/api/eaas/v1/projects", session, map[string]any{
		"name": "Sandbox", "environment": "sandbox",
	})
	if status != http.StatusCreated {
		t.Fatalf("project status=%d body=%v", status, project)
	}
	projectID := project["id"].(string)
	status, denied := tc.do(http.MethodPost, "/api/eaas/v1/projects", session, map[string]any{
		"name": "Prod", "environment": "production",
	})
	if status != http.StatusForbidden {
		t.Fatalf("free-tier production project status=%d body=%v", status, denied)
	}

	status, keyOut := tc.do(http.MethodPost, "/api/eaas/v1/projects/"+projectID+"/keys", session, map[string]any{})
	if status != http.StatusCreated {
		t.Fatalf("key creation status=%d body=%v", status, keyOut)
	}
	apiKey := keyOut["key"].(string)
	if !strings.HasPrefix(apiKey, "eaas_sb_") || keyOut["shown_once"] != true {
		t.Fatalf("unexpected sandbox key response: %v", keyOut)
	}

	status, aesKey := tc.do(http.MethodPost, "/api/eaas/v1/projects/"+projectID+"/crypto-keys", session, map[string]any{"algorithm": "aes-256-gcm"})
	if status != http.StatusCreated {
		t.Fatalf("AES key provisioning status=%d body=%v", status, aesKey)
	}
	aesKeyID := aesKey["key_id"].(string)
	plaintext := b64([]byte("quantum-safe migration plan for production"))
	status, enc := tc.do(http.MethodPost, "/api/eaas/v1/operations/encrypt", apiKey, map[string]any{
		"key_id": aesKeyID, "message": plaintext, "aad": b64([]byte("rivicq-v1")),
	})
	if status != http.StatusOK || enc["ciphertext"] == nil || enc["nonce"] == nil || enc["maturity"] != "Beta implemented" {
		t.Fatalf("encrypt status=%d body=%v", status, enc)
	}
	status, dec := tc.do(http.MethodPost, "/api/eaas/v1/operations/decrypt", apiKey, map[string]any{
		"key_id": aesKeyID, "ciphertext": enc["ciphertext"], "nonce": enc["nonce"], "aad": b64([]byte("rivicq-v1")),
	})
	if status != http.StatusOK || dec["plaintext"] != plaintext {
		t.Fatalf("decrypt status=%d body=%v", status, dec)
	}
	status, bad := tc.do(http.MethodPost, "/api/eaas/v1/operations/decrypt", apiKey, map[string]any{
		"key_id": aesKeyID, "ciphertext": enc["ciphertext"], "nonce": enc["nonce"], "aad": b64([]byte("tampered")),
	})
	if status != http.StatusBadRequest || errCode(bad) != "E_DECRYPT_FAILED" {
		t.Fatalf("tampered decrypt status=%d body=%v", status, bad)
	}

	status, hmacKey := tc.do(http.MethodPost, "/api/eaas/v1/projects/"+projectID+"/crypto-keys", session, map[string]any{"algorithm": "hmac-sha-256"})
	if status != http.StatusCreated {
		t.Fatalf("HMAC key provisioning status=%d body=%v", status, hmacKey)
	}
	hmacKeyID := hmacKey["key_id"].(string)
	status, mac := tc.do(http.MethodPost, "/api/eaas/v1/operations/mac_sign", apiKey, map[string]any{
		"key_id": hmacKeyID, "message": plaintext,
	})
	if status != http.StatusOK {
		t.Fatalf("mac_sign status=%d body=%v", status, mac)
	}
	status, verified := tc.do(http.MethodPost, "/api/eaas/v1/operations/mac_verify", apiKey, map[string]any{
		"key_id": hmacKeyID, "message": plaintext, "signature": mac["mac"],
	})
	if status != http.StatusOK || verified["valid"] != true {
		t.Fatalf("mac_verify status=%d body=%v", status, verified)
	}
	status, badMAC := tc.do(http.MethodPost, "/api/eaas/v1/operations/mac_verify", apiKey, map[string]any{
		"key_id": hmacKeyID, "message": b64([]byte("different")), "signature": mac["mac"],
	})
	if status != http.StatusBadRequest || errCode(badMAC) != "E_MAC_INVALID" {
		t.Fatalf("bad MAC status=%d body=%v", status, badMAC)
	}

	status, digest := tc.do(http.MethodPost, "/api/eaas/v1/operations/digest", apiKey, map[string]any{"message": plaintext})
	if status != http.StatusOK || digest["algorithm"] != "SHA-256" {
		t.Fatalf("digest status=%d body=%v", status, digest)
	}
	status, randOut := tc.do(http.MethodPost, "/api/eaas/v1/operations/random", apiKey, map[string]any{"bytes": 32})
	if status != http.StatusOK {
		t.Fatalf("random status=%d body=%v", status, randOut)
	}
	if raw, err := base64.StdEncoding.DecodeString(randOut["bytes"].(string)); err != nil || len(raw) != 32 {
		t.Fatalf("random output invalid: %v %v", raw, err)
	}

	status, kemKey := tc.do(http.MethodPost, "/api/eaas/v1/operations/mlkem768_keygen", apiKey, map[string]any{})
	if status != http.StatusOK || kemKey["maturity"] != "Experimental" {
		t.Fatalf("ML-KEM keygen status=%d body=%v", status, kemKey)
	}
	kemPub := kemKey["public_key"].(string)
	status, encaps := tc.do(http.MethodPost, "/api/eaas/v1/operations/mlkem768_encapsulate", apiKey, map[string]any{"public_key": kemPub})
	if status != http.StatusOK {
		t.Fatalf("ML-KEM encapsulate status=%d body=%v", status, encaps)
	}
	status, decaps := tc.do(http.MethodPost, "/api/eaas/v1/operations/mlkem768_decapsulate", apiKey, map[string]any{
		"key_id": kemKey["key_id"], "ciphertext": encaps["ciphertext"],
	})
	if status != http.StatusOK || decaps["shared_secret"] != encaps["shared_secret"] {
		t.Fatalf("ML-KEM decapsulation did not round-trip: status=%d", status)
	}

	status, sigKey := tc.do(http.MethodPost, "/api/eaas/v1/operations/mldsa65_keygen", apiKey, map[string]any{})
	if status != http.StatusOK {
		t.Fatalf("ML-DSA keygen status=%d body=%v", status, sigKey)
	}
	status, sig := tc.do(http.MethodPost, "/api/eaas/v1/operations/mldsa65_sign", apiKey, map[string]any{
		"key_id": sigKey["key_id"], "message": plaintext,
	})
	if status != http.StatusOK {
		t.Fatalf("ML-DSA sign status=%d body=%v", status, sig)
	}
	status, sigValid := tc.do(http.MethodPost, "/api/eaas/v1/operations/mldsa65_verify", apiKey, map[string]any{
		"public_key": sigKey["public_key"], "message": plaintext, "signature": sig["signature"],
	})
	if status != http.StatusOK || sigValid["valid"] != true {
		t.Fatalf("ML-DSA verify status=%d body=%v", status, sigValid)
	}
	status, badSig := tc.do(http.MethodPost, "/api/eaas/v1/operations/mldsa65_verify", apiKey, map[string]any{
		"public_key": sigKey["public_key"], "message": b64([]byte("altered")), "signature": sig["signature"],
	})
	if status != http.StatusBadRequest || errCode(badSig) != "E_SIGNATURE_INVALID" {
		t.Fatalf("bad ML-DSA signature status=%d body=%v", status, badSig)
	}

	status, summary := tc.do(http.MethodGet, "/api/eaas/v1/usage/summary", session, nil)
	if status != http.StatusOK || summary["operations_used"].(float64) < 10 || summary["by_category"] == nil {
		t.Fatalf("usage summary status=%d body=%v", status, summary)
	}
	status, events := tc.do(http.MethodGet, "/api/eaas/v1/usage/events", session, nil)
	if status != http.StatusOK || len(events["events"].([]any)) < 10 {
		t.Fatalf("usage events status=%d body=%v", status, events)
	}
	for _, raw := range events["events"].([]any) {
		event := raw.(map[string]any)
		for _, forbidden := range []string{"message", "ciphertext", "plaintext", "signature", "shared_secret", "key"} {
			if _, exists := event[forbidden]; exists {
				t.Fatalf("usage event leaked payload field %s: %v", forbidden, event)
			}
		}
	}

	status, plans := tc.do(http.MethodGet, "/api/eaas/v1/plans", "", nil)
	if status != http.StatusOK || len(plans["plans"].([]any)) != 4 {
		t.Fatalf("plans status=%d body=%v", status, plans)
	}
	status, sub := tc.do(http.MethodPost, "/api/eaas/v1/subscription", session, map[string]any{"plan": "startup"})
	if status != http.StatusOK || sub["billing_status"] != "manual_not_configured" {
		t.Fatalf("upgrade status=%d body=%v", status, sub)
	}
	status, prodProject := tc.do(http.MethodPost, "/api/eaas/v1/projects", session, map[string]any{
		"name": "Production", "environment": "production",
	})
	if status != http.StatusCreated {
		t.Fatalf("production project after upgrade status=%d body=%v", status, prodProject)
	}
	status, liveKey := tc.do(http.MethodPost, "/api/eaas/v1/projects/"+prodProject["id"].(string)+"/keys", session, map[string]any{})
	if status != http.StatusCreated || !strings.HasPrefix(liveKey["key"].(string), "eaas_live_") {
		t.Fatalf("production key status=%d body=%v", status, liveKey)
	}

	status, rotated := tc.do(http.MethodPost, "/api/eaas/v1/keys/"+keyOut["id"].(string)+"/rotate", session, map[string]any{})
	if status != http.StatusOK || rotated["key"] == nil {
		t.Fatalf("rotate status=%d body=%v", status, rotated)
	}
	status, _ = tc.do(http.MethodPost, "/api/eaas/v1/operations/digest", apiKey, map[string]any{"message": plaintext})
	if status != http.StatusUnauthorized {
		t.Fatalf("revoked key was accepted: status=%d", status)
	}
	status, _ = tc.do(http.MethodPost, "/api/eaas/v1/operations/digest", rotated["key"].(string), map[string]any{"message": plaintext})
	if status != http.StatusOK {
		t.Fatalf("rotated key rejected: status=%d", status)
	}
	status, _ = tc.do(http.MethodDelete, "/api/eaas/v1/keys/"+rotated["id"].(string), session, nil)
	if status != http.StatusOK {
		t.Fatalf("revoke status=%d", status)
	}
}

func TestTenantIsolation(t *testing.T) {
	_, tc, _ := newTestEnvironment(t)
	aSession, _ := registerAndVerify(t, tc, "alice@example.com")
	bSession, _ := registerAndVerify(t, tc, "bob@example.com")
	aProject, aKey := createSandbox(t, tc, aSession)
	bProject, bKey := createSandbox(t, tc, bSession)

	status, aliceKey := tc.do(http.MethodPost, "/api/eaas/v1/projects/"+aProject+"/crypto-keys", aSession, map[string]any{"algorithm": "aes-256-gcm"})
	if status != http.StatusCreated {
		t.Fatalf("alice key status=%d", status)
	}
	status, cross := tc.do(http.MethodPost, "/api/eaas/v1/operations/encrypt", bKey, map[string]any{
		"key_id": aliceKey["key_id"], "message": b64([]byte("cross tenant")),
	})
	if status != http.StatusNotFound || errCode(cross) != "E_KEY_NOT_FOUND" {
		t.Fatalf("cross-tenant key use status=%d body=%v", status, cross)
	}
	status, crossProject := tc.do(http.MethodPost, "/api/eaas/v1/projects/"+bProject+"/keys", aSession, map[string]any{})
	if status != http.StatusNotFound {
		t.Fatalf("cross-tenant project access status=%d body=%v", status, crossProject)
	}
	status, _ = tc.do(http.MethodPost, "/api/eaas/v1/operations/digest", aKey, map[string]any{"message": b64([]byte("ok"))})
	if status != http.StatusOK {
		t.Fatal("own credential should still work")
	}
}

func TestQuotaAndRateLimitEnforcement(t *testing.T) {
	service, tc, _ := newTestEnvironment(t)
	session, _ := registerAndVerify(t, tc, "quota@example.com")
	_, apiKey := createSandbox(t, tc, session)

	if err := service.store.Update(func(st *State) error {
		userID := st.Sessions[hashString(session)].UserID
		now := time.Now().UTC()
		for i := 0; i < Plans["free"].MonthlyOperations; i++ {
			st.UsageEvents = append(st.UsageEvents, UsageEvent{
				ID: newID("seed"), UserID: userID, Status: "success", Timestamp: now,
			})
		}
		return nil
	}); err != nil {
		t.Fatalf("seed usage: %v", err)
	}
	status, out := tc.do(http.MethodPost, "/api/eaas/v1/operations/digest", apiKey, map[string]any{"message": b64([]byte("x"))})
	if status != http.StatusTooManyRequests || errCode(out) != "E_QUOTA_EXCEEDED" {
		t.Fatalf("quota status=%d body=%v", status, out)
	}

	if err := service.store.Update(func(st *State) error {
		st.UsageEvents = nil
		st.RateWindows = map[string]*RateWindow{}
		return nil
	}); err != nil {
		t.Fatalf("clear usage: %v", err)
	}
	original := Plans["free"]
	t.Cleanup(func() { Plans["free"] = original })
	limited := original
	limited.RequestsPerMinute = 1
	Plans["free"] = limited
	status, first := tc.do(http.MethodPost, "/api/eaas/v1/operations/digest", apiKey, map[string]any{"message": b64([]byte("x"))})
	if status != http.StatusOK {
		t.Fatalf("first request status=%d body=%v", status, first)
	}
	status, second := tc.do(http.MethodPost, "/api/eaas/v1/operations/digest", apiKey, map[string]any{"message": b64([]byte("x"))})
	if status != http.StatusTooManyRequests || errCode(second) != "E_RATE_LIMITED" {
		t.Fatalf("rate limit status=%d body=%v", status, second)
	}
}

func TestBetaRegistrationValidationAndReview(t *testing.T) {
	_, tc, _ := newTestEnvironment(t)
	valid := BetaRegistrationRequest{
		Name: "Grace Hopper", WorkEmail: "grace@example.org", Organisation: "Example Org",
		Role: "CTO", UseCase: "Evaluating PQC readiness for a payment platform",
		EditionInterest: []string{"eaas_api", "enterprise"}, Deployments: []string{"private_cloud"},
		Integrations: []string{"hardware_hsm", "quantum"}, Consent: true,
	}
	status, out := tc.do(http.MethodPost, "/api/beta/v1/registrations", "", map[string]any{
		"name": valid.Name, "work_email": valid.WorkEmail, "organisation": valid.Organisation,
		"role": valid.Role, "use_case": valid.UseCase, "edition_interest": valid.EditionInterest,
		"deployments": valid.Deployments, "integrations": valid.Integrations, "consent": false,
	})
	if status != http.StatusBadRequest {
		t.Fatalf("missing consent status=%d body=%v", status, out)
	}
	status, out = tc.do(http.MethodPost, "/api/beta/v1/registrations", "", valid)
	if status != http.StatusCreated || out["status"] != "received_pending_review" {
		t.Fatalf("registration status=%d body=%v", status, out)
	}
	status, _ = tc.do(http.MethodPost, "/api/beta/v1/registrations", "", valid)
	if status != http.StatusConflict {
		t.Fatalf("duplicate registration status=%d", status)
	}
	req, _ := http.NewRequest(http.MethodGet, tc.base+"/api/beta/v1/registrations", nil)
	req.Header.Set("X-Admin-Token", "wrong")
	resp, err := tc.client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("wrong admin token status=%d", resp.StatusCode)
	}
	status, _ = tc.do(http.MethodGet, "/api/beta/v1/registrations", "", nil)
	if status != http.StatusForbidden {
		t.Fatalf("missing admin token status=%d", status)
	}
}

func TestSecretsAreNotPersistedInStateFile(t *testing.T) {
	service, tc, dataFile := newTestEnvironment(t)
	session, _ := registerAndVerify(t, tc, "secrets@example.com")
	projectID, apiKey := createSandbox(t, tc, session)
	_, key := tc.do(http.MethodPost, "/api/eaas/v1/projects/"+projectID+"/crypto-keys", session, map[string]any{"algorithm": "aes-256-gcm"})
	_, _ = tc.do(http.MethodPost, "/api/eaas/v1/operations/encrypt", apiKey, map[string]any{
		"key_id": key["key_id"], "message": b64([]byte("TOP SECRET MESSAGE")),
	})
	_ = service
	raw, err := os.ReadFile(dataFile)
	if err != nil {
		t.Fatal(err)
	}
	contents := string(raw)
	for _, secret := range []string{apiKey, session, "TOP SECRET MESSAGE", "correct-horse-battery"} {
		if strings.Contains(contents, secret) {
			t.Fatalf("state file contains sensitive value %q", secret)
		}
	}
}

func TestClassicalCryptoPrimitives(t *testing.T) {
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i)
	}
	out, opErr := runOperation("encrypt", key, opInput{Message: []byte("hello"), AAD: []byte("ctx")})
	if opErr != nil {
		t.Fatal(opErr)
	}
	ct, _ := base64.StdEncoding.DecodeString(out["ciphertext"].(string))
	nonce, _ := base64.StdEncoding.DecodeString(out["nonce"].(string))
	decrypted, opErr := runOperation("decrypt", key, opInput{Ciphertext: ct, Nonce: nonce, AAD: []byte("ctx")})
	if opErr != nil || decrypted["plaintext"] != b64([]byte("hello")) {
		t.Fatalf("round trip failed: %v %v", decrypted, opErr)
	}
	if _, opErr := runOperation("decrypt", key, opInput{Ciphertext: ct, Nonce: nonce, AAD: []byte("wrong")}); opErr == nil || opErr.Code != "E_DECRYPT_FAILED" {
		t.Fatalf("tamper detection failed: %v", opErr)
	}
	if _, opErr := runOperation("random", nil, opInput{Count: 0}); opErr == nil {
		t.Fatal("zero-length random request must be rejected")
	}
}

func TestCORSAllowsConfiguredOriginOnly(t *testing.T) {
	_, tc, _ := newTestEnvironment(t)
	for origin, want := range map[string]string{"https://portal.example": "https://portal.example", "https://evil.example": ""} {
		req, _ := http.NewRequest(http.MethodGet, tc.base+"/api/eaas/v1/plans", nil)
		req.Header.Set("Origin", origin)
		resp, err := tc.client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		_ = resp.Body.Close()
		if got := resp.Header.Get("Access-Control-Allow-Origin"); got != want {
			t.Fatalf("origin %s: allow-origin=%q want %q", origin, got, want)
		}
	}
}

func errCode(body map[string]any) string {
	errObj, ok := body["error"].(map[string]any)
	if !ok {
		return ""
	}
	code, _ := errObj["code"].(string)
	return code
}
