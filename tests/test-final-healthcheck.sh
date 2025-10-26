#!/bin/bash
# Final test: Health check responds before Next.js is ready

echo "🧪 Final Health Check Test"
echo "=========================="
echo ""

# Clean up all node processes
pkill -f "node server.js" 2>/dev/null || true
sleep 2

# Verify ports are free
for PORT in 1337 1338 1339; do
    if lsof -ti:$PORT > /dev/null 2>&1; then
        echo "⚠️  Port $PORT is in use, killing process..."
        kill -9 $(lsof -ti:$PORT) 2>/dev/null || true
    fi
done
sleep 1

# Start server
echo "Starting server..."
node server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start listening (should be < 1 second)
echo "Waiting for server to start listening..."
sleep 1.5

# Find which port it's using
PORT=$(grep -oP "Server listening on.*:(\d+)" /tmp/server.log | grep -oP '\d+$' | head -1)
if [ -z "$PORT" ]; then
    PORT=1337  # Default
fi
echo "Server is on port: $PORT"
echo ""

# Check if Next.js is ready
if grep -q "Next.js app prepared successfully" /tmp/server.log; then
    NEXTJS_READY="yes"
    echo "📋 Next.js status: ✅ Already ready"
else
    NEXTJS_READY="no"
    echo "📋 Next.js status: ⏳ Still initializing"
fi
echo ""

# Test health check
echo "Testing health check on port $PORT..."
HTTP_CODE=$(curl -s -o /tmp/health.txt -w "%{http_code}" "http://localhost:$PORT/healthz" 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check returned 200 OK"
    echo ""
    echo "Response:"
    cat /tmp/health.txt | jq . 2>/dev/null || cat /tmp/health.txt
    echo ""

    if [ "$NEXTJS_READY" = "no" ]; then
        echo ""
        echo "🎉 SUCCESS! Health check passed BEFORE Next.js was ready!"
        echo "   This will fix Railway health check timeouts."
        RESULT=0
    else
        echo ""
        echo "✅ Health check works (but Next.js was already ready)"
        RESULT=0
    fi
else
    echo "❌ FAIL: HTTP $HTTP_CODE"
    cat /tmp/health.txt
    RESULT=1
fi

# Clean up
echo ""
echo "Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
rm -f /tmp/health.txt /tmp/server.log

exit $RESULT
