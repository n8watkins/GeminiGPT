/**
 * Gemini Service
 *
 * Handles all interactions with Google's Gemini AI API.
 *
 * Features:
 * - Streaming response handling
 * - Function calling support
 * - Safety filter detection
 * - Error recovery
 * - Debug event emission
 *
 * Usage:
 * ```javascript
 * const { GeminiService } = require('./services/GeminiService');
 * const gemini = new GeminiService(genAI, tools, functionHandlers);
 * const response = await gemini.sendMessage(socket, chatId, finalHistory, messageParts);
 * ```
 */

class GeminiService {
  constructor(genAI, tools, functionHandlers) {
    this.genAI = genAI;
    this.tools = tools;
    this.functionHandlers = functionHandlers;
    console.log('✅ GeminiService initialized');
  }

  /**
   * Create a Gemini model with configuration
   *
   * @param {string} modelName - Model name (e.g., 'gemini-2.5-flash')
   * @returns {Object} Gemini model instance
   * @private
   */
  createModel(modelName = 'gemini-2.5-flash') {
    return this.genAI.getGenerativeModel({
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
      return await this.functionHandlers[functionName](functionArgs, context);
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      throw error;
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

    for (const functionCall of functionCalls) {
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

        // Stream the follow-up response
        for await (const chunk of followUpResult.stream) {
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
        const errorMsg = `Error executing ${functionName}: ${error.message}`;
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

    // Emit debug info for request
    socket.emit('debug-info', {
      type: 'request',
      timestamp: new Date().toISOString(),
      chatId,
      message: messageParts[messageParts.length - 1]?.text || originalMessage,
      historyLength: finalHistory.length,
      parts: messageParts.map(part => part.text ? 'text' : part.inlineData ? part.inlineData.mimeType : 'unknown')
    });

    // Create model and start chat
    const model = this.createModel();
    const chat = model.startChat({
      history: finalHistory
    });

    // Use streaming API for better UX
    const result = await chat.sendMessageStream(messageParts);

    let fullResponse = '';
    let hasFunctionCalls = false;
    let functionCalls = [];

    console.log('✅ Streaming response from Gemini...');

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

      // Stream chunk to client
      const chunkText = this.streamChunk(chunk, socket, chatId);
      fullResponse += chunkText;
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
