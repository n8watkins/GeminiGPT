/**
 * Test script to reproduce the "empty response" error with tools enabled
 * This mimics the actual WebSocket server configuration
 */

require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildToolsArray } = require('../lib/websocket/prompts');

// Check environment
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ GEMINI_API_KEY found');

async function testWithTools() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

  // Load tools like the actual server does
  const tools = buildToolsArray();
  console.log(`✅ Loaded ${tools[0].function_declarations.length} function tools`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: tools,
    safetySettings: safetySettings
  });

  console.log('\n🧪 Testing question with tools enabled: "what is a promise in js"\n');

  try {
    const chat = model.startChat({
      history: []
    });

    const result = await chat.sendMessageStream([{ text: 'what is a promise in js' }]);

    let fullResponse = '';
    let chunkCount = 0;
    let finishReason = null;
    let hasFunctionCalls = false;

    console.log('📨 Streaming response...\n');

    for await (const chunk of result.stream) {
      chunkCount++;

      // Check for safety filters
      if (chunk.promptFeedback) {
        console.log('📋 Prompt Feedback:', JSON.stringify(chunk.promptFeedback, null, 2));
        if (chunk.promptFeedback.blockReason) {
          console.error('🚫 Content blocked by safety filter:', chunk.promptFeedback.blockReason);
          process.exit(1);
        }
      }

      // Check for function calls
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        hasFunctionCalls = true;
        console.log('🔧 Function calls detected:', chunk.functionCalls);
        break;
      }

      // Check for safety ratings
      if (chunk.candidates && chunk.candidates[0]) {
        const candidate = chunk.candidates[0];

        if (candidate.finishReason) {
          finishReason = candidate.finishReason;
          console.log(`Chunk ${chunkCount} finish reason:`, finishReason);
        }

        if (candidate.finishReason === 'SAFETY') {
          console.error('🚫 Response blocked due to safety concerns');
          process.exit(1);
        }
      }

      // Get text from chunk
      let chunkText = '';
      try {
        chunkText = chunk.text();
        console.log(`Chunk ${chunkCount}: ${chunkText.length} chars`);
      } catch (error) {
        console.error(`❌ Error calling chunk.text() on chunk ${chunkCount}:`, error.message);
        console.log('Chunk object:', JSON.stringify(chunk, null, 2));
      }

      if (chunkText) {
        fullResponse += chunkText;
        process.stdout.write(chunkText);
      }
    }

    console.log('\n\n✅ Streaming completed');
    console.log('📊 Stats:');
    console.log(`  - Total chunks: ${chunkCount}`);
    console.log(`  - Response length: ${fullResponse.length} chars`);
    console.log(`  - Finish reason: ${finishReason}`);
    console.log(`  - Had function calls: ${hasFunctionCalls}`);

    if (fullResponse.length === 0 && !hasFunctionCalls) {
      console.error('\n❌ CRITICAL: Empty response received!');
      console.error('This matches the error you reported.');

      // Try to get the final response
      try {
        const response = await result.response;
        console.log('\n📋 Final response object:', JSON.stringify(response, null, 2));
      } catch (error) {
        console.error('Error getting final response:', error.message);
      }

      process.exit(1);
    }

    if (hasFunctionCalls) {
      console.log('\n⚠️ Response triggered function calls (not an error, but needs handling)');
    } else {
      console.log(`\n📝 First 200 chars of response:\n${fullResponse.substring(0, 200)}...`);
      console.log('\n✅ Test passed - response received successfully');
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testWithTools().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
