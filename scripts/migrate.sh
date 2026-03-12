#!/usr/bin/env bash
# migrate.sh — CryptoBOM SaaS database migration runner
#
# Usage:
#   ./scripts/migrate.sh [dev|staging|prod]
#
# Environment variables (override defaults):
#   DATABASE_URL   — full postgres connection URL
#   DB_HOST        — postgres host            (default: localhost)
#   DB_PORT        — postgres port            (default: 5432)
#   DB_USER        — postgres user            (default: cryptobom)
#   DB_PASSWORD    — postgres password
#   DB_NAME        — postgres database name   (default: cryptobom)
#   DB_SSLMODE     — sslmode                  (default: disable for dev, require for prod)
#   MIGRATIONS_DIR — path to migration files  (default: deploy/migrations)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENVIRONMENT="${1:-dev}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-${REPO_ROOT}/deploy/migrations}"

# Set defaults per environment
case "${ENVIRONMENT}" in
  prod|production)
    DB_SSLMODE="${DB_SSLMODE:-require}"
    ;;
  *)
    DB_SSLMODE="${DB_SSLMODE:-disable}"
    ;;
esac

# Build DATABASE_URL if not already provided
if [ -z "${DATABASE_URL:-}" ]; then
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
  DB_USER="${DB_USER:-cryptobom}"
  DB_PASSWORD="${DB_PASSWORD:-}"
  DB_NAME="${DB_NAME:-cryptobom}"
  DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}"
fi

echo "==> CryptoBOM SaaS – Database Migration Runner"
echo "    Environment : ${ENVIRONMENT}"
echo "    Migrations  : ${MIGRATIONS_DIR}"
echo ""

# Check psql is available
if ! command -v psql &>/dev/null; then
  echo "ERROR: psql not found. Install postgresql-client." >&2
  exit 1
fi

# Ensure migrations directory exists
if [ ! -d "${MIGRATIONS_DIR}" ]; then
  echo "ERROR: Migrations directory not found: ${MIGRATIONS_DIR}" >&2
  exit 1
fi

# Create tracking table if it doesn't exist
psql "${DATABASE_URL}" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);" -v ON_ERROR_STOP=1

# Apply each migration in order (idempotent — skips already-applied versions)
APPLIED=0
SKIPPED=0

for migration_file in $(ls "${MIGRATIONS_DIR}"/*.sql | sort); do
  version="$(basename "${migration_file}" .sql)"

  # Validate version contains only safe characters (alphanumeric, underscore, dash)
  if ! [[ "${version}" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "  [skip]  ${version} — unsafe filename, skipping" >&2
    continue
  fi

  # Check if already applied
  already_applied=$(psql "${DATABASE_URL}" -tAc \
    "SELECT COUNT(*) FROM schema_migrations WHERE version='${version}';" 2>/dev/null || echo "0")

  if [ "${already_applied}" = "1" ]; then
    echo "  [skip]  ${version}"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "  [apply] ${version} ..."
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${migration_file}"
  psql "${DATABASE_URL}" -c \
    "INSERT INTO schema_migrations (version) VALUES ('${version}') ON CONFLICT DO NOTHING;" \
    -v ON_ERROR_STOP=1

  echo "  [done]  ${version}"
  APPLIED=$((APPLIED + 1))
done

echo ""
echo "==> Migration complete: ${APPLIED} applied, ${SKIPPED} already up-to-date."
