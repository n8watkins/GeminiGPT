/**
 * Test the fix for function call detection
 * This simulates the GeminiService flow with the fix
 */

require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildToolsArray } = require('../lib/websocket/prompts');

async function testFix() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const tools = buildToolsArray();

  const { HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: tools,
    safetySettings: safetySettings
  });

  console.log('🧪 Testing with fixed function call detection: "what is a promise in js"\n');

  const chat = model.startChat({ history: [] });
  const result = await chat.sendMessageStream([{ text: 'what is a promise in js' }]);

  let fullResponse = '';
  let hasFunctionCalls = false;
  let functionCalls = [];
  let chunkCount = 0;

  for await (const chunk of result.stream) {
    chunkCount++;

    // FIXED: Call chunk.functionCalls() as a method
    const chunkFunctionCalls = chunk.functionCalls();
    if (chunkFunctionCalls && chunkFunctionCalls.length > 0) {
      hasFunctionCalls = true;
      functionCalls = chunkFunctionCalls;
      console.log('✅ Function calls detected:', functionCalls);
      break;
    }

    const chunkText = chunk.text();
    if (chunkText) {
      fullResponse += chunkText;
    }
  }

  console.log('\n📊 Results:');
  console.log(`  - Chunks processed: ${chunkCount}`);
  console.log(`  - Response length: ${fullResponse.length} chars`);
  console.log(`  - Function calls detected: ${hasFunctionCalls}`);

  if (hasFunctionCalls) {
    console.log('\n✅ FIX WORKS! Function calls properly detected.');
    console.log('Function names:', functionCalls.map(fc => fc.name).join(', '));
    console.log('\nThe server will now:');
    console.log('1. Execute the search_web function');
    console.log('2. Send the results back to Gemini');
    console.log('3. Stream Gemini\'s response to the user');
    console.log('\n✅ This prevents the "empty response" error!');
  } else if (fullResponse.length > 0) {
    console.log('\n✅ Got direct text response (no function calls)');
    console.log('Preview:', fullResponse.substring(0, 100) + '...');
  } else {
    console.log('\n❌ Still getting empty response - something else is wrong');
    process.exit(1);
  }
}

testFix().catch(console.error);
