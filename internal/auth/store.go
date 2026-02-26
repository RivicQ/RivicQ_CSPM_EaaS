package auth

import (
	"database/sql"
	"fmt"
	"os"

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
		"admin@cryptobom.io": {
			ID:       "user-1",
			TenantID: "tenant-1",
			Email:    "admin@cryptobom.io",
			Name:     "Admin User",
			Role:     "admin",
			Password: hashedPassword,
		},
		"operator@cryptobom.io": {
			ID:       "user-2",
			TenantID: "tenant-1",
			Email:    "operator@cryptobom.io",
			Name:     "Operator User",
			Role:     "operator",
			Password: hashedPassword,
		},
		"analyst@cryptobom.io": {
			ID:       "user-3",
			TenantID: "tenant-1",
			Email:    "analyst@cryptobom.io",
			Name:     "Security Analyst",
			Role:     "analyst",
			Password: hashedPassword,
		},
		"viewer@cryptobom.io": {
			ID:       "user-4",
			TenantID: "tenant-1",
			Email:    "viewer@cryptobom.io",
			Name:     "Viewer User",
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

// MockUserStore methods
func (m *MockUserStore) GetUserByEmail(email string) (*User, error) {
	if user, exists := m.users[email]; exists {
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
	m.users[user.Email] = user
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
			Email:    "admin@cryptobom.io",
			Name:     "Administrator",
			Role:     "admin",
			Password: bootstrapPassword,
		},
		{
			ID:       "user-operator",
			TenantID: "tenant-1",
			Email:    "operator@cryptobom.io",
			Name:     "Security Operator",
			Role:     "operator",
			Password: bootstrapPassword,
		},
		{
			ID:       "user-analyst",
			TenantID: "tenant-1",
			Email:    "analyst@cryptobom.io",
			Name:     "Security Analyst",
			Role:     "analyst",
			Password: bootstrapPassword,
		},
		{
			ID:       "user-viewer",
			TenantID: "tenant-1",
			Email:    "viewer@cryptobom.io",
			Name:     "Security Viewer",
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
