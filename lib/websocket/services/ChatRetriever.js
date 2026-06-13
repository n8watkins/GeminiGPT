/**
 * Chat Retriever Service (automatic cross-chat RAG)
 *
 * Before each generation, embeds the incoming user message and searches the
 * vector database for relevant snippets from the user's OTHER chats. Relevant
 * results are formatted into a clearly-delimited context block that gets
 * injected into the model request, plus a `sources` array for the
 * `retrieval-info` socket event so the UI can attribute citations.
 *
 * If nothing relevant is found (or retrieval fails), it returns null and the
 * message flow is byte-for-byte identical to before.
 *
 * Usage:
 * ```javascript
 * const { ChatRetriever } = require('./services/ChatRetriever');
 * const retriever = new ChatRetriever(searchChatsFn);
 * const retrieval = await retriever.retrieve(userId, chatId, message, apiKey);
 * // retrieval => { sources: [{ chatId, chatTitle, snippet, score }], contextBlock } | null
 * ```
 */

const { mmrRerank } = require('./Reranker');

const RETRIEVAL_CONFIG = {
  // LanceDB returns `_distance` (squared L2 by default). Our embeddings are
  // L2-normalized in vectorDB.js, so _distance = 2 * (1 - cosineSimilarity).
  // This is the ABSOLUTE ceiling — "nothing this far is ever relevant". We keep
  // it generous (recall-first; the headline feature is remembering) and rely on
  // RELEVANCE_GAP below for precision. Data (tests/manual/threshold-tuning.js,
  // turn-chunk corpus): legitimate paraphrase recalls reach ~0.76, while
  // structural "my X is named Y" false positives also sit ~0.69-0.80 — they
  // OVERLAP, so no absolute threshold separates them. 0.85 keeps paraphrases
  // safe; the gap rule removes the trailing structural neighbours.
  MAX_DISTANCE: 0.85,

  // RELATIVE cutoff: within one query, drop a vector candidate whose distance is
  // more than this far behind the BEST (closest) candidate. The correct fact is
  // essentially always the closest match, so trimming trailing neighbours costs
  // no recall but kills the structural false positives an absolute threshold
  // can't (e.g. a "dog's name" query's best hit at 0.66 vs a "deployment
  // codename" neighbour at ~0.80 — 0.14 apart, dropped). Measured: 0.10 gives
  // full recall + precision ~0.88 on the tuning corpus. Keyword-only hits (null
  // distance) bypass this — they qualified on lexical merit, not distance.
  RELEVANCE_GAP: 0.10,

  // Cap how many snippets we inject so the context block stays small.
  MAX_SNIPPETS: 4,

  // Snippets are truncated to this many characters (contract: <= 200).
  SNIPPET_MAX_LENGTH: 200,

  // Ask LanceDB for more than we need so the threshold + dedupe still
  // leave up to MAX_SNIPPETS good candidates.
  SEARCH_TOP_K: 12,

  // Don't bother retrieving for trivially short messages ("hi", "ok").
  MIN_QUERY_LENGTH: 8,

  // Hybrid search now also surfaces keyword-only hits (rows with no vector
  // distance but a `_keywordScore` >= 1). A row whose `_distance` is above
  // MAX_DISTANCE (or null) can still qualify if it matched at least this many
  // keywords — strong lexical matches are worth keeping even when the vector
  // similarity is borderline. Default 1: any keyword hit is enough.
  MIN_KEYWORD_MATCHES: 1,

  // MMR (Maximal Marginal Relevance) trade-off used to rerank the survivors
  // for relevance AND diversity before we inject them: each pick maximizes
  // `lambda * relevance - (1 - lambda) * maxCosineSimToAlreadySelected`.
  // 0.7 leans toward relevance while still demoting near-duplicate snippets so
  // we don't spend the context budget on three paraphrases of the same fact.
  MMR_LAMBDA: 0.7
};

class ChatRetriever {
  /**
   * @param {Function} searchChatsFn - vectorDB.searchChats(userId, query, topK, options)
   */
  constructor(searchChatsFn) {
    this.searchChats = searchChatsFn;
    console.log('✅ ChatRetriever initialized', {
      maxDistance: RETRIEVAL_CONFIG.MAX_DISTANCE,
      maxSnippets: RETRIEVAL_CONFIG.MAX_SNIPPETS
    });
  }

