/**
 * Function Tool Declarations
 *
 * IMPORTANT: The 'description' field tells Gemini WHEN to call the function.
 * Editing descriptions changes AI behavior without changing code logic.
 *
 * Each function tool defines:
 * - name: Function identifier (must match implementation)
 * - description: When and why to call this function (CRITICAL for AI behavior)
 * - parameters: JSON Schema defining expected arguments
 */

const FUNCTION_TOOLS = {
  /**
   * Stock Price Lookup
   * Gets real-time stock price information
   */
  get_stock_price: {
    name: "get_stock_price",
    description: "Get current stock price information for a given stock symbol",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "The stock symbol (e.g., AAPL, GOOGL, MSFT)"
        }
      },
      required: ["symbol"]
    }
  },

  /**
   * Weather Information
   * Gets current weather for any location
   */
  get_weather: {
    name: "get_weather",
    description: "Get current weather information for a specific location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The location to get weather for (e.g., 'New York', 'London', 'Tokyo')"
        }
      },
      required: ["location"]
    }
  },

  /**
   * Time Lookup
   * Gets current time for any location/timezone
   */
  get_time: {
    name: "get_time",
    description: "Get current time for a specific location or city",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The location to get time for (e.g., 'New York', 'London', 'Tokyo', 'NY', 'LA')"
        }
      },
      required: ["location"]
    }
  },

  /**
   * Web Search
   * Searches the internet for general information
   */
  search_web: {
    name: "search_web",
    description: "Search the web for general information about any topic",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to look up on the web"
        }
      },
      required: ["query"]
    }
  },

  /**
   * Chat History Search
   * Searches through ALL of the user's past conversations
   *
   * CRITICAL: This is the most complex function tool.
   * The description is VERY detailed to teach the AI when to use it.
   */
  search_chat_history: {
    name: "search_chat_history",
    description: `Search through ALL of the user's past conversations (across different chat sessions) to find relevant information.

IMPORTANT: You can already see the current chat session's full history - use this function ONLY to search OTHER chat sessions.

Use this when:
1. User asks about people/entities not mentioned in THIS conversation (e.g., 'who is Nathan Watkins' when no Nathan was mentioned in current chat)
2. User references documents uploaded in previous chats (e.g., 'what was in my resume' when no resume in current chat)
3. User asks about their preferences, favorites, or past statements (e.g., 'what's my favorite X', 'what did I say about Y')
4. User asks 'do you remember when I told you about X' and X isn't in current chat
5. Questions starting with 'my' that reference context not in current chat (e.g., 'my document', 'my resume', 'my favorite')

DO NOT use this if the information is already visible in the current conversation history.`,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to search for in past conversations. Be specific - include names, topics, or keywords that would help find the relevant information."
        }
      },
      required: ["query"]
    }
  }
};

/**
 * Build tools array for Gemini API
 *
 * @param {Array<string>|null} enabledTools - Which tools to include (default: all)
 * @returns {Array} - Gemini-formatted tools array
 *
 * @example
 * // Include all tools
 * const tools = buildToolsArray();
 *
 * @example
 * // Include only specific tools
 * const tools = buildToolsArray(['get_weather', 'get_time']);
 *
 * @example
 * // Exclude search_chat_history
 * const allTools = getAvailableTools();
 * const filtered = allTools.filter(t => t !== 'search_chat_history');
 * const tools = buildToolsArray(filtered);
 */
function buildToolsArray(enabledTools = null) {
  const toolsToInclude = enabledTools || Object.keys(FUNCTION_TOOLS);

  const function_declarations = toolsToInclude.map(toolName => {
    const tool = FUNCTION_TOOLS[toolName];
    if (!tool) {
      console.warn(`⚠️  Tool ${toolName} not found in FUNCTION_TOOLS`);
      return null;
    }
    return tool;
  }).filter(Boolean);

  return [{ function_declarations }];
}

/**
 * Get all available tool names
 * @returns {Array<string>} - Array of tool names
 */
function getAvailableTools() {
  return Object.keys(FUNCTION_TOOLS);
}

/**
 * Get a specific tool declaration
 * @param {string} toolName - The name of the tool
 * @returns {Object|null} - The tool declaration or null if not found
 */
function getTool(toolName) {
  return FUNCTION_TOOLS[toolName] || null;
}

/**
 * Check if a tool exists
 * @param {string} toolName - The name of the tool
 * @returns {boolean} - True if tool exists
 */
function hasTool(toolName) {
  return toolName in FUNCTION_TOOLS;
}

/**
 * Get tool description (useful for debugging/logging)
 * @param {string} toolName - The name of the tool
 * @returns {string|null} - The tool's description
 */
function getToolDescription(toolName) {
  const tool = getTool(toolName);
  return tool ? tool.description : null;
}

module.exports = {
  FUNCTION_TOOLS,
  buildToolsArray,
  getAvailableTools,
  getTool,
  hasTool,
  getToolDescription
};
