package auth

import (
	"database/sql"
	"fmt"
	"os"
	"strings"

	"github.com/google/uuid"
)

// MockUserStore implements UserStore interface with database
type MockUserStore struct {
	users map[string]*User
}

// DatabaseUserStore implements UserStore with database
type DatabaseUserStore struct {
	db *sql.DB
}

// WorkDomainUserStore implements UserStore for production-only, domain-restricted auth.
type WorkDomainUserStore struct {
	users          map[string]*User
	allowedDomains []string
}

// NewMockUserStore creates a mock user store for testing/bootstrap.
// It requires the CRYPTOBOM_BOOTSTRAP_PASSWORD environment variable to be set;
// if it is not set, an error is returned to prevent use of hardcoded credentials.
func NewMockUserStore() (*MockUserStore, error) {
	bootstrapPassword := os.Getenv("CRYPTOBOM_BOOTSTRAP_PASSWORD")
	if bootstrapPassword == "" {
		return nil, fmt.Errorf("CRYPTOBOM_BOOTSTRAP_PASSWORD environment variable must be set")
	}

	hashedPassword, err := hashPassword(bootstrapPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to hash bootstrap password: %w", err)
	}

	users := map[string]*User{
		"danush.m@rivicq.de": {
			ID:       "user-1",
			TenantID: "tenant-1",
			Email:    "danush.m@rivicq.de",
			Name:     "Danush M",
			Role:     "admin",
			Password: hashedPassword,
		},
		"pratik.rughe@rivicq.de": {
			ID:       "user-2",
			TenantID: "tenant-1",
			Email:    "pratik.rughe@rivicq.de",
			Name:     "Pratik Rughe",
			Role:     "operator",
			Password: hashedPassword,
		},
		"revan.ande@rivicq.de": {
			ID:       "user-3",
			TenantID: "tenant-1",
			Email:    "revan.ande@rivicq.de",
			Name:     "Revan Ande",
			Role:     "analyst",
			Password: hashedPassword,
		},
		"sales@rivicq.de": {
			ID:       "user-4",
			TenantID: "tenant-1",
			Email:    "sales@rivicq.de",
			Name:     "Sales Team",
			Role:     "viewer",
			Password: hashedPassword,
		},
	}

	return &MockUserStore{users: users}, nil
}

// NewDatabaseUserStore creates a database user store
func NewDatabaseUserStore(db *sql.DB) *DatabaseUserStore {
	return &DatabaseUserStore{db: db}
}

// NewWorkDomainUserStore creates a seeded in-memory store for approved work domains.
func NewWorkDomainUserStore() (*WorkDomainUserStore, error) {
	allowedDomains := parseAllowedDomains(os.Getenv("AUTH_ALLOWED_DOMAINS"))
	// If no allowed domains are configured, default to rivicq internal domains for demo/staging
	if len(allowedDomains) == 0 {
		allowedDomains = []string{"rivicq.de", "rivicq.com"}
	}
	users := map[string]*User{}

	bootstrapEmail := strings.TrimSpace(os.Getenv("AUTH_BOOTSTRAP_EMAIL"))
	bootstrapPassword := os.Getenv("AUTH_BOOTSTRAP_PASSWORD")
	if bootstrapEmail != "" && bootstrapPassword != "" {
		if !emailAllowed(bootstrapEmail, allowedDomains) {
			return nil, fmt.Errorf("bootstrap email domain is not allowed")
		}

		bootstrapName := strings.TrimSpace(os.Getenv("AUTH_BOOTSTRAP_NAME"))
		if bootstrapName == "" {
			bootstrapName = "Workspace Admin"
		}
		bootstrapRole := strings.TrimSpace(os.Getenv("AUTH_BOOTSTRAP_ROLE"))
		if bootstrapRole == "" {
			bootstrapRole = "admin"
		}

		hashedPassword, err := hashPassword(bootstrapPassword)
		if err != nil {
			return nil, fmt.Errorf("failed to hash bootstrap password: %w", err)
		}

		users[strings.ToLower(bootstrapEmail)] = &User{
			ID:       "bootstrap-user",
			TenantID: "tenant-1",
			Email:    bootstrapEmail,
			Name:     bootstrapName,
			Role:     bootstrapRole,
			Password: hashedPassword,
		}
	}

	return &WorkDomainUserStore{users: users, allowedDomains: allowedDomains}, nil
}

// MockUserStore methods
func (m *MockUserStore) GetUserByEmail(email string) (*User, error) {
	if user, exists := m.users[strings.ToLower(email)]; exists {
		return user, nil
	}
	return nil, fmt.Errorf("user not found")
}

func (m *MockUserStore) CreateUser(user *User) error {
	user.ID = uuid.New().String()
	user.TenantID = "tenant-1"
	hashedPassword, err := hashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashedPassword
	m.users[strings.ToLower(user.Email)] = user
	return nil
}

