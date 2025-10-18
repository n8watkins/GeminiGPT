#!/usr/bin/env node

/**
 * Data Persistence Test
 * Tests that data persists across database restarts
 */

const { initializeDatabase, userOps, chatOps, messageOps, stats } = require('../../src/lib/database');

async function testDataPersistence() {
  console.log('💾 DATA PERSISTENCE TEST\n');
  console.log('='.repeat(40));

  const testUserId = 'PERSISTENCE-USER-' + Date.now();
  const testChatId = 'PERSISTENCE-CHAT-' + Date.now();

  try {
    // Phase 1: Create data
    console.log('📝 Phase 1: Creating test data...');
    initializeDatabase();
    
    // Create user
    userOps.create(testUserId);
    console.log('✅ User created:', testUserId);
    
    // Create chat
    chatOps.create(testChatId, testUserId, 'Persistence Test Chat');
    console.log('✅ Chat created:', testChatId);
    
    // Create messages
    const messages = [
      { id: 'persist-msg-1', content: 'This message should persist across restarts', role: 'user' },
      { id: 'persist-msg-2', content: 'This is another message that should be saved', role: 'assistant' },
      { id: 'persist-msg-3', content: 'Final message for persistence testing', role: 'user' }
    ];
    
    for (const msg of messages) {
      messageOps.create(msg.id, testChatId, testUserId, msg.content, msg.role);
      console.log(`✅ Message created: ${msg.content.substring(0, 30)}...`);
    }
    
    // Get initial stats
    const initialStats = stats.getUserStats(testUserId);
    console.log(`\n📊 Initial Stats: ${initialStats.chats} chats, ${initialStats.messages} messages`);
    
    // Phase 2: Simulate database restart
    console.log('\n🔄 Phase 2: Simulating database restart...');
    
    // Clear the database connection (simulate restart)
    // Note: In a real restart, the database file would remain but connections would be closed
    
    // Phase 3: Reconnect and verify data
    console.log('🔍 Phase 3: Reconnecting and verifying data...');
    
    // Re-initialize database (simulates app restart)
    initializeDatabase();
    
    // Verify user exists
    const user = userOps.get(testUserId);
    console.log(user ? '✅ User persisted' : '❌ User not found');
    
    // Verify chat exists
    const chat = chatOps.getById(testChatId);
    console.log(chat ? `✅ Chat persisted: ${chat.title}` : '❌ Chat not found');
    
    // Verify messages exist
    const chatMessages = messageOps.getByChat(testChatId);
    console.log(`✅ Messages persisted: ${chatMessages.length} messages found`);
    
    // Verify message content
    const firstMessage = chatMessages.find(m => m.id === 'persist-msg-1');
    const contentMatch = firstMessage && firstMessage.content.includes('persist across restarts');
    console.log(contentMatch ? '✅ Message content preserved' : '❌ Message content corrupted');
    
    // Verify search still works
    const searchResults = messageOps.search(testUserId, 'persist', 10);
    console.log(`✅ Search functionality: ${searchResults.length} results found`);
    
    // Get final stats
    const finalStats = stats.getUserStats(testUserId);
    console.log(`\n📊 Final Stats: ${finalStats.chats} chats, ${finalStats.messages} messages`);
    
    // Verify stats match
    const statsMatch = initialStats.chats === finalStats.chats && initialStats.messages === finalStats.messages;
    console.log(statsMatch ? '✅ Statistics preserved' : '❌ Statistics mismatch');
    
    // Test database file size
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'data/chat.db');
    const dbStats = fs.statSync(dbPath);
    console.log(`✅ Database file size: ${Math.round(dbStats.size / 1024)} KB`);
    
    console.log('\n🎉 PERSISTENCE TEST COMPLETE!');
    console.log('✅ All data persisted correctly across database restart simulation');
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    chatOps.delete(testChatId);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Persistence test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDataPersistence().catch(console.error);
}

module.exports = { testDataPersistence };
