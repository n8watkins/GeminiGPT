/**
 * Conversation Chunker
 *
 * Builds one context-carrying "turn chunk" per completed turn for the vector
 * index WRITE path: the user message and the assistant response combined into a
 * single labelled chunk.
 *
 * Why pair them: indexing the user message and assistant response as two
 * isolated rows loses context — a stored vector for "yes, exactly that one" is
 * meaningless on its own, and the near-identical user/assistant echo forces the
 * read path to dedupe. Pairing fixes both: the assistant's reply supplies the
 * context the bare user message lacks.
 *
 * Why NOT window in neighbouring turns: an earlier version prefixed each chunk
 * with the *previous* turn so follow-ups like "what about the second one?" kept
 * a referent. A live cross-chat probe showed that backfired — it blindly glued
 * every turn's text into the next chunk's embedding, so a query could match a
 * chunk purely on its windowed neighbour and surface the same fact twice, with a
 * citation pointing at an unrelated turn (e.g. a "dog's name" query matched a
 * "production deployment" turn because the dog turn had been windowed into it).
 * One turn per chunk keeps both retrieval and citations honest; the assistant's
 * own reply within the turn already carries enough intra-turn context.
 *
 * Chunk format:
 *   User: <current user message>
 *   Assistant: <current assistant response>
 *
 * Bounded to CHUNK_CHAR_BUDGET; if the turn alone exceeds it we truncate from
 * the END, so the turn's leading content survives in the read path's snippet
 * (which is taken from the start of the stored content).
 */

const CHUNK_CHAR_BUDGET = 1000;

/**
 * Build a single turn chunk from the current user message + assistant response.
 *
 * @param {string} message - current user message content
 * @param {string} responseText - current assistant response content
 * @param {Object} [options]
 * @param {number} [options.charBudget=CHUNK_CHAR_BUDGET] - max chunk length
 * @returns {{ text: string, truncated: boolean }}
 *   text: the chunk string to embed/store.
 *   truncated: whether the turn had to be truncated to fit the budget.
 */
function buildTurnChunk(message, responseText, options = {}) {
  const charBudget =
    options && options.charBudget != null ? options.charBudget : CHUNK_CHAR_BUDGET;

  const userText = typeof message === 'string' ? message.trim() : '';
  const assistantText = typeof responseText === 'string' ? responseText.trim() : '';

  // The turn always present; omit a line only when its side is empty.
  const lines = [];
  if (userText) lines.push(`User: ${userText}`);
  if (assistantText) lines.push(`Assistant: ${assistantText}`);

  let text = lines.join('\n');
  let truncated = false;

  if (text.length > charBudget) {
    text = text.slice(0, charBudget);
    truncated = true;
  }

  return { text, truncated };
}

module.exports = {
  buildTurnChunk,
  CHUNK_CHAR_BUDGET,
};
