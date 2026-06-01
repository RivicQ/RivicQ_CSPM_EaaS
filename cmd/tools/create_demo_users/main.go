package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
	"github.com/rivic-q/cryptobom-saas/internal/auth"
	"github.com/sirupsen/logrus"
)

func main() {
	logger := logrus.New()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		logger.Fatal("DATABASE_URL must be set to connect to the database")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		logger.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := auth.CreateDefaultUsers(db); err != nil {
		logger.Fatalf("failed to create default users: %v", err)
	}

	fmt.Println("Demo users created successfully")
}
