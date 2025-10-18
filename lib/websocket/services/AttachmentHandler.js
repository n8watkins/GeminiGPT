/**
 * Attachment Handler Service
 *
 * Processes various file attachments (images, PDFs, DOCX, text files) for Gemini AI.
 *
 * Features:
 * - Image processing with size limits (10MB max)
 * - PDF/DOCX text extraction with timeout protection
 * - Text file processing
 * - Automatic format conversion for Gemini
 * - Comprehensive error handling
 *
 * Usage:
 * ```javascript
 * const { AttachmentHandler } = require('./services/AttachmentHandler');
 * const handler = new AttachmentHandler(processDocumentAttachmentFn);
 * const result = await handler.processAttachments(attachments, message);
 * ```
 */

class AttachmentHandler {
  constructor(processDocumentAttachmentFn) {
    this.processDocumentAttachment = processDocumentAttachmentFn;
    console.log('✅ AttachmentHandler initialized');
  }

  /**
   * Process a single image attachment
   *
   * @param {Object} attachment - Image attachment object
   * @param {string} attachment.name - File name
   * @param {string} attachment.url - Data URL with base64 content
   * @param {string} attachment.mimeType - MIME type (e.g., 'image/jpeg')
   * @returns {Object} Result with success, messageParts, and enhancedText
   * @private
   */
  processImage(attachment) {
    const result = {
      success: false,
      messageParts: [],
      enhancedText: ''
    };

    const base64Data = attachment.url.split(',')[1];
    if (!base64Data) {
      console.warn(`⚠️  No base64 data found for image: ${attachment.name}`);
      return result;
    }

    const sizeInMB = (base64Data.length / (1024 * 1024)).toFixed(2);
    console.log(`🖼️  Processing image: ${attachment.name}, size: ${sizeInMB}MB (${base64Data.length} chars)`);

    // Check image size (limit to 10MB base64 to match document limit)
    if (base64Data.length > 10 * 1024 * 1024) {
      console.warn(`❌ Image too large: ${attachment.name} (${sizeInMB}MB), skipping`);
      result.enhancedText = `\n\n**Image: ${attachment.name}**\n[Image too large to process - please use an image under 10MB]`;
      return result;
    }

    console.log(`✅ Image accepted: ${attachment.name} (${sizeInMB}MB)`);
    console.log(`📤 Adding image to message parts with mimeType: ${attachment.mimeType || 'image/jpeg'}`);

    result.messageParts.push({
      inlineData: {
        mimeType: attachment.mimeType || 'image/jpeg',
        data: base64Data
      }
    });

    result.success = true;
    console.log(`✓ Image successfully added to messageParts`);
    return result;
  }

  /**
   * Process a PDF or DOCX document attachment
   *
   * @param {Object} attachment - Document attachment object
   * @param {string} attachment.name - File name
   * @param {string} attachment.url - Data URL with base64 content
   * @param {string} attachment.mimeType - MIME type
   * @returns {Promise<Object>} Result with success, enhancedText
   * @private
   */
  async processDocument(attachment) {
    const result = {
      success: false,
      enhancedText: ''
    };

    try {
      const base64Data = attachment.url.split(',')[1];
      console.log(`Document attachment details:`, {
        name: attachment.name,
        mimeType: attachment.mimeType,
        urlPrefix: attachment.url?.substring(0, 50),
        base64Length: base64Data?.length
      });

      if (!base64Data) {
        result.enhancedText = `\n\n**Document: ${attachment.name}**\n[No data found]`;
        return result;
      }

      console.log(`Processing document: ${attachment.name}`);

      // Add timeout to document processing to prevent hanging
      const documentProcessingPromise = this.processDocumentAttachment(base64Data, attachment.name, attachment.mimeType);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Document processing timeout after 30 seconds')), 30000)
      );

      const documentResult = await Promise.race([documentProcessingPromise, timeoutPromise]);

      if (documentResult.success) {
        // Limit document text to prevent token overflow
        const maxTextLength = 8000; // Reasonable limit for Gemini
        const truncatedText = documentResult.extractedText.length > maxTextLength
          ? documentResult.extractedText.substring(0, maxTextLength) + '\n\n[Text truncated due to length]'
          : documentResult.extractedText;

        // Add document text content to the message
        const docType = attachment.mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
        result.enhancedText = `\n\n**${docType} Document: ${attachment.name}**\n${truncatedText}`;
        result.success = true;
        console.log(`Document processed successfully: ${documentResult.textLength} characters extracted (${truncatedText.length} sent)`);
      } else {
        const docType = attachment.mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
        result.enhancedText = `\n\n**${docType} Document: ${attachment.name}**\n[Error processing document: ${documentResult.error}]`;
        console.log(`Document processing failed: ${documentResult.error}`);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      console.error('Document error details:', {
        fileName: attachment.name,
        mimeType: attachment.mimeType,
        urlLength: attachment.url?.length,
        errorMessage: error.message,
        errorStack: error.stack
      });
      const docType = attachment.mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
      result.enhancedText = `\n\n**${docType} Document: ${attachment.name}**\n[Error processing document: ${error.message}]`;
    }

    return result;
  }

