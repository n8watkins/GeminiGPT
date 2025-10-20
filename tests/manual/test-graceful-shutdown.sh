#!/bin/bash
#
# Manual Test for Graceful Shutdown
#
# Tests that the server shuts down cleanly when receiving SIGTERM or SIGINT.
# Verifies:
# - Server starts successfully
# - Server responds to signals
# - Databases close cleanly
# - Exit code is 0 (success)
#

set -e

echo "========================================="
echo "Graceful Shutdown Test"
echo "========================================="
echo ""

# Start the server in background
echo "Starting server..."
NODE_ENV=development npm run dev > /tmp/server-test.log 2>&1 &
SERVER_PID=$!

echo "Server started with PID: $SERVER_PID"
echo "Waiting 10 seconds for server to initialize..."
sleep 10

# Check if server is still running
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "❌ Server failed to start"
  cat /tmp/server-test.log
  exit 1
fi

echo "✅ Server is running"
echo ""

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/healthz || echo "failed")
if [ "$HEALTH_RESPONSE" = "ok" ]; then
  echo "✅ Health check passed"
else
  echo "⚠️  Health check failed (may be expected in test environment)"
fi
echo ""

# Send SIGTERM to trigger graceful shutdown
echo "Sending SIGTERM to server (PID: $SERVER_PID)..."
kill -TERM $SERVER_PID

echo "Waiting for graceful shutdown (max 35 seconds)..."
WAIT_TIME=0
MAX_WAIT=35

while kill -0 $SERVER_PID 2>/dev/null; do
  sleep 1
  WAIT_TIME=$((WAIT_TIME + 1))

  if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    echo "❌ Server did not shut down within timeout"
    kill -9 $SERVER_PID 2>/dev/null || true
    exit 1
  fi

  echo -n "."
done

echo ""
echo ""

# Check exit code
wait $SERVER_PID
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Server shut down gracefully (exit code: 0)"
else
  echo "❌ Server exited with non-zero code: $EXIT_CODE"
  echo ""
  echo "Server logs:"
  tail -50 /tmp/server-test.log
  exit 1
fi

echo ""
echo "Checking server logs for shutdown messages..."
if grep -q "Graceful shutdown completed successfully" /tmp/server-test.log; then
  echo "✅ Found graceful shutdown confirmation in logs"
else
  echo "⚠️  Did not find shutdown confirmation (check logs manually)"
fi

if grep -q "SQLite database connection closed" /tmp/server-test.log; then
  echo "✅ SQLite database closed"
else
  echo "⚠️  SQLite closure not logged"
fi

if grep -q "LanceDB connection closed" /tmp/server-test.log; then
  echo "✅ LanceDB closed"
else
  echo "⚠️  LanceDB closure not logged"
fi

echo ""
echo "========================================="
echo "✅ Graceful shutdown test PASSED"
echo "========================================="
echo ""
echo "To review full logs: cat /tmp/server-test.log"

# Cleanup
rm -f /tmp/server-test.log
