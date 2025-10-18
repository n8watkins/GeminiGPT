#!/usr/bin/env node

/**
 * Comprehensive SQLite Database Tests
 * Tests all aspects of the database functionality
 */

const { initializeDatabase, userOps, chatOps, messageOps, stats } = require('../../src/lib/database');
const { migrationService } = require('../../src/lib/migration');
const { sqliteStorage } = require('../../src/lib/sqliteStorage');
const fs = require('fs');
const path = require('path');

class DatabaseTester {
  constructor() {
    this.testResults = [];
    this.testUserId = 'TEST-USER-' + Date.now();
    this.testChatId = 'TEST-CHAT-' + Date.now();
  }

  logTest(testName, success, details = '') {
    const result = { testName, success, details, timestamp: new Date() };
    this.testResults.push(result);
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
  }

  async runAllTests() {
    console.log('🧪 COMPREHENSIVE SQLITE DATABASE TESTS\n');
    console.log('=' * 50);

    try {
      // Test 1: Basic Database Initialization
      await this.testDatabaseInitialization();
      
      // Test 2: User Operations
      await this.testUserOperations();
      
      // Test 3: Chat Operations
      await this.testChatOperations();
      
      // Test 4: Message Operations
      await this.testMessageOperations();
      
      // Test 5: Search Functionality
      await this.testSearchFunctionality();
      
      // Test 6: Data Persistence
      await this.testDataPersistence();
      
      // Test 7: Migration System
      await this.testMigrationSystem();
      
      // Test 8: Storage Service
      await this.testStorageService();
      
      // Test 9: Performance Tests
      await this.testPerformance();
      
      // Test 10: Edge Cases
      await this.testEdgeCases();
      
      // Test 11: Statistics and Monitoring
      await this.testStatistics();
      
      // Test 12: Database Integrity
      await this.testDatabaseIntegrity();

      // Print final results
      this.printTestResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.logTest('Test Suite', false, error.message);
    }
  }

  async testDatabaseInitialization() {
    console.log('\n📋 Test 1: Database Initialization');
    
    try {
      // Test database creation
      initializeDatabase();
      this.logTest('Database Initialization', true, 'Database created successfully');
      
      // Test database file exists
      const dbPath = path.join(__dirname, 'data/chat.db');
      const dbExists = fs.existsSync(dbPath);
      this.logTest('Database File Exists', dbExists, dbExists ? 'File found' : 'File not found');
      
      // Test database size
      if (dbExists) {
        const stats = fs.statSync(dbPath);
        this.logTest('Database Size', stats.size > 0, `${Math.round(stats.size / 1024)} KB`);
      }
      
    } catch (error) {
      this.logTest('Database Initialization', false, error.message);
    }
  }

  async testUserOperations() {
    console.log('\n👤 Test 2: User Operations');
    
    try {
      // Create user
      const createResult = userOps.create(this.testUserId);
      this.logTest('User Creation', createResult.changes > 0, 'User created');
      
      // Get user
      const user = userOps.get(this.testUserId);
      this.logTest('User Retrieval', !!user, user ? `User ID: ${user.id}` : 'User not found');
      
      // Update last active
      const updateResult = userOps.updateLastActive(this.testUserId);
      this.logTest('Update Last Active', updateResult.changes > 0, 'Last active updated');
      
      // Update preferences
      const preferences = { theme: 'dark', language: 'en' };
      const prefResult = userOps.updatePreferences(this.testUserId, preferences);
      this.logTest('Update Preferences', prefResult.changes > 0, 'Preferences updated');
      
    } catch (error) {
      this.logTest('User Operations', false, error.message);
    }
  }

  async testChatOperations() {
    console.log('\n💬 Test 3: Chat Operations');
    
    try {
      // Create chat
      const createResult = chatOps.create(this.testChatId, this.testUserId, 'Test Chat');
      this.logTest('Chat Creation', createResult.changes > 0, 'Chat created');
      
      // Get chat by ID
      const chat = chatOps.getById(this.testChatId);
      this.logTest('Chat Retrieval by ID', !!chat, chat ? `Title: ${chat.title}` : 'Chat not found');
      
      // Get chats by user
      const userChats = chatOps.getByUser(this.testUserId);
      this.logTest('Get User Chats', userChats.length > 0, `${userChats.length} chats found`);
      
      // Set active chat
      const activeResult = chatOps.setActive(this.testChatId, this.testUserId);
      this.logTest('Set Active Chat', activeResult.changes > 0, 'Chat set as active');
      
      // Get active chat
      const activeChat = chatOps.getActive(this.testUserId);
      this.logTest('Get Active Chat', !!activeChat, activeChat ? `Active: ${activeChat.title}` : 'No active chat');
      
      // Update chat
      const updateResult = chatOps.update(this.testChatId, { title: 'Updated Test Chat' });
      this.logTest('Update Chat', updateResult.changes > 0, 'Chat updated');
      
    } catch (error) {
      this.logTest('Chat Operations', false, error.message);
    }
  }