  /**
   * Process a text file attachment
   *
   * @param {Object} attachment - Text file attachment object
   * @returns {Object} Result with success and enhancedText
   * @private
   */
  processTextFile(attachment) {
    const result = {
      success: false,
      enhancedText: ''
    };

    try {
      const base64Data = attachment.url.split(',')[1];
      if (base64Data) {
        const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        result.enhancedText = `\n\n**File: ${attachment.name}**\n${textContent}`;
        result.success = true;
        console.log(`Text file processed: ${attachment.name}`);
      }
    } catch (error) {
      console.error('Error processing text file:', error);
      result.enhancedText = `\n\n**File: ${attachment.name}**\n[Error processing file: ${error.message}]`;
    }

    return result;
  }

  /**
   * Check if attachment is a document (PDF or DOCX)
   *
   * @param {Object} attachment - Attachment object
   * @returns {boolean} True if attachment is a document
   * @private
   */
  isDocument(attachment) {
    const documentMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    const documentExtensions = ['.pdf', '.docx', '.doc'];

    return documentMimeTypes.includes(attachment.mimeType) ||
           documentExtensions.some(ext => attachment.name?.toLowerCase().endsWith(ext));
  }

  /**
   * Process all attachments and convert to Gemini-compatible format
   *
   * @param {Array} attachments - Array of attachment objects
   * @param {string} message - Original message text
   * @returns {Promise<Object>} Result with messageParts array and enhancedMessage string
   */
  async processAttachments(attachments, message) {
    const messageParts = [];
    let enhancedMessage = message;

    if (!attachments || attachments.length === 0) {
      // No attachments - just return message as text part
      messageParts.push({ text: enhancedMessage });
      return { messageParts, enhancedMessage };
    }

    console.log(`📎 Processing ${attachments.length} attachments`);

    for (const attachment of attachments) {
      try {
        console.log(`📎 Attachment details:`, {
          name: attachment.name,
          type: attachment.type,
          mimeType: attachment.mimeType,
          hasUrl: !!attachment.url,
          urlLength: attachment.url?.length
        });

        if (attachment.type === 'image' && attachment.url) {
          // Handle images
          const imageResult = this.processImage(attachment);
          if (imageResult.success) {
            messageParts.push(...imageResult.messageParts);
          }
          if (imageResult.enhancedText) {
            enhancedMessage += imageResult.enhancedText;
          }
        } else if (this.isDocument(attachment) && attachment.url) {
          // Handle PDFs and DOCX files
          const docResult = await this.processDocument(attachment);
          if (docResult.enhancedText) {
            enhancedMessage += docResult.enhancedText;
          }
        } else if (attachment.type === 'file' && attachment.url) {
          // Handle other text files
          const textResult = this.processTextFile(attachment);
          if (textResult.enhancedText) {
            enhancedMessage += textResult.enhancedText;
          }
        }
      } catch (attachmentError) {
        console.error('Error processing attachment:', attachmentError);
        enhancedMessage += `\n\n**Attachment Error: ${attachment.name}**\n[Error: ${attachmentError.message}]`;
      }
    }

    // Add the enhanced message (with any file content) as text part
    messageParts.push({ text: enhancedMessage });

    console.log(`📨 Processed ${attachments.length} attachments into ${messageParts.length} message parts:`);
    messageParts.forEach((part, index) => {
      if (part.text) {
        console.log(`  Part ${index}: text (${part.text.length} chars)`);
      } else if (part.inlineData) {
        console.log(`  Part ${index}: ${part.inlineData.mimeType} (${part.inlineData.data.length} chars base64)`);
      }
    });

    return { messageParts, enhancedMessage };
  }
}

module.exports = { AttachmentHandler };
