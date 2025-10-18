/**
 * Test if message indexing works
 */

const { addMessage } = require('./vectorDB');

async function testIndexing() {
  console.log('🧪 Testing Message Indexing\n');

  const userId = 'TEST-USER-123';
  const chatId = 'TEST-CHAT-456';

  const message = {
    id: 'msg-1',
    role: 'user',
    content: 'i love dogs their my favorite animal',
    timestamp: new Date()
  };

  console.log('📝 Attempting to index message...');
  console.log(`   User: ${userId}`);
  console.log(`   Chat: ${chatId}`);
  console.log(`   Content: "${message.content}"`);

  try {
    const result = await addMessage(userId, chatId, message, 'Test Chat');
    console.log(`\n✅ Indexing result: ${result ? 'SUCCESS' : 'FAILED'}`);

    // Wait a bit and check if it's in the database
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { searchChats } = require('./vectorDB');
    const searchResults = await searchChats(userId, 'favorite animal', 5);

    console.log(`\n📊 Search Results: Found ${searchResults.length} messages`);
    if (searchResults.length > 0) {
      searchResults.forEach((result, idx) => {
        console.log(`\n  ${idx + 1}. "${result.content}"`);
        console.log(`     Distance: ${result._distance?.toFixed(4)}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

testIndexing();
