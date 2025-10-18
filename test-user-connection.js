/**
 * Test if user browser can connect and send messages
 */

const io = require('socket.io-client');

console.log('🧪 Testing User Connection to WebSocket Server\n');
console.log('This simulates what your browser should be doing...\n');

const socket = io('http://localhost:1337', {
  timeout: 10000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ CONNECTED to WebSocket server');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}\n`);

  console.log('📤 Sending test message...\n');

  socket.emit('send-message', {
    chatId: 'test-chat-123',
    message: 'Hello, this is a test message',
    chatHistory: [],
    attachments: [],
    userId: 'TEST-USER-BROWSER'
  });

  console.log('✅ Message sent! Check the server logs above.');
  console.log('   You should see "Received message" with userId: TEST-USER-BROWSER\n');
});

socket.on('debug-info', (data) => {
  console.log('🔍 DEBUG INFO received:');
  console.log('   Type:', data.type);
  console.log('   Timestamp:', data.timestamp);
  if (data.type === 'request') {
    console.log('   Message:', data.message);
  } else {
    console.log('   Response:', data.response?.substring(0, 100) + '...');
  }
  console.log('');
});

socket.on('message-response', (data) => {
  console.log('✅ RESPONSE received:');
  console.log('   Message:', data.message);
  console.log('   Complete:', data.isComplete);
  console.log('\n✅ SUCCESS! Everything is working!\n');

  setTimeout(() => {
    socket.close();
    process.exit(0);
  }, 1000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

setTimeout(() => {
  console.error('⏱️  Test timed out - no response received');
  socket.close();
  process.exit(1);
}, 30000);