  /**
   * Truncate content into a snippet
   * @param {string} content - Full message content
   * @returns {string} Snippet of at most SNIPPET_MAX_LENGTH characters
   * @private
   */
  makeSnippet(content) {
    const text = String(content || '').replace(/\s+/g, ' ').trim();
    if (text.length <= RETRIEVAL_CONFIG.SNIPPET_MAX_LENGTH) {
      return text;
    }
    return text.substring(0, RETRIEVAL_CONFIG.SNIPPET_MAX_LENGTH - 3) + '...';
  }

  /**
   * Convert a LanceDB distance into a 0..1 relevance score (higher = better).
   * For unit vectors, cosineSimilarity = 1 - distance / 2.
   *
   * @param {number} distance - LanceDB `_distance` (squared L2)
   * @returns {number} Relevance score rounded to 3 decimals
   * @private
   */
  distanceToScore(distance) {
    const score = 1 - distance / 2;
    return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  }

  /**
   * Compute a 0..1 base relevance score for a candidate row, used both to rank
   * within MMR and (for vector rows) as the displayed `score`.
   *
   * Preference order:
   *  1. The fused rank score `_rrf` if the hybrid search provided one.
   *  2. Otherwise the vector relevance derived from `_distance`.
   *  3. Otherwise (keyword-only hit: null `_distance`, no `_rrf`) a small
   *     positive score that grows with `_keywordScore`, so lexical-only matches
   *     still rank — below any real vector hit but above nothing. Capped well
   *     under 1 so a genuine semantic match always outranks it.
   *
   * @param {Object} result - A candidate row from searchChats.
   * @returns {number} Relevance in [0, 1] (higher = better).
   * @private
   */
  baseRelevance(result) {
    if (typeof result._rrf === 'number') {
      return Math.max(0, Math.min(1, result._rrf));
    }
    if (typeof result._distance === 'number') {
      return this.distanceToScore(result._distance);
    }
    const keywordScore = Number(result._keywordScore) || 0;
    // Diminishing-returns curve that stays in (0, 0.5): one keyword ~0.25,
    // saturating toward 0.5 — comfortably below any vector hit's score.
    return Math.round((0.5 * (1 - 1 / (1 + keywordScore))) * 1000) / 1000;
  }

  /**
   * Relative-gap trim (see RETRIEVAL_CONFIG.RELEVANCE_GAP). Among candidates
   * that have a numeric `distance`, find the closest, then drop any whose
   * distance exceeds best + RELEVANCE_GAP. Candidates without a numeric distance
   * (keyword-only hits) are always kept — they qualified lexically, not by
   * distance. Input order is otherwise preserved.
   *
   * @param {Array} survivors - Gated candidates, each with `distance: number|null`.
   * @returns {Array} The kept subset.
   * @private
   */
  applyRelevanceGap(survivors) {
    const distances = survivors
      .map((s) => s.distance)
      .filter((d) => typeof d === 'number');
    if (distances.length === 0) return survivors; // nothing distance-based to trim

    const best = Math.min(...distances);
    const cutoff = best + RETRIEVAL_CONFIG.RELEVANCE_GAP;
    return survivors.filter(
      (s) => typeof s.distance !== 'number' || s.distance <= cutoff
    );
  }

  /**
   * Build the clearly-delimited context block injected into the model request.
   *
   * @param {Array} sources - [{ chatId, chatTitle, snippet, score }]
   * @returns {string} Context block text
   * @private
   */
  buildContextBlock(sources) {
    const lines = sources.map(
      (source) => `- From the chat "${source.chatTitle}": ${source.snippet}`
    );

    return [
      '[Context recalled from the user\'s other chats — use it only if relevant to the current message:',
      ...lines,
      'If you use any of this, weave it into your answer naturally (e.g. "You mentioned earlier that...") instead of referring to "retrieved context" or "search results". If none of it is relevant, ignore it completely.]'
    ].join('\n');
  }

