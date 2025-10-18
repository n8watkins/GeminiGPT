// @ts-expect-error - pdf-parse doesn't have types
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extract text content from a PDF file
 * @param {Buffer} pdfBuffer - PDF file as buffer
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromPDF(pdfBuffer: Buffer) {
  try {
    // Use the simple pdf-parse function
    const data = await pdfParse(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text content from a DOCX file
 * @param {Buffer} docxBuffer - DOCX file as buffer
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromDOCX(docxBuffer: Buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process a document attachment and extract text content
 * @param {string} base64Data - Base64 encoded document data
 * @param {string} fileName - Name of the document file
 * @param {string} mimeType - MIME type of the document
 * @returns {Promise<Object>} - Processed document data with extracted text
 */
async function processDocumentAttachment(base64Data: string, fileName: string, mimeType: string) {
  try {
    // Convert base64 to buffer
    const documentBuffer = Buffer.from(base64Data, 'base64');
    
    let extractedText;
    
    // Extract text based on file type
    if (mimeType === 'application/pdf') {
      extractedText = await extractTextFromPDF(documentBuffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               mimeType === 'application/msword' ||
               fileName.toLowerCase().endsWith('.docx') ||
               fileName.toLowerCase().endsWith('.doc')) {
      extractedText = await extractTextFromDOCX(documentBuffer);
    } else {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }
    
    return {
      success: true,
      fileName,
      mimeType,
      extractedText,
      textLength: extractedText.length,
      preview: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : '')
    };
  } catch (error) {
    console.error('Error processing document:', error);
    return {
      success: false,
      fileName,
      mimeType,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export {
  extractTextFromPDF,
  extractTextFromDOCX,
  processDocumentAttachment
};
