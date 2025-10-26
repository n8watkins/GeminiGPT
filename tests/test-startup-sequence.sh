#!/bin/bash
# Test health check responses during different stages of startup

echo "🧪 Testing health check during server startup sequence..."
echo "========================================================="
echo ""

# Clean up
pkill -f "node server.js" 2>/dev/null || true
sleep 1

# Start server
echo "Starting server..."
node server.js > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
echo ""

# Test at different intervals
test_health() {
    local wait_time=$1
    local description=$2

    sleep $wait_time

    HTTP_CODE=$(curl -s -o /tmp/health.txt -w "%{http_code}" http://localhost:1339/healthz 2>/dev/null)

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ ${description}: Health check OK (${HTTP_CODE})"
        RESPONSE=$(cat /tmp/health.txt)
        echo "   Response: $RESPONSE"
        return 0
    elif [ "$HTTP_CODE" = "000" ]; then
        echo "❌ ${description}: Connection refused (server not listening yet)"
        return 1
    else
        echo "⚠️  ${description}: HTTP ${HTTP_CODE}"
        return 1
    fi
}

# Test every second for 5 seconds
for i in {1..5}; do
    test_health 1 "After ${i}s"
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Health check passed after ${i} second(s)!"
        echo ""

        # Check logs to see if Next.js is ready yet
        if grep -q "Next.js app prepared successfully" /tmp/server.log; then
            echo "📋 Next.js status: ✅ Ready"
        else
            echo "📋 Next.js status: ⏳ Still initializing"
            echo ""
            echo "SUCCESS! Health check passed BEFORE Next.js was ready!"
            echo "This will prevent Railway timeout issues."
        fi

        break
    fi
done

# Show server log
echo ""
echo "📄 Server log:"
echo "---"
tail -20 /tmp/server.log

# Clean up
kill $SERVER_PID 2>/dev/null || true
rm -f /tmp/health.txt /tmp/server.log
