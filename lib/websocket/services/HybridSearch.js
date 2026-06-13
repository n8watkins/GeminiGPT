/**
 * Hybrid keyword + vector search helpers (Reciprocal Rank Fusion).
 *
 * Pure vector search is great at semantic similarity but can miss exact-term,
 * proper-noun, or rare-token matches — an error code, a name like "Waffles", a
 * specific API field. This module adds a lightweight lexical layer and fuses the
 * two ranked lists with Reciprocal Rank Fusion (RRF) so the strengths of each
 * complement the other.
 *
 * These helpers are pure (no DB / network access) so they can be unit-tested
 * against plain row arrays. The actual LanceDB queries live in vectorDB.js.
 */

// A small, deliberately conservative English stopword set. We only want to drop
// words so common they carry no retrieval signal; anything domain-specific
// (names, error codes, API fields) must survive.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can',
  'her', 'was', 'one', 'our', 'out', 'his', 'has', 'had', 'how', 'man',
  'new', 'now', 'old', 'see', 'two', 'way', 'who', 'did', 'get', 'him',
  'let', 'put', 'say', 'she', 'too', 'use', 'that', 'this', 'with', 'have',
  'from', 'they', 'will', 'would', 'there', 'their', 'what', 'about', 'which',
  'when', 'were', 'been', 'into', 'your', 'them', 'then', 'than', 'some',
  'could', 'should', 'does', 'doing', 'done', 'just', 'like', 'over', 'such',
  'only', 'also', 'because', 'these', 'those', 'where', 'while', 'here',
]);

// Cap on the number of significant terms we extract. Beyond this, the keyword
// query gets large and noisy without improving recall meaningfully.
const MAX_KEYWORDS = 8;

// Minimum token length to be considered significant.
const MIN_TOKEN_LENGTH = 3;

/**
 * Extract significant keyword terms from a free-text query.
 *
 * Lowercases, tokenizes on non-word characters, drops a basic English stopword
 * set and tokens shorter than {@link MIN_TOKEN_LENGTH} chars, dedupes (preserving
 * first-seen order), and caps the result at {@link MAX_KEYWORDS}.
 *
 * @param {string} query - Free-text search query
 * @returns {string[]} De-duplicated significant terms (lowercased), or [] if none
 */
function extractKeywords(query) {
  if (!query || typeof query !== 'string') return [];

  const tokens = query.toLowerCase().split(/[^\w]+/);
  const seen = new Set();
  const keywords = [];

  for (const token of tokens) {
    if (token.length < MIN_TOKEN_LENGTH) continue;
    if (STOPWORDS.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    keywords.push(token);
    if (keywords.length >= MAX_KEYWORDS) break;
  }

  return keywords;
}

/**
 * Fuse two ranked result lists with Reciprocal Rank Fusion (RRF).
 *
 * RANK CONVENTION: ranks are **0-based** (the first element of each list has
 * rank 0). For a row appearing in a list at index `i`, its contribution from
 * that list is `1 / (k + i)`. A row's total `_rrf` score is the sum of its
 * contributions across every list it appears in. Higher `_rrf` = more relevant.
 *
 * Rows are de-duplicated across the two lists by `message_id`. When the same
 * `message_id` appears in both lists, we keep a single merged row (the vector
 * list's copy is preferred as the base, since it carries the real `_distance`),
 * and that row's score sums both contributions. Each returned row gets an
 * `_rrf` property attached.
 *
 * @param {Array<Object>} vectorRanked - Vector-search rows, best-first
 * @param {Array<Object>} keywordRanked - Keyword-search rows, best-first
 * @param {Object} [options]
 * @param {number} [options.k=60] - RRF dampening constant
 * @returns {Array<Object>} Fused rows ordered by `_rrf` descending
 */
function reciprocalRankFusion(vectorRanked, keywordRanked, options = {}) {
  const { k = 60 } = options;

  const vec = Array.isArray(vectorRanked) ? vectorRanked : [];
  const kw = Array.isArray(keywordRanked) ? keywordRanked : [];

  // message_id -> { row, score }. Vector rows are added first so they become
  // the base copy (preserving the real `_distance`); keyword-only rows are
  // added when first seen from the keyword list.
  const fused = new Map();

  const accumulate = (list) => {
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      if (!row || row.message_id == null) continue;
      const id = row.message_id;
      const contribution = 1 / (k + i); // 0-based rank
      const existing = fused.get(id);
      if (existing) {
        existing.score += contribution;
      } else {
        fused.set(id, { row, score: contribution });
      }
    }
  };

  accumulate(vec);
  accumulate(kw);

  return Array.from(fused.values())
    .sort((a, b) => b.score - a.score)
    .map(({ row, score }) => {
      row._rrf = score;
      return row;
    });
}

module.exports = {
  extractKeywords,
  reciprocalRankFusion,
  // Exported for tests / tuning visibility.
  STOPWORDS,
  MAX_KEYWORDS,
  MIN_TOKEN_LENGTH,
};