  async testMessageOperations() {
    console.log('\n📝 Test 4: Message Operations');
    
    try {
      const testMessages = [
        {
          id: 'msg-1',
          content: 'This is a test message from the user.',
          role: 'user'
        },
        {
          id: 'msg-2',
          content: 'This is a test response from the assistant.',
          role: 'assistant'
        },
        {
          id: 'msg-3',
          content: 'Another user message with some keywords for testing search functionality.',
          role: 'user'
        }
      ];

      // Create messages
      for (const message of testMessages) {
        const result = messageOps.create(
          message.id,
          this.testChatId,
          this.testUserId,
          message.content,
          message.role,
          [],
          { test: true }
        );
        this.logTest(`Message Creation (${message.role})`, true, `Message: ${message.content.substring(0, 30)}...`);
      }
      
      // Get messages by chat
      const chatMessages = messageOps.getByChat(this.testChatId);
      this.logTest('Get Messages by Chat', chatMessages.length === 3, `${chatMessages.length} messages found`);
      
      // Get messages by user
      const userMessages = messageOps.getByUser(this.testUserId);
      this.logTest('Get Messages by User', userMessages.length >= 3, `${userMessages.length} messages found`);
      
      // Test message content
      const firstMessage = chatMessages[0];
      this.logTest('Message Content Integrity', firstMessage.content.includes('test message'), 'Content preserved correctly');
      
    } catch (error) {
      this.logTest('Message Operations', false, error.message);
    }
  }

  async testSearchFunctionality() {
    console.log('\n🔍 Test 5: Search Functionality');
    
    try {
      // Search for specific terms
      const searchTerms = ['test', 'message', 'keywords', 'nonexistent'];
      
      for (const term of searchTerms) {
        const results = messageOps.search(this.testUserId, term, 10);
        const expectedResults = term === 'nonexistent' ? 0 : results.length > 0;
        this.logTest(`Search for "${term}"`, expectedResults, `${results.length} results found`);
      }
      
      // Test case-insensitive search
      const caseResults = messageOps.search(this.testUserId, 'TEST', 10);
      this.logTest('Case-Insensitive Search', caseResults.length > 0, `${caseResults.length} results found`);
      
    } catch (error) {
      this.logTest('Search Functionality', false, error.message);
    }
  }

  async testDataPersistence() {
    console.log('\n💾 Test 6: Data Persistence');
    
    try {
      // Get initial data
      const initialChats = chatOps.getByUser(this.testUserId);
      const initialMessages = messageOps.getByUser(this.testUserId);
      
      this.logTest('Data Persistence Check', true, `${initialChats.length} chats, ${initialMessages.length} messages`);
      
      // Verify data integrity
      const chat = chatOps.getById(this.testChatId);
      const messages = messageOps.getByChat(this.testChatId);
      
      this.logTest('Chat Persistence', !!chat, chat ? `Chat "${chat.title}" persisted` : 'Chat not found');
      this.logTest('Messages Persistence', messages.length > 0, `${messages.length} messages persisted`);
      
    } catch (error) {
      this.logTest('Data Persistence', false, error.message);
    }
  }

  async testMigrationSystem() {
    console.log('\n🔄 Test 7: Migration System');
    
    try {
      // Test migration status check
      const isCompleted = migrationService.isMigrationCompleted();
      this.logTest('Migration Status Check', typeof isCompleted === 'boolean', `Migration completed: ${isCompleted}`);
      
      // Test migration verification
      const verification = migrationService.verifyMigration();
      this.logTest('Migration Verification', typeof verification === 'object', 'Verification completed');
      
    } catch (error) {
      this.logTest('Migration System', false, error.message);
    }
  }

