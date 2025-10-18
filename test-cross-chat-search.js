/**
 * Comprehensive Cross-Chat Search Test
 *
 * This test will:
 * 1. Index a message about "favorite dog is labrador"
 * 2. Search for "what is my favorite dog"
 * 3. Verify the search finds the labrador message
 * 4. Test pattern matching to ensure queries trigger search
 */

const { addMessage, searchChats } = require('./vectorDB');
const { searchChatHistory } = require('./searchService');

async function testCrossChatSearch() {
  console.log('🧪 Starting Cross-Chat Search Test\n');
  console.log('═'.repeat(60));

  try {
    // Vector DB will auto-initialize on first message
    console.log('\n📊 Step 1: Prepare Test');

    // Test data
    const userId = 'test-user-' + Date.now();
    const chatId1 = 'chat-1-' + Date.now();
    const chatId2 = 'chat-2-' + Date.now();

    console.log('\n👤 Test User ID:', userId);
    console.log('💬 Chat 1 ID:', chatId1);
    console.log('💬 Chat 2 ID:', chatId2);

    // Step 2: Index a message about favorite dog
    console.log('\n═'.repeat(60));
    console.log('📊 Step 2: Index Message About Favorite Dog');
    console.log('═'.repeat(60));

    const userMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'My favorite dog is a labrador',
      timestamp: new Date()
    };

    const assistantMessage = {
      id: 'msg-2',
      role: 'assistant',
      content: 'That\'s wonderful! Labradors are known for being friendly, loyal, and great family pets.',
      timestamp: new Date()
    };

    console.log('\n📝 Indexing user message:', userMessage.content);
    await addMessage(userId, chatId1, userMessage, 'Chat about favorite dog');
    console.log('✅ User message indexed');

    console.log('\n📝 Indexing assistant message:', assistantMessage.content.substring(0, 50) + '...');
    await addMessage(userId, chatId1, assistantMessage, 'Chat about favorite dog');
    console.log('✅ Assistant message indexed');

    // Wait a bit for indexing to complete
    console.log('\n⏳ Waiting 2 seconds for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Test pattern matching
    console.log('\n═'.repeat(60));
    console.log('📊 Step 3: Pattern Matching Test');
    console.log('═'.repeat(60));

    const testQueries = [
      'what is my favorite dog',
      'whats my favorite dog',
      'what\'s my favorite dog',
      'what is my preference',
      'my favorite',
      'tell me about my favorite dog'
    ];

    console.log('\n📝 Test queries that should trigger search:');
    testQueries.forEach(query => {
      console.log(`   - "${query}"`);
    });

    // Step 4: Test vector search directly
    console.log('\n═'.repeat(60));
    console.log('📊 Step 4: Test Vector Search Directly');
    console.log('═'.repeat(60));

    const query = 'what is my favorite dog';
    console.log('\n🔍 Searching for:', query);
    console.log('🔍 User ID:', userId);

    const searchResults = await searchChats(userId, query, 5);
    console.log('\n📊 Raw Search Results:');
    console.log('  - Total results:', searchResults.length);

    if (searchResults.length > 0) {
      console.log('\n✅ Found results! Details:');
      searchResults.forEach((result, index) => {
        console.log(`\n  Result ${index + 1}:`);
        console.log(`    - Chat ID: ${result.chat_id}`);
        console.log(`    - Role: ${result.role}`);
        console.log(`    - Content: "${result.content}"`);
        console.log(`    - Distance: ${result._distance?.toFixed(4) || 'N/A'}`);
        console.log(`    - Chat Title: ${result.chat_title}`);
      });
    } else {
      console.log('\n❌ No results found!');
      console.log('\n🔍 Debugging: Let\'s check if ANY messages exist for this user');
      const allMessages = await searchChats(userId, 'dog labrador favorite', 10);
      console.log('  - Total messages with broader search:', allMessages.length);
      if (allMessages.length > 0) {
        console.log('  - Sample message:', allMessages[0].content);
      }
    }

    // Step 5: Test searchChatHistory function (the one used by WebSocket)
    console.log('\n═'.repeat(60));
    console.log('📊 Step 5: Test searchChatHistory Function');
    console.log('═'.repeat(60));

    const chatHistoryResult = await searchChatHistory(userId, query);
    console.log('\n📊 Search Chat History Result:');
    console.log('  - Result type:', typeof chatHistoryResult);
    console.log('  - Result length:', chatHistoryResult.length);
    console.log('  - Contains "couldn\'t find":', chatHistoryResult.includes("couldn't find"));
    console.log('  - Contains "I couldn\'t find":', chatHistoryResult.includes("I couldn't find"));

    console.log('\n📝 Full Result:');
    console.log('─'.repeat(60));
    console.log(chatHistoryResult);
    console.log('─'.repeat(60));

    // Step 6: Test the check logic from websocket-server.js
    console.log('\n═'.repeat(60));
    console.log('📊 Step 6: Test Result Detection Logic');
    console.log('═'.repeat(60));

    const foundResults = chatHistoryResult &&
                        !chatHistoryResult.includes("couldn't find") &&
                        !chatHistoryResult.includes("I couldn't find");

    console.log('\n🔍 Result Detection:');
    console.log(`  - chatHistoryResult exists: ${!!chatHistoryResult}`);
    console.log(`  - Does NOT contain "couldn't find": ${!chatHistoryResult.includes("couldn't find")}`);
    console.log(`  - Does NOT contain "I couldn't find": ${!chatHistoryResult.includes("I couldn't find")}`);
    console.log(`  - FINAL: ${foundResults ? '✅ Results FOUND' : '❌ Results NOT FOUND'}`);

    // Step 7: Summary
    console.log('\n═'.repeat(60));
    console.log('📊 Test Summary');
    console.log('═'.repeat(60));

    const success = searchResults.length > 0 && foundResults;

    console.log('\n' + (success ? '✅ SUCCESS' : '❌ FAILURE'));
    console.log(`\n  - Messages indexed: ✅`);
    console.log(`  - Vector search finds results: ${searchResults.length > 0 ? '✅' : '❌'}`);
    console.log(`  - searchChatHistory returns results: ${foundResults ? '✅' : '❌'}`);

    if (!success) {
      console.log('\n🔍 Troubleshooting:');
      if (searchResults.length === 0) {
        console.log('  ⚠️  Vector search returned no results');
        console.log('  ➜  Check if embeddings were generated correctly');
        console.log('  ➜  Check if the query embedding is similar to indexed content');
      }
      if (!foundResults) {
        console.log('  ⚠️  Result detection logic marked as "not found"');
        console.log('  ➜  Check if the response contains error messages');
      }
    }

    console.log('\n═'.repeat(60));
    console.log('🏁 Test Complete');
    console.log('═'.repeat(60));

    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCrossChatSearch().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