  /**
   * Retrieve relevant snippets from the user's OTHER chats for this message.
   * Never throws — on any failure, returns null (chat flow unaffected).
   *
   * @param {string} userId - User identifier
   * @param {string} chatId - Current chat identifier (excluded from results)
   * @param {string} message - Incoming user message (used as the query)
   * @param {string|null} apiKey - Visitor-provided API key for embeddings (BYOK)
   * @returns {Promise<{sources: Array, contextBlock: string}|null>}
   */
  async retrieve(userId, chatId, message, apiKey = null) {
    if (!userId || typeof message !== 'string') return null;
    if (message.trim().length < RETRIEVAL_CONFIG.MIN_QUERY_LENGTH) return null;

    try {
      const results = await this.searchChats(
        userId,
        message,
        RETRIEVAL_CONFIG.SEARCH_TOP_K,
        { apiKey, excludeChatId: chatId }
      );

      if (!results || results.length === 0) return null;

      // GATE: keep a row if it's a strong vector match (_distance within
      // MAX_DISTANCE) OR a strong keyword-only match (>= MIN_KEYWORD_MATCHES).
      // Note _distance may be null for keyword-only hits, which fails the
      // distance clause — that's fine, the keyword clause covers them.
      // Then dedupe identical snippets (user message + assistant echo often
      // repeat the same fact) and attach a base relevance + snippet for MMR.
      const seenSnippets = new Set();
      const survivors = [];

      for (const result of results) {
        const distanceQualifies =
          typeof result._distance === 'number' &&
          result._distance <= RETRIEVAL_CONFIG.MAX_DISTANCE;
        const keywordQualifies =
          (Number(result._keywordScore) || 0) >= RETRIEVAL_CONFIG.MIN_KEYWORD_MATCHES;
        if (!distanceQualifies && !keywordQualifies) continue;

        const snippet = this.makeSnippet(result.content);
        if (!snippet || seenSnippets.has(snippet)) continue;
        seenSnippets.add(snippet);

        survivors.push({
          chatId: result.chat_id,
          chatTitle: result.chat_title || 'Untitled Chat',
          snippet,
          // Displayed score stays distance-based for rows with a distance;
          // keyword-only rows get a derived 0..1 score from baseRelevance.
          score:
            typeof result._distance === 'number'
              ? this.distanceToScore(result._distance)
              : this.baseRelevance(result),
          // Internal fields for the reranker (stripped before returning).
          relevance: this.baseRelevance(result),
          vector: Array.isArray(result.vector) ? result.vector : undefined,
          distance: typeof result._distance === 'number' ? result._distance : null
        });
      }

      if (survivors.length === 0) return null;

      // RELATIVE-GAP trim: when there's a vector match, drop vector candidates
      // that are more than RELEVANCE_GAP farther than the closest one. This
      // removes weak structural neighbours that an absolute threshold can't
      // (their distance overlaps the paraphrase band). Keyword-only hits (null
      // distance) are kept regardless — they earned their place lexically.
      const gated = this.applyRelevanceGap(survivors);

      // Rerank for relevance AND diversity, then cap to MAX_SNIPPETS. Rows
      // without a usable vector incur no diversity penalty (MMR falls back to
      // pure relevance ordering for them).
      const reranked = mmrRerank(gated, {
        count: RETRIEVAL_CONFIG.MAX_SNIPPETS,
        lambda: RETRIEVAL_CONFIG.MMR_LAMBDA
      });

      const sources = reranked.map(({ chatId: cId, chatTitle, snippet, score }) => ({
        chatId: cId,
        chatTitle,
        snippet,
        score
      }));

      if (sources.length === 0) return null;

      console.log(`🧠 Cross-chat retrieval: ${sources.length} snippet(s) after MMR rerank`, {
        chatId,
        scores: sources.map((s) => s.score)
      });

      return {
        sources,
        contextBlock: this.buildContextBlock(sources)
      };
    } catch (error) {
      // Retrieval must never break the chat flow
      console.error('Error during cross-chat retrieval (continuing without context):', error);
      return null;
    }
  }
}

module.exports = { ChatRetriever, RETRIEVAL_CONFIG };
