package authn

import (
	"errors"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const (
	// MinPasswordLength is the floor for workspace passwords.
	MinPasswordLength = 12
	// MaxPasswordLength bounds bcrypt input (bcrypt truncates at 72 bytes).
	MaxPasswordLength = 72
)

// commonPasswords is a small deny list of the passwords that dominate
// credential-stuffing lists. It is a floor, not a breach-list service.
var commonPasswords = map[string]bool{
	"password": true, "password1": true, "password123": true, "passw0rd": true,
	"12345678": true, "123456789": true, "1234567890": true, "qwerty123": true,
	"letmein": true, "welcome1": true, "administrator": true, "changeme": true,
	"demopass123": true, "rivicq123": true,
}

// HashPassword returns a bcrypt hash of the password.
func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

// CheckPassword reports whether password matches the bcrypt hash.
func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// ValidatePassword enforces the password policy without identity context.
func ValidatePassword(password string) error {
	return ValidatePasswordFor(password, "", "")
}

// ValidatePasswordFor enforces the password policy with identity context so a
// password cannot be assembled from the account's own email or organisation.
func ValidatePasswordFor(password, email, organisation string) error {
	if len(password) < MinPasswordLength {
		return errors.New("password must be at least 12 characters")
	}
	if len(password) > MaxPasswordLength {
		return errors.New("password must be at most 72 bytes")
	}
	if strings.TrimSpace(password) != password || password == "" {
		return errors.New("password must not begin or end with whitespace")
	}
	if commonPasswords[strings.ToLower(password)] {
		return errors.New("password is too common; choose a unique passphrase")
	}

	var lower, upper, digit, symbol bool
	for _, r := range password {
		switch {
		case r >= 'a' && r <= 'z':
			lower = true
		case r >= 'A' && r <= 'Z':
			upper = true
		case r >= '0' && r <= '9':
			digit = true
		default:
			symbol = true
		}
	}
	classes := 0
	for _, ok := range []bool{lower, upper, digit, symbol} {
		if ok {
			classes++
		}
	}
	if classes < 3 {
		return errors.New("password must mix at least three of: lowercase, uppercase, digits, symbols")
	}

	squash := func(in string) string {
		var b strings.Builder
		for _, r := range strings.ToLower(in) {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
				b.WriteRune(r)
			}
		}
		return b.String()
	}
	squashed := squash(password)
	if email != "" {
		if local, _, found := strings.Cut(normalizeEmail(email), "@"); found {
			if local = squash(local); len(local) >= 4 && strings.Contains(squashed, local) {
				return errors.New("password must not contain your email address")
			}
		}
	}
	if org := squash(organisation); len(org) >= 4 && strings.Contains(squashed, org) {
		return errors.New("password must not contain your organization name")
	}
	return nil
}
