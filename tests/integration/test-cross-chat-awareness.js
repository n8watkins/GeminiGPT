const { initializeDB, searchChats, getDBStats, addMessage } = require('../../src/lib/vectordb');

/**
 * Test script to verify cross-chat awareness functionality
 * This script checks if the vector database properly stores and searches
 * messages across different chat sessions
 */

async function testCrossChatAwareness() {
  console.log('='.repeat(70));
  console.log('CROSS-CHAT AWARENESS TEST');
  console.log('='.repeat(70));

  try {
    // Initialize the database
    console.log('\n1. Initializing vector database...');
    await initializeDB();
    console.log('✓ Database initialized');

    // Get database stats
    console.log('\n2. Checking database stats...');
    const stats = await getDBStats();
    console.log('✓ Database stats:', JSON.stringify(stats, null, 2));

    // Use the ACTUAL user ID from the database
    const userId = 'USER-UQMUOT-6861';
    console.log(`\n3. Using ACTUAL user ID from database: ${userId}`);

    // Test search for "Nathan Watkins"
    console.log('\n4. Searching for "Nathan Watkins"...');
    const nathanResults = await searchChats(userId, 'Nathan Watkins', 5);
    console.log(`✓ Found ${nathanResults.length} results for "Nathan Watkins"`);

    if (nathanResults.length > 0) {
      console.log('\nTop results:');
      nathanResults.forEach((result, index) => {
        console.log(`\n  Result ${index + 1}:`);
        console.log(`    Chat ID: ${result.chat_id}`);
        console.log(`    User ID: ${result.user_id}`);
        console.log(`    Role: ${result.role}`);
        console.log(`    Content: ${result.content.substring(0, 100)}...`);
        console.log(`    Chat Title: ${result.chat_title}`);
        console.log(`    Timestamp: ${new Date(result.timestamp).toLocaleString()}`);
      });
    } else {
      console.log('  ⚠ No results found for "Nathan Watkins"');
      console.log('  This means either:');
      console.log('    - The PDF content was not properly indexed');
      console.log('    - The user ID does not match');
      console.log('    - The messages were not embedded');
    }

    // Test search for resume-related content
    console.log('\n5. Searching for "resume"...');
    const resumeResults = await searchChats(userId, 'resume', 5);
    console.log(`✓ Found ${resumeResults.length} results for "resume"`);

    if (resumeResults.length > 0) {
      console.log('\nTop results:');
      resumeResults.forEach((result, index) => {
        console.log(`\n  Result ${index + 1}:`);
        console.log(`    Chat ID: ${result.chat_id}`);
        console.log(`    Content: ${result.content.substring(0, 100)}...`);
      });
    }

    // Test search for "developer"
    console.log('\n6. Searching for "developer"...');
    const devResults = await searchChats(userId, 'developer', 5);
    console.log(`✓ Found ${devResults.length} results for "developer"`);

    // Test search for any content in the database
    console.log('\n7. Searching for generic content...');
    const genericResults = await searchChats(userId, 'what', 10);
    console.log(`✓ Found ${genericResults.length} results for generic search`);

    if (genericResults.length > 0) {
      console.log('\nAll messages in database for this user:');
      genericResults.forEach((result, index) => {
        console.log(`\n  Message ${index + 1}:`);
        console.log(`    Chat ID: ${result.chat_id}`);
        console.log(`    User ID: ${result.user_id}`);
        console.log(`    Role: ${result.role}`);
        console.log(`    Content preview: ${result.content.substring(0, 150)}...`);
        console.log(`    Chat Title: ${result.chat_title}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSIS');
    console.log('='.repeat(70));

    if (stats.totalMessages === 0) {
      console.log('\n⚠ ISSUE FOUND: Vector database is empty!');
      console.log('  This means messages are not being indexed at all.');
      console.log('  Check:');
      console.log('    - Is indexMessages being called after each message?');
      console.log('    - Are there any errors during embedding generation?');
      console.log('    - Is the addMessage function working correctly?');
    } else if (nathanResults.length === 0 && resumeResults.length === 0) {
      console.log('\n⚠ ISSUE FOUND: User ID mismatch!');
      console.log(`  Database has ${stats.totalMessages} messages but none for user ${userId}`);
      console.log('  Check:');
      console.log('    - What user ID is being used in the frontend?');
      console.log('    - Is localStorage persisting the user ID correctly?');
      console.log('    - Are messages being indexed with the correct user ID?');
    } else if (nathanResults.length === 0) {
      console.log('\n⚠ ISSUE FOUND: PDF content not indexed!');
      console.log('  Messages exist but Nathan Watkins not found.');
      console.log('  Check:');
      console.log('    - Was the PDF text properly extracted?');
      console.log('    - Were both user and assistant messages indexed?');
      console.log('    - Is the search query matching the content?');
    } else {
      console.log('\n✓ System appears to be working correctly!');
      console.log(`  Found ${nathanResults.length} results for "Nathan Watkins"`);
      console.log('  The issue might be:');
      console.log('    - Different user IDs between chat sessions');
      console.log('    - Search not being triggered properly');
      console.log('    - System prompt not using search_chat_history function');
    }

    console.log('\n' + '='.repeat(70));
    console.log('Test complete!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Error during test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCrossChatAwareness();
