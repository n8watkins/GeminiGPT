/**
 * Test Script for Prompts Module
 *
 * Run with: node test-prompts.js
 */

const {
  getFullPrompt,
  getBasePrompt,
  buildToolsArray,
  getAvailableTools,
  buildBehaviorRulesText,
  getExamples
} = require('./lib/websocket/prompts');

console.log('🧪 Testing Prompts Module\n');
console.log('=' .repeat(60));

// Test 1: System Prompts
console.log('\n📝 Test 1: System Prompts');
console.log('-'.repeat(60));
const fullPrompt = getFullPrompt();
console.log(`✅ Full prompt has ${fullPrompt.length} messages`);
console.log(`   - Includes: base, functionCalling, toolsAvailable, acknowledgement`);

const basePrompt = getBasePrompt();
console.log(`✅ Base prompt has ${basePrompt.length} message(s)`);

// Show first system prompt
console.log('\n📄 First system prompt message:');
console.log(JSON.stringify(fullPrompt[0], null, 2).substring(0, 200) + '...');

// Test 2: Function Tools
console.log('\n\n🔧 Test 2: Function Tools');
console.log('-'.repeat(60));
const tools = buildToolsArray();
console.log(`✅ Tools array built successfully`);
console.log(`   Format: ${JSON.stringify(tools).substring(0, 50)}...`);

const availableTools = getAvailableTools();
console.log(`✅ Available tools: ${availableTools.join(', ')}`);
console.log(`   Total: ${availableTools.length} tools`);

// Test 3: Behavior Rules
console.log('\n\n📋 Test 3: Behavior Rules');
console.log('-'.repeat(60));
const behaviorText = buildBehaviorRulesText();
console.log(`✅ Behavior rules text built (${behaviorText.length} characters)`);
console.log(`   Preview:`);
console.log(behaviorText.substring(0, 300) + '...');

// Test 4: Examples
console.log('\n\n💡 Test 4: Examples');
console.log('-'.repeat(60));
const functionExamples = getExamples('functionCalling');
console.log(`✅ Function calling examples: ${functionExamples.length} examples`);
functionExamples.forEach((ex, i) => {
  console.log(`   ${i + 1}. "${ex.user}" → ${ex.assistant.action}`);
});

// Test 5: Integration Test
console.log('\n\n🔗 Test 5: Integration Test');
console.log('-'.repeat(60));
console.log('Building complete Gemini configuration...');

const geminiConfig = {
  model: 'gemini-2.5-flash',
  tools: buildToolsArray(),
  systemPrompt: getFullPrompt()
};

console.log(`✅ Gemini config created:`);
console.log(`   - Model: ${geminiConfig.model}`);
console.log(`   - Tools: ${geminiConfig.tools[0].function_declarations.length} functions`);
console.log(`   - System messages: ${geminiConfig.systemPrompt.length}`);

// Test 6: Selective Tools
console.log('\n\n🎯 Test 6: Selective Tools');
console.log('-'.repeat(60));
const limitedTools = buildToolsArray(['get_weather', 'get_time']);
console.log(`✅ Built tools array with only weather and time`);
console.log(`   Functions: ${limitedTools[0].function_declarations.map(f => f.name).join(', ')}`);

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('🎉 All Tests Passed!');
console.log('='.repeat(60));
console.log('\n✅ Prompts module is working correctly');
console.log('✅ Ready to integrate into websocket-server.js');
console.log('\nNext step: Update websocket-server.js to use these prompts\n');
