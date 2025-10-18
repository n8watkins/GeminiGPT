const { getStockPrice, getWeather, getGeneralSearch } = require('../searchService');

describe('Search Service Tests', () => {
  // Mock environment variables
  beforeAll(() => {
    process.env.GOOGLE_SEARCH_API_KEY = 'test_api_key';
    process.env.GOOGLE_SEARCH_ENGINE_ID = 'test_engine_id';
  });

  describe('getStockPrice', () => {
    test('should return demo data when API key is not configured', async () => {
      // Temporarily set demo API key
      const originalKey = process.env.GOOGLE_SEARCH_API_KEY;
      process.env.GOOGLE_SEARCH_API_KEY = 'your_google_search_api_key_here';
      
      const result = await getStockPrice('AAPL');
      
      expect(result).toContain('Stock Information for AAPL');
      expect(result).toContain('Current Price: $');
      expect(result).toContain('demo data');
      
      // Restore original key
      process.env.GOOGLE_SEARCH_API_KEY = originalKey;
    });

    test('should handle different stock symbols', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
      
      for (const symbol of symbols) {
        const result = await getStockPrice(symbol);
        expect(result).toContain(`Stock Information for ${symbol}`);
        expect(result).toContain('Current Price: $');
      }
    });
  });

  describe('getWeather', () => {
    test('should return demo data when API key is not configured', async () => {
      // Temporarily set demo API key
      const originalKey = process.env.GOOGLE_SEARCH_API_KEY;
      process.env.GOOGLE_SEARCH_API_KEY = 'your_google_search_api_key_here';
      
      const result = await getWeather('Oregon');
      
      expect(result).toContain('Weather in Oregon');
      expect(result).toContain('Current Conditions:');
      expect(result).toContain('Temperature:');
      expect(result).toContain('demo data');
      
      // Restore original key
      process.env.GOOGLE_SEARCH_API_KEY = originalKey;
    });

    test('should handle different locations', async () => {
      const locations = ['New York', 'California', 'London', 'Tokyo'];
      
      for (const location of locations) {
        const result = await getWeather(location);
        expect(result).toContain(`Weather in ${location}`);
        expect(result).toContain('Current Conditions:');
        expect(result).toContain('Temperature:');
      }
    });
  });

  describe('getGeneralSearch', () => {
    test('should return demo data when API key is not configured', async () => {
      // Temporarily set demo API key
      const originalKey = process.env.GOOGLE_SEARCH_API_KEY;
      process.env.GOOGLE_SEARCH_API_KEY = 'your_google_search_api_key_here';
      
      const result = await getGeneralSearch('AI news');
      
      expect(result).toContain('Search Results for "AI news"');
      expect(result).toContain('Wikipedia');
      expect(result).toContain('Latest News');
      expect(result).toContain('demo results');
      
      // Restore original key
      process.env.GOOGLE_SEARCH_API_KEY = originalKey;
    });

    test('should handle different search queries', async () => {
      const queries = ['renewable energy', 'space exploration', 'machine learning'];
      
      for (const query of queries) {
        const result = await getGeneralSearch(query);
        expect(result).toContain(`Search Results for "${query}"`);
        expect(result).toContain('Wikipedia');
        expect(result).toContain('Latest News');
      }
    });
  });
});
