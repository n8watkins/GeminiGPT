/**
 * Test to understand the correct way to detect function calls
 */

require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildToolsArray } = require('../lib/websocket/prompts');

async function testFunctionCallDetection() {
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

  console.log('Testing function call detection with: "what is a promise in js"\n');

  const chat = model.startChat({ history: [] });
  const result = await chat.sendMessageStream([{ text: 'what is a promise in js' }]);

  for await (const chunk of result.stream) {
    console.log('\n=== CHUNK ANALYSIS ===');
    console.log('Chunk keys:', Object.keys(chunk));
    console.log('\nchunk.functionCalls:', chunk.functionCalls);
    console.log('typeof chunk.functionCalls:', typeof chunk.functionCalls);

    // Try as method
    if (typeof chunk.functionCalls === 'function') {
      try {
        console.log('chunk.functionCalls():', chunk.functionCalls());
      } catch (e) {
        console.log('Error calling chunk.functionCalls():', e.message);
      }
    }

    // Check candidates structure
    if (chunk.candidates && chunk.candidates[0]) {
      const candidate = chunk.candidates[0];
      console.log('\ncandidate.finishReason:', candidate.finishReason);
      console.log('candidate.finishMessage:', candidate.finishMessage);

      if (candidate.content && candidate.content.parts) {
        console.log('\ncandidate.content.parts:');
        for (let i = 0; i < candidate.content.parts.length; i++) {
          const part = candidate.content.parts[i];
          console.log(`  Part ${i}:`, Object.keys(part));
          if (part.functionCall) {
            console.log('    ✅ FUNCTION CALL FOUND:', part.functionCall);
          }
        }
      }
    }

    // Try calling text()
    try {
      const text = chunk.text();
      console.log('\nchunk.text():', text.length > 0 ? `"${text.substring(0, 50)}..."` : '(empty string)');
    } catch (e) {
      console.log('\nError calling chunk.text():', e.message);
    }
  }

  console.log('\n=== FINAL RESPONSE ===');
  const response = await result.response;
  console.log('response.functionCalls():', response.functionCalls ? response.functionCalls() : 'undefined');
}

testFunctionCallDetection().catch(console.error);
