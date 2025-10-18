/**
 * Check what's actually in the vector database
 */

const { searchChats } = require('./vectorDB');

async function checkVectorDB() {
  console.log('🔍 Checking Vector Database Contents\n');
  console.log('═'.repeat(60));

  // Get the user ID from your session (check localStorage or sidebar)
  console.log('\n📝 Please check your browser console or sidebar for your User ID');
  console.log('   It should look like: user-[timestamp]');
  console.log('\nFor now, searching with a test query across all potential matches...\n');

  try {
    // Try to search with a very broad query
    const queries = [
      'dog',
      'animal',
      'favorite',
      'love dogs',
      'favorite type of animal'
    ];

    for (const query of queries) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🔍 Searching for: "${query}"`);
      console.log('─'.repeat(60));

      // We don't know the exact user ID, so this will show if there are ANY results
      // In a real scenario, you'd pass the actual user ID
      const testUserId = 'test-search';

      try {
        // This is a hack - we're searching without user filter to see ALL messages
        const { generateEmbedding } = require('./vectorDB');
        const lancedb = require('@lancedb/lancedb');
        const path = require('path');

        const DB_PATH = path.join(__dirname, 'data/lancedb');
        const db = await lancedb.connect(DB_PATH);
        const table = await db.openTable('chat_embeddings');

        const queryEmbedding = await generateEmbedding(query);
        const allResults = await table
          .search(queryEmbedding)
          .limit(10)
          .toArray();

        console.log(`\n📊 Found ${allResults.length} total results (across ALL users):`);

        if (allResults.length > 0) {
          allResults.forEach((result, index) => {
            console.log(`\n  ${index + 1}. User: ${result.user_id.substring(0, 20)}...`);
            console.log(`     Chat: ${result.chat_id.substring(0, 20)}...`);
            console.log(`     Role: ${result.role}`);
            console.log(`     Content: "${result.content.substring(0, 80)}..."`);
            console.log(`     Distance: ${result._distance?.toFixed(4)}`);
            console.log(`     Chat Title: ${result.chat_title}`);
          });
        } else {
          console.log('  ❌ No results found');
        }
      } catch (error) {
        console.error('  ❌ Error searching:', error.message);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 Database Check Complete');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
  }
}

checkVectorDB().catch(console.error);
