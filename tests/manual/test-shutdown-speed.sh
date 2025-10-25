#!/bin/bash

# Test Shutdown Speed
#
# This script tests how quickly the server shuts down when receiving SIGINT (Ctrl+C)
#
# Expected behavior:
# - BEFORE FIX: 30+ seconds (waits for rate limiter interval to timeout or force exit after 30s)
# - AFTER FIX: <2 seconds (cleanly shuts down all resources)

echo "🧪 Testing Server Shutdown Speed"
echo "================================="
echo ""
echo "This test will:"
echo "1. Start the server"
echo "2. Wait 3 seconds for initialization"
echo "3. Send SIGINT (Ctrl+C)"
echo "4. Measure shutdown time"
echo ""
echo "Expected shutdown time: <2 seconds"
echo ""

# Start server in background
echo "▶️  Starting server..."
npm run dev > /tmp/server-shutdown-test.log 2>&1 &
SERVER_PID=$!

echo "   Server PID: $SERVER_PID"
echo ""

# Wait for server to initialize
echo "⏳ Waiting 3 seconds for server to initialize..."
sleep 3

# Check if server is still running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ ERROR: Server failed to start"
    cat /tmp/server-shutdown-test.log
    exit 1
fi

echo "✅ Server running"
echo ""

# Send SIGINT and measure shutdown time
echo "🛑 Sending SIGINT (Ctrl+C)..."
START_TIME=$(date +%s)
kill -INT $SERVER_PID

# Wait for process to exit (with timeout)
TIMEOUT=35  # Slightly longer than force exit timeout
ELAPSED=0
while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 0.1
    ELAPSED=$((ELAPSED + 1))

    if [ $ELAPSED -ge $((TIMEOUT * 10)) ]; then
        echo "❌ TIMEOUT: Server did not shut down within ${TIMEOUT}s"
        echo ""
        echo "Server is still running. Force killing..."
        kill -9 $SERVER_PID 2>/dev/null
        echo ""
        echo "Last 50 lines of server log:"
        tail -50 /tmp/server-shutdown-test.log
        exit 1
    fi
done

END_TIME=$(date +%s)
SHUTDOWN_TIME=$((END_TIME - START_TIME))

echo ""
echo "✅ Server shut down successfully"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Shutdown Time: ${SHUTDOWN_TIME} seconds"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Evaluate performance
if [ $SHUTDOWN_TIME -le 2 ]; then
    echo "🎉 EXCELLENT: Shutdown time is optimal (<= 2 seconds)"
    EXIT_CODE=0
elif [ $SHUTDOWN_TIME -le 5 ]; then
    echo "✅ GOOD: Shutdown time is acceptable (<= 5 seconds)"
    EXIT_CODE=0
elif [ $SHUTDOWN_TIME -le 10 ]; then
    echo "⚠️  SLOW: Shutdown time is slower than expected (<= 10 seconds)"
    EXIT_CODE=1
else
    echo "❌ VERY SLOW: Shutdown time is too slow (> 10 seconds)"
    EXIT_CODE=1
fi

echo ""
echo "Shutdown log (last 30 lines):"
echo "─────────────────────────────────"
tail -30 /tmp/server-shutdown-test.log | grep -E "(Closing|closed|Cleaning|cleaned|shutdown|exit)" || echo "(No shutdown logs found)"
echo ""

# Cleanup
rm -f /tmp/server-shutdown-test.log

exit $EXIT_CODE
