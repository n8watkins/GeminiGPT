/**
 * Test script to reproduce the "empty response" error
 * Tests simple questions like "what is a promise in js"
 */

require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Check environment
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment');
  process.exit(1);
}

console.log('✅ GEMINI_API_KEY found');

async function testSimpleQuestion() {
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

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    safetySettings: safetySettings
  });

  console.log('\n🧪 Testing question: "what is a promise in js"\n');

  try {
    const chat = model.startChat({
      history: []
    });

    const result = await chat.sendMessageStream([{ text: 'what is a promise in js' }]);

    let fullResponse = '';
    let chunkCount = 0;
    let finishReason = null;

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

        if (candidate.safetyRatings) {
          console.log(`Chunk ${chunkCount} safety ratings:`, candidate.safetyRatings);
        }
      }

      // Get text from chunk
      const chunkText = chunk.text();
      console.log(`Chunk ${chunkCount}: ${chunkText.length} chars`);

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
    console.log(`\n📝 Full response:\n${fullResponse}`);

    if (fullResponse.length === 0) {
      console.error('\n❌ CRITICAL: Empty response received!');
      console.error('This matches the error you reported.');
      process.exit(1);
    }

    console.log('\n✅ Test passed - response received successfully');

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run test
testSimpleQuestion().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
