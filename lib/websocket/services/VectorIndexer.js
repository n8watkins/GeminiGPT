/**
 * Vector Indexer Service
 *
 * Handles message indexing to vector database for semantic search.
 *
 * Features:
 * - Message pair indexing (user + assistant)
 * - Chat title extraction
 * - Asynchronous background indexing
 * - Error recovery
 *
 * Usage:
 * ```javascript
 * const { VectorIndexer } = require('./services/VectorIndexer');
 * const indexer = new VectorIndexer(addMessageFn);
 * await indexer.indexMessagePair(userId, chatId, userMsg, assistantMsg, chatHistory);
 * ```
 */

class VectorIndexer {
  constructor(addMessageFn) {
    this.addMessage = addMessageFn;
    console.log('✅ VectorIndexer initialized');
  }

  /**
   * Create message objects for indexing
   *
   * @param {string} message - User message content
   * @param {string} responseText - Assistant response content
   * @returns {Object} Object with userMessage and assistantMessage
   * @private
   */
  createMessageObjects(message, responseText) {
    const userMessage = {
      id: `user-${Date.now()}`,
      content: message,
      role: 'user',
      timestamp: new Date()
    };

    const assistantMessage = {
      id: `assistant-${Date.now()}`,
      content: responseText,
      role: 'assistant',
      timestamp: new Date()
    };

    return { userMessage, assistantMessage };
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
   * Index messages to vector database
   *
   * @param {string} userId - User identifier
   * @param {string} chatId - Chat identifier
   * @param {Object} userMessage - User message object
   * @param {Object} assistantMessage - Assistant message object
   * @param {string} chatTitle - Chat title
   * @private
   */
  async indexMessages(userId, chatId, userMessage, assistantMessage, chatTitle) {
    if (!userId) return;

    try {
      // Index both messages asynchronously
      await Promise.all([
        this.addMessage(userId, chatId, userMessage, chatTitle).catch(err =>
          console.error('Error indexing user message:', err)
        ),
        this.addMessage(userId, chatId, assistantMessage, chatTitle).catch(err =>
          console.error('Error indexing assistant message:', err)
        )
      ]);
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
   */
  async indexMessagePair(userId, chatId, message, responseText, chatHistory) {
    const chatTitle = this.getChatTitle(chatHistory);
    const { userMessage, assistantMessage } = this.createMessageObjects(message, responseText);
    await this.indexMessages(userId, chatId, userMessage, assistantMessage, chatTitle);
  }
}

module.exports = { VectorIndexer };
