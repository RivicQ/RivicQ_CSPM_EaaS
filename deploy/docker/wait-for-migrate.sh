#!/bin/sh
set -e

# Wait for migrate completion file created by the migrate container
TIMEOUT=${WAIT_TIMEOUT:-300}
INTERVAL=2
elapsed=0

echo "Waiting for migrations (timeout ${TIMEOUT}s)..."
while [ ! -f /migrate-status/done ]; do
  if [ "$elapsed" -ge "$TIMEOUT" ]; then
    echo "Timeout waiting for migrations after ${TIMEOUT}s" >&2
    exit 1
  fi
  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
done

echo "Migrations complete, starting server"
exec /app/cryptobom-server
