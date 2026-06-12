/**
 * End-to-end test for automatic cross-chat RAG retrieval.
 *
 * Flow:
 * 1. Send a distinctive fact to chat-A ("my dog's name is Waffles")
 * 2. Wait for the response + background vector indexing
 * 3. Ask "what is my dog's name?" in a DIFFERENT chat (chat-B), same user
 * 4. Assert:
 *    (a) a `retrieval-info` event arrives with a source from chat-A
 *    (b) the streamed response mentions "Waffles"
 *
 * Usage: node tests/integration/test-cross-chat-rag.js <port>
 * Requires the server to be running (node server.js) with a GEMINI_API_KEY.
 */

const { io } = require('socket.io-client');

const port = process.argv[2];
if (!port) {
  console.error('Usage: node tests/integration/test-cross-chat-rag.js <port>');
  process.exit(2);
}

const URL = `http://localhost:${port}`;
const userId = `rag-test-user-${Date.now()}`;
const chatA = `rag-test-chat-A-${Date.now()}`;
const chatB = `rag-test-chat-B-${Date.now()}`;

const INDEXING_WAIT_MS = 6000;
const STEP_TIMEOUT_MS = 90000;

function sendAndCollect(socket, { chatId, message, chatHistory }) {
  return new Promise((resolve, reject) => {
    let response = '';
    const retrievalEvents = [];
    let retrievalBeforeFirstChunk = false;
    let sawFirstChunk = false;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for response in ${chatId}`));
    }, STEP_TIMEOUT_MS);

    const onRetrieval = (info) => {
      if (info.chatId === chatId) {
        retrievalEvents.push(info);
        if (!sawFirstChunk) retrievalBeforeFirstChunk = true;
      }
    };

    const onResponse = (data) => {
      if (data.chatId !== chatId) return;
      if (data.message) {
        sawFirstChunk = true;
        response += data.message;
      }
      if (data.isComplete) {
        cleanup();
        resolve({ response, retrievalEvents, retrievalBeforeFirstChunk });
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('message-response', onResponse);
      socket.off('retrieval-info', onRetrieval);
    };

    socket.on('retrieval-info', onRetrieval);
    socket.on('message-response', onResponse);
    socket.emit('send-message', { chatId, message, chatHistory, userId });
  });
}

async function main() {
  console.log(`Connecting to ${URL} as ${userId}`);
  const socket = io(URL, { transports: ['websocket'] });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Connect timeout')), 15000);
    socket.on('connect', () => { clearTimeout(t); resolve(); });
    socket.on('connect_error', (err) => { clearTimeout(t); reject(err); });
  });
  console.log('Connected:', socket.id);

  // Step 1: plant the fact in chat A
  console.log(`\n--- Chat A (${chatA}): planting fact ---`);
  const factMessage = "Just so you know, my dog's name is Waffles and he is a corgi.";
  console.log('USER:', factMessage);
  const stepA = await sendAndCollect(socket, { chatId: chatA, message: factMessage, chatHistory: [] });
  console.log('ASSISTANT:', stepA.response.substring(0, 300));
  if (stepA.retrievalEvents.length > 0) {
    console.log(`(note: chat A itself got ${stepA.retrievalEvents.length} retrieval-info event(s) — fine, user may have prior data)`);
  }

  // Step 2: wait for background indexing
  console.log(`\nWaiting ${INDEXING_WAIT_MS}ms for vector indexing...`);
  await new Promise((r) => setTimeout(r, INDEXING_WAIT_MS));

  // Step 3: ask in chat B
  console.log(`\n--- Chat B (${chatB}): asking cross-chat question ---`);
  const question = 'what is my dog\'s name?';
  console.log('USER:', question);
  const stepB = await sendAndCollect(socket, { chatId: chatB, message: question, chatHistory: [] });
  console.log('ASSISTANT:', stepB.response.substring(0, 500));
  console.log('\nretrieval-info events:', JSON.stringify(stepB.retrievalEvents, null, 2));

  // Assertions
  const failures = [];

  if (stepB.retrievalEvents.length === 0) {
    failures.push('No retrieval-info event received in chat B');
  } else {
    const sources = stepB.retrievalEvents.flatMap((e) => e.sources || []);
    if (!sources.some((s) => s.chatId === chatA)) {
      failures.push(`retrieval-info sources did not include chat A (${chatA}): ${JSON.stringify(sources)}`);
    }
    if (sources.some((s) => (s.snippet || '').length > 200)) {
      failures.push('A snippet exceeded 200 chars');
    }
    if (!stepB.retrievalBeforeFirstChunk) {
      failures.push('retrieval-info arrived AFTER the first response chunk (must arrive before the stream)');
    }
  }

  if (!/waffles/i.test(stepB.response)) {
    failures.push(`Response did not mention "Waffles": ${stepB.response.substring(0, 200)}`);
  }

  socket.disconnect();

  if (failures.length > 0) {
    console.error('\n❌ CROSS-CHAT RAG TEST FAILED:');
    failures.forEach((f) => console.error(' -', f));
    process.exit(1);
  }

  console.log('\n✅ CROSS-CHAT RAG TEST PASSED');
  console.log(' - retrieval-info arrived before the response stream, with a source from chat A');
  console.log(' - response in chat B mentioned "Waffles"');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
