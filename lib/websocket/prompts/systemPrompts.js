/**
 * System Prompts - Edit these to change AI behavior
 *
 * IMPORTANT: These are loaded at runtime, so you can:
 * - Edit without recompiling
 * - Version control prompts separately
 * - A/B test variations
 * - Load from database later
 *
 * Each prompt is a Gemini-formatted message object with role and parts.
 */

const SYSTEM_PROMPTS = {
  /**
   * Base system prompt (always included)
   * Sets the fundamental AI behavior and identity
   */
  base: {
    role: 'user',
    parts: [{
      text: `You are a helpful AI assistant with access to the user's full conversation history across multiple chat sessions.

When writing code, ALWAYS use actual values - NEVER use placeholders like [object Object].`
    }]
  },

  /**
   * Function calling instructions
   * Tells the AI when and how to use available functions
   */
  functionCalling: {
    role: 'user',
    parts: [{
      text: `When a user asks about something from a previous conversation that isn't visible in the current chat, use the search_chat_history function to look through their other chat sessions.

Examples of when to use search_chat_history:
- "what did I tell you about my preferences?" → Search for "preferences" in past conversations
- "do you remember when I mentioned my project?" → Search for "project" in past conversations
- "what was that code snippet I shared earlier?" → Search for "code snippet" in past conversations

Only search chat history when the information is clearly from a different conversation. If it's in the current chat, use that directly.`
    }]
  },

  /**
   * Available tools description
   * Lists what functions are available to the AI
   */
  toolsAvailable: {
    role: 'user',
    parts: [{
      text: `You also have access to:
- search_web: For current events and general knowledge
- get_stock_price, get_weather, get_time: For real-time data
- search_chat_history: To find information from previous chat sessions`
    }]
  },

  /**
   * Model acknowledgement
   * The AI's response showing it understands the instructions
   * This improves performance by confirming understanding
   */
  acknowledgement: {
    role: 'model',
    parts: [{
      text: `Understood! I'll help with your questions by:
- Using information from the current conversation when available
- Searching previous chat sessions if you reference something from another conversation
- Using web search for current events and real-time information
- Providing accurate, helpful responses with real code (never using placeholders)`
    }]
  }
};

/**
 * Build system prompt messages array
 * @param {Object} options - What to include
 * @param {boolean} options.includeFunctionCalling - Include function calling instructions
 * @param {boolean} options.includeToolsAvailable - Include available tools description
 * @param {boolean} options.includeAcknowledgement - Include model acknowledgement
 * @returns {Array} - Gemini-formatted system messages
 */
function buildSystemPrompt(options = {}) {
  const {
    includeFunctionCalling = true,
    includeToolsAvailable = true,
    includeAcknowledgement = true
  } = options;

  const messages = [SYSTEM_PROMPTS.base];

  if (includeFunctionCalling) {
    messages.push(SYSTEM_PROMPTS.functionCalling);
  }

  if (includeToolsAvailable) {
    messages.push(SYSTEM_PROMPTS.toolsAvailable);
  }

  if (includeAcknowledgement) {
    messages.push(SYSTEM_PROMPTS.acknowledgement);
  }

  return messages;
}

/**
 * Get just the base system prompt (no function calling instructions)
 * Useful for testing or minimal configurations
 */
function getBasePrompt() {
  return [SYSTEM_PROMPTS.base];
}

/**
 * Get full system prompt (all components)
 * This is the default configuration with all features enabled
 */
function getFullPrompt() {
  return buildSystemPrompt({
    includeFunctionCalling: true,
    includeToolsAvailable: true,
    includeAcknowledgement: true
  });
}

/**
 * Get system prompt without acknowledgement
 * Useful if you want shorter prompts
 */
function getPromptWithoutAcknowledgement() {
  return buildSystemPrompt({
    includeFunctionCalling: true,
    includeToolsAvailable: true,
    includeAcknowledgement: false
  });
}

module.exports = {
  SYSTEM_PROMPTS,
  buildSystemPrompt,
  getBasePrompt,
  getFullPrompt,
  getPromptWithoutAcknowledgement
};