func (m *MockUserStore) UpdateUser(user *User) error {
	m.users[user.Email] = user
	return nil
}

// DatabaseUserStore methods
func (d *DatabaseUserStore) GetUserByEmail(email string) (*User, error) {
	query := `
		SELECT id, tenant_id, email, name, role 
		FROM users 
		WHERE email = $1`

	user := &User{}
	err := d.db.QueryRow(query, email).Scan(
		&user.ID, &user.TenantID, &user.Email, &user.Name, &user.Role,
	)

	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Get password separately for security
	var password string
	err = d.db.QueryRow("SELECT password FROM users WHERE email = $1", email).Scan(&password)
	if err != nil {
		return nil, err
	}
	user.Password = password

	return user, nil
}

func (d *DatabaseUserStore) CreateUser(user *User) error {
	hashedPassword, err := hashPassword(user.Password)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	user.ID = uuid.New().String()
	user.TenantID = "tenant-1" // Default tenant

	query := `
		INSERT INTO users (id, tenant_id, email, name, role, password, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`

	_, err = d.db.Exec(query,
		user.ID, user.TenantID, user.Email, user.Name, user.Role, hashedPassword,
	)

	return err
}

func (d *DatabaseUserStore) UpdateUser(user *User) error {
	query := `
		UPDATE users 
		SET name = $2, role = $3, updated_at = NOW()
		WHERE id = $1`

	_, err := d.db.Exec(query, user.ID, user.Name, user.Role)
	return err
}

func (w *WorkDomainUserStore) GetUserByEmail(email string) (*User, error) {
	if !emailAllowed(email, w.allowedDomains) {
		return nil, fmt.Errorf("email domain not allowed")
	}
	if user, exists := w.users[strings.ToLower(email)]; exists {
		return user, nil
	}
	return nil, fmt.Errorf("user not found")
}

func (w *WorkDomainUserStore) CreateUser(user *User) error {
	if !emailAllowed(user.Email, w.allowedDomains) {
		return fmt.Errorf("email domain not allowed")
	}
	user.ID = uuid.New().String()
	user.TenantID = "tenant-1"
	hashedPassword, err := hashPassword(user.Password)
	if err != nil {
		return err
	}
	user.Password = hashedPassword
	w.users[strings.ToLower(user.Email)] = user
	return nil
}

func (w *WorkDomainUserStore) UpdateUser(user *User) error {
	w.users[strings.ToLower(user.Email)] = user
	return nil
}

// CreateDefaultUsers creates bootstrap users from environment variable.
// Requires CRYPTOBOM_BOOTSTRAP_PASSWORD to be set; returns an error otherwise.
func CreateDefaultUsers(db *sql.DB) error {
	bootstrapPassword := os.Getenv("CRYPTOBOM_BOOTSTRAP_PASSWORD")
	if bootstrapPassword == "" {
		return fmt.Errorf("CRYPTOBOM_BOOTSTRAP_PASSWORD environment variable must be set")
	}

	users := []User{
		{
			ID:       "user-admin",
			TenantID: "tenant-1",
			Email:    "danush.m@rivicq.de",
			Name:     "Danush M",
			Role:     "admin",
			Password: bootstrapPassword,
		},
		{
			ID:       "user-operator",
			TenantID: "tenant-1",
			Email:    "pratik.rughe@rivicq.de",
			Name:     "Pratik Rughe",
			Role:     "operator",
			Password: bootstrapPassword,
		},
		{
			ID:       "user-analyst",
			TenantID: "tenant-1",
			Email:    "revan.ande@rivicq.de",
			Name:     "Revan Ande",
			Role:     "analyst",
			Password: bootstrapPassword,
		},
		{
			ID:       "user-viewer",
			TenantID: "tenant-1",
			Email:    "sales@rivicq.de",
			Name:     "Sales Team",
			Role:     "viewer",
			Password: bootstrapPassword,
		},
	}

	for _, user := range users {
		userStore := NewDatabaseUserStore(db)
		if err := userStore.CreateUser(&user); err != nil {
			return fmt.Errorf("failed to create user %s: %w", user.Email, err)
		}
	}

	return nil
}

func parseAllowedDomains(raw string) []string {
	parts := strings.Split(raw, ",")
	domains := make([]string, 0, len(parts))
	for _, part := range parts {
		domain := strings.ToLower(strings.TrimSpace(part))
		if domain != "" {
			domains = append(domains, domain)
		}
	}
	return domains
}

func emailAllowed(email string, allowedDomains []string) bool {
	if len(allowedDomains) == 0 {
		return true
	}
	parts := strings.Split(strings.ToLower(strings.TrimSpace(email)), "@")
	if len(parts) != 2 {
		return false
	}
	for _, domain := range allowedDomains {
		if parts[1] == strings.ToLower(strings.TrimSpace(domain)) {
			return true
		}
	}
	return false
}
