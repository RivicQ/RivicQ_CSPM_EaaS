#!/usr/bin/env bash
# Run the lightweight IBMQ mock server for local dev/CI
set -euo pipefail

go run ./demo/mock-ibmq/mock_server.go &
PID=$!
echo "Mock server started (PID $PID)"
sleep 1
echo "To stop: kill $PID"
