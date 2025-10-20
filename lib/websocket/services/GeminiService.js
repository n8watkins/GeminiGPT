/**
 * Gemini Service
 *
 * Handles all interactions with Google's Gemini API.
 *
 * Features:
 * - Streaming response handling
 * - Function calling support
 * - Safety filter detection
 * - Error recovery
 * - Debug event emission
 * - Timeout protection
 * - Response length limits
 *
 * Usage:
 * ```javascript
 * const { GeminiService } = require('./services/GeminiService');
 * const gemini = new GeminiService(genAI, tools, functionHandlers);
 * const response = await gemini.sendMessage(socket, chatId, finalHistory, messageParts);
 * ```
 */

// Import logger
const { geminiLogger } = require('../../logger');

// Configuration constants
const GEMINI_CONFIG = {
  API_TIMEOUT_MS: 60000, // 60 seconds for API calls
  MAX_RESPONSE_LENGTH: 50000, // 50K characters max
  MAX_FUNCTION_RESULT_LENGTH: 10000, // 10K characters for function results
  MAX_FUNCTION_CALLS_PER_MESSAGE: 5 // Limit function calls to prevent loops
};

class GeminiService {
  constructor(genAI, tools, functionHandlers) {
    this.genAI = genAI;
    this.tools = tools;
    this.functionHandlers = functionHandlers;

    // LRU Cache for GoogleGenerativeAI instances (keyed by API key fingerprint)
    // Prevents creating new instances for every request from the same user
    this.genAICache = new Map(); // { fingerprint: genAI instance }
    this.cacheAccessTimes = new Map(); // { fingerprint: timestamp } for LRU tracking
    this.cacheMaxSize = 100; // Limit cache size to prevent memory issues

    // Cache for validated API keys (avoid repeated validation calls)
    // { fingerprint: { valid: boolean, timestamp: number, reason?: string } }
    this.validatedKeys = new Map();
    this.validationCacheDuration = 3600000; // 1 hour

    geminiLogger.info('✅ GeminiService initialized with config:', {
      apiTimeout: `${GEMINI_CONFIG.API_TIMEOUT_MS / 1000}s`,
      maxResponseLength: GEMINI_CONFIG.MAX_RESPONSE_LENGTH,
      maxFunctionCalls: GEMINI_CONFIG.MAX_FUNCTION_CALLS_PER_MESSAGE,
      cacheEnabled: true,
      cachePolicy: 'LRU',
      cacheMaxSize: this.cacheMaxSize,
      apiKeyValidation: true
    });
  }

