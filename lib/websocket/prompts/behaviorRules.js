/**
 * AI Behavior Rules
 *
 * These are injected into the system prompt to control AI behavior.
 * Edit these to change how the AI responds WITHOUT changing core logic.
 *
 * Each rule category can be enabled/disabled independently.
 * This allows for fine-grained control over AI behavior.
 */

const BEHAVIOR_RULES = {
  /**
   * Code Generation Rules
   * How the AI should write and format code examples
   */
  codeGeneration: {
    enabled: true,
    rules: [
      "ALWAYS use actual values in code examples",
      "NEVER use placeholders like [object Object] or TODO",
      "Include error handling in code examples",
      "Add comments explaining complex logic",
      "Use modern JavaScript/TypeScript syntax",
      "Provide working, runnable code examples"
    ]
  },

  /**
   * Response Formatting Rules
   * How the AI should structure and format responses
   */
  formatting: {
    enabled: true,
    rules: [
      "Use markdown formatting for better readability",
      "Break long responses into sections with headers",
      "Use bullet points for lists",
      "Use code blocks with language specifiers",
      "Include examples when explaining concepts",
      "Keep paragraphs concise (3-4 sentences max)"
    ]
  },

  /**
   * Function Calling Rules
   * When and how the AI should use available functions
   */
  functionCalling: {
    enabled: true,
    rules: [
      "ONLY call search_chat_history for information NOT in current conversation",
      "Always check current conversation first before searching history",
      "Prefer search_web for current events and real-time data",
      "Use get_stock_price, get_weather, get_time for real-time queries",
      "Don't make redundant function calls",
      "Explain what you're doing when calling functions"
    ]
  },

  /**
   * Tone and Style Rules
   * The AI's communication style and personality
   */
  tone: {
    enabled: true,
    rules: [
      "Be helpful and friendly",
      "Use professional but approachable language",
      "Acknowledge when you don't know something",
      "Ask clarifying questions when needed",
      "Be concise but thorough",
      "Show empathy and understanding"
    ]
  },

  /**
   * Error Handling Rules
   * How the AI should respond to errors and failures
   */
  errorHandling: {
    enabled: true,
    rules: [
      "If a function call fails, explain what went wrong",
      "Suggest alternatives when something doesn't work",
      "Never expose internal errors to user",
      "Provide helpful next steps",
      "Offer to try a different approach",
      "Apologize for errors and maintain positive tone"
    ]
  },

  /**
   * Context Awareness Rules
   * How the AI should use conversation history and context
   */
  contextAwareness: {
    enabled: true,
    rules: [
      "Remember information from earlier in the conversation",
      "Reference previous messages when relevant",
      "Maintain conversation continuity",
      "Don't ask for information already provided",
      "Use pronouns appropriately (they/them when gender unknown)"
    ]
  }
};

/**
 * Build behavior rules text for injection into system prompt
 *
 * @param {Object} options - Which rule categories to include
 * @param {boolean} options.includeCodeGeneration - Include code generation rules
 * @param {boolean} options.includeFormatting - Include formatting rules
 * @param {boolean} options.includeFunctionCalling - Include function calling rules
 * @param {boolean} options.includeTone - Include tone/style rules
 * @param {boolean} options.includeErrorHandling - Include error handling rules
 * @param {boolean} options.includeContextAwareness - Include context awareness rules
 * @returns {string} - Formatted rules text
 */
function buildBehaviorRulesText(options = {}) {
  const {
    includeCodeGeneration = true,
    includeFormatting = true,
    includeFunctionCalling = true,
    includeTone = true,
    includeErrorHandling = true,
    includeContextAwareness = true
  } = options;

  const sections = [];

  if (includeCodeGeneration && BEHAVIOR_RULES.codeGeneration.enabled) {
    sections.push(
      "Code Generation:\n" +
      BEHAVIOR_RULES.codeGeneration.rules.map(r => `- ${r}`).join('\n')
    );
  }

  if (includeFormatting && BEHAVIOR_RULES.formatting.enabled) {
    sections.push(
      "Response Formatting:\n" +
      BEHAVIOR_RULES.formatting.rules.map(r => `- ${r}`).join('\n')
    );
  }

  if (includeFunctionCalling && BEHAVIOR_RULES.functionCalling.enabled) {
    sections.push(
      "Function Calling:\n" +
      BEHAVIOR_RULES.functionCalling.rules.map(r => `- ${r}`).join('\n')
    );
  }

  if (includeTone && BEHAVIOR_RULES.tone.enabled) {
    sections.push(
      "Tone & Style:\n" +
      BEHAVIOR_RULES.tone.rules.map(r => `- ${r}`).join('\n')
    );
  }

  if (includeErrorHandling && BEHAVIOR_RULES.errorHandling.enabled) {
    sections.push(
      "Error Handling:\n" +
      BEHAVIOR_RULES.errorHandling.rules.map(r => `- ${r}`).join('\n')
    );
  }

  if (includeContextAwareness && BEHAVIOR_RULES.contextAwareness.enabled) {
    sections.push(
      "Context Awareness:\n" +
      BEHAVIOR_RULES.contextAwareness.rules.map(r => `- ${r}`).join('\n')
    );
  }

  return sections.length > 0 ? "\n\n" + sections.join('\n\n') : "";
}

/**
 * Enable/disable a behavior rule category
 *
 * @param {string} category - The category name (e.g., 'codeGeneration')
 * @param {boolean} enabled - Whether to enable or disable
 */
function toggleBehavior(category, enabled) {
  if (BEHAVIOR_RULES[category]) {
    BEHAVIOR_RULES[category].enabled = enabled;
  } else {
    console.warn(`⚠️  Behavior category '${category}' not found`);
  }
}

/**
 * Get all behavior rule categories
 * @returns {Array<string>} - Array of category names
 */
function getBehaviorCategories() {
  return Object.keys(BEHAVIOR_RULES);
}

/**
 * Get rules for a specific category
 *
 * @param {string} category - The category name
 * @returns {Array<string>|null} - Array of rules or null if not found
 */
function getRulesForCategory(category) {
  return BEHAVIOR_RULES[category]?.rules || null;
}

/**
 * Check if a behavior category is enabled
 *
 * @param {string} category - The category name
 * @returns {boolean} - True if enabled
 */
function isBehaviorEnabled(category) {
  return BEHAVIOR_RULES[category]?.enabled || false;
}

/**
 * Add a new rule to an existing category
 *
 * @param {string} category - The category name
 * @param {string} rule - The rule to add
 */
function addRule(category, rule) {
  if (BEHAVIOR_RULES[category]) {
    BEHAVIOR_RULES[category].rules.push(rule);
  } else {
    console.warn(`⚠️  Behavior category '${category}' not found`);
  }
}

/**
 * Remove a rule from a category
 *
 * @param {string} category - The category name
 * @param {string} rule - The exact rule text to remove
 */
function removeRule(category, rule) {
  if (BEHAVIOR_RULES[category]) {
    const index = BEHAVIOR_RULES[category].rules.indexOf(rule);
    if (index > -1) {
      BEHAVIOR_RULES[category].rules.splice(index, 1);
    }
  }
}

module.exports = {
  BEHAVIOR_RULES,
  buildBehaviorRulesText,
  toggleBehavior,
  getBehaviorCategories,
  getRulesForCategory,
  isBehaviorEnabled,
  addRule,
  removeRule
};
