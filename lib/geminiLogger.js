/**
 * Gemini API Logger Service
 *
 * Comprehensive logging for all Gemini API requests and responses.
 * Stores detailed information in SQLite for debugging and monitoring.
 */

const { randomUUID } = require('crypto');

class GeminiLogger {
  constructor(geminiLogOps) {
    this.geminiLogOps = geminiLogOps;
    this.activeRequests = new Map(); // Track timing for requests
  }

  /**
   * Log a Gemini API request
   *
   * @param {Object} params
   * @param {string} params.chatId - Chat ID
   * @param {string} params.userId - User ID
   * @param {Object} params.history - Chat history sent to Gemini
   * @param {Array} params.parts - Message parts
   * @param {Object} params.metadata - Additional metadata
   * @returns {string} - Log ID for tracking
   */
  logRequest({ chatId, userId, history, parts, metadata = {} }) {
    const logId = randomUUID();
    const startTime = Date.now();

    try {
      const requestData = {
        history: this._sanitizeHistory(history),
        parts: this._sanitizeParts(parts),
        historyLength: history?.length || 0,
        partsCount: parts?.length || 0
      };

      // Store in database
      this.geminiLogOps.create(
        logId,
        chatId || null,
        userId || null,
        requestData,
        {
          ...metadata,
          userAgent: metadata.userAgent || 'unknown',
          ipAddress: metadata.ipAddress || 'unknown'
        }
      );

      // Track timing
      this.activeRequests.set(logId, { startTime, chatId, userId });

      console.log(`📝 [Gemini Logger] Request logged: ${logId.substring(0, 8)}...`, {
        chatId,
        historyLength: requestData.historyLength,
        partsCount: requestData.partsCount
      });

      return logId;
    } catch (error) {
      console.error('❌ [Gemini Logger] Failed to log request:', error);
      return logId; // Return ID even if logging fails
    }
  }

  /**
   * Log a successful Gemini API response
   *
   * @param {string} logId - Log ID from logRequest
   * @param {Object} response - Gemini response object
   * @param {Array} functionCalls - Function calls made during the request
   */
  logResponse(logId, response, functionCalls = []) {
    try {
      const requestInfo = this.activeRequests.get(logId);
      if (!requestInfo) {
        console.warn(`⚠️ [Gemini Logger] No active request found for log ID: ${logId}`);
        return;
      }

      const durationMs = Date.now() - requestInfo.startTime;

      // Extract response data
      const responseData = {
        text: response?.text || '',
        candidates: response?.candidates?.map(c => ({
          content: c.content?.parts?.map(p => ({
            text: p.text?.substring(0, 1000) || '' // Limit text for storage
          })),
          finishReason: c.finishReason,
          safetyRatings: c.safetyRatings
        })),
        usageMetadata: response?.usageMetadata
      };

      const tokenCount = response?.usageMetadata?.totalTokenCount || null;

      // Store in database
      this.geminiLogOps.updateSuccess(
        logId,
        responseData,
        durationMs,
        tokenCount,
        functionCalls
      );

      // Clean up tracking
      this.activeRequests.delete(logId);

      console.log(`✅ [Gemini Logger] Response logged: ${logId.substring(0, 8)}...`, {
        durationMs,
        tokenCount,
        functionCallsCount: functionCalls.length
      });
    } catch (error) {
      console.error('❌ [Gemini Logger] Failed to log response:', error);
    }
  }

  /**
   * Log a Gemini API error
   *
   * @param {string} logId - Log ID from logRequest
   * @param {Error} error - Error object
   */
  logError(logId, error) {
    try {
      const requestInfo = this.activeRequests.get(logId);
      if (!requestInfo) {
        console.warn(`⚠️ [Gemini Logger] No active request found for log ID: ${logId}`);
        return;
      }

      const durationMs = Date.now() - requestInfo.startTime;

      // Extract error data
      const errorData = {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 1000), // Limit stack trace
        code: error.code,
        statusCode: error.statusCode,
        details: error.details
      };

      // Store in database
      this.geminiLogOps.updateError(logId, errorData, durationMs);

      // Clean up tracking
      this.activeRequests.delete(logId);

      console.log(`❌ [Gemini Logger] Error logged: ${logId.substring(0, 8)}...`, {
        durationMs,
        errorMessage: error.message
      });
    } catch (err) {
      console.error('❌ [Gemini Logger] Failed to log error:', err);
    }
  }

  /**
   * Get logs for a specific chat
   */
  getLogsByChat(chatId, limit = 50) {
    try {
      return this.geminiLogOps.getByChat(chatId, limit);
    } catch (error) {
      console.error('❌ [Gemini Logger] Failed to get logs by chat:', error);
      return [];
    }
  }

  /**
   * Get logs for a specific user
   */
  getLogsByUser(userId, limit = 100) {
    try {
      return this.geminiLogOps.getByUser(userId, limit);
    } catch (error) {
      console.error('❌ [Gemini Logger] Failed to get logs by user:', error);
      return [];
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit = 50) {
    try {
      return this.geminiLogOps.getRecent(limit);
    } catch (error) {
      console.error('❌ [Gemini Logger] Failed to get recent logs:', error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  getStats(chatId = null, userId = null) {
    try {
      return this.geminiLogOps.getStats(chatId, userId);
    } catch (error) {
      console.error('❌ [Gemini Logger] Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Clean up old logs
   */
  cleanupOldLogs(days = 30) {
    try {
      const result = this.geminiLogOps.deleteOlderThan(days);
      console.log(`🧹 [Gemini Logger] Cleaned up logs older than ${days} days:`, result.changes);
      return result;
    } catch (error) {
      console.error('❌ [Gemini Logger] Failed to cleanup old logs:', error);
      return null;
    }
  }

  /**
   * Sanitize history for storage (remove large data, keep structure)
   */
  _sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];

    return history.map(msg => ({
      role: msg.role,
      parts: msg.parts?.map(part => ({
        text: part.text?.substring(0, 500) || '', // Limit text length
        inlineData: part.inlineData ? { mimeType: part.inlineData.mimeType } : undefined,
        functionCall: part.functionCall,
        functionResponse: part.functionResponse
      }))
    }));
  }

  /**
   * Sanitize parts for storage
   */
  _sanitizeParts(parts) {
    if (!Array.isArray(parts)) return [];

    return parts.map(part => ({
      text: part.text?.substring(0, 1000) || '',
      inlineData: part.inlineData ? { mimeType: part.inlineData.mimeType } : undefined,
      functionCall: part.functionCall,
      functionResponse: part.functionResponse
    }));
  }
}

module.exports = { GeminiLogger };
