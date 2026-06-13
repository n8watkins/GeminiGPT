/**
 * Unit tests for the hybrid keyword + vector search helpers.
 *
 * Pure vector search misses exact-term / proper-noun / rare-token matches; the
 * lexical layer + Reciprocal Rank Fusion recovers those. These tests cover the
 * two pure helpers in isolation (no LanceDB / embeddings):
 *   - extractKeywords: stopwords + short tokens dropped, dedupe, cap
 *   - reciprocalRankFusion: RRF math, dedupe by message_id, and the headline
 *     scenario where a keyword-only hit (absent from / low in the vector list)
 *     gets surfaced into the fused top results.
 */

const {
  extractKeywords,
  reciprocalRankFusion,
} = require('../lib/websocket/services/HybridSearch');

describe('extractKeywords', () => {
  it('lowercases, tokenizes, and drops stopwords + short tokens', () => {
    const kw = extractKeywords('What is the Waffles error code?');
    // "what", "is", "the" are stopwords/short; "code" survives.
    expect(kw).toEqual(['waffles', 'error', 'code']);
  });

  it('dedupes repeated terms (preserving first-seen order)', () => {
    const kw = extractKeywords('Waffles waffles WAFFLES dog');
    expect(kw).toEqual(['waffles', 'dog']);
  });

  it('drops tokens shorter than 3 characters', () => {
    const kw = extractKeywords('go to db ok api');
    // "go", "to", "db", "ok" are < 3 chars or stopwords; "api" survives.
    expect(kw).toEqual(['api']);
  });

  it('tokenizes on non-word characters (punctuation, symbols)', () => {
    const kw = extractKeywords('error-code:ENOENT, retry_count=3');
    expect(kw).toEqual(['error', 'code', 'enoent', 'retry_count']);
  });

  it('caps at 8 significant terms', () => {
    const kw = extractKeywords(
      'alpha bravo charlie delta echo foxtrot golf hotel india juliet'
    );
    expect(kw).toHaveLength(8);
    expect(kw).toEqual([
      'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel',
    ]);
  });

  it('returns [] when nothing significant remains', () => {
    expect(extractKeywords('the and is to')).toEqual([]);
    expect(extractKeywords('')).toEqual([]);
    expect(extractKeywords(null)).toEqual([]);
    expect(extractKeywords(undefined)).toEqual([]);
  });
});

describe('reciprocalRankFusion', () => {
  const row = (id, extra = {}) => ({ message_id: id, content: `c-${id}`, ...extra });

  it('computes RRF scores with 0-based ranks and default k=60', () => {
    const vec = [row('a'), row('b')];
    const fused = reciprocalRankFusion(vec, []);
    // 0-based rank: a at index 0 -> 1/60, b at index 1 -> 1/61.
    expect(fused[0].message_id).toBe('a');
    expect(fused[0]._rrf).toBeCloseTo(1 / 60, 10);
    expect(fused[1].message_id).toBe('b');
    expect(fused[1]._rrf).toBeCloseTo(1 / 61, 10);
  });

  it('respects a custom k value', () => {
    const fused = reciprocalRankFusion([row('a')], [], { k: 10 });
    expect(fused[0]._rrf).toBeCloseTo(1 / 10, 10);
  });

  it('dedupes by message_id and SUMS contributions across both lists', () => {
    const vec = [row('a'), row('b'), row('c')];
    const kw = [row('c'), row('a')];
    const fused = reciprocalRankFusion(vec, kw);
    // Only 3 distinct message_ids survive.
    expect(fused).toHaveLength(3);
    const byId = Object.fromEntries(fused.map((r) => [r.message_id, r._rrf]));
    // a: vec rank 0 + kw rank 1 = 1/60 + 1/61
    expect(byId.a).toBeCloseTo(1 / 60 + 1 / 61, 10);
    // b: vec rank 1 only = 1/61
    expect(byId.b).toBeCloseTo(1 / 61, 10);
    // c: vec rank 2 + kw rank 0 = 1/62 + 1/60
    expect(byId.c).toBeCloseTo(1 / 62 + 1 / 60, 10);
  });

  it('orders the fused result by _rrf descending', () => {
    const vec = [row('a'), row('b'), row('c')];
    const kw = [row('c')];
    const fused = reciprocalRankFusion(vec, kw);
    const scores = fused.map((r) => r._rrf);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
    // c appears in both lists, so it should rank first.
    expect(fused[0].message_id).toBe('c');
  });

  it('prefers the vector-list row object as the base (keeps real _distance)', () => {
    const vec = [row('a', { _distance: 0.42 })];
    const kw = [row('a', { _distance: null, _keywordScore: 2 })];
    const fused = reciprocalRankFusion(vec, kw);
    expect(fused).toHaveLength(1);
    // The retained object is the vector copy, so _distance is the real number.
    expect(fused[0]._distance).toBe(0.42);
  });

  it('surfaces a keyword-only hit that vector search ranked absent', () => {
    // Vector search returned 12 semantically-similar-but-wrong rows and did NOT
    // surface the row that literally contains the rare proper noun "Waffles".
    const vec = Array.from({ length: 12 }, (_, i) =>
      row(`vec-${i}`, { _distance: 0.9 + i * 0.01 })
    );
    // Keyword search found the exact "Waffles" message at rank 0.
    const kw = [row('kw-waffles', { _distance: null, _keywordScore: 1 })];

    const fused = reciprocalRankFusion(vec, kw);
    const topIds = fused.slice(0, 3).map((r) => r.message_id);
    // The keyword-only hit (kw rank 0 -> 1/60) outscores every vector row below
    // rank 0 (1/61, 1/62, ...), so it lands in the fused top results.
    expect(topIds).toContain('kw-waffles');
    // It still carries its keyword-only markers.
    const waffles = fused.find((r) => r.message_id === 'kw-waffles');
    expect(waffles._distance).toBeNull();
    expect(waffles._keywordScore).toBe(1);
    expect(typeof waffles._rrf).toBe('number');
  });

  it('skips rows without a message_id and tolerates non-array inputs', () => {
    const fused = reciprocalRankFusion(
      [row('a'), { content: 'no id' }, null],
      undefined
    );
    expect(fused).toHaveLength(1);
    expect(fused[0].message_id).toBe('a');
  });
});
