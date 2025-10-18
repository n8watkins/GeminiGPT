// @ts-expect-error - pdf-parse doesn't have types
import pdfParse from 'pdf-parse';

/**
 * Extract text content from a PDF file
 * @param {Buffer} pdfBuffer - PDF file as buffer
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromPDF(pdfBuffer: Buffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process a PDF attachment and extract text content
 * @param {string} base64Data - Base64 encoded PDF data
 * @param {string} fileName - Name of the PDF file
 * @returns {Promise<Object>} - Processed PDF data with extracted text
 */
async function processPDFAttachment(base64Data: string, fileName: string) {
  try {
    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    
    // Extract text from PDF
    const extractedText = await extractTextFromPDF(pdfBuffer);
    
    return {
      success: true,
      fileName,
      extractedText,
      textLength: extractedText.length,
      preview: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : '')
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    return {
      success: false,
      fileName,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export {
  extractTextFromPDF,
  processPDFAttachment
};
