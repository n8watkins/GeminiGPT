const { initializeDB, addMessage, searchChats, getDBStats, closeDB } = require('../../src/lib/vectordb');

async function testVectorDB() {
  console.log('🧪 Testing Vector Database Implementation');
  console.log('=' .repeat(50));
  
  try {
    // Initialize database
    console.log('\n1. Initializing database...');
    await initializeDB();
    console.log('✅ Database initialized successfully');
    
    // Test adding messages
    console.log('\n2. Adding test messages...');
    const testUserId = 'USER-TEST-1234';
    const testChatId = 'chat-test-001';
    
    const testMessages = [
      {
        id: 'msg-1',
        content: 'What is the weather like in New York?',
        role: 'user',
        timestamp: new Date('2025-01-01T10:00:00Z')
      },
      {
        id: 'msg-2',
        content: 'The weather in New York is currently sunny with a temperature of 72°F.',
        role: 'assistant',
        timestamp: new Date('2025-01-01T10:01:00Z')
      },
      {
        id: 'msg-3',
        content: 'Can you tell me about Apple stock prices?',
        role: 'user',
        timestamp: new Date('2025-01-01T11:00:00Z')
      },
      {
        id: 'msg-4',
        content: 'Apple (AAPL) stock is currently trading at $150.25, up 2.3% today.',
        role: 'assistant',
        timestamp: new Date('2025-01-01T11:01:00Z')
      }
    ];
    
    for (const message of testMessages) {
      await addMessage(testUserId, testChatId, message, 'Test Chat');
      console.log(`✅ Added ${message.role} message: ${message.content.substring(0, 50)}...`);
    }
    
    // Test searching
    console.log('\n3. Testing search functionality...');
    
    const searchQueries = [
      'weather information',
      'stock prices',
      'Apple company',
      'temperature in New York'
    ];
    
    for (const query of searchQueries) {
      console.log(`\n🔍 Searching for: "${query}"`);
      const results = await searchChats(testUserId, query, 3);
      
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} relevant messages:`);
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. [${result.role}] ${result.content.substring(0, 80)}...`);
        });
      } else {
        console.log('❌ No results found');
      }
    }
    
    // Test user isolation
    console.log('\n4. Testing user isolation...');
    const otherUserId = 'USER-OTHER-5678';
    const otherResults = await searchChats(otherUserId, 'weather', 3);
    console.log(`✅ User isolation test: Found ${otherResults.length} results for other user (should be 0)`);
    
    // Get database stats
    console.log('\n5. Database statistics...');
    const stats = await getDBStats();
    console.log('📊 Database Stats:', stats);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close database connection
    await closeDB();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the test
testVectorDB().catch(console.error);
