package authn

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/lib/pq"
)

// SQLStore is a PostgreSQL-backed Store.
type SQLStore struct {
	db *sql.DB
}

// NewSQLStore wraps a database handle. It does not run migrations; the caller
// applies the authn migration first.
func NewSQLStore(db *sql.DB) Store {
	return &SQLStore{db: db}
}

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == "23505"
}

const userColumns = `id, tenant_id, email, name, role, password,
	email_verified, mfa_enabled, COALESCE(mfa_secret, ''), COALESCE(organisation, ''),
	disabled, created_at, updated_at`

func scanUser(row interface {
	Scan(dest ...interface{}) error
}) (*User, error) {
	var u User
	var role string
	if err := row.Scan(
		&u.ID, &u.TenantID, &u.Email, &u.Name, &role, &u.PasswordHash,
		&u.EmailVerified, &u.MFAEnabled, &u.MFASecret, &u.Organisation,
		&u.Disabled, &u.CreatedAt, &u.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	u.Role = normalizeRole(role)
	return &u, nil
}

func (s *SQLStore) CreateUser(ctx context.Context, u *User) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO users (id, tenant_id, email, name, role, password,
			email_verified, mfa_enabled, mfa_secret, organisation, disabled, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
		u.ID, u.TenantID, normalizeEmail(u.Email), u.Name, string(u.Role), u.PasswordHash,
		u.EmailVerified, u.MFAEnabled, nullIfEmpty(u.MFASecret), u.Organisation, u.Disabled,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrEmailTaken
		}
		return err
	}
	return nil
}

func (s *SQLStore) UpdateUser(ctx context.Context, u *User) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE users SET email=$2, name=$3, role=$4, password=$5,
			email_verified=$6, mfa_enabled=$7, mfa_secret=$8, organisation=$9, disabled=$10,
			updated_at=NOW()
		WHERE id=$1`,
		u.ID, normalizeEmail(u.Email), u.Name, string(u.Role), u.PasswordHash,
		u.EmailVerified, u.MFAEnabled, nullIfEmpty(u.MFASecret), u.Organisation, u.Disabled,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrEmailTaken
		}
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrUserNotFound
	}
	return nil
}

func (s *SQLStore) GetUserByID(ctx context.Context, id string) (*User, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE id=$1`, id)
	return scanUser(row)
}

func (s *SQLStore) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM users WHERE lower(email)=lower($1)`, normalizeEmail(email))
	return scanUser(row)
}

func (s *SQLStore) ListUsersByTenant(ctx context.Context, tenantID string) ([]*User, error) {
	var (
		rows *sql.Rows
		err  error
	)
	if tenantID == "" {
		rows, err = s.db.QueryContext(ctx, `SELECT `+userColumns+` FROM users ORDER BY email`)
	} else {
		rows, err = s.db.QueryContext(ctx, `SELECT `+userColumns+` FROM users WHERE tenant_id=$1 ORDER BY email`, tenantID)
	}
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []*User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *SQLStore) CreateSession(ctx context.Context, sess *Session) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO auth_sessions (id, user_id, refresh_hash, user_agent, ip, created_at, expires_at, rotated_to, revoked_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		sess.ID, sess.UserID, sess.RefreshHash, sess.UserAgent, sess.IP,
		sess.CreatedAt, sess.ExpiresAt, sess.RotatedTo, sess.RevokedAt,
	)
	return err
}

func (s *SQLStore) UpdateSession(ctx context.Context, sess *Session) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE auth_sessions SET rotated_to=$2, revoked_at=$3 WHERE id=$1`,
		sess.ID, sess.RotatedTo, sess.RevokedAt,
	)
	return err
}

const sessionColumns = `id, user_id, refresh_hash, COALESCE(user_agent,''), COALESCE(ip,''), created_at, expires_at, COALESCE(rotated_to,''), revoked_at`

func scanSession(row interface {
	Scan(dest ...interface{}) error
}) (*Session, error) {
	var s Session
	if err := row.Scan(&s.ID, &s.UserID, &s.RefreshHash, &s.UserAgent, &s.IP,
		&s.CreatedAt, &s.ExpiresAt, &s.RotatedTo, &s.RevokedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrInvalidToken
		}
		return nil, err
	}
	return &s, nil
}

func (s *SQLStore) GetSessionByID(ctx context.Context, id string) (*Session, error) {
	return scanSession(s.db.QueryRowContext(ctx, `SELECT `+sessionColumns+` FROM auth_sessions WHERE id=$1`, id))
}

func (s *SQLStore) GetSessionByRefreshHash(ctx context.Context, hash string) (*Session, error) {
	return scanSession(s.db.QueryRowContext(ctx, `SELECT `+sessionColumns+` FROM auth_sessions WHERE refresh_hash=$1`, strings.TrimSpace(hash)))
}

func (s *SQLStore) ListSessionsByUser(ctx context.Context, userID string) ([]*Session, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT `+sessionColumns+` FROM auth_sessions WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []*Session
	for rows.Next() {
		sess, err := scanSession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sess)
	}
	return out, rows.Err()
}

func (s *SQLStore) RevokeSessionsForUser(ctx context.Context, userID string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL`, userID)
	return err
}

func (s *SQLStore) CreateToken(ctx context.Context, t *Token) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO auth_tokens (hash, user_id, purpose, expires_at, used_at, created_at)
		VALUES ($1,$2,$3,$4,$5,NOW())`,
		t.Hash, t.UserID, string(t.Purpose), t.ExpiresAt, t.UsedAt,
	)
	return err
}

func (s *SQLStore) GetToken(ctx context.Context, hash string) (*Token, error) {
	var t Token
	var purpose string
	err := s.db.QueryRowContext(ctx,
		`SELECT hash, user_id, purpose, expires_at, used_at FROM auth_tokens WHERE hash=$1`,
		strings.TrimSpace(hash),
	).Scan(&t.Hash, &t.UserID, &purpose, &t.ExpiresAt, &t.UsedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrInvalidToken
		}
		return nil, err
	}
	t.Purpose = TokenPurpose(purpose)
	return &t, nil
}

func (s *SQLStore) MarkTokenUsed(ctx context.Context, hash string) error {
	res, err := s.db.ExecContext(ctx,
		`UPDATE auth_tokens SET used_at=COALESCE(used_at, NOW()) WHERE hash=$1`,
		strings.TrimSpace(hash),
	)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrInvalidToken
	}
	return nil
}

func nullIfEmpty(s string) interface{} {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}
