#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/create-demo-users.sh
# Requires: DATABASE_URL in environment or in .env.demo

if [ -f .env.demo ]; then
  export $(grep -v '^#' .env.demo | xargs)
fi

if [ -z "${DATABASE_URL-}" ]; then
  echo "DATABASE_URL must be set (example: postgres://user:pass@localhost:5432/dbname?sslmode=disable)"
  exit 1
fi

echo "Creating demo users in database: $DATABASE_URL"

go run ./cmd/tools/create_demo_users

echo "Done."
