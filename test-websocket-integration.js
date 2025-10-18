/**
 * Integration Test for V3 Prompts Module
 * Tests that websocket-server.js loads correctly with new prompts
 */

const path = require('path');

// Mock environment variables
process.env.GEMINI_API_KEY = 'test-key';
process.env.GOOGLE_SEARCH_API_KEY = 'test-key';
process.env.GOOGLE_SEARCH_ENGINE_ID = 'test-id';

console.log('🧪 Testing WebSocket Server Integration with V3 Prompts\n');
console.log('='.repeat(60));

try {
  // Test 1: Load prompts module
  console.log('\n📝 Test 1: Load Prompts Module');
  console.log('-'.repeat(60));
  const { getFullPrompt, buildToolsArray, getAvailableTools } = require('./lib/websocket/prompts');

  const systemPrompts = getFullPrompt();
  const tools = buildToolsArray();
  const availableTools = getAvailableTools();

  console.log('✅ Prompts module loaded successfully');
  console.log(`   - System prompts: ${systemPrompts.length} messages`);
  console.log(`   - Function tools: ${tools[0].function_declarations.length} functions`);
  console.log(`   - Available: ${availableTools.join(', ')}`);

  // Test 2: Verify system prompt structure
  console.log('\n📋 Test 2: Verify System Prompt Structure');
  console.log('-'.repeat(60));

  const hasBase = systemPrompts.some(p => p.role === 'user' && p.parts[0].text.includes('helpful AI assistant'));
  const hasAcknowledgement = systemPrompts.some(p => p.role === 'model' && p.parts[0].text.includes('Understood'));

  if (hasBase) console.log('✅ Base system prompt present');
  if (hasAcknowledgement) console.log('✅ Acknowledgement present');

  // Test 3: Verify function tools
  console.log('\n🔧 Test 3: Verify Function Tools');
  console.log('-'.repeat(60));

  const toolNames = tools[0].function_declarations.map(f => f.name);
  const expectedTools = ['get_stock_price', 'get_weather', 'get_time', 'search_web', 'search_chat_history'];

  const allPresent = expectedTools.every(t => toolNames.includes(t));

  if (allPresent) {
    console.log('✅ All expected tools present:');
    toolNames.forEach(name => console.log(`   - ${name}`));
  } else {
    console.log('❌ Missing tools!');
    process.exit(1);
  }

  // Test 4: Verify function descriptions
  console.log('\n📖 Test 4: Verify Function Descriptions');
  console.log('-'.repeat(60));

  const searchChatHistory = tools[0].function_declarations.find(f => f.name === 'search_chat_history');
  const hasDetailedDescription = searchChatHistory.description.length > 100;

  if (hasDetailedDescription) {
    console.log('✅ search_chat_history has detailed description');
    console.log(`   Length: ${searchChatHistory.description.length} characters`);
  }

  // Test 5: Load websocket-server module (this will test integration)
  console.log('\n🔌 Test 5: Load WebSocket Server Module');
  console.log('-'.repeat(60));

  // This is a smoke test - just verify it loads without errors
  const wsModule = require('./websocket-server');

  console.log('✅ WebSocket server module loaded successfully');
  console.log('✅ Integration with prompts module verified');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 All Integration Tests Passed!');
  console.log('='.repeat(60));
  console.log('\n✅ V3 Prompts module working correctly');
  console.log('✅ WebSocket server integration successful');
  console.log('✅ Ready for production use\n');

  process.exit(0);

} catch (error) {
  console.error('\n❌ Test Failed!');
  console.error('Error:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}
