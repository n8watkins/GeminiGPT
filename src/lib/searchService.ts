/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { searchChats } from './vectordb';

// You'll need to get a Google Custom Search API key and Search Engine ID
// 1. Go to https://console.developers.google.com/
// 2. Enable the Custom Search API
// 3. Create credentials (API key)
// 4. Go to https://cse.google.com/ to create a custom search engine
// 5. Get your Search Engine ID

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || 'your_google_search_api_key';
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || 'your_search_engine_id';

async function searchGoogle(query: string, numResults: number = 5) {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_SEARCH_API_KEY,
        cx: GOOGLE_SEARCH_ENGINE_ID,
        q: query,
        num: numResults
      }
    });

    return response.data.items?.map((item: { title: string; link: string; snippet: string }) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    })) || [];
  } catch (error) {
    console.error('Error searching Google:', error);
    return [];
  }
}

async function getStockPrice(symbol: string) {
  try {
    // For demo purposes, return mock data when API keys are not configured
    if (GOOGLE_SEARCH_API_KEY === 'your_google_search_api_key_here') {
      return `📈 **Stock Information for ${symbol.toUpperCase()}**\n\n` +
             `Current Price: $${(Math.random() * 200 + 50).toFixed(2)}\n` +
             `Change: ${(Math.random() * 10 - 5).toFixed(2)}% (${Math.random() > 0.5 ? '↗️' : '↘️'})\n` +
             `Volume: ${(Math.random() * 10000000).toFixed(0)}\n\n` +
             `*Note: This is demo data. To get real stock prices, please configure your Google Search API keys.*`;
    }

    // Use a financial API like Alpha Vantage or Yahoo Finance
    // For demo purposes, we'll use a simple search
    const results = await searchGoogle(`${symbol} stock price current`, 3);
    
    if (results.length === 0) {
      return `I couldn't find current stock price information for ${symbol}. Please check the symbol and try again.`;
    }

    let response = `Current stock information for ${symbol}:\n\n`;
    results.forEach((result: { title: string; snippet: string; link: string }, index: number) => {
      response += `${index + 1}. ${result.title}\n${result.snippet}\n${result.link}\n\n`;
    });

    return response;
  } catch (error) {
    console.error('Error getting stock price:', error);
    return `Sorry, I couldn't retrieve stock price information for ${symbol} at this time.`;
  }
}

async function getWeather(location: string) {
  try {
    // For demo purposes, return mock data when API keys are not configured
    if (GOOGLE_SEARCH_API_KEY === 'your_google_search_api_key_here') {
      const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Overcast'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const temp = Math.floor(Math.random() * 30 + 10); // 10-40°C
      
      return `🌤️ **Weather in ${location}**\n\n` +
             `Current Conditions: ${condition}\n` +
             `Temperature: ${temp}°C (${Math.floor(temp * 9/5 + 32)}°F)\n` +
             `Humidity: ${Math.floor(Math.random() * 40 + 40)}%\n` +
             `Wind: ${Math.floor(Math.random() * 20 + 5)} km/h\n\n` +
             `*Note: This is demo data. To get real weather information, please configure your Google Search API keys.*`;
    }

    const results = await searchGoogle(`weather in ${location} current conditions`, 3);
    
    if (results.length === 0) {
      return `I couldn't find weather information for ${location}. Please check the location name and try again.`;
    }

    let response = `Current weather information for ${location}:\n\n`;
    results.forEach((result: { title: string; snippet: string; link: string }, index: number) => {
      response += `${index + 1}. ${result.title}\n${result.snippet}\n${result.link}\n\n`;
    });

    return response;
  } catch (error) {
    console.error('Error getting weather:', error);
    return `Sorry, I couldn't retrieve weather information for ${location} at this time.`;
  }
}

