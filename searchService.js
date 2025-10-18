const axios = require('axios');

// You'll need to get a Google Custom Search API key and Search Engine ID
// 1. Go to https://console.developers.google.com/
// 2. Enable the Custom Search API
// 3. Create credentials (API key)
// 4. Go to https://cse.google.com/ to create a custom search engine
// 5. Get your Search Engine ID

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

async function searchGoogle(query, numResults = 5) {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_SEARCH_API_KEY,
        cx: GOOGLE_SEARCH_ENGINE_ID,
        q: query,
        num: numResults
      }
    });

    return response.data.items?.map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    })) || [];
  } catch (error) {
    console.error('Error searching Google:', error);
    return [];
  }
}

async function getStockPrice(symbol) {
  try {
    // Check if API keys are configured
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      return `❌ **Stock Information for ${symbol.toUpperCase()}**\n\n` +
             `Unable to fetch stock data. Please configure Google Search API keys in your environment variables.\n\n` +
             `Required: GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID`;
    }

    // Use a financial API like Alpha Vantage or Yahoo Finance
    // For demo purposes, we'll use a simple search
    const results = await searchGoogle(`${symbol} stock price current`, 3);
    
    if (results.length === 0) {
      return `I couldn't find current stock price information for ${symbol}. Please check the symbol and try again.`;
    }

    let response = `Current stock information for ${symbol}:\n\n`;
    results.forEach((result, index) => {
      response += `${index + 1}. ${result.title}\n${result.snippet}\n${result.link}\n\n`;
    });

    return response;
  } catch (error) {
    console.error('Error getting stock price:', error);
    return `Sorry, I couldn't retrieve stock price information for ${symbol} at this time.`;
  }
}

async function getWeather(location) {
  try {
    // Check if API keys are configured
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      return `❌ **Weather in ${location}**\n\n` +
             `Unable to fetch weather data. Please configure Google Search API keys in your environment variables.\n\n` +
             `Required: GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID`;
    }

    const results = await searchGoogle(`weather in ${location} current conditions`, 3);
    
    if (results.length === 0) {
      return `I couldn't find weather information for ${location}. Please check the location name and try again.`;
    }

    let response = `Current weather information for ${location}:\n\n`;
    results.forEach((result, index) => {
      response += `${index + 1}. ${result.title}\n${result.snippet}\n${result.link}\n\n`;
    });

    return response;
  } catch (error) {
    console.error('Error getting weather:', error);
    return `Sorry, I couldn't retrieve weather information for ${location} at this time.`;
  }
}

async function getTime(location) {
  try {
    // Get current time for the specified location
    const now = new Date();
    
    // Simple timezone mapping for common locations
    const timezones = {
      'new york': 'America/New_York',
      'ny': 'America/New_York',
      'nyc': 'America/New_York',
      'london': 'Europe/London',
      'paris': 'Europe/Paris',
      'tokyo': 'Asia/Tokyo',
      'california': 'America/Los_Angeles',
      'la': 'America/Los_Angeles',
      'los angeles': 'America/Los_Angeles',
      'chicago': 'America/Chicago',
      'denver': 'America/Denver',
      'seattle': 'America/Los_Angeles',
      'miami': 'America/New_York',
      'boston': 'America/New_York',
      'austin': 'America/Chicago',
      'dallas': 'America/Chicago',
      'houston': 'America/Chicago',
      'phoenix': 'America/Phoenix',
      'las vegas': 'America/Los_Angeles',
      'san francisco': 'America/Los_Angeles',
      'san diego': 'America/Los_Angeles',
      'portland': 'America/Los_Angeles',
      'oregon': 'America/Los_Angeles',
      'washington': 'America/New_York',
      'dc': 'America/New_York',
      'washington dc': 'America/New_York'
    };

    const locationKey = location.toLowerCase().trim();
    const timezone = timezones[locationKey] || 'America/New_York'; // Default to NY time
    
    // Create a date object for the specific timezone
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const targetTime = new Date(utc + (getTimezoneOffset(timezone) * 60000));
    
    const timeString = targetTime.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    return `🕐 **Current Time in ${location}**\n\n` +
           `${timeString}\n\n` +
           `*Time zone: ${timezone}*`;
  } catch (error) {
    console.error('Error getting time:', error);
    return `Sorry, I couldn't get the current time for ${location}.`;
  }
}

