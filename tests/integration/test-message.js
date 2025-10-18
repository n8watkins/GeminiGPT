// Test sending a message to Railway WebSocket
const WebSocket = require('ws');

const railwayUrl = 'https://fearless-prosperity-production.up.railway.app';
const wsUrl = railwayUrl.replace('https://', 'wss://');

console.log('🔌 Testing message sending to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ WebSocket connected!');
  
  // Send a test message in the format the frontend uses
  const testMessage = {
    message: 'Hello, can you respond?',
    chatHistory: [],
    chatId: 'test-chat-' + Date.now()
  };
  
  console.log('📤 Sending message:', JSON.stringify(testMessage, null, 2));
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

// Listen for typing indicators
ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    if (parsed.isTyping !== undefined) {
      console.log('⌨️ Typing indicator:', parsed.isTyping ? 'Typing...' : 'Stopped typing');
    } else if (parsed.content) {
      console.log('💬 AI Response:', parsed.content);
      console.log('✅ Complete:', parsed.isComplete);
    }
  } catch (e) {
    console.log('📨 Raw message:', data.toString());
  }
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
}, 15000);
