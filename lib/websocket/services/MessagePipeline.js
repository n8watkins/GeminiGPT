/**
 * Message Pipeline Orchestrator
 *
 * Coordinates all services to process a message from user through to AI response.
 *
 * Pipeline stages:
 * 1. Rate limiting check
 * 2. History processing
 * 3. Attachment processing
 * 4. Gemini API call
 * 5. Message indexing
 *
 * Usage:
 * ```javascript
 * const { MessagePipeline } = require('./services/MessagePipeline');
 * const pipeline = new MessagePipeline(rateLimiter, historyProcessor, attachmentHandler, geminiService, vectorIndexer);
 * await pipeline.processMessage(socket, data);
 * ```
 */

class MessagePipeline {
  constructor(rateLimiter, historyProcessor, attachmentHandler, geminiService, vectorIndexer) {
    this.rateLimiter = rateLimiter;
    this.historyProcessor = historyProcessor;
    this.attachmentHandler = attachmentHandler;
    this.geminiService = geminiService;
    this.vectorIndexer = vectorIndexer;
    console.log('✅ MessagePipeline initialized');
  }

  /**
   * Check rate limit and handle rejection (supports per-API-key limiting)
   *
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} chatId - Chat identifier
   * @param {string} userId - User identifier
   * @param {string} [apiKey] - Optional API key for per-key rate limiting
   * @returns {Object} Rate limit result
   * @private
   */
  checkRateLimit(socket, chatId, userId, apiKey = null) {
    // Create API key fingerprint if provided (for rate limiting without exposing key)
    // SECURITY: Use SHA-256 for cryptographically secure fingerprinting
    let apiKeyFingerprint = null;
    if (apiKey && typeof apiKey === 'string') {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
      apiKeyFingerprint = hash.substring(0, 16);
    }

    const rateLimit = this.rateLimiter.checkLimit(userId, apiKeyFingerprint);

    // Send rate limit info to client (for UI display)
    socket.emit('rate-limit-info', {
      remaining: rateLimit.remaining,
      limit: rateLimit.limit,
      resetAt: rateLimit.resetAt
    });

    // If rate limited, reject the request
    if (!rateLimit.allowed) {
      const retryInSeconds = Math.ceil(rateLimit.retryAfter / 1000);
      const retryInMinutes = Math.ceil(retryInSeconds / 60);
      const limitTypeText = rateLimit.limitType === 'minute' ? 'minute' : 'hour';

      console.log(`🚫 Rate limit exceeded for user ${userId}. Retry after ${retryInSeconds}s`);

      // Calculate the exact time when they can send again
      const resetTime = new Date(rateLimit.resetAt[rateLimit.limitType]);
      const resetTimeString = resetTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Create a friendly message
      let waitMessage;
      if (retryInSeconds < 60) {
        waitMessage = `${retryInSeconds} seconds`;
      } else if (retryInMinutes < 60) {
        waitMessage = `${retryInMinutes} minute${retryInMinutes > 1 ? 's' : ''}`;
      } else {
        const hours = Math.ceil(retryInMinutes / 60);
        waitMessage = `${hours} hour${hours > 1 ? 's' : ''}`;
      }

      // Send friendly message to client
      socket.emit('message-response', {
        chatId,
        message: `### You've reached your message limit\n\nTo prevent abuse, there's a limit on how many messages you can send per ${limitTypeText}.\n\n**You can send more messages in ${waitMessage}** (at ${resetTimeString}).\n\n**Current usage:**\n- ${rateLimit.remaining.minute} of ${rateLimit.limit.minute} messages remaining this minute\n- ${rateLimit.remaining.hour} of ${rateLimit.limit.hour} messages remaining this hour\n\nThank you for your patience! 🙏`,
        isComplete: true,
        rateLimited: true
      });

      socket.emit('typing', { chatId, isTyping: false });
    } else {
      console.log(`✅ Rate limit check passed for user ${userId}. Remaining: ${rateLimit.remaining.minute}/min, ${rateLimit.remaining.hour}/hr`);
    }

    return rateLimit;
  }

  /**
   * Log chat history debug info
   *
   * @param {string} chatId - Chat identifier
   * @param {string} userId - User identifier
   * @param {Array} chatHistory - Chat history array
   * @private
   */
  logChatHistory(chatId, userId, chatHistory) {
    console.log('📝 Chat History Debug:');
    console.log('  - Chat ID:', chatId);
    console.log('  - History length:', chatHistory ? chatHistory.length : 'undefined');
    console.log('  - User ID:', userId);

    if (chatHistory && chatHistory.length > 0) {
      console.log('  - First message:', {
        role: chatHistory[0].role,
        content: chatHistory[0].content?.substring(0, 50) + '...',
        hasAttachments: !!chatHistory[0].attachments?.length
      });
      console.log('  - Last message:', {
        role: chatHistory[chatHistory.length - 1].role,
        content: chatHistory[chatHistory.length - 1].content?.substring(0, 50) + '...',
        hasAttachments: !!chatHistory[chatHistory.length - 1].attachments?.length
      });
    } else {
      console.log('  - No chat history provided!');
    }
  }

  /**
   * Process a message through the complete pipeline
   *
   * @param {Object} socket - Socket.IO socket instance
   * @param {Object} data - Message data
   * @param {string} data.message - User message text
   * @param {Array} data.chatHistory - Chat history
   * @param {string} data.chatId - Chat identifier
   * @param {Array} data.attachments - File attachments
   * @param {string} data.userId - User identifier
   * @param {string} data.apiKey - User's Gemini API key (BYOK)
   */
  async processMessage(socket, data) {
    const { message, chatHistory, chatId, attachments, userId, apiKey } = data;

    // Stage 1: Rate limiting check (includes per-API-key limiting)
    const rateLimit = this.checkRateLimit(socket, chatId, userId, apiKey);
    if (!rateLimit.allowed) {
      return; // Stop processing if rate limited
    }

    // Debug logging
    this.logChatHistory(chatId, userId, chatHistory);

    // Emit typing indicator
    socket.emit('typing', { chatId, isTyping: true });

    try {
      // Stage 2: History processing
      const finalHistory = this.historyProcessor.processHistory(chatHistory);

      // Stage 3: Attachment processing
      const { messageParts } = await this.attachmentHandler.processAttachments(attachments, message);

      // Stage 4: Gemini API call
      const result = await this.geminiService.sendMessage(
        socket,
        chatId,
        finalHistory,
        messageParts,
        message,
        chatHistory,
        { userId, apiKey }
      );

      // Stage 5: Message indexing
      if (result && result.response && !result.blocked && !result.error) {
        await this.vectorIndexer.indexMessagePair(userId, chatId, message, result.response, chatHistory);
      }

      socket.emit('typing', { chatId, isTyping: false });
    } catch (error) {
      // Re-throw to be handled by caller
      socket.emit('typing', { chatId, isTyping: false });
      throw error;
    }
  }
}

module.exports = { MessagePipeline };
