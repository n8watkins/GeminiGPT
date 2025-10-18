const fs = require('fs');
const path = require('path');
const { processDocumentAttachment } = require('../../src/lib/documentProcessor');

async function testDocumentProcessing() {
  console.log('🧪 Testing Document Processing...\n');

  // Test files in public folder
  const testFiles = [
    {
      name: 'resumepdf.pdf',
      path: path.join(__dirname, 'public', 'resumepdf.pdf'),
      mimeType: 'application/pdf'
    },
    {
      name: 'resumedoc.docx', 
      path: path.join(__dirname, 'public', 'resumedoc.docx'),
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  ];

  for (const file of testFiles) {
    console.log(`📄 Testing ${file.name}...`);
    
    try {
      // Check if file exists
      if (!fs.existsSync(file.path)) {
        console.log(`❌ File not found: ${file.path}`);
        continue;
      }

      // Read file as buffer
      const fileBuffer = fs.readFileSync(file.path);
      console.log(`📊 File size: ${fileBuffer.length} bytes`);

      // Convert to base64
      const base64Data = fileBuffer.toString('base64');
      console.log(`📊 Base64 length: ${base64Data.length} characters`);

      // Process document
      console.log('🔄 Processing document...');
      const startTime = Date.now();
      
      const result = await processDocumentAttachment(base64Data, file.name, file.mimeType);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      if (result.success) {
        console.log(`✅ Success! Processing time: ${processingTime}ms`);
        console.log(`📊 Extracted text length: ${result.textLength} characters`);
        console.log(`📝 Preview (first 200 chars):`);
        console.log(`"${result.preview}"`);
        console.log(`📝 Full text (first 500 chars):`);
        console.log(`"${result.extractedText.substring(0, 500)}${result.extractedText.length > 500 ? '...' : ''}"`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }

    } catch (error) {
      console.log(`💥 Error testing ${file.name}:`, error.message);
    }

    console.log('─'.repeat(80));
  }

  console.log('🏁 Document processing tests completed!');
}

// Run the tests
testDocumentProcessing().catch(console.error);
