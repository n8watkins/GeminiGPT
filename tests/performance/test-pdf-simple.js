const fs = require('fs');
const path = require('path');

// Try different ways to import pdf-parse
console.log('Testing pdf-parse imports...');

try {
  const pdfParse1 = require('pdf-parse');
  console.log('Direct require:', typeof pdfParse1, Object.keys(pdfParse1));
  
  if (typeof pdfParse1 === 'function') {
    console.log('pdf-parse is a function, testing...');
    const buffer = fs.readFileSync(path.join(__dirname, 'public', 'resumepdf.pdf'));
    pdfParse1(buffer).then(result => {
      console.log('Success! Result:', typeof result, Object.keys(result));
      console.log('Text preview:', result.text ? result.text.substring(0, 100) : 'no text');
    }).catch(err => {
      console.log('Error:', err.message);
    });
  } else {
    console.log('pdf-parse is not a function');
  }
} catch (error) {
  console.log('Import error:', error.message);
}
