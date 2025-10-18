const lancedb = require('@lancedb/lancedb');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/lancedb');

/**
 * Test script to examine the actual contents of the vector database
 * This helps us understand what data is stored and with what user IDs
 */

async function examineDatabase() {
  console.log('='.repeat(70));
  console.log('VECTOR DATABASE CONTENTS EXAMINATION');
  console.log('='.repeat(70));

  try {
    // Connect to the database
    console.log('\n1. Connecting to LanceDB...');
    const db = await lancedb.connect(DB_PATH);
    console.log('✓ Connected');

    // Get table names
    console.log('\n2. Getting table names...');
    const tableNames = await db.tableNames();
    console.log('✓ Tables:', tableNames);

    // Open the chat_embeddings table
    console.log('\n3. Opening chat_embeddings table...');
    const table = await db.openTable('chat_embeddings');
    console.log('✓ Table opened');

    // Get total row count
    const count = await table.countRows();
    console.log(`✓ Total messages in database: ${count}`);

    // Get all records (without the vector field to keep output manageable)
    console.log('\n4. Fetching all records...');
    const allRecords = await table
      .query()
      .limit(50)
      .toArray();

    console.log(`✓ Retrieved ${allRecords.length} records\n`);

    // Analyze the records
    const userIds = new Set();
    const chatIds = new Set();
    const chatTitles = new Set();

    console.log('='.repeat(70));
    console.log('ALL MESSAGES IN DATABASE');
    console.log('='.repeat(70));

    allRecords.forEach((record, index) => {
      userIds.add(record.user_id);
      chatIds.add(record.chat_id);
      if (record.chat_title) chatTitles.add(record.chat_title);

      console.log(`\nMessage ${index + 1}:`);
      console.log(`  User ID: ${record.user_id}`);
      console.log(`  Chat ID: ${record.chat_id}`);
      console.log(`  Message ID: ${record.message_id}`);
      console.log(`  Role: ${record.role}`);
      console.log(`  Chat Title: ${record.chat_title}`);
      console.log(`  Timestamp: ${new Date(record.timestamp).toLocaleString()}`);
      console.log(`  Content (first 200 chars): ${record.content.substring(0, 200)}...`);

      // Check if this message mentions Nathan Watkins
      if (record.content.toLowerCase().includes('nathan') ||
          record.content.toLowerCase().includes('watkins')) {
        console.log(`  ⭐ CONTAINS "Nathan" or "Watkins"!`);
      }
      if (record.content.toLowerCase().includes('resume')) {
        console.log(`  ⭐ CONTAINS "resume"!`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`\nTotal messages: ${count}`);
    console.log(`Unique user IDs: ${userIds.size}`);
    console.log(`User IDs found: ${Array.from(userIds).join(', ')}`);
    console.log(`\nUnique chat IDs: ${chatIds.size}`);
    console.log(`Chat IDs: ${Array.from(chatIds).slice(0, 5).join(', ')}${chatIds.size > 5 ? '...' : ''}`);
    console.log(`\nUnique chat titles: ${chatTitles.size}`);
    console.log(`Chat titles: ${Array.from(chatTitles).join(', ')}`);

    console.log('\n' + '='.repeat(70));
    console.log('FINDINGS');
    console.log('='.repeat(70));

    if (userIds.size === 1) {
      console.log(`\n✓ All messages belong to a single user: ${Array.from(userIds)[0]}`);
      console.log('  This is expected behavior.');
      console.log('  For cross-chat awareness to work, you must use the SAME user ID');
      console.log('  when testing in different chat sessions.');
    } else {
      console.log(`\n⚠ Messages belong to ${userIds.size} different users!`);
      console.log('  This might indicate:');
      console.log('    - User ID is changing between sessions');
      console.log('    - localStorage is being cleared');
      console.log('    - Different browser profiles/tabs');
    }

    await db.close();
    console.log('\n✓ Database connection closed');

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the examination
examineDatabase();
