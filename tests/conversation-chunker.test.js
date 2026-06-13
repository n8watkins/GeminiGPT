/**
 * Tests for the conversation-window chunker on the vector-index WRITE path.
 *
 * The chunker combines a completed turn (user message + assistant response)
 * into ONE context-carrying chunk, optionally prefixed with a short window of
 * the immediately preceding turn so follow-ups retain meaning. Chunks are
 * bounded: when over budget we drop the oldest windowed context FIRST, then
 * truncate the current turn — but never drop the current turn entirely.
 *
 * chatHistory entries use the Gemini shape: { role, parts: [{ text }] }.
 */

const { buildTurnChunk, CHUNK_CHAR_BUDGET } = require('../lib/websocket/services/ConversationChunker');

// Gemini-shaped history entry helper.
function entry(role, text) {
  return { role, parts: [{ text }] };
}

describe('ConversationChunker.buildTurnChunk', () => {
  it('combines the current user + assistant turn into one labelled chunk', () => {
    const { text, windowedTurns, truncated } = buildTurnChunk(
      'What is the capital of France?',
      'The capital of France is Paris.',
      []
    );

    expect(text).toBe(
      'User: What is the capital of France?\nAssistant: The capital of France is Paris.'
    );
    expect(windowedTurns).toBe(0);
    expect(truncated).toBe(false);
  });

  it('windows in the immediately preceding turn for context', () => {
    const history = [
      entry('user', 'List three European capitals.'),
      entry('model', 'Paris, Berlin, and Madrid.'),
    ];

    const { text, windowedTurns, truncated } = buildTurnChunk(
      'What about the second one?',
      'Berlin is the capital of Germany.',
      history
    );

    // Current turn LEADS; the preceding turn (2 entries) trails as context.
    expect(text).toBe(
      [
        'User: What about the second one?',
        'Assistant: Berlin is the capital of Germany.',
        '',
        '--- Earlier in this chat (for context) ---',
        'User: List three European capitals.',
        'Assistant: Paris, Berlin, and Madrid.',
      ].join('\n')
    );
    expect(windowedTurns).toBe(2);
    expect(truncated).toBe(false);
  });

  it('drops the oldest windowed context first when over budget, keeping the current turn', () => {
    // A large preceding turn that would blow the budget if windowed in.
    const big = 'x'.repeat(CHUNK_CHAR_BUDGET);
    const history = [entry('user', big), entry('model', big)];

    const { text, windowedTurns, truncated } = buildTurnChunk(
      'short follow up',
      'short answer',
      history
    );

    // Windowed context dropped entirely; current turn preserved untouched.
    expect(windowedTurns).toBe(0);
    expect(truncated).toBe(false);
    expect(text).toBe('User: short follow up\nAssistant: short answer');
    expect(text.length).toBeLessThanOrEqual(CHUNK_CHAR_BUDGET);
  });

  it('truncates the current turn when it alone exceeds the budget', () => {
    const hugeUser = 'a'.repeat(CHUNK_CHAR_BUDGET);
    const hugeAssistant = 'b'.repeat(CHUNK_CHAR_BUDGET);

    const { text, windowedTurns, truncated } = buildTurnChunk(hugeUser, hugeAssistant, []);

    expect(truncated).toBe(true);
    expect(windowedTurns).toBe(0);
    expect(text.length).toBe(CHUNK_CHAR_BUDGET);
    // The current turn is never dropped — it leads with the user message.
    expect(text.startsWith('User: ')).toBe(true);
  });

  it('handles no history (undefined) gracefully', () => {
    const { text, windowedTurns, truncated } = buildTurnChunk('hi', 'hello', undefined);

    expect(text).toBe('User: hi\nAssistant: hello');
    expect(windowedTurns).toBe(0);
    expect(truncated).toBe(false);
  });

  it('handles empty-history array gracefully', () => {
    const { text, windowedTurns } = buildTurnChunk('hi', 'hello', []);

    expect(text).toBe('User: hi\nAssistant: hello');
    expect(windowedTurns).toBe(0);
  });

  it('omits an empty side of the turn but still produces a chunk', () => {
    const { text } = buildTurnChunk('', 'standalone assistant note', []);
    expect(text).toBe('Assistant: standalone assistant note');
  });

  it('skips history entries with no text when windowing', () => {
    const history = [entry('user', ''), entry('model', 'prior answer')];

    const { text, windowedTurns } = buildTurnChunk('next q', 'next a', history);

    expect(windowedTurns).toBe(1);
    expect(text).toBe(
      [
        'User: next q',
        'Assistant: next a',
        '',
        '--- Earlier in this chat (for context) ---',
        'Assistant: prior answer',
      ].join('\n')
    );
  });
});