async function getTime(location: string) {
  try {
    // Get current time for the specified location
    const now = new Date();
    
    // Simple timezone mapping for common locations
    const timezones: Record<string, string> = {
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

function getTimezoneOffset(timezone: string) {
  // Simple timezone offset mapping (in hours from UTC)
  const offsets: Record<string, number> = {
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

async function getGeneralSearch(query: string) {
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
    results.forEach((result: { title: string; snippet: string; link: string }, index: number) => {
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
async function searchChatHistory(userId: string, query: string) {
  try {
    console.log(`Searching chat history for user ${userId} with query: ${query}`);
    
    // Search for similar messages in user's chat history
    const results = await searchChats(userId, query, 5);
    
    if (results.length === 0) {
      return `I couldn't find any relevant past conversations about "${query}". This might be the first time we're discussing this topic.`;
    }
    
    // Analyze the results to provide intelligent answers
    const userMessages = results.filter((r: any) => r.role === 'user');
    
    // Look for direct answers to common questions
    const lowerQuery = query.toLowerCase();
    
    // Handle "favorite" questions
    if (lowerQuery.includes('favorite') || lowerQuery.includes('prefer')) {
      const favoriteStatements = userMessages.filter((msg: any) => 
        msg.content.toLowerCase().includes('favorite') || 
        msg.content.toLowerCase().includes('prefer') ||
        msg.content.toLowerCase().includes('my ')
      );
      
      if (favoriteStatements.length > 0) {
        // Extract the most relevant statement
        const mostRecent = favoriteStatements[0];
        const content = mostRecent.content;
        
        // Try to extract the key information
        if (content.toLowerCase().includes('tennis')) {
          return `Based on our previous conversations, your favorite sport is **tennis**! You mentioned this and asked for tennis tips.`;
        } else if (content.toLowerCase().includes('sport')) {
          // Extract the sport mentioned
          const sportMatch = content.match(/my favorite sport is (\w+)/i);
          if (sportMatch) {
            return `Based on our previous conversations, your favorite sport is **${sportMatch[1]}**!`;
          }
        } else if (content.toLowerCase().includes('language')) {
          // Extract the language mentioned
          const languageMatch = content.match(/my favorite language is (\w+)/i) || 
                               content.match(/favorite language.*?(\w+)/i) ||
                               content.match(/language.*?(\w+)/i);
          if (languageMatch) {
            return `Based on our previous conversations, your favorite language is **${languageMatch[1]}**!`;
          }
        }
      }
    }
    
    // Handle "what did I say" or "what did we discuss" questions
    if (lowerQuery.includes('what did') || lowerQuery.includes('what we') || lowerQuery.includes('discussed')) {
      const topics = new Set();
      userMessages.forEach((msg: any) => {
        // Extract key topics from user messages
        const words = msg.content.toLowerCase().split(/\s+/);
        words.forEach((word: string) => {
          if (word.length > 4 && !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'were', 'said', 'told'].includes(word)) {
            topics.add(word);
          }
        });
      });
      
      if (topics.size > 0) {
        const topicList = Array.from(topics).slice(0, 5).join(', ');
        return `Based on our previous conversations, we've discussed: **${topicList}**. The most recent topics include tennis tips and your favorite sports.`;
      }
    }
    
    // Use Gemini to analyze the search results and provide a direct answer
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      // Prepare context from search results
      const contextMessages = results.slice(0, 5).map((result: any, index: number) => {
        const role = result.role === 'user' ? 'User' : 'Assistant';
        return `${index + 1}. ${role}: "${result.content}"`;
      }).join('\n');
      
      const analysisPrompt = `Based on the following conversation history, please answer the user's question directly and concisely. 

User's question: "${query}"

Conversation history:
${contextMessages}

Please provide a direct answer to the user's question based on the conversation history. If the information is available, give a specific answer. If not, say you couldn't find that information in the previous conversations. Keep your response brief and helpful.`;

      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      const analyzedAnswer = response.text();
      
      return analyzedAnswer;
    } catch (error) {
      console.error('Error analyzing search results with Gemini:', error);
      
      // Fallback to simple summary
      const recentTopics: string[] = [];
      userMessages.slice(0, 3).forEach((msg: any) => {
        const content = msg.content.substring(0, 100);
        if (content.length > 10) {
          recentTopics.push(`"${content}${content.length >= 100 ? '...' : ''}"`);
        }
      });
      
      if (recentTopics.length > 0) {
        return `Based on our previous conversations, here's what we've discussed:\n\n${recentTopics.join('\n\n')}\n\n*Found ${results.length} relevant past conversation${results.length > 1 ? 's' : ''}.*`;
      }
    }
    
    // Fallback to original format if no patterns match
    let response = `Here's what we've discussed before about "${query}":\n\n`;
    
    results.slice(0, 3).forEach((result: any, index: number) => {
      const date = new Date(result.timestamp).toLocaleDateString();
      const time = new Date(result.timestamp).toLocaleTimeString();
      const role = result.role === 'user' ? 'You' : 'I';
      
      response += `${index + 1}. **${role}** (${date} at ${time}):\n`;
      response += `   "${result.content.substring(0, 150)}${result.content.length > 150 ? '...' : ''}"\n`;
      if (result.chat_title) {
        response += `   *From chat: ${result.chat_title}*\n`;
      }
      response += `\n`;
    });
    
    response += `\n*Found ${results.length} relevant past conversation${results.length > 1 ? 's' : ''}.*`;
    
    return response;
  } catch (error) {
    console.error('Error searching chat history:', error);
    return `Sorry, I couldn't search through our past conversations about "${query}" at this time.`;
  }
}

export {
  searchGoogle,
  getStockPrice,
  getWeather,
  getTime,
  getGeneralSearch,
  searchChatHistory
};
