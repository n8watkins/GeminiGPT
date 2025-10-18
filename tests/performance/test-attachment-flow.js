const io = require('socket.io-client');

async function testAttachmentFlow() {
  console.log('🧪 Testing Attachment Flow');
  console.log('==========================\n');

  const socket = io('http://localhost:5000');
  const testChatId = 'test-attachment-chat';

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket server');
    
    // Test 1: Send message without attachments
    console.log('\n1. Testing message without attachments...');
    socket.emit('send-message', {
      chatId: testChatId,
      message: 'Hello, this is a test message without attachments',
      chatHistory: [],
      userId: 'USER-TEST-123',
      attachments: []
    });
  });

  socket.on('message-response', (data) => {
    console.log('📥 Received response:');
    console.log(`   Chat ID: ${data.chatId}`);
    console.log(`   Message: ${data.message.substring(0, 100)}...`);
    console.log(`   Complete: ${data.isComplete}`);
    
    if (data.isComplete) {
      console.log('\n✅ Basic message flow working');
      socket.disconnect();
    }
  });

  socket.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  // Wait for test to complete
  setTimeout(() => {
    console.log('\n⏰ Test timeout');
    socket.disconnect();
  }, 10000);
}

testAttachmentFlow();
