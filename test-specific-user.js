/**
 * Test search for a specific user ID
 */

const { searchChats } = require('./vectorDB');
const { searchChatHistory } = require('./searchService');

async function testSpecificUser() {
  console.log('🔍 Testing Search for Specific User\n');
  console.log('═'.repeat(60));

  // The user IDs from the database scan
  const userIds = [
    'USER-0Z57WR-7511',  // Has "i love dogs their my favorite aniaml"
    'USER-UQMUOT-6861',  // Has "dogs are my favorite animla"
    'USER-YFI4RZ-8385'   // Has "dogs"
  ];

  const query = 'what is my favorite type of animal';

  for (const userId of userIds) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`🔍 Query: "${query}"`);
    console.log('─'.repeat(60));

    try {
      // Test direct vector search
      const vectorResults = await searchChats(userId, query, 5);
      console.log(`\n📊 Vector Search Results: ${vectorResults.length} found`);

      if (vectorResults.length > 0) {
        vectorResults.forEach((result, idx) => {
          console.log(`\n  ${idx + 1}. Content: "${result.content}"`);
          console.log(`     Distance: ${result._distance?.toFixed(4)}`);
          console.log(`     Role: ${result.role}`);
        });
      } else {
        console.log('  ❌ No results from vector search');
      }

      // Test searchChatHistory function
      console.log(`\n🔎 searchChatHistory Result:`);
      const historyResult = await searchChatHistory(userId, query);

      const foundResults = historyResult &&
                          !historyResult.includes("couldn't find") &&
                          !historyResult.includes("I couldn't find");

      console.log(`  - Found results: ${foundResults ? '✅ YES' : '❌ NO'}`);
      console.log(`  - Result length: ${historyResult.length} chars`);

      if (foundResults) {
        console.log(`\n  📝 Result preview:`);
        console.log('  ' + historyResult.substring(0, 200) + '...');
      } else {
        console.log(`\n  ❌ No results message:`);
        console.log('  ' + historyResult.substring(0, 200));
      }

    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🏁 Test Complete');
  console.log('═'.repeat(60));
}

testSpecificUser().catch(console.error);
