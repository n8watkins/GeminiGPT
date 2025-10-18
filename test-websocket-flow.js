/**
 * Test WebSocket Flow - Simulate Actual Client Request
 *
 * This will connect to the actual WebSocket server and send
 * a "write Python function" request to see where [object Object] appears
 */

const io = require('socket.io-client');

console.log('🧪 Testing WebSocket Flow for [object Object] Issue\n');

const socket = io('http://localhost:1337', {
  timeout: 10000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Sending test message...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Simulate exactly what the client sends
  const testData = {
    chatId: 'test-chat-' + Date.now(),
    message: 'Write a Python function to sort an array',
    chatHistory: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),  // THIS IS THE PROBLEM - Date object
        attachments: []
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi! How can I help you?',
        timestamp: new Date(),  // THIS IS THE PROBLEM - Date object
        attachments: []
      }
    ],
    attachments: [],
    userId: 'test-user-' + Date.now()
  };

  console.log('Data being sent:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n');

  socket.emit('send-message', testData);
});

socket.on('message-response', (data) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📨 Received Response');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Response type:', typeof data.message);
  console.log('Response length:', data.message?.length);
  console.log('Is complete:', data.isComplete);
  console.log('Contains [object Object]:', data.message?.includes('[object Object]'));

  if (data.message?.includes('[object Object]')) {
    console.log('\n🚨 FAILURE: Response contains [object Object]');
    console.log('\nFirst 1000 chars of response:');
    console.log(data.message.substring(0, 1000));
  } else {
    console.log('\n✅ SUCCESS: Clean response');
    console.log('\nFirst 500 chars of response:');
    console.log(data.message.substring(0, 500));
  }

  if (data.isComplete) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    socket.close();
    process.exit(data.message?.includes('[object Object]') ? 1 : 0);
  }
});

socket.on('typing', (data) => {
  console.log('⌨️  Typing indicator:', data.isTyping);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('⏱️  Test timed out after 30 seconds');
  socket.close();
  process.exit(1);
}, 30000);
