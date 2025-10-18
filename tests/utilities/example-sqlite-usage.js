#!/usr/bin/env node

/**
 * Example usage of the new SQLite database system
 * This demonstrates how to integrate SQLite storage into your application
 */

const { sqliteStorage } = require('./src/lib/sqliteStorage');
const { userOps, chatOps, messageOps, stats } = require('./src/lib/database');

async function demonstrateSQLiteUsage() {
  console.log('🚀 SQLite Database Usage Examples\n');

  try {
    // Initialize the storage service (includes automatic migration)
    console.log('1. Initializing SQLite storage...');
    await sqliteStorage.initialize();
    console.log('✅ Storage initialized\n');

    // Get current user info
    const userId = sqliteStorage.getCurrentUserId();
    console.log('2. Current user:', userId);

    // Create a new chat
    console.log('\n3. Creating a new chat...');
    const chat = await sqliteStorage.createChat('Example Chat');
    console.log('✅ Chat created:', chat.title, '(ID:', chat.id + ')');

    // Add some messages
    console.log('\n4. Adding messages...');
    const messages = [
      {
        id: 'msg-1',
        content: 'Hello! This is my first message in the new SQLite database.',
        role: 'user',
        timestamp: new Date()
      },
      {
        id: 'msg-2',
        content: 'Great! The SQLite database is working perfectly. It provides much better performance and reliability than localStorage.',
        role: 'assistant',
        timestamp: new Date()
      },
      {
        id: 'msg-3',
        content: 'Can you search through my previous messages?',
        role: 'user',
        timestamp: new Date()
      }
    ];

    for (const message of messages) {
      await sqliteStorage.addMessage(chat.id, message);
      console.log(`✅ Added ${message.role} message: "${message.content.substring(0, 50)}..."`);
    }

    // Search messages
    console.log('\n5. Searching messages...');
    const searchResults = await sqliteStorage.searchMessages('SQLite', 5);
    console.log(`✅ Found ${searchResults.length} messages containing "SQLite"`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. [${result.role}] ${result.content.substring(0, 60)}...`);
    });

    // Get user statistics
    console.log('\n6. User statistics...');
    const userStats = await sqliteStorage.getUserStats();
    console.log('✅ User stats:', userStats);

    // Demonstrate direct database operations
    console.log('\n7. Direct database operations...');
    const allChats = chatOps.getByUser(userId);
    console.log(`✅ User has ${allChats.length} chats`);

    const allMessages = messageOps.getByUser(userId);
    console.log(`✅ User has ${allMessages.length} total messages`);

    const dbSize = stats.getDatabaseSize();
    console.log(`✅ Database size: ${Math.round(dbSize / 1024)} KB`);

    // Load chat state (like the old localStorage function)
    console.log('\n8. Loading chat state...');
    const chatState = await sqliteStorage.loadChatState();
    console.log(`✅ Loaded ${chatState.chats.length} chats from database`);
    console.log(`✅ Active chat: ${chatState.activeChatId ? 'Yes' : 'None'}`);

    // Save chat state (like the old localStorage function)
    console.log('\n9. Saving chat state...');
    await sqliteStorage.saveChatState(chatState);
    console.log('✅ Chat state saved to database');

    console.log('\n🎉 All SQLite operations completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Automatic migration from localStorage');
    console.log('  ✅ User management and session persistence');
    console.log('  ✅ Chat creation and management');
    console.log('  ✅ Message storage and retrieval');
    console.log('  ✅ Full-text search capabilities');
    console.log('  ✅ Statistics and monitoring');
    console.log('  ✅ Drop-in replacement for localStorage');

    console.log('\n🔄 Integration Steps:');
    console.log('  1. Replace localStorage calls with sqliteStorage methods');
    console.log('  2. Update ChatContext to use async/await');
    console.log('  3. Update WebSocket server to use SQLite');
    console.log('  4. Test with existing data migration');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateSQLiteUsage().catch(console.error);
}

module.exports = { demonstrateSQLiteUsage };
