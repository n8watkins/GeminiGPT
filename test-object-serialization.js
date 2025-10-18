/**
 * Diagnostic Test Suite for [object Object] Issue
 *
 * This tests various parts of the data flow to identify where
 * objects are being converted to "[object Object]" strings
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Starting diagnostic tests for [object Object] issue\n');
console.log('Environment check:');
console.log('  GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Test 1: Simple Gemini API call with code generation
async function test1_SimpleCodeGeneration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Simple Code Generation (No History)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = 'Write a Python function to sort an array';

    console.log('Request:', prompt);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('\nResponse length:', text.length);
    console.log('Response type:', typeof text);
    console.log('Contains [object Object]:', text.includes('[object Object]'));

    if (text.includes('[object Object]')) {
      console.log('\n🚨 FAILURE: Response contains [object Object]');
      console.log('First 500 chars:', text.substring(0, 500));
    } else {
      console.log('\n✅ SUCCESS: Clean response');
      console.log('First 200 chars:', text.substring(0, 200));
    }

    return text;
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return null;
  }
}

// Test 2: Code generation WITH chat history
async function test2_WithChatHistory() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Code Generation WITH Chat History');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const history = [
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Hi! How can I help you?' }]
      }
    ];

    console.log('History:', JSON.stringify(history, null, 2));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage('Write a Python function to sort an array');
    const response = await result.response;
    const text = response.text();

    console.log('\nResponse length:', text.length);
    console.log('Response type:', typeof text);
    console.log('Contains [object Object]:', text.includes('[object Object]'));

    if (text.includes('[object Object]')) {
      console.log('\n🚨 FAILURE: Response contains [object Object]');
      console.log('First 500 chars:', text.substring(0, 500));
    } else {
      console.log('\n✅ SUCCESS: Clean response');
      console.log('First 200 chars:', text.substring(0, 200));
    }

    return text;
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return null;
  }
}

// Test 3: Simulate our actual message format
async function test3_SimulateActualFormat() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Simulate Actual Server Message Format');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Simulate what our server sends
    const chatHistory = [
      {
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
        id: 'test-1'
      },
      {
        role: 'assistant',
        content: 'Hi! How can I help you?',
        timestamp: new Date(),
        id: 'test-2'
      }
    ];

    console.log('Original chatHistory (from client):');
    console.log(JSON.stringify(chatHistory, null, 2));

    // Convert like our server does
    const history = chatHistory.map((msg) => {
      let textContent = msg.content;
      if (typeof textContent !== 'string') {
        console.warn('⚠️ Message content is not a string:', typeof textContent, textContent);
        textContent = textContent?.text || textContent?.toString() || String(textContent);
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: textContent }]
      };
    });

    console.log('\nConverted history (for Gemini):');
    console.log(JSON.stringify(history, null, 2));

    const finalHistory = [
      {
        role: 'user',
        parts: [{ text: 'You are a helpful AI assistant. When writing code, ALWAYS use actual values - NEVER use placeholders like [object Object].' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood! I will write complete code with actual values.' }]
      },
      ...history
    ];

    console.log('\nFinal history length:', finalHistory.length);

    const chat = model.startChat({ history: finalHistory });
    const result = await chat.sendMessage('Write a Python function to sort an array');
    const response = await result.response;
    const text = response.text();

    console.log('\nResponse length:', text.length);
    console.log('Response type:', typeof text);
    console.log('Contains [object Object]:', text.includes('[object Object]'));

    if (text.includes('[object Object]')) {
      console.log('\n🚨 FAILURE: Response contains [object Object]');
      console.log('Full response:');
      console.log(text);
    } else {
      console.log('\n✅ SUCCESS: Clean response');
      console.log('First 300 chars:', text.substring(0, 300));
    }

    return text;
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

// Test 4: Check if it's a markdown rendering issue
async function test4_CheckMarkdownRendering() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Check Raw Response Structure');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Write a simple Python function to add two numbers');
    const response = await result.response;

    console.log('Response object keys:', Object.keys(response));
    console.log('\nresponse.text() type:', typeof response.text());
    console.log('response.text() length:', response.text().length);

    // Try to access candidates directly
    if (response.candidates && response.candidates.length > 0) {
      console.log('\nCandidate 0 structure:');
      console.log('  Keys:', Object.keys(response.candidates[0]));

      if (response.candidates[0].content) {
        console.log('  Content keys:', Object.keys(response.candidates[0].content));
        console.log('  Parts length:', response.candidates[0].content.parts?.length);

        if (response.candidates[0].content.parts && response.candidates[0].content.parts[0]) {
          console.log('  First part keys:', Object.keys(response.candidates[0].content.parts[0]));
          console.log('  First part text type:', typeof response.candidates[0].content.parts[0].text);
          console.log('  First part text (first 200 chars):', response.candidates[0].content.parts[0].text?.substring(0, 200));
        }
      }
    }

    const text = response.text();
    console.log('\nFinal text check:');
    console.log('  Contains [object Object]:', text.includes('[object Object]'));

    if (text.includes('[object Object]')) {
      console.log('  🚨 FAILURE: Contains [object Object]');
    } else {
      console.log('  ✅ SUCCESS: Clean text');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

// Test 5: Test with actual system prompt from our server
async function test5_WithActualSystemPrompt() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: With Actual System Prompt from Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `You are a helpful AI assistant with access to the user's conversation history across multiple chat sessions. CRITICAL INSTRUCTIONS:

1. IF you receive context from previous conversations, use that information to answer
2. IF you are told that chat history was searched but nothing was found, answer using your general knowledge
3. IF no chat history search was mentioned, answer using your general knowledge
4. NEVER say "I don't have information from previous conversations" for general knowledge questions
5. You can analyze images and documents, and use special functions for stock prices, weather, time, and web search
6. When writing code, ALWAYS use actual values, variable names, and code - NEVER use placeholders like [object Object], [value], or [placeholder]
7. Write complete, executable code with proper syntax

Remember: Always provide helpful answers. Use previous conversation context when provided, but freely use general knowledge otherwise.`;

    const history = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood! I will:\n- Use context from previous conversations when provided\n- Use general knowledge when no relevant chat history is found\n- Always provide helpful answers without refusing general knowledge questions\n- Analyze documents and use special functions when needed\n- Write complete, executable code with actual values (never placeholders like [object Object])' }]
      }
    ];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage('Write a Python function to sort an array');
    const response = await result.response;
    const text = response.text();

    console.log('Response length:', text.length);
    console.log('Contains [object Object]:', text.includes('[object Object]'));

    if (text.includes('[object Object]')) {
      console.log('\n🚨 FAILURE: Response contains [object Object]');
      console.log('Full response:');
      console.log(text);
    } else {
      console.log('\n✅ SUCCESS: Clean response');
      console.log('Code snippet:');
      console.log(text.substring(0, 500));
    }

    return text;
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return null;
  }
}

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════\n');
  console.log('  [object Object] Diagnostic Test Suite');
  console.log('\n═══════════════════════════════════════════\n\n');

  await test1_SimpleCodeGeneration();
  await test2_WithChatHistory();
  await test3_SimulateActualFormat();
  await test4_CheckMarkdownRendering();
  await test5_WithActualSystemPrompt();

  console.log('\n\n═══════════════════════════════════════════');
  console.log('  All Tests Complete');
  console.log('═══════════════════════════════════════════\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
