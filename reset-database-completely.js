/**
 * Completely reset the vector database - DELETE EVERYTHING
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/lancedb');

console.log('⚠️  WARNING: This will DELETE the entire vector database!');
console.log(`📁 Database path: ${DB_PATH}`);

try {
  if (fs.existsSync(DB_PATH)) {
    console.log('\n🗑️  Deleting database directory...');
    fs.rmSync(DB_PATH, { recursive: true, force: true });
    console.log('✅ Database completely deleted!');
    console.log('\n📊 The database will be recreated automatically when you send your first message.');
  } else {
    console.log('\n✅ Database does not exist - nothing to delete');
  }
} catch (error) {
  console.error('\n❌ Error deleting database:', error.message);
  process.exit(1);
}
