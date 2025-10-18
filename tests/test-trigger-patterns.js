/**
 * Test the shouldTriggerChatHistorySearch function patterns
 */

function shouldTriggerChatHistorySearch(message) {
  const lowerMessage = message.toLowerCase();

  // Patterns that suggest we should search chat history first
  const searchPatterns = [
    // Questions about people
    /what (does|is) (.+) (do|work|do for a living)/,
    /who is (.+)/,
    /tell me about (.+)/,
    /what kind of work does (.+) do/,
    /what does (.+) do/,

    // Questions about specific topics that might have been discussed
    /what (is|are) (.+)/,
    /how (does|do) (.+) work/,
    /explain (.+)/,

    // Questions about preferences or personal info
    /what (is|are) (my|your) (.+)/,
    /do (i|you) (.+)/,
    /have (i|you) (.+)/,

    // Questions about documents or files
    /what (is|was) in (.+)/,
    /what does (.+) say/,
    /what (is|was) the (.+) about/,
  ];

  // Check if any pattern matches
  for (const pattern of searchPatterns) {
    if (pattern.test(lowerMessage)) {
      return true;
    }
  }

  // Also check for specific keywords that suggest personal context
  const personalKeywords = [
    'resume', 'cv', 'document', 'file', 'uploaded', 'mentioned', 'discussed',
    'previously', 'before', 'earlier', 'my', 'your', 'personal', 'favorite',
    'prefer', 'like', 'love', 'hate', 'dislike'
  ];

  return personalKeywords.some(keyword => lowerMessage.includes(keyword));
}

console.log('='.repeat(70));
console.log('TESTING shouldTriggerChatHistorySearch PATTERNS');
console.log('='.repeat(70));

// Test queries from the actual user interaction
const testQueries = [
  // These SHOULD trigger search
  { query: 'who is nathan watkins', expected: true, description: 'Question about person' },
  { query: 'what is my favorite animal', expected: true, description: 'Question about personal preference' },
  { query: 'what does nathan watkins do', expected: true, description: 'Question about person\'s work' },
  { query: 'tell me about nathan watkins', expected: true, description: 'Request for info about person' },
  { query: 'what was in the resume', expected: true, description: 'Question about uploaded document' },
  { query: 'what is my favorite sport', expected: true, description: 'Question about personal favorite' },
  { query: 'did I mention my favorite color', expected: true, description: 'Question about previous mention' },
  { query: 'what did we discuss earlier', expected: true, description: 'Question about previous discussion' },

  // These should NOT trigger search (general knowledge)
  { query: 'what is the capital of France', expected: false, description: 'General knowledge question' },
  { query: 'how does photosynthesis work', expected: false, description: 'Science question' },
  { query: 'tell me a joke', expected: false, description: 'General request' },
];

console.log('\nTest Results:\n');

let passed = 0;
let failed = 0;

testQueries.forEach((test, index) => {
  const result = shouldTriggerChatHistorySearch(test.query);
  const status = result === test.expected ? '✓ PASS' : '✗ FAIL';

  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${index + 1}. ${status}`);
  console.log(`   Query: "${test.query}"`);
  console.log(`   Description: ${test.description}`);
  console.log(`   Expected: ${test.expected}, Got: ${result}`);

  if (result !== test.expected) {
    console.log(`   ⚠ MISMATCH!`);
  }
  console.log('');
});

console.log('='.repeat(70));
console.log(`RESULTS: ${passed}/${testQueries.length} tests passed, ${failed} failed`);
console.log('='.repeat(70));

// Analyze specific problem queries
console.log('\n' + '='.repeat(70));
console.log('ANALYZING PROBLEM QUERIES FROM USER');
console.log('='.repeat(70));

const problemQueries = [
  'who is nathan watkins',
  'what is my favorite animal'
];

problemQueries.forEach(query => {
  const shouldTrigger = shouldTriggerChatHistorySearch(query);
  console.log(`\nQuery: "${query}"`);
  console.log(`Should trigger search: ${shouldTrigger ? 'YES ✓' : 'NO ✗'}`);

  if (shouldTrigger) {
    console.log('✓ This query SHOULD trigger pre-search');
    console.log('  If it didn\'t work, the issue is likely:');
    console.log('    1. Pre-search happened but results were ignored');
    console.log('    2. Gemini model didn\'t use the search_chat_history function');
    console.log('    3. Search results weren\'t added to context properly');
  } else {
    console.log('✗ This query WILL NOT trigger pre-search');
    console.log('  This is the problem! The pattern needs to be fixed.');
  }
});
