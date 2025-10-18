/**
 * Count how many records are in the vector database
 */

const lancedb = require('@lancedb/lancedb');
const path = require('path');

async function countRecords() {
  try {
    const DB_PATH = path.join(__dirname, 'data/lancedb');
    const db = await lancedb.connect(DB_PATH);
    const table = await db.openTable('chat_embeddings');

    // Get all records
    const allRecords = await table.query().limit(1000).toArray();

    console.log(`\n📊 Vector Database Statistics:`);
    console.log(`   Total records: ${allRecords.length}`);

    if (allRecords.length > 0) {
      // Count by user
      const userCounts = {};
      allRecords.forEach(record => {
        const userId = record.user_id;
        userCounts[userId] = (userCounts[userId] || 0) + 1;
      });

      console.log(`\n👥 Records by User:`);
      Object.entries(userCounts).forEach(([userId, count]) => {
        console.log(`   ${userId}: ${count} messages`);
      });

      console.log(`\n📝 Sample records:`);
      allRecords.slice(0, 5).forEach((record, idx) => {
        console.log(`\n   ${idx + 1}. User: ${record.user_id}`);
        console.log(`      Content: "${record.content.substring(0, 60)}..."`);
        console.log(`      Chat: ${record.chat_id.substring(0, 30)}...`);
      });
    } else {
      console.log(`\n✅ Database is empty (reset worked!)`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

countRecords();
