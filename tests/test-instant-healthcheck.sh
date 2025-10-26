#!/bin/bash
# Test that health check responds IMMEDIATELY, before Next.js is ready

echo "🧪 Testing instant health check response..."
echo "================================================"
echo ""

# Clean up any existing servers
pkill -f "node server.js" 2>/dev/null || true
sleep 1

# Start server in background
echo "Starting server..."
node server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait just 100ms (not enough time for Next.js to prepare)
sleep 0.1

# Try health check immediately
echo ""
echo "Attempting health check 100ms after server start..."
echo "(Next.js should still be initializing)"
echo ""

HTTP_CODE=$(curl -s -o /tmp/health-response.txt -w "%{http_code}" http://localhost:1339/healthz 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS: Health check responded immediately!"
    echo "HTTP Status: $HTTP_CODE"
    echo "Response:"
    cat /tmp/health-response.txt
    echo ""
    echo ""
    echo "This proves health checks will pass in Railway during cold starts!"
    RESULT=0
elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ FAIL: Connection refused"
    echo "Server hasn't started listening yet"
    RESULT=1
else
    echo "⚠️  WARNING: Unexpected HTTP code: $HTTP_CODE"
    echo "Response:"
    cat /tmp/health-response.txt
    RESULT=1
fi

# Clean up
kill $SERVER_PID 2>/dev/null || true
rm -f /tmp/health-response.txt /tmp/server.log

exit $RESULT
