/**
 * Message Pipeline Orchestrator
 *
 * Coordinates all services to process a message from user through to AI response.
 *
 * Pipeline stages:
 * 1. Rate limiting check
 * 2. Pool budget check (shared server key only; BYOK is never blocked)
 * 3. History processing
 * 4. Attachment processing
 * 5. Cross-chat retrieval (automatic RAG context from the user's other chats)
 * 6. Gemini API call
 * 7. Message indexing
 * 8. Usage reporting (usage-info to sender; pool meter broadcast to everyone)
 *
 * Usage:
 * ```javascript
 * const { MessagePipeline } = require('./services/MessagePipeline');
 * const pipeline = new MessagePipeline(rateLimiter, historyProcessor, attachmentHandler, geminiService, vectorIndexer, chatRetriever, usageTracker);
 * await pipeline.processMessage(socket, data);
 * ```
 */

class MessagePipeline {
  constructor(rateLimiter, historyProcessor, attachmentHandler, geminiService, vectorIndexer, chatRetriever = null, usageTracker = null) {
    this.rateLimiter = rateLimiter;
    this.historyProcessor = historyProcessor;
    this.attachmentHandler = attachmentHandler;
    this.geminiService = geminiService;
    this.vectorIndexer = vectorIndexer;
    this.chatRetriever = chatRetriever;
    this.usageTracker = usageTracker;
    console.log('✅ MessagePipeline initialized', { autoRetrieval: !!chatRetriever, usageTracking: !!usageTracker });
  }

  /**
   * Check rate limit and handle rejection
   *
   * CRITICAL: Users with their own API key (BYOK) are NOT rate limited.
   * Only users using the shared server key are rate limited.
   *
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} chatId - Chat identifier
   * @param {string} userId - User identifier
   * @param {string} [apiKey] - Optional API key (BYOK users bypass rate limits)
   * @returns {Object} Rate limit result
   * @private
   */
  checkRateLimit(socket, chatId, userId, apiKey = null) {
    // CRITICAL: BYOK users get unlimited access (no rate limiting)
    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
      console.log(`✅ BYOK user detected - bypassing rate limits for user ${userId}`);

      // Return unlimited rate limit info for BYOK users
      const unlimitedRateLimit = {
        allowed: true,
        retryAfter: 0,
        remaining: {
          minute: 999999, // Show as unlimited in UI
          hour: 999999
        },
        limit: {
          minute: 999999,
          hour: 999999
        },
        resetAt: {
          minute: Date.now() + 60000,
          hour: Date.now() + 3600000
        }
      };

      // Send unlimited rate limit info to client
      socket.emit('rate-limit-info', {
        remaining: unlimitedRateLimit.remaining,
        limit: unlimitedRateLimit.limit,
        resetAt: unlimitedRateLimit.resetAt
      });

      return unlimitedRateLimit;
    }

