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
    console.log('✅ GeminiService initialized with config:', {
      apiTimeout: `${GEMINI_CONFIG.API_TIMEOUT_MS / 1000}s`,
      maxResponseLength: GEMINI_CONFIG.MAX_RESPONSE_LENGTH,
      maxFunctionCalls: GEMINI_CONFIG.MAX_FUNCTION_CALLS_PER_MESSAGE
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
   * Create a Gemini model with configuration
   *
   * @param {string} modelName - Model name (e.g., 'gemini-2.5-flash')
   * @param {string} apiKey - Optional user-provided API key (BYOK)
   * @returns {Object} Gemini model instance
   * @private
   */
  createModel(modelName = 'gemini-2.5-flash', apiKey = null) {
    let genAI;

    // If user provided their own API key (BYOK), validate it first
    if (apiKey) {
      if (!this.isValidApiKey(apiKey)) {
        console.warn('⚠️ Invalid client API key provided, using server fallback', {
          keyPreview: this.sanitizeApiKeyForLogging(apiKey)
        });
        genAI = this.genAI; // Fallback to server key
      } else {
        console.log('✅ Using client-provided API key', {
          keyPreview: this.sanitizeApiKeyForLogging(apiKey)
        });
        genAI = new (require('@google/generative-ai').GoogleGenerativeAI)(apiKey);
      }
    } else {
      console.log('📌 Using server API key (no client key provided)');
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
      console.log('📋 Prompt Feedback:', JSON.stringify(chunk.promptFeedback, null, 2));
      if (chunk.promptFeedback.blockReason) {
        console.error('🚫 Content blocked by safety filter:', chunk.promptFeedback.blockReason);
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
      console.log('🛡️ Safety Ratings:', chunk.candidates[0].safetyRatings);
    }

    // Check if response was blocked
    if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].finishReason === 'SAFETY') {
      console.error('🚫 Response blocked due to safety concerns');
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
    console.log('📨 Chunk received, length:', chunkText?.length || 0);

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
    console.log(`Calling function: ${functionName} with args:`, functionArgs);

    if (!this.functionHandlers[functionName]) {
      return `Unknown function: ${functionName}`;
    }

    try {
      let result = await this.functionHandlers[functionName](functionArgs, context);

      // CRITICAL FIX: Limit function result size
      if (typeof result === 'string' && result.length > GEMINI_CONFIG.MAX_FUNCTION_RESULT_LENGTH) {
        console.warn(`Function result truncated: ${result.length} → ${GEMINI_CONFIG.MAX_FUNCTION_RESULT_LENGTH} chars`);
        result = result.substring(0, GEMINI_CONFIG.MAX_FUNCTION_RESULT_LENGTH) +
          '\n\n[Result truncated due to length]';
      }

      return result;
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
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
      console.warn(`Function calls limited: ${functionCalls.length} → ${GEMINI_CONFIG.MAX_FUNCTION_CALLS_PER_MESSAGE}`);
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
            console.warn('Function response length limit reached');
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
        console.error(`Error executing function ${functionName}:`, error);
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
      console.error('🚨 CRITICAL: Gemini returned empty response!');
      console.error('This could be due to:');
      console.error('  1. Content safety filters blocking the response');
      console.error('  2. API quota/rate limits');
      console.error('  3. Model refusing to generate content for this prompt');
      console.error('Original message:', message);
      console.error('Chat history length:', chatHistory?.length || 0);

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
      console.error('🚨 CRITICAL: Gemini response contains [object Object] placeholder!');
      console.error('Full response:', response);
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
    console.log('🚀 Calling Gemini API...');

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
    const model = this.createModel('gemini-2.5-flash', apiKey);
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
        console.error('❌ Gemini API timeout');
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

    console.log('✅ Streaming response from Gemini...');

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
          console.log('Function calls detected:', functionCalls);
          break; // Stop streaming if function calls are needed
        }

        // CRITICAL FIX: Check response length limit
        if (fullResponse.length >= GEMINI_CONFIG.MAX_RESPONSE_LENGTH) {
          console.warn('Response length limit reached');
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
      console.log('Gemini streamed response complete');
      console.log('Response text length:', fullResponse.length);

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
