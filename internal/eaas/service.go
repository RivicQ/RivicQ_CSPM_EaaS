package eaas

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// Config controls the standalone EaaS service.
type Config struct {
	DataFile       string
	Environment    string
	AdminToken     string
	AllowedOrigins []string
}

// Service implements the EaaS product journey and all entitlement checks.
type Service struct {
	store *Store
	cfg   Config
}

// NewService opens the store and returns a ready service.
func NewService(cfg Config) (*Service, error) {
	if cfg.Environment == "" {
		cfg.Environment = "development"
	}
	store, err := NewStore(cfg.DataFile)
	if err != nil {
		return nil, err
	}
	return &Service{store: store, cfg: cfg}, nil
}

type apiError struct {
	Status  int
	Code    string
	Message string
}

func (e *apiError) Error() string { return e.Message }

func fail(status int, code, message string) *apiError {
	return &apiError{Status: status, Code: code, Message: message}
}

func newID(prefix string) string { return prefix + "_" + uuid.NewString() }

func b64(b []byte) string { return base64.StdEncoding.EncodeToString(b) }

func hashString(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func randomToken(bytes int) (string, error) {
	buf := make([]byte, bytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func minuteBucket(t time.Time) string {
	return t.UTC().Truncate(time.Minute).Format(time.RFC3339)
}

func (s *Service) isProduction() bool { return strings.EqualFold(s.cfg.Environment, "production") }

// ---------------------------------------------------------------------------
// Account lifecycle
// ---------------------------------------------------------------------------

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterResponse struct {
	UserID              string `json:"user_id"`
	Email               string `json:"email"`
	Verified            bool   `json:"verified"`
	SessionToken        string `json:"session_token"`
	SessionExpiresAt    string `json:"session_expires_at"`
	DevVerificationCode string `json:"dev_verification_code,omitempty"`
	DevNotice           string `json:"dev_notice,omitempty"`
}

func validEmail(email string) bool {
	addr, err := mail.ParseAddress(strings.TrimSpace(email))
	return err == nil && addr.Address == strings.TrimSpace(email) && strings.Contains(addr.Address, ".")
}

func (s *Service) Register(req RegisterRequest) (RegisterResponse, *apiError) {
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if len(req.Name) < 2 || len(req.Name) > 120 {
		return RegisterResponse{}, fail(400, "E_INVALID_REQUEST", "name must be 2-120 characters")
	}
	if !validEmail(req.Email) {
		return RegisterResponse{}, fail(400, "E_INVALID_REQUEST", "a valid email address is required")
	}
	if len(req.Password) < 12 || len(req.Password) > 128 {
		return RegisterResponse{}, fail(400, "E_INVALID_REQUEST", "password must be 12-128 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return RegisterResponse{}, fail(500, "E_INTERNAL", "password hashing failed")
	}
	codeInt, err := randomInt(1000000)
	if err != nil {
		return RegisterResponse{}, fail(500, "E_INTERNAL", "verification code generation failed")
	}
	code := fmt.Sprintf("%06d", codeInt)
	token, err := randomToken(32)
	if err != nil {
		return RegisterResponse{}, fail(500, "E_INTERNAL", "token generation failed")
	}
	now := time.Now().UTC()
	user := &User{
		ID:                  newID("usr"),
		Email:               req.Email,
		Name:                req.Name,
		PasswordHash:        string(hash),
		VerificationHash:    hashString(code),
		VerificationExpires: now.Add(24 * time.Hour),
		CreatedAt:           now,
	}
	session := &Session{
		TokenHash: hashString(token),
		UserID:    user.ID,
		CreatedAt: now,
		ExpiresAt: now.Add(7 * 24 * time.Hour),
	}

	if err := s.store.Update(func(st *State) error {
		for _, existing := range st.Users {
			if existing.Email == user.Email {
				return errors.New("duplicate email")
			}
		}
		st.Users[user.ID] = user
		st.Sessions[session.TokenHash] = session
		st.Subscriptions[user.ID] = &Subscription{
			UserID: user.ID, Plan: "free", Status: "active",
			BillingStatus: "not_required", UpdatedAt: now,
		}
		return nil
	}); err != nil {
		if err.Error() == "duplicate email" {
			return RegisterResponse{}, fail(409, "E_ACCOUNT_EXISTS", "an account with this email already exists")
		}
		return RegisterResponse{}, fail(500, "E_INTERNAL", "unable to create account")
	}

	resp := RegisterResponse{
		UserID: user.ID, Email: user.Email, Verified: false,
		SessionToken: token, SessionExpiresAt: session.ExpiresAt.Format(time.RFC3339),
	}
	if !s.isProduction() {
		resp.DevVerificationCode = code
		resp.DevNotice = "Development environment: the verification code is returned once for testing. Email delivery is an integration pending item."
	}
	return resp, nil
}

func randomInt(n int) (int64, error) {
	v, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		return 0, err
	}
	return v.Int64(), nil
}

func (s *Service) Verify(userID, code string) *apiError {
	if len(code) != 6 {
		return fail(400, "E_INVALID_REQUEST", "verification code must be 6 digits")
	}
	err := s.store.Update(func(st *State) error {
		u := st.Users[userID]
		if u == nil {
			return errors.New("unknown user")
		}
		if u.Verified {
			return nil
		}
		if time.Now().UTC().After(u.VerificationExpires) || u.FailedVerifications >= 5 {
			return errors.New("expired")
		}
		if subtle.ConstantTimeCompare([]byte(hashString(code)), []byte(u.VerificationHash)) != 1 {
			u.FailedVerifications++
			return errors.New("invalid")
		}
		u.Verified = true
		u.VerificationHash = ""
		return nil
	})
	if err == nil {
		return nil
	}
	switch err.Error() {
	case "unknown user":
		return fail(404, "E_NOT_FOUND", "account not found")
	case "expired":
		return fail(410, "E_CODE_EXPIRED", "verification code expired; register again to request a new code")
	default:
		return fail(400, "E_CODE_INVALID", "verification code is invalid")
	}
}

func (s *Service) Login(email, password string) (RegisterResponse, *apiError) {
	email = strings.ToLower(strings.TrimSpace(email))
	var user *User
	s.store.View(func(st *State) {
		for _, u := range st.Users {
			if u.Email == email {
				user = u
				break
			}
		}
	})
	if user == nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return RegisterResponse{}, fail(401, "E_UNAUTHORIZED", "invalid email or password")
	}
	token, err := randomToken(32)
	if err != nil {
		return RegisterResponse{}, fail(500, "E_INTERNAL", "token generation failed")
	}
	now := time.Now().UTC()
	sess := &Session{TokenHash: hashString(token), UserID: user.ID, CreatedAt: now, ExpiresAt: now.Add(7 * 24 * time.Hour)}
	if err := s.store.Update(func(st *State) error {
		st.Sessions[sess.TokenHash] = sess
		return nil
	}); err != nil {
		return RegisterResponse{}, fail(500, "E_INTERNAL", "unable to create session")
	}
	return RegisterResponse{
		UserID: user.ID, Email: user.Email, Verified: user.Verified,
		SessionToken: token, SessionExpiresAt: sess.ExpiresAt.Format(time.RFC3339),
	}, nil
}

func (s *Service) SessionUser(token string) (string, *apiError) {
	var userID string
	s.store.View(func(st *State) {
		sess := st.Sessions[hashString(token)]
		if sess != nil && time.Now().UTC().Before(sess.ExpiresAt) {
			userID = sess.UserID
		}
	})
	if userID == "" {
		return "", fail(401, "E_UNAUTHORIZED", "session is invalid or expired")
	}
	return userID, nil
}

func (s *Service) Logout(token string) *apiError {
	if err := s.store.Update(func(st *State) error {
		delete(st.Sessions, hashString(token))
		return nil
	}); err != nil {
		return fail(500, "E_INTERNAL", "unable to revoke session")
	}
	return nil
}

func (s *Service) Account(userID string) (map[string]any, *apiError) {
	var out map[string]any
	s.store.View(func(st *State) {
		if u := st.Users[userID]; u != nil {
			out = map[string]any{"user_id": u.ID, "email": u.Email, "name": u.Name, "verified": u.Verified, "plan": s.planFor(userID).ID}
		}
	})
	if out == nil {
		return nil, fail(404, "E_NOT_FOUND", "account not found")
	}
	return out, nil
}

func (s *Service) planFor(userID string) Plan {
	planID := "free"
	s.store.View(func(st *State) {
		if sub := st.Subscriptions[userID]; sub != nil {
			planID = sub.Plan
		}
	})
	p, ok := getPlan(planID)
	if !ok {
		return Plans["free"]
	}
	return p
}

// ---------------------------------------------------------------------------
// Projects and credentials
// ---------------------------------------------------------------------------

type ProjectRequest struct {
	Name        string `json:"name"`
	Environment string `json:"environment"`
}

func (s *Service) requireVerified(userID string) *apiError {
	verified := false
	s.store.View(func(st *State) {
		if u := st.Users[userID]; u != nil {
			verified = u.Verified
		}
	})
	if !verified {
		return fail(403, "E_VERIFICATION_REQUIRED", "verify your account before creating projects or credentials")
	}
	return nil
}

func (s *Service) CreateProject(userID string, req ProjectRequest) (map[string]any, *apiError) {
	if e := s.requireVerified(userID); e != nil {
		return nil, e
	}
	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) < 2 || len(req.Name) > 80 {
		return nil, fail(400, "E_INVALID_REQUEST", "project name must be 2-80 characters")
	}
	if req.Environment == "" {
		req.Environment = "sandbox"
	}
	if req.Environment != "sandbox" && req.Environment != "production" {
		return nil, fail(400, "E_INVALID_REQUEST", "environment must be sandbox or production")
	}
	plan := s.planFor(userID)
	if req.Environment == "production" && !planAllowsProduction(plan) {
		return nil, fail(403, "E_PLAN_RESTRICTION", "production projects require the Startup plan or above")
	}
	project := &Project{ID: newID("prj"), UserID: userID, Name: req.Name, Environment: req.Environment, CreatedAt: time.Now().UTC()}
	if err := s.store.Update(func(st *State) error {
		count := 0
		for _, p := range st.Projects {
			if p.UserID == userID {
				count++
			}
		}
		if !planCountLimit(plan.Projects, count) {
			return errors.New("project_limit")
		}
		st.Projects[project.ID] = project
		return nil
	}); err != nil {
		if err.Error() == "project_limit" {
			return nil, fail(403, "E_PLAN_RESTRICTION", "project limit reached for the current plan")
		}
		return nil, fail(500, "E_INTERNAL", "unable to create project")
	}
	return map[string]any{"id": project.ID, "name": project.Name, "environment": project.Environment, "created_at": project.CreatedAt.Format(time.RFC3339)}, nil
}

func (s *Service) ListProjects(userID string) []map[string]any {
	out := []map[string]any{}
	s.store.View(func(st *State) {
		for _, p := range st.Projects {
			if p.UserID == userID {
				out = append(out, map[string]any{"id": p.ID, "name": p.Name, "environment": p.Environment, "created_at": p.CreatedAt.Format(time.RFC3339)})
			}
		}
	})
	return out
}

func (s *Service) ownedProject(userID, projectID string) (*Project, bool) {
	var project *Project
	s.store.View(func(st *State) {
		p := st.Projects[projectID]
		if p != nil && p.UserID == userID {
			project = p
		}
	})
	return project, project != nil
}

// CreateAPIKey returns the plaintext secret exactly once.
func (s *Service) CreateAPIKey(userID, projectID string) (map[string]any, *apiError) {
	if e := s.requireVerified(userID); e != nil {
		return nil, e
	}
	project, ok := s.ownedProject(userID, projectID)
	if !ok {
		return nil, fail(404, "E_NOT_FOUND", "project not found")
	}
	plan := s.planFor(userID)
	if project.Environment == "production" && !planAllowsProduction(plan) {
		return nil, fail(403, "E_PLAN_RESTRICTION", "production credentials require the Startup plan or above")
	}
	prefix := "eaas_sb_"
	if project.Environment == "production" {
		prefix = "eaas_live_"
	}
	secret, err := randomToken(32)
	if err != nil {
		return nil, fail(500, "E_INTERNAL", "credential generation failed")
	}
	plain := prefix + secret
	key := &APIKey{
		ID: newID("key"), UserID: userID, ProjectID: projectID, Prefix: prefix + secret[:8],
		Hash: hashString(plain), Environment: project.Environment, CreatedAt: time.Now().UTC(),
	}
	if err := s.store.Update(func(st *State) error {
		count := 0
		for _, k := range st.APIKeys {
			if k.ProjectID == projectID && k.RevokedAt == nil {
				count++
			}
		}
		if !planCountLimit(plan.KeysPerProject, count) {
			return errors.New("key_limit")
		}
		st.APIKeys[key.ID] = key
		return nil
	}); err != nil {
		if err.Error() == "key_limit" {
			return nil, fail(403, "E_PLAN_RESTRICTION", "API key limit reached for the current plan")
		}
		return nil, fail(500, "E_INTERNAL", "unable to create credential")
	}
	return map[string]any{
		"id": key.ID, "key": plain, "prefix": key.Prefix, "environment": key.Environment,
		"created_at": key.CreatedAt.Format(time.RFC3339), "shown_once": true,
	}, nil
}

func (s *Service) ListAPIKeys(userID, projectID string) ([]map[string]any, *apiError) {
	if _, ok := s.ownedProject(userID, projectID); !ok {
		return nil, fail(404, "E_NOT_FOUND", "project not found")
	}
	out := []map[string]any{}
	s.store.View(func(st *State) {
		for _, k := range st.APIKeys {
			if k.UserID == userID && k.ProjectID == projectID {
				lastUsed := ""
				if k.LastUsedAt != nil {
					lastUsed = k.LastUsedAt.Format(time.RFC3339)
				}
				out = append(out, map[string]any{
					"id": k.ID, "prefix": k.Prefix, "environment": k.Environment,
					"created_at": k.CreatedAt.Format(time.RFC3339), "last_used_at": lastUsed,
					"revoked": k.RevokedAt != nil,
				})
			}
		}
	})
	return out, nil
}

func (s *Service) RevokeAPIKey(userID, keyID string) *apiError {
	err := s.store.Update(func(st *State) error {
		k := st.APIKeys[keyID]
		if k == nil || k.UserID != userID {
			return errors.New("not_found")
		}
		if k.RevokedAt == nil {
			now := time.Now().UTC()
			k.RevokedAt = &now
		}
		return nil
	})
	if err != nil {
		return fail(404, "E_NOT_FOUND", "credential not found")
	}
	return nil
}

// RotateAPIKey revokes the old credential and issues a new one atomically.
func (s *Service) RotateAPIKey(userID, keyID string) (map[string]any, *apiError) {
	var projectID string
	if err := s.store.Update(func(st *State) error {
		k := st.APIKeys[keyID]
		if k == nil || k.UserID != userID || k.RevokedAt != nil {
			return errors.New("not_found")
		}
		projectID = k.ProjectID
		now := time.Now().UTC()
		k.RevokedAt = &now
		return nil
	}); err != nil {
		return nil, fail(404, "E_NOT_FOUND", "active credential not found")
	}
	return s.CreateAPIKey(userID, projectID)
}

// CreateCryptoKey provisions a server-held key for symmetric or PQC operations.
func (s *Service) CreateCryptoKey(userID, projectID, algorithm string) (map[string]any, *apiError) {
	if e := s.requireVerified(userID); e != nil {
		return nil, e
	}
	if _, ok := s.ownedProject(userID, projectID); !ok {
		return nil, fail(404, "E_NOT_FOUND", "project not found")
	}
	allowed := map[string]bool{"aes-256-gcm": true, "hmac-sha-256": true, "mlkem-768": true, "mldsa-65": true}
	if !allowed[algorithm] {
		return nil, fail(400, "E_INVALID_REQUEST", "unsupported key algorithm")
	}
	private, public, err := generateKeyMaterial(algorithm)
	if err != nil {
		return nil, fail(500, "E_INTERNAL", "key generation failed")
	}
	key := &SigningKey{
		ID: newID("crypto_key"), ProjectID: projectID, UserID: userID,
		Algorithm: algorithm, PrivateB64: b64(private), PublicB64: b64(public), CreatedAt: time.Now().UTC(),
	}
	if err := s.store.Update(func(st *State) error {
		st.SigningKeys[key.ID] = key
		return nil
	}); err != nil {
		return nil, fail(500, "E_INTERNAL", "unable to store key")
	}
	out := map[string]any{"key_id": key.ID, "algorithm": algorithm, "created_at": key.CreatedAt.Format(time.RFC3339)}
	if public != nil {
		out["public_key"] = b64(public)
	}
	return out, nil
}

// AuthenticateAPIKey resolves a raw API key. Tenant identity always comes from
// the stored credential, never from a client-supplied header.
func (s *Service) AuthenticateAPIKey(plain string) (string, string, string, *apiError) {
	var userID, keyID, projectID string
	s.store.View(func(st *State) {
		k := st.APIKeys[hashLookup(st, plain)]
		if k == nil || k.RevokedAt != nil {
			return
		}
		userID, keyID, projectID = k.UserID, k.ID, k.ProjectID
	})
	if keyID == "" {
		return "", "", "", fail(401, "E_UNAUTHORIZED", "API credential is invalid or revoked")
	}
	return userID, keyID, projectID, nil
}

func hashLookup(st *State, plain string) string {
	target := hashString(plain)
	for id, k := range st.APIKeys {
		if k.Hash == target {
			return id
		}
	}
	return ""
}

// ---------------------------------------------------------------------------
// Operations, quotas and metering
// ---------------------------------------------------------------------------

func fieldBytes(m map[string]any, name string, max int) ([]byte, *apiError) {
	raw, ok := m[name]
	if !ok || raw == nil {
		return nil, nil
	}
	str, ok := raw.(string)
	if !ok {
		return nil, fail(400, "E_INVALID_REQUEST", name+" must be base64 encoded")
	}
	decoded, err := base64.StdEncoding.DecodeString(str)
	if err != nil {
		return nil, fail(400, "E_INVALID_REQUEST", name+" is not valid base64")
	}
	if max > 0 && len(decoded) > max {
		return nil, fail(400, "E_INVALID_REQUEST", name+" exceeds the maximum allowed size")
	}
	return decoded, nil
}

func fieldInt(m map[string]any, name string) (int, *apiError) {
	raw, ok := m[name]
	if !ok || raw == nil {
		return 0, nil
	}
	switch v := raw.(type) {
	case float64:
		return int(v), nil
	case string:
		n, err := strconv.Atoi(v)
		if err != nil {
			return 0, fail(400, "E_INVALID_REQUEST", name+" must be an integer")
		}
		return n, nil
	default:
		return 0, fail(400, "E_INVALID_REQUEST", name+" must be an integer")
	}
}

func (s *Service) monthlyUsage(userID string) int {
	now := time.Now().UTC()
	count := 0
	s.store.View(func(st *State) {
		for _, e := range st.UsageEvents {
			if e.UserID == userID && e.Status == "success" &&
				e.Timestamp.Year() == now.Year() && e.Timestamp.Month() == now.Month() {
				count++
			}
		}
	})
	return count
}

func (s *Service) checkRateLimit(keyID string, limit int) *apiError {
	if limit < 0 {
		return nil
	}
	bucket := minuteBucket(time.Now().UTC())
	var apiErr *apiError
	_ = s.store.Update(func(st *State) error {
		cutoff := minuteBucket(time.Now().UTC().Add(-2 * time.Minute))
		for k, w := range st.RateWindows {
			if w.Bucket < cutoff {
				delete(st.RateWindows, k)
			}
		}
		id := keyID + "|" + bucket
		w := st.RateWindows[id]
		if w == nil || w.Bucket != bucket {
			w = &RateWindow{Bucket: bucket}
			st.RateWindows[id] = w
		}
		if w.Count >= limit {
			apiErr = fail(429, "E_RATE_LIMITED", "per-minute request limit reached for this credential")
			return errors.New("rate_limited")
		}
		w.Count++
		return nil
	})
	return apiErr
}

var keyAlgorithmForOperation = map[string]string{
	"encrypt": "aes-256-gcm", "decrypt": "aes-256-gcm",
	"mac_sign": "hmac-sha-256", "mac_verify": "hmac-sha-256",
	"mlkem768_decapsulate": "mlkem-768", "mldsa65_sign": "mldsa-65",
}

var keygenAlgorithmForOperation = map[string]string{
	"mlkem768_keygen": "mlkem-768", "mldsa65_keygen": "mldsa-65",
}

// Execute performs one real cryptographic operation and records an audit-safe
// usage event. No payload, key or secret is written to storage or logs.
func (s *Service) Execute(userID, keyID, projectID, operationID string, body map[string]any) (map[string]any, *apiError) {
	started := time.Now()
	op, ok := operationByID(operationID)
	if !ok {
		return nil, fail(404, "E_OPERATION_UNAVAILABLE", "operation is not implemented")
	}
	if e := s.requireVerified(userID); e != nil {
		return nil, e
	}
	plan := s.planFor(userID)
	used := s.monthlyUsage(userID)
	if !planAllowsUnlimited(plan) && used >= plan.MonthlyOperations {
		s.recordUsage(userID, projectID, keyID, op, "rejected", "E_QUOTA_EXCEEDED", started)
		return nil, fail(429, "E_QUOTA_EXCEEDED", fmt.Sprintf("monthly operation quota of %d reached; upgrade your plan or wait for the next billing period", plan.MonthlyOperations))
	}
	if e := s.checkRateLimit(keyID, plan.RequestsPerMinute); e != nil {
		s.recordUsage(userID, projectID, keyID, op, "rejected", e.Code, started)
		return nil, e
	}

	if alg, isKeygen := keygenAlgorithmForOperation[operationID]; isKeygen {
		private, public, err := generateKeyMaterial(alg)
		if err != nil {
			s.recordUsage(userID, projectID, keyID, op, "failure", "E_INTERNAL", started)
			return nil, fail(500, "E_INTERNAL", "key generation failed")
		}
		key := &SigningKey{ID: newID("crypto_key"), ProjectID: projectID, UserID: userID, Algorithm: alg, PrivateB64: b64(private), PublicB64: b64(public), CreatedAt: time.Now().UTC()}
		if err := s.store.Update(func(st *State) error {
			st.SigningKeys[key.ID] = key
			return nil
		}); err != nil {
			return nil, fail(500, "E_INTERNAL", "unable to store key")
		}
		s.recordUsage(userID, projectID, keyID, op, "success", "", started)
		return map[string]any{"key_id": key.ID, "public_key": b64(public), "algorithm": op.Algorithm, "maturity": op.Maturity}, nil
	}

	input := opInput{}
	var decodeErr *apiError
	if input.Message, decodeErr = fieldBytes(body, "message", maxPayloadBytes); decodeErr != nil {
		return nil, decodeErr
	}
	if input.AAD, decodeErr = fieldBytes(body, "aad", 64*1024); decodeErr != nil {
		return nil, decodeErr
	}
	if input.Ciphertext, decodeErr = fieldBytes(body, "ciphertext", maxPayloadBytes); decodeErr != nil {
		return nil, decodeErr
	}
	if input.Nonce, decodeErr = fieldBytes(body, "nonce", 64); decodeErr != nil {
		return nil, decodeErr
	}
	if input.Signature, decodeErr = fieldBytes(body, "signature", 16*1024); decodeErr != nil {
		return nil, decodeErr
	}
	if input.PublicKey, decodeErr = fieldBytes(body, "public_key", 16*1024); decodeErr != nil {
		return nil, decodeErr
	}
	if input.Count, decodeErr = fieldInt(body, "bytes"); decodeErr != nil {
		return nil, decodeErr
	}

	var private []byte
	if alg, needsKey := keyAlgorithmForOperation[operationID]; needsKey {
		cryptoKeyID, _ := body["key_id"].(string)
		if cryptoKeyID == "" {
			return nil, fail(400, "E_INVALID_REQUEST", "key_id is required for this operation")
		}
		var key *SigningKey
		s.store.View(func(st *State) {
			candidate := st.SigningKeys[cryptoKeyID]
			if candidate != nil && candidate.UserID == userID && candidate.ProjectID == projectID && candidate.Algorithm == alg {
				key = candidate
			}
		})
		if key == nil {
			return nil, fail(404, "E_KEY_NOT_FOUND", "key not found in this project")
		}
		decoded, err := base64.StdEncoding.DecodeString(key.PrivateB64)
		if err != nil {
			return nil, fail(500, "E_INTERNAL", "stored key is malformed")
		}
		private = decoded
	}

	result, opErr := runOperation(operationID, private, input)
	if opErr != nil {
		s.recordUsage(userID, projectID, keyID, op, "failure", opErr.Code, started)
		return nil, fail(400, opErr.Code, opErr.Error())
	}
	result["operation"] = op.ID
	result["maturity"] = op.Maturity
	s.recordUsage(userID, projectID, keyID, op, "success", "", started)
	return result, nil
}

func (s *Service) recordUsage(userID, projectID, keyID string, op Operation, status, code string, started time.Time) {
	event := UsageEvent{
		ID: newID("use"), UserID: userID, ProjectID: projectID, KeyID: keyID,
		Operation: op.ID, Category: op.Category, Status: status, ErrorCode: code,
		LatencyMS: time.Since(started).Milliseconds(), Timestamp: time.Now().UTC(),
	}
	_ = s.store.Update(func(st *State) error {
		st.UsageEvents = append(st.UsageEvents, event)
		for _, k := range st.APIKeys {
			if k.ID == keyID {
				now := time.Now().UTC()
				k.LastUsedAt = &now
			}
		}
		return nil
	})
}

func (s *Service) UsageSummary(userID string) map[string]any {
	plan := s.planFor(userID)
	now := time.Now().UTC()
	byOperation := map[string]int{}
	byCategory := map[string]int{}
	success, failure := 0, 0
	s.store.View(func(st *State) {
		for _, e := range st.UsageEvents {
			if e.UserID != userID || e.Timestamp.Year() != now.Year() || e.Timestamp.Month() != now.Month() {
				continue
			}
			byOperation[e.Operation]++
			byCategory[e.Category]++
			if e.Status == "success" {
				success++
			} else {
				failure++
			}
		}
	})
	remaining := -1
	if plan.MonthlyOperations >= 0 {
		remaining = plan.MonthlyOperations - success
		if remaining < 0 {
			remaining = 0
		}
	}
	nextReset := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.UTC)
	return map[string]any{
		"plan": plan.ID, "period_start": time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339),
		"period_end": nextReset.Format(time.RFC3339), "operations_used": success,
		"operations_failed": failure, "monthly_quota": plan.MonthlyOperations,
		"remaining_quota": remaining, "requests_per_minute": plan.RequestsPerMinute,
		"by_operation": byOperation, "by_category": byCategory,
		"upgrade_interest": success >= plan.MonthlyOperations/2 && plan.MonthlyOperations > 0,
	}
}