    // Users without API key (using shared server key) are rate limited
    console.log(`🔍 Checking rate limits for user ${userId} (using shared server key)`);
    const rateLimit = this.rateLimiter.checkLimit(userId, null);

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
   * Check the shared pool's daily budget (pool-key requests only).
   *
   * CRITICAL: BYOK users are NEVER blocked by the pool budget — only requests
   * that would be served by the shared server key count against (and are
   * limited by) the pool.
   *
   * On exhaustion this rejects via the standard `message-error` path with
   * `code: 'POOL_EXHAUSTED'` (contract in docs/RAG_OVERHAUL_PLAN.md) so the
   * UI can offer BYOK as the upgrade path, and sends a `usage-info` snapshot
   * showing `available: 0`.
   *
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} chatId - Chat identifier
   * @param {string} userId - User identifier
   * @param {string} [apiKey] - Optional API key (BYOK bypasses the pool)
   * @returns {boolean} True if the message may proceed
   * @private
   */
  checkPoolBudget(socket, chatId, userId, apiKey = null) {
    // BYOK requests never draw from the pool
    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
      return true;
    }

    if (!this.usageTracker || this.usageTracker.hasPoolBudget()) {
      return true;
    }

    const pool = this.usageTracker.getPoolUsage();
    console.log(`🚫 Pool budget exhausted (${pool.used}/${pool.budget}) - rejecting pool request from user ${userId}`);

    socket.emit('message-error', {
      chatId,
      code: 'POOL_EXHAUSTED',
      message: `The shared demo pool has used all ${pool.budget} of today's free requests. It refills at midnight UTC — or add your own free Gemini API key (takes about a minute) to keep chatting without limits.`,
      pool
    });

    // Let the UI's meter reflect the empty pool immediately
    socket.emit('usage-info', this.usageTracker.buildUsageInfo(userId));
    socket.emit('typing', { chatId, isTyping: false });

    return false;
  }

  /**
   * Emit usage-info after a completed message: full snapshot to the sender,
   * and (when the pool was drawn down) the pool portion to everyone else so
   * all connected meters move in real time.
   *
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} userId - User identifier
   * @param {boolean} poolChanged - Whether this message consumed pool budget
   * @private
   */
  emitUsageInfo(socket, userId, poolChanged) {
    if (!this.usageTracker) return;

    try {
      const usageInfo = this.usageTracker.buildUsageInfo(userId);
      socket.emit('usage-info', usageInfo);

      if (poolChanged) {
        // Other sockets get the shared pool state; their own user stats are
        // unaffected by this message (user: null = "no update for you").
        socket.broadcast.emit('usage-info', { pool: usageInfo.pool, user: null });
      }
    } catch (error) {
      // Usage reporting must never break the message flow
      console.error('❌ Failed to emit usage-info:', error);
    }
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

    // Stage 2: Pool budget check (BYOK requests are never blocked by this)
    if (!this.checkPoolBudget(socket, chatId, userId, apiKey)) {
      return; // Pool exhausted - message-error with POOL_EXHAUSTED already sent
    }

    // Debug logging
    this.logChatHistory(chatId, userId, chatHistory);

    // Emit typing indicator
    socket.emit('typing', { chatId, isTyping: true });

    try {
      // Stage 3: History processing
      const finalHistory = this.historyProcessor.processHistory(chatHistory);

      // Stage 4: Attachment processing
      const { messageParts } = await this.attachmentHandler.processAttachments(attachments, message);

      // Stage 5: Automatic cross-chat retrieval (RAG)
      // Embed the incoming message, search the user's OTHER chats, and inject
      // relevant snippets as a context block. No matches = no change at all.
      if (this.chatRetriever) {
        const retrieval = await this.chatRetriever.retrieve(userId, chatId, message, apiKey);
        if (retrieval && retrieval.sources.length > 0) {
          // Emit BEFORE the message-response stream starts so the UI can
          // attribute the upcoming response to these sources.
          socket.emit('retrieval-info', {
            chatId,
            sources: retrieval.sources
          });

          // Inject as a user/model exchange to keep history roles alternating.
          finalHistory.push(
            { role: 'user', parts: [{ text: retrieval.contextBlock }] },
            { role: 'model', parts: [{ text: 'Noted. I will weave that context in naturally if it is relevant, and ignore it otherwise.' }] }
          );
        }
      }

      // Stage 6: Gemini API call
      // A pool-key request is "spent" the moment the generation starts (the
      // API call is made either way), so record it before sending. Mirrors
      // the gemini_logs row GeminiService writes for this request.
      const usingPool = !apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0;
      if (usingPool && this.usageTracker) {
        this.usageTracker.recordPoolRequest();
      }

      const result = await this.geminiService.sendMessage(
        socket,
        chatId,
        finalHistory,
        messageParts,
        message,
        chatHistory,
        { userId, apiKey }
      );

      // Stage 7: Message indexing (uses the visitor's key when provided, BYOK)
      if (result && result.response && !result.blocked && !result.error) {
        await this.vectorIndexer.indexMessagePair(userId, chatId, message, result.response, chatHistory, apiKey);
      }

      // Stage 8: Usage reporting (sender snapshot + global pool meter broadcast)
      this.emitUsageInfo(socket, userId, usingPool);

      socket.emit('typing', { chatId, isTyping: false });
    } catch (error) {
      // Re-throw to be handled by caller
      socket.emit('typing', { chatId, isTyping: false });
      throw error;
    }
  }
}

module.exports = { MessagePipeline };
