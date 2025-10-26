/**
 * Test WebSocket client to verify the fix works end-to-end
 * Run the server first with: npm run dev
 */

const io = require('socket.io-client');

const socket = io('http://localhost:1339', {
  transports: ['websocket'],
  auth: {
    token: JSON.stringify({
      user: {
        id: 'test-user-123',
        email: 'test@example.com'
      }
    })
  }
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Sending test message: "what is a promise in js"\n');

  socket.emit('send-message', {
    message: 'what is a promise in js',
    chatId: 'test-chat-' + Date.now(),
    userId: 'test-user-123',
    chatHistory: [] // Empty history for first message
  });
});

socket.on('typing', (data) => {
  console.log('⌨️  Typing:', data.isTyping);
});

let fullResponse = '';
socket.on('message-response', (data) => {
  if (data.message && !data.isComplete) {
    fullResponse += data.message;
    process.stdout.write(data.message);
  }

  if (data.isComplete) {
    console.log('\n\n✅ Response complete!');
    console.log('Total response length:', fullResponse.length);

    if (data.error) {
      console.error('❌ Error flag set:', data.error);
    }

    if (fullResponse.length === 0) {
      console.error('❌ FAIL: Empty response received (bug still exists)');
      process.exit(1);
    } else {
      console.log('✅ SUCCESS: Got response from server!');
      console.log('Preview:', fullResponse.substring(0, 200) + '...');
      process.exit(0);
    }
  }
});

socket.on('debug-info', (data) => {
  console.log('\n📋 Debug info:', data.type);
  if (data.hadFunctionCalls) {
    console.log('  - Function calls:', data.functionNames);
  }
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('Make sure the server is running: npm run dev');
  process.exit(1);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Timeout after 60 seconds
setTimeout(() => {
  console.error('❌ Test timeout - no response after 60 seconds');
  process.exit(1);
}, 60000);

console.log('Connecting to WebSocket server at http://localhost:1339...');