func (s *Service) UsageEvents(userID string, limit int) []map[string]any {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	out := []map[string]any{}
	s.store.View(func(st *State) {
		for i := len(st.UsageEvents) - 1; i >= 0 && len(out) < limit; i-- {
			e := st.UsageEvents[i]
			if e.UserID != userID {
				continue
			}
			out = append(out, map[string]any{
				"id": e.ID, "operation": e.Operation, "category": e.Category,
				"status": e.Status, "error_code": e.ErrorCode, "latency_ms": e.LatencyMS,
				"timestamp": e.Timestamp.Format(time.RFC3339),
			})
		}
	})
	return out
}

// ---------------------------------------------------------------------------
// Subscription and beta onboarding
// ---------------------------------------------------------------------------

func (s *Service) ChangePlan(userID, planID string) (map[string]any, *apiError) {
	plan, ok := getPlan(strings.ToLower(strings.TrimSpace(planID)))
	if !ok {
		return nil, fail(400, "E_INVALID_REQUEST", "unknown plan")
	}
	used := s.monthlyUsage(userID)
	if plan.MonthlyOperations >= 0 && used > plan.MonthlyOperations {
		return nil, fail(409, "E_DOWNGRADE_BLOCKED", fmt.Sprintf("current usage (%d) exceeds the target plan quota (%d)", used, plan.MonthlyOperations))
	}
	sub := &Subscription{UserID: userID, Plan: plan.ID, Status: "active", BillingStatus: plan.BillingIntegration, UpdatedAt: time.Now().UTC()}
	if err := s.store.Update(func(st *State) error {
		st.Subscriptions[userID] = sub
		return nil
	}); err != nil {
		return nil, fail(500, "E_INTERNAL", "unable to update subscription")
	}
	return map[string]any{
		"plan": plan.ID, "status": sub.Status, "billing_status": sub.BillingStatus,
		"entitlements": plan, "notice": "Entitlements are enforced immediately. Payment collection is an integration pending item; no card data is collected by this service.",
	}, nil
}

