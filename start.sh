#!/bin/bash
set -euo pipefail

# Load local configuration from .env (gitignored). Do NOT hardcode secrets here.
if [ -f "$(dirname "$0")/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$(dirname "$0")/.env"
    set +a
fi

if [ -z "${JWT_SECRET:-}" ] || [ "${#JWT_SECRET}" -lt 32 ]; then
    echo "ERROR: JWT_SECRET must be set (>= 32 chars) in .env" >&2
    exit 1
fi

if [ -z "${AUTH_BOOTSTRAP_EMAIL:-}" ] || [ -z "${AUTH_BOOTSTRAP_PASSWORD:-}" ]; then
    echo "ERROR: AUTH_BOOTSTRAP_EMAIL and AUTH_BOOTSTRAP_PASSWORD must be set in .env" >&2
    exit 1
fi

exec /tmp/cryptobom-server
