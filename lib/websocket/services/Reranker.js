/**
 * Offline reranker (Maximal Marginal Relevance).
 *
 * After the vector DB hands back ranked candidates, we want the few snippets we
 * actually inject to be BOTH relevant to the query AND diverse from each other —
 * three near-identical paraphrases of the same fact waste context-window budget.
 * MMR balances those two goals with a single tunable knob (`lambda`) and needs
 * no extra LLM call, so it adds essentially zero latency/cost (this app runs on
 * a shared free-tier Gemini pool, which rules out an LLM-based reranker).
 *
 * MMR greedily builds the result set, each step picking the candidate that
 * maximizes:
 *
 *     lambda * relevance - (1 - lambda) * maxCosineSimToAlreadySelected
 *
 * Our embeddings are L2-normalized (unit vectors), so the cosine similarity
 * between two of them is just their dot product.
 */

/**
 * Dot product of two equal-length numeric arrays. For unit vectors this equals
 * their cosine similarity.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 * @private
 */
function dot(a, b) {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Whether a candidate carries a usable unit vector for diversity scoring.
 *
 * @param {*} vector
 * @returns {boolean}
 * @private
 */
function hasUsableVector(vector) {
  return Array.isArray(vector) && vector.length > 0;
}

/**
 * Rerank candidates with Maximal Marginal Relevance.
 *
 * Pure function — does not mutate or reorder the input array, and returns
 * (references to) a subset of the original candidate objects in pick order.
 *
 * @param {Array<{relevance: number, vector?: number[]}>} candidates
 *   Each candidate must expose a numeric `relevance` in [0, 1] (higher = better)
 *   and may expose a unit `vector` (number[]). A candidate without a usable
 *   vector contributes no diversity penalty (its similarity-to-selected is 0).
 * @param {Object} [options]
 * @param {number} [options.count=4] - Maximum number of candidates to return.
 * @param {number} [options.lambda=0.7] - Relevance/diversity trade-off in [0, 1].
 *   1 = pure relevance (ignore diversity); 0 = pure diversity.
 * @returns {Array} Selected candidates (subset of the input) in pick order,
 *   length <= count.
 */
function mmrRerank(candidates, { count = 4, lambda = 0.7 } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const limit = Math.min(count, candidates.length);
  if (limit <= 0) return [];

  const remaining = candidates.slice();
  const selected = [];

  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevance = Number(candidate.relevance) || 0;

      // Diversity penalty = the highest cosine similarity to anything already
      // selected. With no selections yet (or no usable vectors) this is 0, so
      // the first pick is simply the most relevant candidate.
      let maxSim = 0;
      if (hasUsableVector(candidate.vector)) {
        for (const chosen of selected) {
          if (!hasUsableVector(chosen.vector)) continue;
          const sim = dot(candidate.vector, chosen.vector);
          if (sim > maxSim) maxSim = sim;
        }
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = i;
      }
    }

    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected;
}

module.exports = { mmrRerank };
