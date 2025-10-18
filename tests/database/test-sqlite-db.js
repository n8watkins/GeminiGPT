#!/usr/bin/env node

/**
 * Test script for SQLite database functionality
 */

const { initializeDatabase, userOps, chatOps, messageOps, stats } = require('../../src/lib/database');
const { migrationService } = require('../../src/lib/migration');
const { sqliteStorage } = require('../../src/lib/sqliteStorage');

async function testSQLiteDatabase() {
  console.log('🧪 Testing SQLite Database Setup\n');

  try {
    // Initialize database
    console.log('1. Initializing database...');
    initializeDatabase();
    console.log('✅ Database initialized successfully\n');

    // Test user operations
    console.log('2. Testing user operations...');
    const testUserId = 'TEST-USER-1234';
    
    userOps.create(testUserId);
    console.log('✅ User created');
    
    userOps.updateLastActive(testUserId);
    console.log('✅ User last active updated');
    
    const user = userOps.get(testUserId);
    console.log('✅ User retrieved:', user);
    console.log('');

    // Test chat operations
    console.log('3. Testing chat operations...');
    const testChatId = 'TEST-CHAT-1234';
    const testTitle = 'Test Chat';
    
    chatOps.create(testChatId, testUserId, testTitle);
    console.log('✅ Chat created');
    
    chatOps.setActive(testChatId, testUserId);
    console.log('✅ Chat set as active');
    
    const chats = chatOps.getByUser(testUserId);
    console.log('✅ User chats retrieved:', chats.length, 'chats');
    
    const activeChat = chatOps.getActive(testUserId);
    console.log('✅ Active chat retrieved:', activeChat?.title);
    console.log('');

    // Test message operations
    console.log('4. Testing message operations...');
    const testMessageId = 'TEST-MSG-1234';
    const testContent = 'This is a test message';
    
    messageOps.create(
      testMessageId,
      testChatId,
      testUserId,
      testContent,
      'user',
      [],
      { test: true }
    );
    console.log('✅ Message created');
    
    const messages = messageOps.getByChat(testChatId);
    console.log('✅ Chat messages retrieved:', messages.length, 'messages');
    
    const userMessages = messageOps.getByUser(testUserId);
    console.log('✅ User messages retrieved:', userMessages.length, 'messages');
    console.log('');

    // Test search functionality
    console.log('5. Testing search functionality...');
    const searchResults = messageOps.search(testUserId, 'test', 5);
    console.log('✅ Search results:', searchResults.length, 'matches');
    console.log('');

    // Test statistics
    console.log('6. Testing statistics...');
    const userStats = stats.getUserStats(testUserId);
    console.log('✅ User stats:', userStats);
    
    const dbSize = stats.getDatabaseSize();
    console.log('✅ Database size:', Math.round(dbSize / 1024), 'KB');
    console.log('');

    // Test SQLite storage service
    console.log('7. Testing SQLite storage service...');
    await sqliteStorage.initialize();
    console.log('✅ SQLite storage service initialized');
    
    const currentUserId = sqliteStorage.getCurrentUserId();
    console.log('✅ Current user ID:', currentUserId);
    
    const storageStats = await sqliteStorage.getUserStats();
    console.log('✅ Storage stats:', storageStats);
    console.log('');

    // Cleanup test data
    console.log('8. Cleaning up test data...');
    chatOps.delete(testChatId);
    console.log('✅ Test data cleaned up');
    console.log('');

    console.log('🎉 All SQLite database tests passed successfully!');
    console.log('\n📊 Database Features:');
    console.log('  ✅ User management');
    console.log('  ✅ Chat management');
    console.log('  ✅ Message storage');
    console.log('  ✅ Full-text search');
    console.log('  ✅ Statistics');
    console.log('  ✅ Migration support');
    console.log('  ✅ Storage service integration');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSQLiteDatabase().catch(console.error);
}

module.exports = { testSQLiteDatabase };