  /**
   * Validate API key format
   *
   * @param {string} key - API key to validate
   * @returns {boolean} True if key appears valid
   * @private
   */
  isValidApiKey(key) {
    // Basic validation to prevent crashes from malformed keys
    if (!key || typeof key !== 'string') {
      return false;
    }

    const trimmedKey = key.trim();

    // Gemini API keys start with 'AIza'
    if (!trimmedKey.startsWith('AIza')) {
      return false;
    }

    // Minimum length check (Gemini keys are typically 39 characters)
    if (trimmedKey.length < 39) {
      return false;
    }

    // Maximum reasonable length (prevent massive strings)
    if (trimmedKey.length > 100) {
      return false;
    }

    // Valid characters check (alphanumeric, underscore, hyphen)
    if (!/^[A-Za-z0-9_-]+$/.test(trimmedKey)) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize API key for logging (shows only first/last 4 chars)
   *
   * @param {string} key - API key to sanitize
   * @returns {string} Sanitized string safe for logging
   * @private
   */
  sanitizeApiKeyForLogging(key) {
    if (!key || typeof key !== 'string' || key.length < 12) {
      return '***';
    }

    const first4 = key.substring(0, 4);
    const last4 = key.substring(key.length - 4);
    return `${first4}...${last4}`;
  }

  /**
   * Create a cryptographically secure fingerprint hash of an API key for caching
   * Does NOT reveal the actual key
   *
   * SECURITY: Uses SHA-256 for collision resistance and prevents reverse-engineering
   *
   * @param {string} key - API key to fingerprint
   * @returns {string} Secure hash fingerprint (16 chars)
   * @private
   */
  getApiKeyFingerprint(key) {
    if (!key || typeof key !== 'string') {
      return 'server'; // Special fingerprint for server key
    }

    // Use Node.js crypto module for SHA-256 hash
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    // Use first 16 chars for better collision resistance
    return hash.substring(0, 16);
  }

  /**
   * Validate API key by making a minimal test call to Google's API
   *
   * SECURITY: Verifies the key actually works before caching/using it
   *
   * @param {string} apiKey - API key to validate
   * @returns {Promise<Object>} Validation result { valid: boolean, reason?: string }
   * @private
   */
  async validateApiKeyWithGemini(apiKey) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const testGenAI = new GoogleGenerativeAI(apiKey);
      const model = testGenAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Make minimal API call to verify key works (1 token response)
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        generationConfig: { maxOutputTokens: 1 }
      });

      // If we get here, the key works
      await result.response;
      return { valid: true };
    } catch (error) {
      // Check for authentication/authorization errors
      if (error.status === 401 || error.status === 403) {
        return { valid: false, reason: 'Invalid API key - authentication failed' };
      }

      if (error.message && error.message.includes('API_KEY_INVALID')) {
        return { valid: false, reason: 'Invalid API key format' };
      }

      // Other errors (network, quota, etc.) don't invalidate the key
      geminiLogger.warn('API key validation error (non-auth):', error.message);
      return { valid: true, error: error.message };
    }
  }

  /**
   * Get or create cached GoogleGenerativeAI instance with LRU eviction
   *
   * PERFORMANCE: Uses LRU (Least Recently Used) cache to keep active users' instances
   *
   * @param {string} apiKey - API key to get instance for
   * @returns {Object} GoogleGenerativeAI instance
   * @private
   */
  getOrCreateGenAI(apiKey) {
    // Server key is always this.genAI
    if (!apiKey) {
      return this.genAI;
    }

    // Create fingerprint for cache key
    const fingerprint = this.getApiKeyFingerprint(apiKey);
    const now = Date.now();

    // Check cache and update access time (LRU tracking)
    if (this.genAICache.has(fingerprint)) {
      this.cacheAccessTimes.set(fingerprint, now);
      geminiLogger.debug('♻️ Using cached GoogleGenerativeAI instance', { fingerprint });
      return this.genAICache.get(fingerprint);
    }

    // Create new instance
    geminiLogger.debug('🆕 Creating new GoogleGenerativeAI instance', { fingerprint });
    const genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(apiKey);

    // LRU eviction: remove least recently used if cache is full
    if (this.genAICache.size >= this.cacheMaxSize) {
      let lruKey = null;
      let lruTime = Infinity;

      // Find least recently used entry
      for (const [key, time] of this.cacheAccessTimes.entries()) {
        if (time < lruTime) {
          lruTime = time;
          lruKey = key;
        }
      }

      // Remove LRU entry
      if (lruKey) {
        this.genAICache.delete(lruKey);
        this.cacheAccessTimes.delete(lruKey);
        const ageSeconds = Math.floor((now - lruTime) / 1000);
        geminiLogger.debug('🗑️ Cache full, evicted LRU entry', {
          evictedKey: lruKey,
          lastAccessedSecondsAgo: ageSeconds
        });
      }
    }

    // Add to cache with current timestamp
    this.genAICache.set(fingerprint, genAI);
    this.cacheAccessTimes.set(fingerprint, now);
    return genAI;
  }

  /**
   * Create a Gemini model with configuration
   * Includes server-side API key verification
   *
   * @param {string} modelName - Model name (e.g., 'gemini-2.5-flash')
   * @param {string} apiKey - Optional user-provided API key (BYOK)
   * @returns {Promise<Object>} Gemini model instance
   * @private
   */
  async createModel(modelName = 'gemini-2.5-flash', apiKey = null) {
    let genAI;

    // If user provided their own API key (BYOK), validate it first
    if (apiKey) {
      if (!this.isValidApiKey(apiKey)) {
        geminiLogger.warn('⚠️ Invalid client API key format, using server fallback', {
          keyPreview: this.sanitizeApiKeyForLogging(apiKey)
        });
        genAI = this.genAI; // Fallback to server key
      } else {
        const fingerprint = this.getApiKeyFingerprint(apiKey);
        const now = Date.now();

        // Check validation cache first (validate once per hour)
        const cached = this.validatedKeys.get(fingerprint);
        if (cached && (now - cached.timestamp) < this.validationCacheDuration) {
          // Use cached validation result
          if (!cached.valid) {
            geminiLogger.warn('⚠️ Previously validated key is invalid, using server fallback', {
              reason: cached.reason,
              keyPreview: this.sanitizeApiKeyForLogging(apiKey)
            });
            genAI = this.genAI;
          } else {
            geminiLogger.debug('✅ Using validated client API key (cached)', {
              keyPreview: this.sanitizeApiKeyForLogging(apiKey)
            });
            genAI = this.getOrCreateGenAI(apiKey);
          }
        } else {
          // Validate key with Google API (first use or cache expired)
          geminiLogger.debug('🔍 Validating client API key with Google...', {
            keyPreview: this.sanitizeApiKeyForLogging(apiKey)
          });

          const validation = await this.validateApiKeyWithGemini(apiKey);
          this.validatedKeys.set(fingerprint, {
            valid: validation.valid,
            timestamp: now,
            reason: validation.reason
          });

          if (!validation.valid) {
            geminiLogger.warn('⚠️ API key validation failed, using server fallback', {
              reason: validation.reason,
              keyPreview: this.sanitizeApiKeyForLogging(apiKey)
            });
            genAI = this.genAI;
          } else {
            geminiLogger.info('✅ API key validated successfully', {
              keyPreview: this.sanitizeApiKeyForLogging(apiKey)
            });
            genAI = this.getOrCreateGenAI(apiKey);
          }
        }
      }
    } else {
      geminiLogger.debug('📌 Using server API key (no client key provided)');
      genAI = this.genAI;
    }

    return genAI.getGenerativeModel({
      model: modelName,
      tools: this.tools
    });
  }

  /**
   * Check for safety/content filtering issues in chunk
   *
   * @param {Object} chunk - Response chunk from Gemini
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} chatId - Chat identifier
   * @returns {boolean} True if response was blocked
   * @private
   */
  checkSafetyFilters(chunk, socket, chatId) {
    // Check for prompt feedback (safety/content filtering issues)
    if (chunk.promptFeedback) {
      geminiLogger.debug('📋 Prompt Feedback:', JSON.stringify(chunk.promptFeedback, null, 2));
      if (chunk.promptFeedback.blockReason) {
        geminiLogger.error('🚫 Content blocked by safety filter:', chunk.promptFeedback.blockReason);
        socket.emit('message-response', {
          chatId,
          message: `Sorry, I cannot respond to this request due to content safety filters. Block reason: ${chunk.promptFeedback.blockReason}`,
          isComplete: true
        });
        socket.emit('typing', { chatId, isTyping: false });
        return true;
      }
    }

    // Check for safety ratings in candidates
    if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].safetyRatings) {
      geminiLogger.debug('🛡️ Safety Ratings:', chunk.candidates[0].safetyRatings);
    }

    // Check if response was blocked
    if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].finishReason === 'SAFETY') {
      geminiLogger.error('🚫 Response blocked due to safety concerns');
      socket.emit('message-response', {
        chatId,
        message: 'Sorry, I cannot provide a response due to content safety filters.',
        isComplete: true
      });
      socket.emit('typing', { chatId, isTyping: false });
      return true;
    }

    return false;
  }

  /**
   * Stream a single response chunk to client
   *
   * @param {Object} chunk - Response chunk from Gemini
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} chatId - Chat identifier
   * @returns {string} Text content of chunk
   * @private
   */
  streamChunk(chunk, socket, chatId) {
    const chunkText = chunk.text();
    geminiLogger.debug('📨 Chunk received, length:', chunkText?.length || 0);

    if (chunkText) {
      // Send streaming chunk to client
      socket.emit('message-response', {
        chatId,
        message: chunkText,
        isComplete: false
      });
    }

    return chunkText || '';
  }

  /**
   * Execute a function call requested by Gemini
   *
   * @param {string} functionName - Name of function to execute
   * @param {Object} functionArgs - Arguments for the function
   * @param {Object} context - Additional context (userId, etc.)
   * @returns {Promise<string>} Function result
   * @private
   */
  async executeFunction(functionName, functionArgs, context = {}) {
    geminiLogger.debug(`Calling function: ${functionName} with args:`, functionArgs);

    if (!this.functionHandlers[functionName]) {
      return `Unknown function: ${functionName}`;
    }

    try {
      let result = await this.functionHandlers[functionName](functionArgs, context);

      // CRITICAL FIX: Limit function result size
      if (typeof result === 'string' && result.length > GEMINI_CONFIG.MAX_FUNCTION_RESULT_LENGTH) {
        geminiLogger.warn(`Function result truncated: ${result.length} → ${GEMINI_CONFIG.MAX_FUNCTION_RESULT_LENGTH} chars`);
        result = result.substring(0, GEMINI_CONFIG.MAX_FUNCTION_RESULT_LENGTH) +
          '\n\n[Result truncated due to length]';
      }

      return result;
    } catch (error) {
      geminiLogger.error(`Error executing function ${functionName}:`, error);
      // CRITICAL FIX: Don't leak error details to client
      throw new Error(`Function execution failed`);
    }
  }

  /**
   * Process function calls and stream responses
   *
   * @param {Object} chat - Gemini chat instance
   * @param {Array} functionCalls - Array of function calls to process
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} chatId - Chat identifier
   * @param {Object} context - Additional context (userId, etc.)
   * @returns {Promise<Object>} Result with functionResponse and functionNames
   * @private
   */
  async processFunctionCalls(chat, functionCalls, socket, chatId, context = {}) {
    let functionResponse = '';
    const functionNames = [];

    // CRITICAL FIX: Limit number of function calls to prevent infinite loops
    const limitedCalls = functionCalls.slice(0, GEMINI_CONFIG.MAX_FUNCTION_CALLS_PER_MESSAGE);
    if (functionCalls.length > GEMINI_CONFIG.MAX_FUNCTION_CALLS_PER_MESSAGE) {
      geminiLogger.warn(`Function calls limited: ${functionCalls.length} → ${GEMINI_CONFIG.MAX_FUNCTION_CALLS_PER_MESSAGE}`);
    }

    for (const functionCall of limitedCalls) {
      const functionName = functionCall.name;
      const functionArgs = functionCall.args;
      functionNames.push(functionName);

      let functionResult = '';

      try {
        functionResult = await this.executeFunction(functionName, functionArgs, context);

        // Send function result back to Gemini with streaming
        const followUpResult = await chat.sendMessageStream([
          {
            functionResponse: {
              name: functionName,
              response: { result: functionResult }
            }
          }
        ]);

        // Stream the follow-up response with length limit
        for await (const chunk of followUpResult.stream) {
          // CRITICAL FIX: Check response length limit
          if (functionResponse.length >= GEMINI_CONFIG.MAX_RESPONSE_LENGTH) {
            geminiLogger.warn('Function response length limit reached');
            break;
          }

          const chunkText = chunk.text();
          if (chunkText) {
            functionResponse += chunkText;

            // Send streaming chunk to client
            socket.emit('message-response', {
              chatId,
              message: chunkText,
              isComplete: false
            });
          }
        }
      } catch (error) {
        geminiLogger.error(`Error executing function ${functionName}:`, error);
        // CRITICAL FIX: Sanitize error message - don't leak sensitive data
        const errorMsg = `I encountered an error while processing that request. Please try again.`;
        functionResponse += errorMsg;

        socket.emit('message-response', {
          chatId,
          message: errorMsg,
          isComplete: false
        });
      }
    }

    return { functionResponse, functionNames };
  }

  /**
   * Validate response completeness
   *
   * @param {string} response - Full response text
   * @param {string} message - Original message
   * @param {Array} chatHistory - Chat history
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} chatId - Chat identifier
   * @returns {boolean} True if response is valid
   * @private
   */
  validateResponse(response, message, chatHistory, socket, chatId) {
    // Check if response is empty
    if (response.length === 0) {
      geminiLogger.error('🚨 CRITICAL: Gemini returned empty response!');
      geminiLogger.error('This could be due to:');
      geminiLogger.error('  1. Content safety filters blocking the response');
      geminiLogger.error('  2. API quota/rate limits');
      geminiLogger.error('  3. Model refusing to generate content for this prompt');
      geminiLogger.error('Original message:', message);
      geminiLogger.error('Chat history length:', chatHistory?.length || 0);

      // Send helpful error message to user
      socket.emit('message-response', {
        chatId,
        message: 'I apologize, but I was unable to generate a response. This could be due to content safety filters or the nature of the request. Could you please rephrase your question?',
        isComplete: true
      });

      socket.emit('typing', { chatId, isTyping: false });
      return false;
    }

    // Check for [object Object] placeholder
    if (response.includes('[object Object]')) {
      geminiLogger.error('🚨 CRITICAL: Gemini response contains [object Object] placeholder!');
      geminiLogger.error('Full response:', response);
    }

    return true;
  }

  /**
   * Send a message to Gemini and stream the response
   *
   * @param {Object} socket - Socket.IO socket instance
   * @param {string} chatId - Chat identifier
   * @param {Array} finalHistory - Processed chat history with system prompts
   * @param {Array} messageParts - Message parts (text + attachments)
   * @param {string} originalMessage - Original message text (for error reporting)
   * @param {Array} chatHistory - Original chat history (for error reporting)
   * @param {Object} context - Additional context (userId, etc.)
   * @returns {Promise<Object>} Result with response text and metadata
   */
  async sendMessage(socket, chatId, finalHistory, messageParts, originalMessage = '', chatHistory = [], context = {}) {
    geminiLogger.debug('🚀 Calling Gemini API...');

    // Extract API key from context (BYOK)
    const { apiKey } = context;

    // Emit debug info for request
    socket.emit('debug-info', {
      type: 'request',
      timestamp: new Date().toISOString(),
      chatId,
      message: messageParts[messageParts.length - 1]?.text || originalMessage,
      historyLength: finalHistory.length,
      parts: messageParts.map(part => part.text ? 'text' : part.inlineData ? part.inlineData.mimeType : 'unknown'),
      usingClientKey: !!apiKey
    });

    // Create model and start chat (using client-provided key if available)
    // Note: createModel now validates API keys server-side
    const model = await this.createModel('gemini-2.5-flash', apiKey);
    const chat = model.startChat({
      history: finalHistory
    });

    // CRITICAL FIX: Add timeout to API call to prevent hanging
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Gemini API timeout after ${GEMINI_CONFIG.API_TIMEOUT_MS / 1000} seconds`));
      }, GEMINI_CONFIG.API_TIMEOUT_MS);
    });

    let result;
    try {
      // Race between API call and timeout
      result = await Promise.race([
        chat.sendMessageStream(messageParts),
        timeoutPromise
      ]);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.message.includes('timeout')) {
        geminiLogger.error('❌ Gemini API timeout');
        socket.emit('message-response', {
          chatId,
          message: 'The AI is taking too long to respond. Please try again.',
          isComplete: true
        });
        socket.emit('typing', { chatId, isTyping: false });
        return { response: '', error: 'timeout' };
      }
      throw error;
    }

    let fullResponse = '';
    let hasFunctionCalls = false;
    let functionCalls = [];

    geminiLogger.debug('✅ Streaming response from Gemini...');

    try {
      // Stream the response chunks
      for await (const chunk of result.stream) {
        // Check for safety filters
        if (this.checkSafetyFilters(chunk, socket, chatId)) {
          return { response: '', blocked: true };
        }

        // Check for function calls
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          hasFunctionCalls = true;
          functionCalls = chunk.functionCalls;
          geminiLogger.debug('Function calls detected:', functionCalls);
          break; // Stop streaming if function calls are needed
        }

        // CRITICAL FIX: Check response length limit
        if (fullResponse.length >= GEMINI_CONFIG.MAX_RESPONSE_LENGTH) {
          geminiLogger.warn('Response length limit reached');
          break;
        }

        // Stream chunk to client
        const chunkText = this.streamChunk(chunk, socket, chatId);
        fullResponse += chunkText;
      }
    } finally {
      // Always clear timeout
      clearTimeout(timeoutId);
    }

    // Process function calls if present
    if (hasFunctionCalls && functionCalls.length > 0) {
      const { functionResponse, functionNames } = await this.processFunctionCalls(
        chat,
        functionCalls,
        socket,
        chatId,
        context
      );

      // Emit debug info for response
      socket.emit('debug-info', {
        type: 'response',
        timestamp: new Date().toISOString(),
        chatId,
        response: functionResponse,
        hadFunctionCalls: true,
        functionNames
      });

      // Send completion signal
      socket.emit('message-response', {
        chatId,
        message: '',
        isComplete: true
      });

      return {
        response: functionResponse,
        hadFunctionCalls: true,
        functionNames
      };
    } else {
      // No function calls - streaming completed
      geminiLogger.debug('Gemini streamed response complete');
      geminiLogger.debug('Response text length:', fullResponse.length);

      // Validate response
      if (!this.validateResponse(fullResponse, originalMessage, chatHistory, socket, chatId)) {
        return { response: '', error: 'Empty response' };
      }

      // Emit debug info for response
      socket.emit('debug-info', {
        type: 'response',
        timestamp: new Date().toISOString(),
        chatId,
        response: fullResponse,
        hadFunctionCalls: false,
        wasStreamed: true
      });

      // Send completion signal
      socket.emit('message-response', {
        chatId,
        message: '',
        isComplete: true
      });

      return {
        response: fullResponse,
        hadFunctionCalls: false,
        wasStreamed: true
      };
    }
  }
}

module.exports = { GeminiService };
