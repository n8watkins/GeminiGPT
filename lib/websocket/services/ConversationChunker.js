/**
 * Conversation Chunker
 *
 * Builds context-carrying "turn chunks" for the vector index WRITE path.
 *
 * Why: indexing the user message and assistant response as two isolated rows
 * loses conversational context. A stored snippet like "yes, exactly that one"
 * is useless when retrieved out of context, and near-identical user/assistant
 * echoes force the read path to dedupe. Instead we combine one full turn
 * (user + assistant) into a single chunk, optionally prefixed with a short
 * window of the immediately preceding turn so follow-ups like "what about the
 * second one?" retain meaning.
 *
 * Chunk format (newline-separated, oldest first):
 *   [windowed prior turn(s)...]
 *   User: <current user message>
 *   Assistant: <current assistant response>
 *
 * Budget handling (when over CHUNK_CHAR_BUDGET):
 *   1. Drop the oldest windowed prior-turn lines first.
 *   2. Only if the current turn alone still exceeds budget, truncate it.
 *   The current turn (User + Assistant lines) is NEVER dropped entirely.
 *
 * chatHistory entries use the Gemini shape: { role, parts: [{ text }] }
 * where role is 'user' or 'model'.
 */

const CHUNK_CHAR_BUDGET = 1000;
const WINDOW_TURNS = 1; // how many preceding turns to include as context

/**
 * Pull the plain text out of a Gemini-shaped history entry.
 *
 * @param {Object} entry - { role, parts: [{ text }] }
 * @returns {string} The concatenated text of the entry's parts (trimmed).
 * @private
 */
function entryText(entry) {
  if (!entry || !Array.isArray(entry.parts)) return '';
  return entry.parts
    .map((p) => (p && typeof p.text === 'string' ? p.text : ''))
    .join('')
    .trim();
}

/**
 * Map a Gemini role to a human label for the chunk text.
 *
 * @param {string} role - 'user' | 'model' | 'assistant'
 * @returns {string} 'User' | 'Assistant'
 * @private
 */
function roleLabel(role) {
  return role === 'user' ? 'User' : 'Assistant';
}

/**
 * Extract a window of the immediately preceding turns from chatHistory as
 * labelled lines (oldest first). A "turn" here is a single history entry; we
 * take up to `windowTurns * 2` trailing entries (one user + one model per
 * turn) so a follow-up keeps its referent.
 *
 * @param {Array} chatHistory - Gemini-shaped history (may be undefined/empty)
 * @param {number} windowTurns - number of preceding turns to include
 * @returns {string[]} Array of "Label: text" lines, oldest first.
 * @private
 */
function buildWindowLines(chatHistory, windowTurns) {
  if (!Array.isArray(chatHistory) || chatHistory.length === 0 || windowTurns <= 0) {
    return [];
  }

  const maxEntries = windowTurns * 2;
  const recent = chatHistory.slice(-maxEntries);

  const lines = [];
  for (const entry of recent) {
    const text = entryText(entry);
    if (!text) continue;
    lines.push(`${roleLabel(entry.role)}: ${text}`);
  }
  return lines;
}

/**
 * Build a single context-carrying turn chunk.
 *
 * @param {string} message - current user message content
 * @param {string} responseText - current assistant response content
 * @param {Array} chatHistory - Gemini-shaped prior history (before this turn)
 * @param {Object} [options]
 * @param {number} [options.charBudget=CHUNK_CHAR_BUDGET] - max chunk length
 * @param {number} [options.windowTurns=WINDOW_TURNS] - preceding turns to window
 * @returns {{ text: string, windowedTurns: number, truncated: boolean }}
 *   text: the chunk string to embed/store.
 *   windowedTurns: how many prior-turn lines were actually included.
 *   truncated: whether the current turn had to be truncated to fit.
 */
function buildTurnChunk(message, responseText, chatHistory, options = {}) {
  const charBudget = options.charBudget != null ? options.charBudget : CHUNK_CHAR_BUDGET;
  const windowTurns = options.windowTurns != null ? options.windowTurns : WINDOW_TURNS;

  const userText = typeof message === 'string' ? message.trim() : '';
  const assistantText = typeof responseText === 'string' ? responseText.trim() : '';

  // The current turn always present; omit a line only if its text is empty.
  const currentLines = [];
  if (userText) currentLines.push(`User: ${userText}`);
  if (assistantText) currentLines.push(`Assistant: ${assistantText}`);

  let windowLines = buildWindowLines(chatHistory, windowTurns);

  const assemble = (wLines, cLines) => [...wLines, ...cLines].join('\n');

  // 1. Drop the oldest windowed context lines first until under budget.
  while (windowLines.length > 0 && assemble(windowLines, currentLines).length > charBudget) {
    windowLines = windowLines.slice(1);
  }

  let text = assemble(windowLines, currentLines);
  let truncated = false;

  // 2. If the current turn alone still exceeds budget, truncate (never drop).
  if (text.length > charBudget) {
    text = text.slice(0, charBudget);
    truncated = true;
  }

  return {
    text,
    windowedTurns: windowLines.length,
    truncated,
  };
}

module.exports = {
  buildTurnChunk,
  CHUNK_CHAR_BUDGET,
  WINDOW_TURNS,
};
