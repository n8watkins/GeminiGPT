const { searchChatHistory } = require('./searchService');

/**
 * Test the searchChatHistory function to see what results it returns
 */

async function testSearchChatHistory() {
  console.log('='.repeat(70));
  console.log('TESTING searchChatHistory FUNCTION');
  console.log('='.repeat(70));

  // Use the actual user ID from the database
  const userId = 'USER-UQMUOT-6861';

  // Test queries that failed in real usage
  const queries = [
    'who is nathan watkins',
    'what is my favorite animal',
    'nathan watkins',
    'resume',
    'favorite animal'
  ];

  for (const query of queries) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Query: "${query}"`);
    console.log('='.repeat(70));

    try {
      const result = await searchChatHistory(userId, query);

      console.log('\nResult from searchChatHistory:');
      console.log('-'.repeat(70));
      console.log(result);
      console.log('-'.repeat(70));

      // Analyze the result
      if (result.includes("couldn't find any relevant past conversations")) {
        console.log('\n⚠ Status: NO RESULTS FOUND');
        console.log('  This means the search did not find relevant messages.');
      } else {
        console.log('\n✓ Status: RESULTS FOUND');
        console.log('  The search found relevant information!');

        // Check if it contains key information
        if (query.includes('nathan') || query.includes('watkins')) {
          if (result.toLowerCase().includes('nathan') && result.toLowerCase().includes('watkins')) {
            console.log('  ✓ Result contains "Nathan Watkins"');
          }
          if (result.toLowerCase().includes('developer') || result.toLowerCase().includes('react')) {
            console.log('  ✓ Result contains developer information');
          }
          if (result.toLowerCase().includes('resume')) {
            console.log('  ✓ Result mentions resume');
          }
          if (result.toLowerCase().includes('musician')) {
            console.log('  ⚠ Result mentions musician (hallucinated answer)');
          }
        }

        if (query.includes('favorite') && query.includes('animal')) {
          if (result.toLowerCase().includes('dog')) {
            console.log('  ✓ Result contains "dog" (correct answer)');
          } else {
            console.log('  ✗ Result does NOT contain "dog"');
          }
        }
      }

    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS');
  console.log('='.repeat(70));

  console.log('\nThe searchChatHistory function uses:');
  console.log('  1. Vector search via searchChats (from vectordb)');
  console.log('  2. Gemini AI to analyze and answer the question');
  console.log('  3. Fallback to formatted results if Gemini fails');

  console.log('\nIf results are found here but not used in the chat:');
  console.log('  - The pre-search is working correctly');
  console.log('  - The problem is in how the results are added to context');
  console.log('  - OR Gemini is ignoring the context provided');

  console.log('\nIf results are NOT found:');
  console.log('  - The vector search may not be finding relevant messages');
  console.log('  - Embeddings may not be similar enough');
  console.log('  - User ID mismatch (but we verified this is correct)');

  console.log('\n' + '='.repeat(70));
}

// Run the test
testSearchChatHistory();
