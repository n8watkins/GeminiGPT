/**
 * End-to-End Cross-Chat Search Test
 *
 * This simulates exactly what a user would do:
 * 1. Say "i love dogs their my favorite animal" in Chat 1
 * 2. Ask "what is my favorite type of animal" in Chat 2
 * 3. Verify it finds the information from Chat 1
 */

const io = require('socket.io-client');

const TEST_USER_ID = 'USER-E2E-TEST-' + Date.now();
const CHAT_1_ID = 'chat-1-' + Date.now();
const CHAT_2_ID = 'chat-2-' + Date.now();

console.log('🧪 End-to-End Cross-Chat Search Test\n');
console.log('═'.repeat(60));
console.log(`\n👤 Test User ID: ${TEST_USER_ID}`);
console.log(`💬 Chat 1 ID: ${CHAT_1_ID}`);
console.log(`💬 Chat 2 ID: ${CHAT_2_ID}\n`);

const socket = io('http://localhost:1337', {
  timeout: 10000,
  transports: ['websocket', 'polling']
});

let testStep = 0;

socket.on('connect', async () => {
  console.log('✅ Connected to WebSocket server\n');

  // STEP 1: Send message in Chat 1 about loving dogs
  testStep = 1;
  console.log('═'.repeat(60));
  console.log('📊 STEP 1: Send "i love dogs" message in Chat 1');
  console.log('═'.repeat(60));

  const chat1Message = 'i love dogs their my favorite animal';

  console.log(`\n📤 Sending to Chat 1: "${chat1Message}"`);

  socket.emit('send-message', {
    chatId: CHAT_1_ID,
    message: chat1Message,
    chatHistory: [],  // First message in this chat
    attachments: [],
    userId: TEST_USER_ID
  });
});

let chat1ResponseReceived = false;
let chat2ResponseReceived = false;

socket.on('message-response', async (data) => {
  if (data.chatId === CHAT_1_ID && !chat1ResponseReceived && data.isComplete) {
    chat1ResponseReceived = true;

    console.log(`\n✅ Chat 1 Response received:`);
    console.log(`   "${data.message.substring(0, 100)}..."\n`);

    // Wait 3 seconds for message to be indexed to vector DB
    console.log('⏳ Waiting 3 seconds for message to be indexed to vector DB...\n');

    setTimeout(async () => {
      // STEP 2: Ask about favorite animal in Chat 2
      testStep = 2;
      console.log('═'.repeat(60));
      console.log('📊 STEP 2: Ask "what is my favorite type of animal" in Chat 2');
      console.log('═'.repeat(60));

      const chat2Message = 'what is my favorite type of animal';

      console.log(`\n📤 Sending to Chat 2: "${chat2Message}"`);
      console.log('🔍 This should trigger cross-chat search and find "dogs" from Chat 1\n');

      socket.emit('send-message', {
        chatId: CHAT_2_ID,
        message: chat2Message,
        chatHistory: [],  // First message in Chat 2
        attachments: [],
        userId: TEST_USER_ID
      });
    }, 3000);
  }

  if (data.chatId === CHAT_2_ID && !chat2ResponseReceived && data.isComplete) {
    chat2ResponseReceived = true;

    console.log('═'.repeat(60));
    console.log('📊 STEP 3: Verify Response');
    console.log('═'.repeat(60));

    console.log(`\n✅ Chat 2 Response received:`);
    console.log('─'.repeat(60));
    console.log(data.message);
    console.log('─'.repeat(60));

    // Check if the response mentions dogs
    const lowerResponse = data.message.toLowerCase();
    const foundDogs = lowerResponse.includes('dog');
    const foundFavorite = lowerResponse.includes('favorite');

    console.log('\n📊 Test Results:');
    console.log(`   - Response mentions "dog": ${foundDogs ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Response mentions "favorite": ${foundFavorite ? '✅ YES' : '❌ NO'}`);

    if (foundDogs && foundFavorite) {
      console.log('\n🎉 SUCCESS! Cross-chat search is working!');
      console.log('   The AI correctly found "dogs" from the previous chat.\n');
      socket.close();
      process.exit(0);
    } else {
      console.log('\n❌ FAILURE! Cross-chat search did not find the information.');
      console.log('   Expected the response to mention that your favorite animal is dogs.\n');
      socket.close();
      process.exit(1);
    }
  }
});

socket.on('typing', (data) => {
  if (data.isTyping) {
    console.log(`⌨️  AI is typing for ${data.chatId}...`);
  }
});

socket.on('connect_error', (error) => {
  console.error('\n❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('error', (error) => {
  console.error('\n❌ Socket error:', error);
  process.exit(1);
});

// Timeout after 60 seconds
setTimeout(() => {
  console.error('\n⏱️  Test timed out after 60 seconds');
  socket.close();
  process.exit(1);
}, 60000);