  async testStorageService() {
    console.log('\n🗄️ Test 8: Storage Service');
    
    try {
      // Initialize storage service
      await sqliteStorage.initialize();
      this.logTest('Storage Service Initialization', true, 'Service initialized');
      
      // Test user ID
      const userId = sqliteStorage.getCurrentUserId();
      this.logTest('User ID Retrieval', !!userId, `User ID: ${userId}`);
      
      // Test chat creation
      const newChat = await sqliteStorage.createChat('Storage Test Chat');
      this.logTest('Storage Chat Creation', !!newChat, `Chat: ${newChat.title}`);
      
      // Test message addition
      await sqliteStorage.addMessage(newChat.id, {
        id: 'storage-msg-1',
        content: 'Test message via storage service',
        role: 'user',
        timestamp: new Date()
      });
      this.logTest('Storage Message Addition', true, 'Message added via storage service');
      
      // Test search
      const searchResults = await sqliteStorage.searchMessages('storage', 5);
      this.logTest('Storage Search', searchResults.length > 0, `${searchResults.length} results found`);
      
      // Test statistics
      const userStats = await sqliteStorage.getUserStats();
      this.logTest('Storage Statistics', !!userStats, `Stats: ${JSON.stringify(userStats)}`);
      
    } catch (error) {
      this.logTest('Storage Service', false, error.message);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Test 9: Performance Tests');
    
    try {
      const startTime = Date.now();
      
      // Test bulk operations
      const bulkChats = [];
      const bulkMessages = [];
      
      // Create multiple chats
      for (let i = 0; i < 10; i++) {
        const chatId = `bulk-chat-${i}`;
        chatOps.create(chatId, this.testUserId, `Bulk Chat ${i}`);
        bulkChats.push(chatId);
      }
      
      const chatTime = Date.now() - startTime;
      this.logTest('Bulk Chat Creation', true, `10 chats in ${chatTime}ms`);
      
      // Create multiple messages
      const messageStartTime = Date.now();
      for (let i = 0; i < 50; i++) {
        const messageId = `bulk-msg-${i}`;
        const chatId = bulkChats[i % bulkChats.length];
        messageOps.create(messageId, chatId, this.testUserId, `Bulk message ${i}`, 'user');
        bulkMessages.push(messageId);
      }
      
      const messageTime = Date.now() - messageStartTime;
      this.logTest('Bulk Message Creation', true, `50 messages in ${messageTime}ms`);
      
      // Test search performance
      const searchStartTime = Date.now();
      const searchResults = messageOps.search(this.testUserId, 'bulk', 100);
      const searchTime = Date.now() - searchStartTime;
      this.logTest('Search Performance', searchResults.length > 0, `${searchResults.length} results in ${searchTime}ms`);
      
      const totalTime = Date.now() - startTime;
      this.logTest('Overall Performance', totalTime < 1000, `Total operations in ${totalTime}ms`);
      
    } catch (error) {
      this.logTest('Performance Tests', false, error.message);
    }
  }

  async testEdgeCases() {
    console.log('\n🔬 Test 10: Edge Cases');
    
    try {
      // Test invalid user ID
      const invalidUser = userOps.get('INVALID-USER-ID');
      this.logTest('Invalid User ID', invalidUser === undefined, 'Correctly returned undefined');
      
      // Test invalid chat ID
      const invalidChat = chatOps.getById('INVALID-CHAT-ID');
      this.logTest('Invalid Chat ID', invalidChat === undefined, 'Correctly returned undefined');
      
      // Test empty search
      const emptySearch = messageOps.search(this.testUserId, '', 10);
      this.logTest('Empty Search', Array.isArray(emptySearch), 'Returned array for empty search');
      
      // Test null/undefined inputs
      try {
        userOps.create(null);
        this.logTest('Null User ID', false, 'Should have thrown error');
      } catch (error) {
        this.logTest('Null User ID', true, 'Correctly handled null input');
      }
      
    } catch (error) {
      this.logTest('Edge Cases', false, error.message);
    }
  }

  async testStatistics() {
    console.log('\n📊 Test 11: Statistics and Monitoring');
    
    try {
      // Test user statistics
      const userStats = stats.getUserStats(this.testUserId);
      this.logTest('User Statistics', !!userStats, `Chats: ${userStats.chats}, Messages: ${userStats.messages}`);
      
      // Test database size
      const dbSize = stats.getDatabaseSize();
      this.logTest('Database Size', dbSize > 0, `${Math.round(dbSize / 1024)} KB`);
      
      // Test statistics accuracy
      const actualChats = chatOps.getByUser(this.testUserId).length;
      const actualMessages = messageOps.getByUser(this.testUserId).length;
      
      this.logTest('Statistics Accuracy', 
        userStats.chats === actualChats && userStats.messages === actualMessages,
        `Stats match actual data: ${userStats.chats}/${actualChats} chats, ${userStats.messages}/${actualMessages} messages`
      );
      
    } catch (error) {
      this.logTest('Statistics', false, error.message);
    }
  }

  async testDatabaseIntegrity() {
    console.log('\n🔒 Test 12: Database Integrity');
    
    try {
      // Test foreign key constraints
      try {
        // Try to create message with invalid chat ID
        messageOps.create('integrity-test', 'INVALID-CHAT', this.testUserId, 'Test', 'user');
        this.logTest('Foreign Key Constraints', false, 'Should have failed with invalid chat ID');
      } catch (error) {
        this.logTest('Foreign Key Constraints', true, 'Correctly enforced foreign keys');
      }
      
      // Test data consistency
      const chats = chatOps.getByUser(this.testUserId);
      let consistent = true;
      
      for (const chat of chats) {
        const messages = messageOps.getByChat(chat.id);
        for (const message of messages) {
          if (message.user_id !== this.testUserId) {
            consistent = false;
            break;
          }
        }
        if (!consistent) break;
      }
      
      this.logTest('Data Consistency', consistent, 'All messages belong to correct user');
      
      // Test database file integrity
      const dbPath = path.join(__dirname, 'data/chat.db');
      const dbExists = fs.existsSync(dbPath);
      this.logTest('Database File Integrity', dbExists, 'Database file exists and accessible');
      
    } catch (error) {
      this.logTest('Database Integrity', false, error.message);
    }
  }

  printTestResults() {
    console.log('\n' + '=' * 50);
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('=' * 50);
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.testName}: ${r.details}`));
    }
    
    console.log(`\n🎉 Database Testing Complete!`);
    
    if (failedTests === 0) {
      console.log(`✅ All tests passed! Your SQLite database is working perfectly.`);
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed. Please review the issues above.`);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new DatabaseTester();
  tester.runAllTests().catch(console.error);
}

module.exports = { DatabaseTester };
