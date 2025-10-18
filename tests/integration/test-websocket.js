// Simple WebSocket test client
const WebSocket = require('ws');

const railwayUrl = 'https://fearless-prosperity-production.up.railway.app';
const wsUrl = railwayUrl.replace('https://', 'wss://');

console.log('🔌 Testing WebSocket connection to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  
  // Send a test message
  const testMessage = {
    message: 'Hello from test client',
    chatHistory: [],
    chatId: 'test-chat-123'
  };
  
  console.log('📤 Sending test message:', testMessage);
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', function message(data) {
  console.log('📨 Received response:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
}, 10000);
