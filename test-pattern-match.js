/**
 * Test if the pattern matching is working
 */

function shouldTriggerChatHistorySearch(message) {
  const lowerMessage = message.toLowerCase();

  const searchPatterns = [
    /what (is|are) my (.+)/,
    /what (is|are) our (.+)/,
    /what did i (.+)/,
    /what have i (.+)/,
    /do i (.+)/,
    /did i (.+)/,
    /have i (.+)/,
    /what's my (.+)/,
  ];

  for (const pattern of searchPatterns) {
    if (pattern.test(lowerMessage)) {
      console.log(`✅ MATCHED pattern: ${pattern}`);
      return true;
    }
  }

  const personalKeywords = [
    'uploaded',
    'my resume',
    'my cv',
    'my document',
    'my file',
    'discussed with you',
    'talked with you',
    'mentioned to you',
    'told you',
    'my favorite',
    'my preference'
  ];

  for (const keyword of personalKeywords) {
    if (lowerMessage.includes(keyword)) {
      console.log(`✅ MATCHED keyword: "${keyword}"`);
      return true;
    }
  }

  return false;
}

const testQueries = [
  "what is my favorite type of animal",
  "what is my favorite animal",
  "whats my favorite animal",
  "what's my favorite dog",
  "my favorite dog is a labrador",
  "i love dogs their my favorite animal"
];

console.log('🧪 Testing Pattern Matching\n');
console.log('═'.repeat(60));

testQueries.forEach(query => {
  console.log(`\n📝 Query: "${query}"`);
  const result = shouldTriggerChatHistorySearch(query);
  console.log(`   Result: ${result ? '✅ WILL TRIGGER SEARCH' : '❌ Will NOT trigger search'}\n`);
});

console.log('═'.repeat(60));
