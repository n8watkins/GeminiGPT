const { getStockPrice, getWeather, getTime, getGeneralSearch } = require('../searchService');

// Set up test environment - uses real API keys from environment
console.log('🔑 Using API keys from environment variables');
console.log('Google Search API Key:', process.env.GOOGLE_SEARCH_API_KEY ? '✅ Set' : '❌ Missing');
console.log('Google Search Engine ID:', process.env.GOOGLE_SEARCH_ENGINE_ID ? '✅ Set' : '❌ Missing');

async function runManualTests() {
  console.log('🧪 Running Manual Tests for Gemini Chat App\n');
  console.log('=' .repeat(50));

  // Test 1: Stock Price Function
  console.log('\n📈 Test 1: Stock Price Function');
  console.log('-'.repeat(30));
  try {
    const stockResult = await getStockPrice('AAPL');
    console.log('✅ Stock Price Test Passed');
    console.log('Result:', stockResult.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ Stock Price Test Failed:', error.message);
  }

  // Test 2: Weather Function
  console.log('\n🌤️ Test 2: Weather Function');
  console.log('-'.repeat(30));
  try {
    const weatherResult = await getWeather('Oregon');
    console.log('✅ Weather Test Passed');
    console.log('Result:', weatherResult.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ Weather Test Failed:', error.message);
  }

  // Test 3: Time Function
  console.log('\n🕐 Test 3: Time Function');
  console.log('-'.repeat(30));
  try {
    const timeResult = await getTime('New York');
    console.log('✅ Time Test Passed');
    console.log('Result:', timeResult.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ Time Test Failed:', error.message);
  }

  // Test 4: General Search Function
  console.log('\n🔍 Test 4: General Search Function');
  console.log('-'.repeat(30));
  try {
    const searchResult = await getGeneralSearch('AI news');
    console.log('✅ Search Test Passed');
    console.log('Result:', searchResult.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ Search Test Failed:', error.message);
  }

  // Test 5: Function Detection Keywords
  console.log('\n🎯 Test 5: Function Detection Keywords');
  console.log('-'.repeat(30));
  
  const testQueries = [
    'What is the stock price of Tesla?',
    'How is the weather in New York?',
    'What time is it in New York?',
    'Search for renewable energy information',
    'Tell me about the weather in California',
    'What is the price of Microsoft stock?',
    'What time is it in London?',
    'Find information about space exploration'
  ];

  testQueries.forEach((query, index) => {
    const lowerQuery = query.toLowerCase();
    let detectedFunction = 'None';
    
    if (lowerQuery.includes('stock') || lowerQuery.includes('price') || lowerQuery.includes('ticker')) {
      detectedFunction = 'Stock Price';
    } else if (lowerQuery.includes('weather') || lowerQuery.includes('temperature') || lowerQuery.includes('forecast')) {
      detectedFunction = 'Weather';
    } else if (lowerQuery.includes('time') || lowerQuery.includes('what time') || lowerQuery.includes('current time')) {
      detectedFunction = 'Time';
    } else if (lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('look up')) {
      detectedFunction = 'General Search';
    }
    
    console.log(`${index + 1}. "${query}" → ${detectedFunction}`);
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ Manual Tests Completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Open http://localhost:5000');
  console.log('3. Try the test queries above');
  console.log('4. Check console logs for function call detection');
}

// Run the tests
runManualTests().catch(console.error);
