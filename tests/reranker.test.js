/**
 * MMR reranker unit tests.
 *
 * The reranker (lib/websocket/services/Reranker.js) takes ranked retrieval
 * candidates and reorders them for relevance AND diversity, so we don't inject
 * three paraphrases of the same fact into the model context. These tests cover
 * the MMR math directly:
 *   - near-duplicates get demoted in favour of a distinct candidate,
 *   - candidates without vectors fall back to pure relevance ordering,
 *   - the output is capped to `count`.
 */

const { mmrRerank } = require('../lib/websocket/services/Reranker');

// Build a 768-ish unit vector from a 2D direction (angle in radians), padded
// with zeros. Keeping it 2D-meaningful makes the cosine geometry easy to reason
// about while still being a valid (unit-norm) vector.
function unitVec(angleRad) {
  return [Math.cos(angleRad), Math.sin(angleRad)];
}

describe('mmrRerank', () => {
  it('prefers a distinct candidate over a near-duplicate for the 2nd pick', () => {
    // Three near-identical high-relevance vectors (tiny angular separation) and
    // one distinct vector that is slightly LESS relevant.
    const dupA = { id: 'dupA', relevance: 0.95, vector: unitVec(0.0) };
    const dupB = { id: 'dupB', relevance: 0.93, vector: unitVec(0.001) };
    const dupC = { id: 'dupC', relevance: 0.92, vector: unitVec(0.002) };
    const distinct = { id: 'distinct', relevance: 0.8, vector: unitVec(Math.PI / 2) };

    const result = mmrRerank([dupA, dupB, dupC, distinct], { count: 2, lambda: 0.7 });

    expect(result).toHaveLength(2);
    // First pick is the most relevant (no diversity penalty yet).
    expect(result[0].id).toBe('dupA');
    // Second pick must be the distinct one: although dupB has higher raw
    // relevance, its near-1.0 cosine similarity to dupA wipes out its MMR score.
    expect(result[1].id).toBe('distinct');
  });

  it('falls back to pure relevance ordering when candidates lack vectors', () => {
    const candidates = [
      { id: 'low', relevance: 0.3 },
      { id: 'high', relevance: 0.9 },
      { id: 'mid', relevance: 0.6 }
    ];

    const result = mmrRerank(candidates, { count: 3, lambda: 0.7 });

    expect(result.map((c) => c.id)).toEqual(['high', 'mid', 'low']);
  });

  it('caps the output length to count', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      relevance: 1 - i * 0.05,
      vector: unitVec(i)
    }));

    const result = mmrRerank(candidates, { count: 3, lambda: 0.7 });
    expect(result).toHaveLength(3);
  });

  it('returns at most as many candidates as provided', () => {
    const candidates = [
      { id: 'a', relevance: 0.9 },
      { id: 'b', relevance: 0.5 }
    ];
    const result = mmrRerank(candidates, { count: 5, lambda: 0.7 });
    expect(result).toHaveLength(2);
  });

  it('returns an empty array for empty input', () => {
    expect(mmrRerank([], { count: 4, lambda: 0.7 })).toEqual([]);
  });

  it('does not mutate or reorder the input array', () => {
    const candidates = [
      { id: 'a', relevance: 0.5 },
      { id: 'b', relevance: 0.9 }
    ];
    const snapshot = candidates.slice();
    mmrRerank(candidates, { count: 2, lambda: 0.7 });
    expect(candidates).toEqual(snapshot);
    expect(candidates[0].id).toBe('a');
  });
});