func (s *Service) Subscription(userID string) map[string]any {
	plan := s.planFor(userID)
	return map[string]any{"plan": plan, "billing_status": plan.BillingIntegration, "status": "active"}
}

type BetaRegistrationRequest struct {
	Name            string   `json:"name"`
	WorkEmail       string   `json:"work_email"`
	Organisation    string   `json:"organisation"`
	Role            string   `json:"role"`
	UseCase         string   `json:"use_case"`
	EditionInterest []string `json:"edition_interest"`
	Deployments     []string `json:"deployments"`
	Integrations    []string `json:"integrations"`
	Consent         bool     `json:"consent"`
}

var allowedBetaValues = map[string]map[string]bool{
	"edition_interest": {"community": true, "enterprise": true, "eaas_api": true, "open_source_cloud": true},
	"deployments":      {"saas": true, "self_hosted": true, "private_cloud": true, "on_premises": true},
	"integrations":     {"ai": true, "quantum": true, "hardware_hsm": true, "wireless": true, "cloud_cspm": true},
}

func (s *Service) CreateBetaRegistration(req BetaRegistrationRequest) (map[string]any, *apiError) {
	req.Name = strings.TrimSpace(req.Name)
	req.WorkEmail = strings.ToLower(strings.TrimSpace(req.WorkEmail))
	req.Organisation = strings.TrimSpace(req.Organisation)
	if len(req.Name) < 2 || len(req.Name) > 120 || !validEmail(req.WorkEmail) || len(req.Organisation) < 2 || len(req.Organisation) > 160 {
		return nil, fail(400, "E_INVALID_REQUEST", "name, valid work email and organisation are required")
	}
	if len(req.UseCase) < 10 || len(req.UseCase) > 2000 || !req.Consent {
		return nil, fail(400, "E_INVALID_REQUEST", "a use case and explicit privacy consent are required")
	}
	for _, value := range req.EditionInterest {
		if !allowedBetaValues["edition_interest"][value] {
			return nil, fail(400, "E_INVALID_REQUEST", "unsupported edition_interest value: "+value)
		}
	}
	for _, values := range []struct {
		field  string
		values []string
	}{{"deployments", req.Deployments}, {"integrations", req.Integrations}} {
		for _, value := range values.values {
			if !allowedBetaValues[values.field][value] {
				return nil, fail(400, "E_INVALID_REQUEST", "unsupported "+values.field+" value: "+value)
			}
		}
	}
	reg := &BetaRegistration{
		ID: newID("beta"), Name: req.Name, WorkEmail: req.WorkEmail, Organisation: req.Organisation,
		Role: strings.TrimSpace(req.Role), UseCase: strings.TrimSpace(req.UseCase),
		EditionInterest: req.EditionInterest, Deployments: req.Deployments, Integrations: req.Integrations,
		Consent: req.Consent, Status: "received_pending_review", CreatedAt: time.Now().UTC(),
	}
	if err := s.store.Update(func(st *State) error {
		for _, existing := range st.BetaRegistrations {
			if existing.WorkEmail == reg.WorkEmail {
				return errors.New("duplicate")
			}
		}
		st.BetaRegistrations = append(st.BetaRegistrations, reg)
		return nil
	}); err != nil {
		if err.Error() == "duplicate" {
			return nil, fail(409, "E_REGISTRATION_EXISTS", "a beta registration already exists for this email")
		}
		return nil, fail(500, "E_INTERNAL", "unable to store registration")
	}
	return map[string]any{"id": reg.ID, "status": reg.Status, "message": "Registration received and stored for review. This is not an invitation or approval."}, nil
}

func (s *Service) ListBetaRegistrations(adminToken string) ([]map[string]any, *apiError) {
	if s.cfg.AdminToken == "" || subtle.ConstantTimeCompare([]byte(adminToken), []byte(s.cfg.AdminToken)) != 1 {
		return nil, fail(403, "E_FORBIDDEN", "administrative token is not configured or is invalid")
	}
	out := []map[string]any{}
	s.store.View(func(st *State) {
		for _, r := range st.BetaRegistrations {
			out = append(out, map[string]any{
				"id": r.ID, "name": r.Name, "work_email": r.WorkEmail, "organisation": r.Organisation,
				"role": r.Role, "status": r.Status, "created_at": r.CreatedAt.Format(time.RFC3339),
				"edition_interest": r.EditionInterest, "deployments": r.Deployments, "integrations": r.Integrations,
			})
		}
	})
	return out, nil
}
