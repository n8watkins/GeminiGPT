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
      text: `CRITICAL: When a user asks about someone or something NOT in the current conversation (like "who is X" or "what's in my resume"), you MUST call the search_chat_history function to search their previous conversations in OTHER chat sessions.

Examples of when to use search_chat_history:
- "who is Nathan Watkins?" → Search for "Nathan Watkins" in past conversations
- "what's in my resume?" → Search for "resume" in past conversations
- "what did I tell you about my preferences?" → Search for "preferences" in past conversations
- "do you remember when I mentioned X?" → Search for "X" in past conversations

DO NOT use search_chat_history if the information is already visible in THIS conversation.`
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
      text: `Understood! I will:
1. Check if information is in the current conversation first
2. Call search_chat_history when users ask about things from OTHER chat sessions
3. Use search_web for current information
4. Provide accurate, helpful responses with real code (no placeholders)`
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
