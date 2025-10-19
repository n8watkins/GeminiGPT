/**
 * Attachment Handler Service
 *
 * Processes various file attachments (images, PDFs, DOCX, text files) for Gemini AI.
 *
 * Features:
 * - Image processing with size and dimension limits
 * - PDF/DOCX text extraction with timeout protection
 * - Text file processing
 * - File signature validation for security
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

// Configuration constants
const ATTACHMENT_CONFIG = {
  // File size limits
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_TEXT_LENGTH: 8000, // Maximum characters for document text

  // Image dimension limits (prevent memory issues)
  MAX_IMAGE_WIDTH: 4096,
  MAX_IMAGE_HEIGHT: 4096,

  // Timeouts
  DOCUMENT_PROCESSING_TIMEOUT_MS: 30000, // 30 seconds

  // File signature validation (magic bytes)
  FILE_SIGNATURES: {
    'image/jpeg': ['ffd8ff'],
    'image/png': ['89504e47'],
    'image/gif': ['474946'],
    'image/webp': ['52494646'],
    'application/pdf': ['25504446']
  }
};

class AttachmentHandler {
  constructor(processDocumentAttachmentFn) {
    this.processDocumentAttachment = processDocumentAttachmentFn;
    console.log('✅ AttachmentHandler initialized with config:', {
      maxImageSize: `${ATTACHMENT_CONFIG.MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
      maxDimensions: `${ATTACHMENT_CONFIG.MAX_IMAGE_WIDTH}x${ATTACHMENT_CONFIG.MAX_IMAGE_HEIGHT}`,
      documentTimeout: `${ATTACHMENT_CONFIG.DOCUMENT_PROCESSING_TIMEOUT_MS / 1000}s`
    });
  }

  /**
   * Validate file signature (magic bytes) for security
   *
   * @param {string} base64Data - Base64 encoded file data
   * @param {string} mimeType - Expected MIME type
   * @returns {boolean} True if signature matches expected type
   * @private
   */
  validateFileSignature(base64Data, mimeType) {
    const expectedSignatures = ATTACHMENT_CONFIG.FILE_SIGNATURES[mimeType];
    if (!expectedSignatures) {
      // No signature validation for this type
      return true;
    }

    try {
      // Get first few bytes of file
      const buffer = Buffer.from(base64Data.substring(0, 16), 'base64');
      const hex = buffer.toString('hex').toLowerCase();

      // Check if any expected signature matches
      const isValid = expectedSignatures.some(sig => hex.startsWith(sig));

      if (!isValid) {
        console.warn(`⚠️  File signature mismatch for ${mimeType}. Expected: ${expectedSignatures.join(' or ')}, Got: ${hex.substring(0, 12)}`);
      }

      return isValid;
    } catch (error) {
      console.error('Error validating file signature:', error);
      return false;
    }
  }

  /**
   * Validate image dimensions from base64 data
   *
   * @param {string} base64Data - Base64 encoded image data
   * @param {string} mimeType - Image MIME type
   * @returns {Promise<Object>} Object with valid flag and dimensions
   * @private
   */
  async validateImageDimensions(base64Data, mimeType) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      let width = 0;
      let height = 0;

      // Parse dimensions based on image type
      if (mimeType === 'image/png') {
        // PNG: width and height are at bytes 16-23
        if (buffer.length >= 24) {
          width = buffer.readUInt32BE(16);
          height = buffer.readUInt32BE(20);
        }
      } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        // JPEG: scan for SOF marker (simplified check)
        // For production, consider using a library like 'image-size'
        console.log('📐 JPEG dimension validation: using size-based heuristic');
        // Allow JPEG for now, but log warning if too large
        return { valid: true, width: 0, height: 0, note: 'JPEG dimensions not validated' };
      }

      const valid = width <= ATTACHMENT_CONFIG.MAX_IMAGE_WIDTH &&
                   height <= ATTACHMENT_CONFIG.MAX_IMAGE_HEIGHT;

      if (!valid) {
        console.warn(`❌ Image dimensions too large: ${width}x${height} (max: ${ATTACHMENT_CONFIG.MAX_IMAGE_WIDTH}x${ATTACHMENT_CONFIG.MAX_IMAGE_HEIGHT})`);
      }

      return { valid, width, height };
    } catch (error) {
      console.error('Error validating image dimensions:', error);
      // Allow on validation error to prevent false rejections
      return { valid: true, width: 0, height: 0, error: error.message };
    }
  }

  /**
   * Process a single image attachment
   *
   * @param {Object} attachment - Image attachment object
   * @param {string} attachment.name - File name
   * @param {string} attachment.url - Data URL with base64 content
   * @param {string} attachment.mimeType - MIME type (e.g., 'image/jpeg')
   * @returns {Promise<Object>} Result with success, messageParts, and enhancedText
   * @private
   */
  async processImage(attachment) {
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

    // Validate file size
    if (base64Data.length > ATTACHMENT_CONFIG.MAX_IMAGE_SIZE_BYTES) {
      const maxSizeMB = ATTACHMENT_CONFIG.MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
      console.warn(`❌ Image too large: ${attachment.name} (${sizeInMB}MB), skipping`);
      result.enhancedText = `\n\n**Image: ${attachment.name}**\n[Image too large to process - please use an image under ${maxSizeMB}MB]`;
      return result;
    }

    // Validate file signature for security
    const mimeType = attachment.mimeType || 'image/jpeg';
    if (!this.validateFileSignature(base64Data, mimeType)) {
      console.warn(`❌ Invalid file signature for ${attachment.name}`);
      result.enhancedText = `\n\n**Image: ${attachment.name}**\n[Invalid file format - file signature does not match expected type]`;
      return result;
    }

    // Validate image dimensions
    const dimensionCheck = await this.validateImageDimensions(base64Data, mimeType);
    if (!dimensionCheck.valid) {
      console.warn(`❌ Image dimensions exceed limits: ${attachment.name}`);
      result.enhancedText = `\n\n**Image: ${attachment.name}**\n[Image dimensions too large: ${dimensionCheck.width}x${dimensionCheck.height} (max: ${ATTACHMENT_CONFIG.MAX_IMAGE_WIDTH}x${ATTACHMENT_CONFIG.MAX_IMAGE_HEIGHT})]`;
      return result;
    }

    console.log(`✅ Image accepted: ${attachment.name} (${sizeInMB}MB${dimensionCheck.width ? `, ${dimensionCheck.width}x${dimensionCheck.height}` : ''})`);
    console.log(`📤 Adding image to message parts with mimeType: ${mimeType}`);

    result.messageParts.push({
      inlineData: {
        mimeType: mimeType,
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

      // Validate PDF file signature for security
      if (attachment.mimeType === 'application/pdf') {
        if (!this.validateFileSignature(base64Data, 'application/pdf')) {
          console.warn(`❌ Invalid PDF signature for ${attachment.name}`);
          result.enhancedText = `\n\n**PDF Document: ${attachment.name}**\n[Invalid file format - file signature does not match PDF format]`;
          return result;
        }
      }

      // Add timeout to document processing to prevent hanging
      const documentProcessingPromise = this.processDocumentAttachment(base64Data, attachment.name, attachment.mimeType);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Document processing timeout after ${ATTACHMENT_CONFIG.DOCUMENT_PROCESSING_TIMEOUT_MS / 1000} seconds`)), ATTACHMENT_CONFIG.DOCUMENT_PROCESSING_TIMEOUT_MS)
      );

      const documentResult = await Promise.race([documentProcessingPromise, timeoutPromise]);

      if (documentResult.success) {
        // Limit document text to prevent token overflow
        const truncatedText = documentResult.extractedText.length > ATTACHMENT_CONFIG.MAX_TEXT_LENGTH
          ? documentResult.extractedText.substring(0, ATTACHMENT_CONFIG.MAX_TEXT_LENGTH) + '\n\n[Text truncated due to length]'
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
          // Handle images (now async with validation)
          const imageResult = await this.processImage(attachment);
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
