package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
	"github.com/rivic-q/cryptobom-saas/internal/authn"
	"github.com/sirupsen/logrus"
)

// create_demo_users seeds the bootstrap admin (and, when DEMO_MODE is enabled,
// the four demo identities) through the authn lifecycle so the SQL store has
// real accounts.
func main() {
	logger := logrus.New()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		logger.Fatal("DATABASE_URL must be set to connect to the database")
	}

	cfg, err := authn.LoadConfig()
	if err != nil {
		logger.Fatalf("configuration error: %v", err)
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		logger.Fatalf("failed to open database: %v", err)
	}
	defer func() { _ = db.Close() }()

	svc, err := authn.NewService(cfg, authn.NewSQLStore(db))
	if err != nil {
		logger.Fatalf("failed to build auth service: %v", err)
	}

	if err := svc.SeedBootstrap(context.Background()); err != nil {
		logger.Fatalf("failed to create users: %v", err)
	}
	fmt.Println("Users seeded successfully")
}
