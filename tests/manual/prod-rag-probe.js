/**
 * One-off LIVE probe of the cross-chat RAG pipeline on prod.
 * Confirms the new chunking + hybrid + MMR code is wired end-to-end:
 *   1. plant two distinct facts (incl. a rare exact token) in chat A
 *   2. wait for background turn-chunk indexing
 *   3a. semantic question in chat B  -> expects "Waffles"
 *   3b. exact rare-token question in chat B -> exercises the keyword/hybrid path
 * Uses a fresh random userId so the only data for this user is what we plant.
 *
 * Manual tool (NOT run by `npm test`): it hits the live site and spends shared
 * pool budget. Run it directly:
 *   node tests/manual/prod-rag-probe.js
 *   PROBE_URL=http://localhost:<port> node tests/manual/prod-rag-probe.js
 */
const { io } = require('socket.io-client');

const URL = process.env.PROBE_URL || 'https://geminigpt-n8.onrender.com';
const userId = `prod-probe-${Date.now()}`;
const chatA = `probe-A-${Date.now()}`;
const chatB = `probe-B-${Date.now()}`;
const INDEXING_WAIT_MS = 8000;
const STEP_TIMEOUT_MS = 90000;

function sendAndCollect(socket, { chatId, message, chatHistory }) {
  return new Promise((resolve, reject) => {
    let response = '';
    const retrievalEvents = [];
    let retrievalBeforeFirstChunk = false;
    let sawFirstChunk = false;
    const timeout = setTimeout(() => { cleanup(); reject(new Error(`Timed out in ${chatId}`)); }, STEP_TIMEOUT_MS);
    const onRetrieval = (info) => {
      if (info.chatId === chatId) { retrievalEvents.push(info); if (!sawFirstChunk) retrievalBeforeFirstChunk = true; }
    };
    const onResponse = (data) => {
      if (data.chatId !== chatId) return;
      if (data.message) { sawFirstChunk = true; response += data.message; }
      if (data.isComplete) { cleanup(); resolve({ response, retrievalEvents, retrievalBeforeFirstChunk }); }
    };
    const onError = (e) => { if (!e || e.chatId === chatId) { cleanup(); reject(new Error('message-error: ' + JSON.stringify(e))); } };
    const cleanup = () => { clearTimeout(timeout); socket.off('message-response', onResponse); socket.off('retrieval-info', onRetrieval); socket.off('message-error', onError); };
    socket.on('retrieval-info', onRetrieval);
    socket.on('message-response', onResponse);
    socket.on('message-error', onError);
    socket.emit('send-message', { chatId, message, chatHistory, userId });
  });
}

async function main() {
  console.log(`Connecting to ${URL} as ${userId}`);
  const socket = io(URL, { transports: ['websocket'] });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('connect timeout')), 20000);
    socket.on('connect', () => { clearTimeout(t); resolve(); });
    socket.on('connect_error', (err) => { clearTimeout(t); reject(err); });
  });
  console.log('Connected:', socket.id);

  // Plant fact 1 (semantic target) + fact 2 (rare exact token) across two turns
  console.log(`\n--- Chat A: planting facts ---`);
  const f1 = "Just so you know, my dog's name is Waffles and he is a corgi.";
  console.log('USER A1:', f1);
  const a1 = await sendAndCollect(socket, { chatId: chatA, message: f1, chatHistory: [] });
  console.log('ASSISTANT A1:', a1.response.slice(0, 160));

  const f2 = "Also remember: my production deployment runs under the internal codename Zephyr-Quokka-7X.";
  console.log('USER A2:', f2);
  const a2 = await sendAndCollect(socket, { chatId: chatA, message: f2, chatHistory: [
    { role: 'user', parts: [{ text: f1 }] },
    { role: 'model', parts: [{ text: a1.response }] },
  ] });
  console.log('ASSISTANT A2:', a2.response.slice(0, 160));

  console.log(`\nWaiting ${INDEXING_WAIT_MS}ms for turn-chunk indexing...`);
  await new Promise((r) => setTimeout(r, INDEXING_WAIT_MS));

  // Probe 1: semantic
  console.log(`\n--- Chat B: semantic question ---`);
  const q1 = "what is my dog's name?";
  console.log('USER B1:', q1);
  const b1 = await sendAndCollect(socket, { chatId: chatB, message: q1, chatHistory: [] });
  console.log('ASSISTANT B1:', b1.response.slice(0, 280));
  console.log('retrieval B1:', JSON.stringify(b1.retrievalEvents.flatMap(e => e.sources || []).map(s => ({ chat: s.chatId === chatA ? 'A' : s.chatId, score: s.score, snippet: (s.snippet||'').slice(0,80) })), null, 1));

  // Probe 2: rare exact token (keyword/hybrid path)
  console.log(`\n--- Chat B: exact rare-token question (hybrid/keyword) ---`);
  const q2 = "what is the codename Zephyr-Quokka-7X for?";
  console.log('USER B2:', q2);
  const b2 = await sendAndCollect(socket, { chatId: chatB, message: q2, chatHistory: [] });
  console.log('ASSISTANT B2:', b2.response.slice(0, 280));
  console.log('retrieval B2:', JSON.stringify(b2.retrievalEvents.flatMap(e => e.sources || []).map(s => ({ chat: s.chatId === chatA ? 'A' : s.chatId, score: s.score, snippet: (s.snippet||'').slice(0,80) })), null, 1));

  socket.disconnect();

  const fails = [];
  const b1Sources = b1.retrievalEvents.flatMap(e => e.sources || []);
  if (b1Sources.length === 0) fails.push('B1: no retrieval-info');
  else if (!b1Sources.some(s => s.chatId === chatA)) fails.push('B1: no source from chat A');
  if (!/waffles/i.test(b1.response)) fails.push('B1: response did not mention Waffles');
  if (!b1.retrievalBeforeFirstChunk && b1Sources.length) fails.push('B1: retrieval-info arrived after stream start');

  const b2Sources = b2.retrievalEvents.flatMap(e => e.sources || []);
  if (b2Sources.length === 0) fails.push('B2: no retrieval-info (keyword path did not surface anything)');
  else if (!b2Sources.some(s => s.chatId === chatA)) fails.push('B2: no source from chat A');
  if (!/deploy|production|codename/i.test(b2.response)) fails.push('B2: response did not reflect the recalled deployment fact');

  if (fails.length) { console.error('\n❌ PROBE FAILURES:'); fails.forEach(f => console.error(' -', f)); process.exit(1); }
  console.log('\n✅ LIVE PROD RAG PROBE PASSED (semantic + exact-token cross-chat recall both fired)');
  process.exit(0);
}
main().catch(e => { console.error('Probe error:', e); process.exit(1); });
