const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

console.log('PDF Parse module structure:');
console.log('Type:', typeof pdfParse);
console.log('Keys:', Object.keys(pdfParse));
console.log('PDFParse type:', typeof pdfParse.PDFParse);
console.log('VerbosityLevel:', pdfParse.VerbosityLevel);

// Try to create a parser instance
try {
  const parser = new pdfParse.PDFParse({}, pdfParse.VerbosityLevel.ERRORS);
  console.log('Parser created successfully');
  console.log('Parser methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
  console.log('Parser events:', parser._events ? Object.keys(parser._events) : 'no events');
} catch (error) {
  console.log('Error creating parser:', error.message);
}

// Try the getHeader function
try {
  const buffer = fs.readFileSync(path.join(__dirname, 'public', 'resumepdf.pdf'));
  const header = pdfParse.getHeader(buffer);
  console.log('Header result:', header);
} catch (error) {
  console.log('Error getting header:', error.message);
}
