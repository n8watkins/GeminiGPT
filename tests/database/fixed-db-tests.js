#!/usr/bin/env node

/**
 * Fixed SQLite Database Tests
 * Addresses issues found in comprehensive tests
 */

const { initializeDatabase, userOps, chatOps, messageOps, stats } = require('../../src/lib/database');
const { sqliteStorage } = require('../../src/lib/sqliteStorage');

async function runFixedTests() {
  console.log('🧪 FIXED SQLITE DATABASE TESTS\n');
  console.log('='.repeat(50));

  const testResults = [];
  const testUserId = 'FIXED-TEST-USER-' + Date.now();
  const testChatId = 'FIXED-TEST-CHAT-' + Date.now();

  function logTest(testName, success, details = '') {
    testResults.push({ testName, success, details });
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
  }

  try {
    // Initialize database
    console.log('\n📋 Test 1: Database Initialization');
    initializeDatabase();
    logTest('Database Initialization', true, 'Database initialized successfully');

    // Test user operations
    console.log('\n👤 Test 2: User Operations');
    userOps.create(testUserId);
    logTest('User Creation', true, 'User created');
    
    const user = userOps.get(testUserId);
    logTest('User Retrieval', !!user, `User ID: ${user?.id}`);
    
    userOps.updateLastActive(testUserId);
    logTest('Update Last Active', true, 'Last active updated');

    // Test chat operations
    console.log('\n💬 Test 3: Chat Operations');
    chatOps.create(testChatId, testUserId, 'Fixed Test Chat');
    logTest('Chat Creation', true, 'Chat created');
    
    const chat = chatOps.getById(testChatId);
    logTest('Chat Retrieval', !!chat, `Title: ${chat?.title}`);
    
    const userChats = chatOps.getByUser(testUserId);
    logTest('Get User Chats', userChats.length > 0, `${userChats.length} chats found`);
    
    chatOps.setActive(testChatId, testUserId);
    logTest('Set Active Chat', true, 'Chat set as active');
    
    const activeChat = chatOps.getActive(testUserId);
    logTest('Get Active Chat', !!activeChat, `Active: ${activeChat?.title}`);

    // Test message operations with unique IDs
    console.log('\n📝 Test 4: Message Operations');
    const uniqueMessageId1 = 'fixed-msg-1-' + Date.now();
    const uniqueMessageId2 = 'fixed-msg-2-' + Date.now();
    const uniqueMessageId3 = 'fixed-msg-3-' + Date.now();

    messageOps.create(uniqueMessageId1, testChatId, testUserId, 'First test message', 'user');
    logTest('Message Creation 1', true, 'User message created');
    
    messageOps.create(uniqueMessageId2, testChatId, testUserId, 'Second test message from assistant', 'assistant');
    logTest('Message Creation 2', true, 'Assistant message created');
    
    messageOps.create(uniqueMessageId3, testChatId, testUserId, 'Third message with search keywords', 'user');
    logTest('Message Creation 3', true, 'Message with keywords created');

    // Test message retrieval
    const chatMessages = messageOps.getByChat(testChatId);
    logTest('Get Messages by Chat', chatMessages.length >= 3, `${chatMessages.length} messages found`);
    
    const userMessages = messageOps.getByUser(testUserId);
    logTest('Get Messages by User', userMessages.length >= 3, `${userMessages.length} messages found`);

    // Test search functionality
    console.log('\n🔍 Test 5: Search Functionality');
    const searchResults1 = messageOps.search(testUserId, 'test', 10);
    logTest('Search for "test"', searchResults1.length > 0, `${searchResults1.length} results found`);
    
    const searchResults2 = messageOps.search(testUserId, 'keywords', 10);
    logTest('Search for "keywords"', searchResults2.length > 0, `${searchResults2.length} results found`);
    
    const searchResults3 = messageOps.search(testUserId, 'nonexistent', 10);
    logTest('Search for "nonexistent"', searchResults3.length === 0, `${searchResults3.length} results found (expected 0)`);

    // Test storage service
    console.log('\n🗄️ Test 6: Storage Service');
    await sqliteStorage.initialize();
    logTest('Storage Service Init', true, 'Service initialized');
    
    const userId = sqliteStorage.getCurrentUserId();
    logTest('Get User ID', !!userId, `User ID: ${userId}`);
    
    const newChat = await sqliteStorage.createChat('Storage Service Test');
    logTest('Storage Chat Creation', !!newChat, `Chat: ${newChat.title}`);
    
    const uniqueStorageMsgId = 'storage-msg-' + Date.now();
    await sqliteStorage.addMessage(newChat.id, {
      id: uniqueStorageMsgId,
      content: 'Test message via storage service',
      role: 'user',
      timestamp: new Date()
    });
    logTest('Storage Message Addition', true, 'Message added via storage service');
    
    const storageSearchResults = await sqliteStorage.searchMessages('storage', 5);
    logTest('Storage Search', storageSearchResults.length > 0, `${storageSearchResults.length} results found`);

    // Test performance with bulk operations
    console.log('\n⚡ Test 7: Performance Tests');
    const startTime = Date.now();
    
    // Create multiple chats
    for (let i = 0; i < 5; i++) {
      const bulkChatId = `bulk-chat-${i}-${Date.now()}`;
      chatOps.create(bulkChatId, testUserId, `Bulk Chat ${i}`);
    }
    
    const chatTime = Date.now() - startTime;
    logTest('Bulk Chat Creation', true, `5 chats in ${chatTime}ms`);
    
    // Create multiple messages
    const messageStartTime = Date.now();
    for (let i = 0; i < 20; i++) {
      const messageId = `bulk-msg-${i}-${Date.now()}`;
      const chatId = testChatId; // Use existing chat
      messageOps.create(messageId, chatId, testUserId, `Bulk message ${i}`, 'user');
    }
    
    const messageTime = Date.now() - messageStartTime;
    logTest('Bulk Message Creation', true, `20 messages in ${messageTime}ms`);
    
    // Test search performance
    const searchStartTime = Date.now();
    const bulkSearchResults = messageOps.search(testUserId, 'bulk', 100);
    const searchTime = Date.now() - searchStartTime;
    logTest('Search Performance', bulkSearchResults.length > 0, `${bulkSearchResults.length} results in ${searchTime}ms`);

    // Test statistics
    console.log('\n📊 Test 8: Statistics');
    const userStats = stats.getUserStats(testUserId);
    logTest('User Statistics', !!userStats, `Chats: ${userStats.chats}, Messages: ${userStats.messages}`);
    
    const dbSize = stats.getDatabaseSize();
    logTest('Database Size', dbSize > 0, `${Math.round(dbSize / 1024)} KB`);
    
    // Test data integrity
    console.log('\n🔒 Test 9: Data Integrity');
    const allChats = chatOps.getByUser(testUserId);
    const allMessages = messageOps.getByUser(testUserId);
    
    let dataConsistent = true;
    for (const message of allMessages) {
      if (message.user_id !== testUserId) {
        dataConsistent = false;
        break;
      }
    }
    logTest('Data Consistency', dataConsistent, 'All messages belong to correct user');
    
    // Test edge cases
    console.log('\n🔬 Test 10: Edge Cases');
    const invalidUser = userOps.get('INVALID-USER-ID');
    logTest('Invalid User ID', invalidUser === undefined, 'Correctly returned undefined');
    
    const invalidChat = chatOps.getById('INVALID-CHAT-ID');
    logTest('Invalid Chat ID', invalidChat === undefined, 'Correctly returned undefined');
    
    const emptySearch = messageOps.search(testUserId, '', 10);
    logTest('Empty Search', Array.isArray(emptySearch), 'Returned array for empty search');

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.testName}: ${r.details}`));
    }
    
    console.log(`\n🎉 Database Testing Complete!`);
    
    if (failedTests === 0) {
      console.log(`✅ All tests passed! Your SQLite database is working perfectly.`);
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed. Please review the issues above.`);
    }

    // Show final database state
    console.log('\n📊 Final Database State:');
    const finalStats = stats.getUserStats(testUserId);
    console.log(`   User: ${testUserId}`);
    console.log(`   Chats: ${finalStats.chats}`);
    console.log(`   Messages: ${finalStats.messages}`);
    console.log(`   Attachments: ${finalStats.attachments}`);
    console.log(`   Database Size: ${Math.round(stats.getDatabaseSize() / 1024)} KB`);

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    logTest('Test Suite', false, error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runFixedTests().catch(console.error);
}

module.exports = { runFixedTests };
