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

const RETRIEVAL_CONFIG = {
  // LanceDB returns `_distance` (squared L2 by default). Our embeddings are
  // L2-normalized in vectorDB.js, so _distance = 2 * (1 - cosineSimilarity).
  // Measured empirically with gemini-embedding-001 @ 768 dims (see
  // tests/integration/test-cross-chat-rag.js): for the cross-chat question
  // "what is my dog's name?", the planted fact ("my dog's name is Waffles...")
  // scored 0.656 and the assistant's paraphrased echo 0.801, while unrelated
  // content ("how do I center a div in CSS?") sat at 1.13-1.17. 0.85
  // (cosine ~0.575) keeps direct hits and paraphrases, drops noise with a
  // ~0.3 margin.
  MAX_DISTANCE: 0.85,

  // Cap how many snippets we inject so the context block stays small.
  MAX_SNIPPETS: 4,

  // Snippets are truncated to this many characters (contract: <= 200).
  SNIPPET_MAX_LENGTH: 200,

  // Ask LanceDB for more than we need so the threshold + dedupe still
  // leave up to MAX_SNIPPETS good candidates.
  SEARCH_TOP_K: 12,

  // Don't bother retrieving for trivially short messages ("hi", "ok").
  MIN_QUERY_LENGTH: 8
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

      // Keep only results above the relevance threshold, dedupe identical
      // snippets (user message + assistant echo often repeat facts), cap count.
      const sources = [];
      const seenSnippets = new Set();

      for (const result of results) {
        if (typeof result._distance !== 'number' || result._distance > RETRIEVAL_CONFIG.MAX_DISTANCE) {
          continue;
        }

        const snippet = this.makeSnippet(result.content);
        if (!snippet || seenSnippets.has(snippet)) continue;
        seenSnippets.add(snippet);

        sources.push({
          chatId: result.chat_id,
          chatTitle: result.chat_title || 'Untitled Chat',
          snippet,
          score: this.distanceToScore(result._distance)
        });

        if (sources.length >= RETRIEVAL_CONFIG.MAX_SNIPPETS) break;
      }

      if (sources.length === 0) return null;

      console.log(`🧠 Cross-chat retrieval: ${sources.length} snippet(s) above threshold`, {
        chatId,
        distances: results.slice(0, RETRIEVAL_CONFIG.MAX_SNIPPETS).map(r => Number(r._distance?.toFixed?.(3)))
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
