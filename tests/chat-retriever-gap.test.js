/**
 * Tests for ChatRetriever's relative-gap trim (RETRIEVAL_CONFIG.RELEVANCE_GAP).
 *
 * An absolute distance threshold can't separate a weak structural neighbour
 * (e.g. a "production deployment codename" turn) from a legitimate paraphrase —
 * their distances overlap. The gap rule drops vector candidates that trail the
 * closest match by more than RELEVANCE_GAP, which removes the neighbour without
 * costing recall (the correct fact is essentially always the closest match).
 */

const { ChatRetriever, RETRIEVAL_CONFIG } = require('../lib/websocket/services/ChatRetriever');

// Build a retriever whose searchChats returns a fixed set of rows.
function retrieverReturning(rows) {
  return new ChatRetriever(async () => rows);
}

const QUERY = 'what is my dog\'s name?'; // length >= MIN_QUERY_LENGTH

describe('ChatRetriever relevance-gap trim', () => {
  it('drops a structural neighbour that trails the best match by more than the gap', async () => {
    const best = 0.66;
    const neighbour = best + RETRIEVAL_CONFIG.RELEVANCE_GAP + 0.05; // clearly beyond the gap
    const rows = [
      { chat_id: 'dog', chat_title: 'Dog chat', content: 'User: my dog is named Waffles, a corgi.', _distance: best, _keywordScore: 0, vector: [1, 0, 0] },
      { chat_id: 'deploy', chat_title: 'Deploy chat', content: 'User: my production deployment codename is Zephyr-Quokka-7X.', _distance: neighbour, _keywordScore: 0, vector: [0, 1, 0] },
    ];
    // Both pass the absolute gate (<= MAX_DISTANCE)…
    expect(neighbour).toBeLessThanOrEqual(RETRIEVAL_CONFIG.MAX_DISTANCE);

    const result = await retrieverReturning(rows).retrieve('u1', 'current', QUERY);
    expect(result).not.toBeNull();
    const ids = result.sources.map((s) => s.chatId);
    expect(ids).toContain('dog');
    expect(ids).not.toContain('deploy'); // trimmed by the gap
  });

  it('keeps a trailing match that is within the gap', async () => {
    const rows = [
      { chat_id: 'a', chat_title: 'A', content: 'User: alpha fact about widgets.', _distance: 0.60, _keywordScore: 0, vector: [1, 0, 0] },
      { chat_id: 'b', chat_title: 'B', content: 'User: beta fact also about widgets.', _distance: 0.60 + RETRIEVAL_CONFIG.RELEVANCE_GAP - 0.01, _keywordScore: 0, vector: [0, 1, 0] },
    ];
    const result = await retrieverReturning(rows).retrieve('u1', 'current', QUERY);
    const ids = result.sources.map((s) => s.chatId);
    expect(ids).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('keeps keyword-only hits (null distance) regardless of the gap', async () => {
    const rows = [
      { chat_id: 'vec', chat_title: 'Vec', content: 'User: the strong vector match here.', _distance: 0.55, _keywordScore: 0, vector: [1, 0, 0] },
      // keyword-only hit: no usable distance, but matched a rare token lexically
      { chat_id: 'kw', chat_title: 'KW', content: 'User: contains the exact token Zephyr-Quokka-7X.', _distance: null, _keywordScore: 2, vector: [0, 1, 0] },
    ];
    const result = await retrieverReturning(rows).retrieve('u1', 'current', QUERY);
    const ids = result.sources.map((s) => s.chatId);
    expect(ids).toContain('vec');
    expect(ids).toContain('kw'); // survives despite null distance
  });
});