function getTimezoneOffset(timezone) {
  // Simple timezone offset mapping (in hours from UTC)
  const offsets = {
    'America/New_York': -5, // EST (adjust for DST as needed)
    'America/Los_Angeles': -8, // PST
    'America/Chicago': -6, // CST
    'America/Denver': -7, // MST
    'America/Phoenix': -7, // MST (no DST)
    'Europe/London': 0, // GMT
    'Europe/Paris': 1, // CET
    'Asia/Tokyo': 9 // JST
  };
  return offsets[timezone] || -5; // Default to EST
}

async function getGeneralSearch(query) {
  try {
    // For demo purposes, return mock data when API keys are not configured
    if (GOOGLE_SEARCH_API_KEY === 'your_google_search_api_key_here') {
      return `🔍 **Search Results for "${query}"**\n\n` +
             `1. **${query} - Wikipedia**\n` +
             `   ${query} is a topic of interest with various aspects and applications...\n` +
             `   https://en.wikipedia.org/wiki/${encodeURIComponent(query)}\n\n` +
             `2. **Latest News about ${query}**\n` +
             `   Recent developments and updates related to ${query}...\n` +
             `   https://news.google.com/search?q=${encodeURIComponent(query)}\n\n` +
             `3. **${query} - Official Information**\n` +
             `   Comprehensive information and resources about ${query}...\n` +
             `   https://www.google.com/search?q=${encodeURIComponent(query)}\n\n` +
             `*Note: These are demo results. To get real search results, please configure your Google Search API keys.*`;
    }

    const results = await searchGoogle(query, 5);
    
    if (results.length === 0) {
      return `I couldn't find information about "${query}". Please try rephrasing your question.`;
    }

    let response = `Search results for "${query}":\n\n`;
    results.forEach((result, index) => {
      response += `${index + 1}. ${result.title}\n${result.snippet}\n${result.link}\n\n`;
    });

    return response;
  } catch (error) {
    console.error('Error in general search:', error);
    return `Sorry, I couldn't search for "${query}" at this time.`;
  }
}

/**
 * Search through user's chat history using vector similarity
 * @param {string} userId - User ID to search within
 * @param {string} query - Search query
 * @returns {Promise<string>} - Formatted search results
 */
async function searchChatHistory(userId, query) {
  try {
    console.log(`Searching chat history for user ${userId} with query: ${query}`);
    
    // Import the vector database functions
    const { searchChats } = require('./vectorDB');
    
    // Search for similar messages
    const results = await searchChats(userId, query, 5);
    
    if (results.length === 0) {
      return `🔍 **Chat History Search for "${query}"**\n\n` +
             `I couldn't find any relevant information about "${query}" in your previous conversations.`;
    }
    
    // Format the results
    let response = `🔍 **Chat History Search for "${query}"**\n\n` +
                   `I found ${results.length} relevant message(s) from your previous conversations:\n\n`;
    
    results.forEach((result, index) => {
      const timestamp = new Date(result.timestamp).toLocaleString();
      const chatTitle = result.chat_title || 'Untitled Chat';
      const content = result.content.length > 200 
        ? result.content.substring(0, 200) + '...' 
        : result.content;
      
      response += `${index + 1}. **From "${chatTitle}"** (${timestamp})\n` +
                  `   ${result.role === 'user' ? '👤 You' : '🤖 Assistant'}: ${content}\n\n`;
    });
    
    return response;
  } catch (error) {
    console.error('Error searching chat history:', error);
    return `Sorry, I couldn't search through our past conversations about "${query}" at this time. Error: ${error.message}`;
  }
}

module.exports = {
  searchGoogle,
  getStockPrice,
  getWeather,
  getTime,
  getGeneralSearch,
  searchChatHistory
};
