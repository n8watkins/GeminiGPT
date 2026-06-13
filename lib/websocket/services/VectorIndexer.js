/**
 * Vector Indexer Service
 *
 * Handles message indexing to vector database for semantic search.
 *
 * Features:
 * - Conversation-window turn-chunk indexing (one context-carrying row per turn)
 * - Chat title extraction
 * - Asynchronous background indexing
 * - Error recovery
 *
 * Each completed turn (user message + assistant response) is combined into ONE
 * "turn chunk" via ConversationChunker, optionally prefixed with a short window
 * of the preceding turn so follow-ups retain meaning. This is stored as a single
 * row with role 'turn' (instead of two isolated user/assistant rows), which both
 * preserves conversational context and reduces the dedupe burden on the read
 * path. Older rows written before this change remain searchable.
 *
 * Usage:
 * ```javascript
 * const { VectorIndexer } = require('./services/VectorIndexer');
 * const indexer = new VectorIndexer(addMessageFn);
 * await indexer.indexMessagePair(userId, chatId, userMsg, assistantMsg, chatHistory);
 * ```
 */

const { buildTurnChunk } = require('./ConversationChunker');

class VectorIndexer {
  constructor(addMessageFn) {
    this.addMessage = addMessageFn;
    console.log('✅ VectorIndexer initialized');
  }

  /**
   * Build a single context-carrying turn-chunk message object for indexing.
   *
   * The chunk combines the current user message + assistant response (and a
   * short window of the preceding turn) into one string; that string is what
   * gets embedded by vectorDB.addMessage. The stored role is 'turn'.
   *
   * @param {string} message - User message content
   * @param {string} responseText - Assistant response content
   * @param {Array} chatHistory - Gemini-shaped prior history ({role, parts:[{text}]})
   * @returns {{ turnMessage: Object, chunkMeta: { windowedTurns: number, truncated: boolean } }}
   * @private
   */
  createTurnChunk(message, responseText, chatHistory) {
    const { text, windowedTurns, truncated } = buildTurnChunk(message, responseText, chatHistory);

    const turnMessage = {
      id: `turn-${Date.now()}`,
      content: text,
      role: 'turn',
      timestamp: new Date()
    };

    return { turnMessage, chunkMeta: { windowedTurns, truncated } };
  }

  /**
   * Get chat title from history or generate default
   *
   * @param {Array} chatHistory - Array of chat messages
   * @returns {string} Chat title
   * @private
   */
  getChatTitle(chatHistory) {
    return chatHistory.length > 0 ?
      (chatHistory[0].role === 'user' && chatHistory[0].parts && chatHistory[0].parts[0] ?
        chatHistory[0].parts[0].text.substring(0, 50) + '...' : 'Chat') :
      'New Chat';
  }

  /**
   * Index a single combined turn-chunk row to the vector database.
   *
   * @param {string} userId - User identifier
   * @param {string} chatId - Chat identifier
   * @param {Object} turnMessage - Combined turn-chunk message object (role 'turn')
   * @param {string} chatTitle - Chat title
   * @param {Object} chunkMeta - Chunk bookkeeping ({ windowedTurns, truncated })
   * @param {string|null} apiKey - Visitor-provided API key for embeddings (BYOK)
   * @private
   */
  async indexTurn(userId, chatId, turnMessage, chatTitle, chunkMeta, apiKey = null) {
    if (!userId) return;

    const metadata = {
      kind: 'turn',
      windowedTurns: chunkMeta.windowedTurns,
      truncated: chunkMeta.truncated
    };

    try {
      await this.addMessage(userId, chatId, turnMessage, chatTitle, metadata, apiKey).catch(err =>
        console.error('Error indexing turn chunk:', err)
      );
    } catch (error) {
      console.error('Error in background indexing:', error);
    }
  }

  /**
   * Handle message indexing with chat title extraction
   *
   * @param {string} userId - User identifier
   * @param {string} chatId - Chat identifier
   * @param {string} message - User message text
   * @param {string} responseText - Assistant response text
   * @param {Array} chatHistory - Chat history array
   * @param {string|null} apiKey - Visitor-provided API key for embeddings (BYOK)
   */
  async indexMessagePair(userId, chatId, message, responseText, chatHistory, apiKey = null) {
    const chatTitle = this.getChatTitle(chatHistory);
    const { turnMessage, chunkMeta } = this.createTurnChunk(message, responseText, chatHistory);
    await this.indexTurn(userId, chatId, turnMessage, chatTitle, chunkMeta, apiKey);
  }
}

module.exports = { VectorIndexer };
