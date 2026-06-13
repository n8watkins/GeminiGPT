/**
 * Tests for the turn chunker on the vector-index WRITE path.
 *
 * The chunker combines a completed turn (user message + assistant response)
 * into ONE labelled chunk. It deliberately does NOT window in neighbouring
 * turns (an earlier version did; a live probe showed it polluted each chunk's
 * embedding with its neighbour, causing the same fact to be recalled twice with
 * a misleading citation). Chunks are bounded: a turn that alone exceeds the
 * budget is truncated from the end so its leading content survives in the
 * read-path snippet.
 */

const { buildTurnChunk, CHUNK_CHAR_BUDGET } = require('../lib/websocket/services/ConversationChunker');

describe('ConversationChunker.buildTurnChunk', () => {
  it('combines the current user + assistant turn into one labelled chunk', () => {
    const { text, truncated } = buildTurnChunk(
      'What is the capital of France?',
      'The capital of France is Paris.'
    );

    expect(text).toBe(
      'User: What is the capital of France?\nAssistant: The capital of France is Paris.'
    );
    expect(truncated).toBe(false);
  });

  it('does NOT include any neighbouring-turn context — only this turn', () => {
    const { text } = buildTurnChunk('what about the second one?', 'Berlin.');
    // The chunk is exactly the current turn; nothing else is glued in.
    expect(text).toBe('User: what about the second one?\nAssistant: Berlin.');
    expect(text).not.toMatch(/Earlier/i);
  });

  it('truncates the turn when it alone exceeds the budget (leads with the user message)', () => {
    const hugeUser = 'a'.repeat(CHUNK_CHAR_BUDGET);
    const hugeAssistant = 'b'.repeat(CHUNK_CHAR_BUDGET);

    const { text, truncated } = buildTurnChunk(hugeUser, hugeAssistant);

    expect(truncated).toBe(true);
    expect(text.length).toBe(CHUNK_CHAR_BUDGET);
    // The turn is never dropped — it leads with the user message.
    expect(text.startsWith('User: ')).toBe(true);
  });

  it('respects a custom charBudget option', () => {
    const { text, truncated } = buildTurnChunk('hello there', 'general kenobi', { charBudget: 10 });
    expect(text.length).toBe(10);
    expect(truncated).toBe(true);
    expect(text.startsWith('User: ')).toBe(true);
  });

  it('omits an empty side of the turn but still produces a chunk', () => {
    expect(buildTurnChunk('', 'standalone assistant note').text).toBe(
      'Assistant: standalone assistant note'
    );
    expect(buildTurnChunk('standalone user note', '').text).toBe('User: standalone user note');
  });

  it('handles both sides empty / non-string input gracefully', () => {
    expect(buildTurnChunk('', '').text).toBe('');
    expect(buildTurnChunk(undefined, null).text).toBe('');
    expect(buildTurnChunk(undefined, null).truncated).toBe(false);
  });
});
