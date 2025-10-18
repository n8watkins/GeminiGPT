/**
 * History Processor Service
 *
 * Converts chat history from database format to Gemini-compatible format.
 *
 * Features:
 * - Deep cleaning of message objects to remove non-serializable data
 * - Handles [object Object] serialization issues
 * - Processes attachments (images) from history
 * - Converts roles (user/assistant -> user/model)
 * - Integrates with system prompts from prompts module
 *
 * Usage:
 * ```javascript
 * const { HistoryProcessor } = require('./services/HistoryProcessor');
 * const processor = new HistoryProcessor();
 * const geminiHistory = processor.processHistory(chatHistory);
 * ```
 */

const { getFullPrompt } = require('../prompts');

class HistoryProcessor {
  constructor() {
    console.log('✅ HistoryProcessor initialized');
  }

  /**
   * Sanitize message content to ensure it's a clean string
   * Handles cases where content might be an object or contain serialization artifacts
   *
   * @param {*} content - Message content (string or object)
   * @returns {string} Clean string content
   * @private
   */
  sanitizeContent(content) {
    // Ensure content is a string
    let textContent = content;

    if (typeof textContent !== 'string') {
      console.warn('⚠️ Message content is not a string:', typeof textContent, textContent);
      // Try to extract text if it's an object
      textContent = textContent?.text || textContent?.toString() || String(textContent);
    }

    // CRITICAL: Check if textContent contains [object Object] which indicates serialization issues
    if (textContent && textContent.includes('[object Object]')) {
      console.error('🚨 CRITICAL: textContent contains [object Object]!');
      console.error('Original content:', JSON.stringify(content, null, 2));
      console.error('textContent:', textContent);

      // Try to extract just the actual text content
      if (typeof content === 'object' && content !== null && 'text' in content) {
        textContent = String(content.text);
      } else {
        // Last resort: try to find any string property
        const stringProps = Object.entries(content || {})
          .filter(([key, val]) => typeof val === 'string' && val.length > 0)
          .map(([key, val]) => val);

        if (stringProps.length > 0) {
          textContent = stringProps[0];
        }
      }
    }

    return textContent;
  }

  /**
   * Extract and process attachments from a message
   * Converts image attachments to Gemini's inline data format
   *
   * @param {Array} attachments - Array of attachment objects
   * @returns {Array} Array of Gemini-compatible inline data parts
   * @private
   */
  extractAttachmentsFromHistory(attachments) {
    const parts = [];

    if (!attachments || attachments.length === 0) {
      return parts;
    }

    console.log(`📎 Processing ${attachments.length} attachments from chat history`);

    for (const attachment of attachments) {
      if (attachment.type === 'image' && attachment.url) {
        try {
          const base64Data = attachment.url.split(',')[1];
          if (base64Data) {
            const sizeInMB = (base64Data.length / (1024 * 1024)).toFixed(2);
            console.log(`🖼️  Adding image from history: ${attachment.name}, size: ${sizeInMB}MB`);

            // Add image to parts array in Gemini format
            parts.push({
              inlineData: {
                mimeType: attachment.mimeType || 'image/jpeg',
                data: base64Data
              }
            });
            console.log(`✓ Image from history added to parts. Total attachment parts: ${parts.length}`);
          }
        } catch (error) {
          console.error(`Error processing attachment from history: ${attachment.name}`, error);
        }
      }
    }

    return parts;
  }

  /**
   * Convert a single message to Gemini format
   *
   * @param {Object} msg - Message object from database
   * @param {string} msg.role - Message role (user/assistant)
   * @param {string|Object} msg.content - Message content
   * @param {Array} [msg.attachments] - Optional attachments
   * @returns {Object} Gemini-compatible message
   * @private
   */
  convertMessage(msg) {
    // CRITICAL: Deep clean the message object to remove Date objects and other non-serializable data
    // Socket.io may have already partially serialized these, causing [object Object] issues

    const textContent = this.sanitizeContent(msg.content);

    // Build parts array - start with text
    const parts = [{ text: textContent }];

    // CRITICAL FIX: Include image attachments from chat history
    // This allows Gemini to see images from previous messages for context
    if (msg.attachments && msg.attachments.length > 0) {
      const attachmentParts = this.extractAttachmentsFromHistory(msg.attachments);
      parts.push(...attachmentParts);
    }

    return {
      role: msg.role === 'user' ? 'user' : 'model',
      parts: parts
    };
  }

  /**
   * Process chat history array and convert to Gemini format
   * Includes system prompts at the beginning
   *
   * @param {Array} chatHistory - Array of message objects from database
   * @returns {Array} Gemini-compatible history with system prompts
   */
  processHistory(chatHistory) {
    console.log('📝 Processing Chat History:');
    console.log(`  - Input history length: ${chatHistory ? chatHistory.length : 0}`);

    // Convert chat history to Gemini format
    const history = chatHistory.map((msg) => this.convertMessage(msg));

    // Debug: Log converted history
    console.log('🔄 Converted History for Gemini:');
    console.log('  - Total messages:', history.length);

    if (history.length > 0) {
      console.log('  - First converted:', {
        role: history[0].role,
        contentType: typeof history[0].parts[0].text,
        content: history[0].parts[0].text?.substring(0, 50) + '...'
      });
      console.log('  - Last converted:', {
        role: history[history.length - 1].role,
        contentType: typeof history[history.length - 1].parts[0].text,
        content: history[history.length - 1].parts[0].text?.substring(0, 50) + '...'
      });

      // Log ALL messages to see where [object Object] comes from
      console.log('📋 Full history being sent to Gemini:');
      history.forEach((msg, idx) => {
        console.log(`  [${idx}] ${msg.role}: ${typeof msg.parts[0].text} = "${msg.parts[0].text?.substring(0, 100)}..."`);
      });
    }

    // Get system prompts from prompts module
    const systemPrompts = getFullPrompt();
    const finalHistory = [...systemPrompts, ...history];

    // Debug: Log final history
    console.log('🎯 Final History for Gemini:');
    console.log('  - Total messages in final history:', finalHistory.length);
    console.log('  - System messages:', systemPrompts.length);
    console.log('  - Chat history messages:', history.length);

    return finalHistory;
  }

  /**
   * Get just the converted history without system prompts
   * Useful for testing or when system prompts are managed separately
   *
   * @param {Array} chatHistory - Array of message objects from database
   * @returns {Array} Gemini-compatible history WITHOUT system prompts
   */
  processHistoryWithoutSystemPrompts(chatHistory) {
    return chatHistory.map((msg) => this.convertMessage(msg));
  }
}

module.exports = { HistoryProcessor };
