# WebSocket Server Refactoring Plan V3 - FINAL
## Ultra-Gemini Deep Analysis: Prompt Engineering First Architecture

> **Focus:** Intuitive module design for easy prompt adaptation and AI behavior tuning
> **Date:** 2025-10-18
> **Status:** FINAL - Optimized for prompt engineering workflow

---

## 🎯 Critical Insight: The Real Architecture

After ultra-deep analysis, here's what the WebSocket server **actually** does:

```
User Message → [Prompting Layer] → Gemini → Response
                      ↑
                   THIS IS THE CORE
```

**90% of future changes will be:**
1. Tweaking system prompts
2. Adjusting function calling descriptions
3. Modifying AI behavior instructions
4. Adding new function tools
5. Changing conversation context

**Current V2 Problem:** Prompts are **scattered and hidden** in:
- System prompt (lines 589-594)
- Function declarations (lines 296-369)
- Embedded in ChatHistoryConverter
- Mixed with business logic

**V3 Solution:** **Prompts as First-Class Citizens**

---

## 🚨 V2 Architecture Flaws for Prompt Engineering

### Problem 1: System Prompt is Buried in Code
```javascript
// V2: System prompt hardcoded in ChatHistoryConverter.js
const finalHistory = [
  {
    role: 'user',
    parts: [{ text: 'You are a helpful AI assistant...' }] // HARDCODED! 😱
  }
];
```

**Issue:** To change AI behavior, you have to:
1. Find the file (ChatHistoryConverter.js)
2. Navigate to line 50+
3. Edit a string inside an object inside an array
4. Redeploy the entire app

**Developer Pain:** "Where the hell is the system prompt?" 🤬

---

### Problem 2: Function Descriptions are Code
```javascript
// V2: Function declarations in GeminiClient.js
const tools = [
  {
    function_declarations: [
      {
        name: "search_chat_history",
        description: "Search through ALL of..." // 300+ char string in code!
      }
    ]
  }
];
```

**Issue:** To tweak function behavior instructions:
1. Open GeminiClient.js
2. Scroll to find the right function
3. Edit description (error-prone)
4. Redeploy

**Developer Pain:** "I just want to change when it calls this function!" 😤

---

### Problem 3: No Prompt Versioning
```javascript
// No way to:
- A/B test different prompts
- Roll back to previous prompts
- See prompt change history
- Experiment with variations
```

---

### Problem 4: Prompt Logic Scattered
```javascript
// System prompt in ChatHistoryConverter.js
// Function descriptions in GeminiClient.js
// Behavior hints in ChatHistoryConverter.js
// Examples in function descriptions
```

**Developer Pain:** "I need to change 4 files to modify AI behavior?!" 🤯

---

## ✅ V3 Architecture: Prompt Engineering First

### Core Principle
**"If you might want to edit it while tuning AI behavior, it should be in ONE place, not in code"**

### New Module Structure

```
lib/websocket/
├── index.js                      # 50 lines - Entry point
├── prompts/                      # 🆕 PROMPTS FIRST-CLASS
│   ├── systemPrompts.js          # System prompt templates
│   ├── functionTools.js          # Function declarations with descriptions
│   ├── behaviorRules.js          # AI behavior rules
│   └── examples.js               # Few-shot examples
├── services/
│   ├── RateLimiter.js            # 220 lines - Token bucket
│   ├── HistoryProcessor.js       # 150 lines - Clean & format (NOT prompting)
│   ├── AttachmentHandler.js     # 180 lines - Process files
│   ├── GeminiService.js          # 250 lines - API wrapper (NO prompts)
│   └── VectorIndexer.js          # 100 lines - Index to DB
├── orchestration/
│   └── MessagePipeline.js        # 150 lines - Coordinate services
└── socket/
    └── eventHandlers.js          # 100 lines - Socket.IO events
```

**Total:** ~1,200 lines with CLEAR separation: Prompts vs Logic

---

## 📦 Detailed V3 Modules

### 1. `lib/websocket/prompts/systemPrompts.js`

**Purpose:** ALL system prompts in ONE PLACE

**Why This Matters:**
- ✅ Edit prompts without touching code
- ✅ Version control prompts separately
- ✅ A/B test different prompts
- ✅ Experiment without breaking logic

**Interface:**
```javascript
/**
 * System Prompts - Edit these to change AI behavior
 *
 * IMPORTANT: These are loaded at runtime, so you can:
 * - Edit without recompiling
 * - Load from database/config later
 * - A/B test variations
 */

const SYSTEM_PROMPTS = {
  // Base system prompt (always included)
  base: {
    role: 'user',
    parts: [{
      text: `You are a helpful AI assistant with access to the user's full conversation history across multiple chat sessions.

When writing code, ALWAYS use actual values - NEVER use placeholders like [object Object].`
    }]
  },

  // Function calling instructions (conditionally added)
  functionCalling: {
    role: 'user',
    parts: [{
      text: `CRITICAL: When a user asks about someone or something NOT in the current conversation, you MUST call the search_chat_history function.

Examples of when to use search_chat_history:
- "who is Nathan Watkins?" → Search for "Nathan Watkins" in past conversations
- "what's in my resume?" → Search for "resume" in past conversations
- "what did I tell you about my preferences?" → Search for "preferences" in past conversations

DO NOT use search_chat_history if the information is already visible in THIS conversation.`
    }]
  },

  // Available tools description
  toolsAvailable: {
    role: 'user',
    parts: [{
      text: `You also have access to:
- search_web: For current events and general knowledge
- get_stock_price, get_weather, get_time: For real-time data
- search_chat_history: To find information from previous chat sessions`
    }]
  },

  // Model acknowledgement (optional but improves performance)
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
 * Get just the base system prompt (no function calling)
 */
function getBasePrompt() {
  return [SYSTEM_PROMPTS.base];
}

/**
 * Get full system prompt (all components)
 */
function getFullPrompt() {
  return buildSystemPrompt({
    includeFunctionCalling: true,
    includeToolsAvailable: true,
    includeAcknowledgement: true
  });
}

module.exports = {
  SYSTEM_PROMPTS,
  buildSystemPrompt,
  getBasePrompt,
  getFullPrompt
};
```

**Lines:** ~120

**Future Enhancement:**
```javascript
// Later, you can load from database:
async function getSystemPromptFromDB(userId, experimentId) {
  const prompt = await db.getPrompt(userId, experimentId);
  return prompt || SYSTEM_PROMPTS.base;
}
```

---

### 2. `lib/websocket/prompts/functionTools.js`

**Purpose:** Function declarations with detailed descriptions

**Why This Matters:**
- ✅ Change function descriptions without touching API code
- ✅ Tune when AI calls functions
- ✅ Add new functions easily
- ✅ See all available functions at a glance

**Interface:**
```javascript
/**
 * Function Tool Declarations
 *
 * IMPORTANT: The 'description' field tells Gemini WHEN to call the function.
 * Editing descriptions changes AI behavior without changing code logic.
 */

const FUNCTION_TOOLS = {
  // Stock price lookup
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

  // Weather information
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

  // Time lookup
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

  // Web search
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

  // Chat history search
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
 * Build tools array for Gemini
 * @param {Array<string>} enabledTools - Which tools to include (default: all)
 * @returns {Array} - Gemini-formatted tools array
 */
function buildToolsArray(enabledTools = null) {
  const toolsToInclude = enabledTools || Object.keys(FUNCTION_TOOLS);

  const function_declarations = toolsToInclude.map(toolName => {
    const tool = FUNCTION_TOOLS[toolName];
    if (!tool) {
      console.warn(`Tool ${toolName} not found in FUNCTION_TOOLS`);
      return null;
    }
    return tool;
  }).filter(Boolean);

  return [{ function_declarations }];
}

/**
 * Get all available tool names
 */
function getAvailableTools() {
  return Object.keys(FUNCTION_TOOLS);
}

/**
 * Get a specific tool declaration
 */
function getTool(toolName) {
  return FUNCTION_TOOLS[toolName];
}

module.exports = {
  FUNCTION_TOOLS,
  buildToolsArray,
  getAvailableTools,
  getTool
};
```

**Lines:** ~150

**Benefits:**
```javascript
// Easy to add new tools:
FUNCTION_TOOLS.new_function = {
  name: "new_function",
  description: "What this does...",
  parameters: { /* schema */ }
};

// Easy to experiment with descriptions:
// Just edit the description field and redeploy!
```

---

### 3. `lib/websocket/prompts/behaviorRules.js` 🆕

**Purpose:** Fine-grained AI behavior rules (separate from system prompt)

**Why This Matters:**
- ✅ Tune AI personality without editing main prompt
- ✅ Add/remove rules easily
- ✅ Enable/disable behaviors dynamically
- ✅ A/B test different behaviors

**Interface:**
```javascript
/**
 * AI Behavior Rules
 *
 * These are injected into the system prompt to control AI behavior.
 * Edit these to change how the AI responds WITHOUT changing core logic.
 */

const BEHAVIOR_RULES = {
  // Code generation rules
  codeGeneration: {
    enabled: true,
    rules: [
      "ALWAYS use actual values in code examples",
      "NEVER use placeholders like [object Object] or TODO",
      "Include error handling in code examples",
      "Add comments explaining complex logic"
    ]
  },

  // Response formatting rules
  formatting: {
    enabled: true,
    rules: [
      "Use markdown formatting for better readability",
      "Break long responses into sections with headers",
      "Use bullet points for lists",
      "Use code blocks with language specifiers"
    ]
  },

  // Function calling rules
  functionCalling: {
    enabled: true,
    rules: [
      "ONLY call search_chat_history for information NOT in current conversation",
      "Always check current conversation first before searching history",
      "Prefer search_web for current events and real-time data",
      "Use get_stock_price, get_weather, get_time for real-time queries"
    ]
  },

  // Tone and style rules
  tone: {
    enabled: true,
    rules: [
      "Be helpful and friendly",
      "Use professional but approachable language",
      "Acknowledge when you don't know something",
      "Ask clarifying questions when needed"
    ]
  },

  // Error handling rules
  errorHandling: {
    enabled: true,
    rules: [
      "If a function call fails, explain what went wrong",
      "Suggest alternatives when something doesn't work",
      "Never expose internal errors to user",
      "Provide helpful next steps"
    ]
  }
};

/**
 * Build behavior rules text for injection into system prompt
 * @param {Object} options - Which rule categories to include
 * @returns {string} - Formatted rules text
 */
function buildBehaviorRulesText(options = {}) {
  const {
    includeCodeGeneration = true,
    includeFormatting = true,
    includeFunctionCalling = true,
    includeTone = true,
    includeErrorHandling = true
  } = options;

  const sections = [];

  if (includeCodeGeneration && BEHAVIOR_RULES.codeGeneration.enabled) {
    sections.push("Code Generation:\n" + BEHAVIOR_RULES.codeGeneration.rules.map(r => `- ${r}`).join('\n'));
  }

  if (includeFormatting && BEHAVIOR_RULES.formatting.enabled) {
    sections.push("Response Formatting:\n" + BEHAVIOR_RULES.formatting.rules.map(r => `- ${r}`).join('\n'));
  }

  if (includeFunctionCalling && BEHAVIOR_RULES.functionCalling.enabled) {
    sections.push("Function Calling:\n" + BEHAVIOR_RULES.functionCalling.rules.map(r => `- ${r}`).join('\n'));
  }

  if (includeTone && BEHAVIOR_RULES.tone.enabled) {
    sections.push("Tone & Style:\n" + BEHAVIOR_RULES.tone.rules.map(r => `- ${r}`).join('\n'));
  }

  if (includeErrorHandling && BEHAVIOR_RULES.errorHandling.enabled) {
    sections.push("Error Handling:\n" + BEHAVIOR_RULES.errorHandling.rules.map(r => `- ${r}`).join('\n'));
  }

  return sections.length > 0 ? "\n\n" + sections.join('\n\n') : "";
}

/**
 * Enable/disable a behavior rule category
 */
function toggleBehavior(category, enabled) {
  if (BEHAVIOR_RULES[category]) {
    BEHAVIOR_RULES[category].enabled = enabled;
  }
}

module.exports = {
  BEHAVIOR_RULES,
  buildBehaviorRulesText,
  toggleBehavior
};
```

**Lines:** ~100

**Usage:**
```javascript
// In systemPrompts.js:
const { buildBehaviorRulesText } = require('./behaviorRules');

SYSTEM_PROMPTS.base.parts[0].text += buildBehaviorRulesText();
```

---

### 4. `lib/websocket/prompts/examples.js` 🆕

**Purpose:** Few-shot examples for better AI behavior

**Why This Matters:**
- ✅ Show AI how to respond to specific queries
- ✅ Improve function calling accuracy
- ✅ Easy to add/remove examples
- ✅ A/B test which examples work best

**Interface:**
```javascript
/**
 * Few-Shot Examples
 *
 * These examples teach the AI how to respond in specific scenarios.
 * Add examples to improve AI behavior without changing code.
 */

const EXAMPLES = {
  // Function calling examples
  functionCalling: [
    {
      user: "who is Nathan Watkins?",
      assistant: {
        thought: "User is asking about someone not in current conversation. I should search chat history.",
        action: "search_chat_history",
        args: { query: "Nathan Watkins" }
      }
    },
    {
      user: "what's the weather in Tokyo?",
      assistant: {
        thought: "User wants current weather data.",
        action: "get_weather",
        args: { location: "Tokyo" }
      }
    },
    {
      user: "how is AAPL stock doing?",
      assistant: {
        thought: "User wants stock price for Apple (AAPL).",
        action: "get_stock_price",
        args: { symbol: "AAPL" }
      }
    }
  ],

  // Code generation examples
  codeGeneration: [
    {
      user: "write a function to sort an array",
      assistant: `Here's a function to sort an array:

\`\`\`javascript
function sortArray(arr) {
  // Make a copy to avoid mutating original
  const sorted = [...arr];

  // Use built-in sort with comparison function
  sorted.sort((a, b) => a - b);

  return sorted;
}

// Example usage:
const numbers = [5, 2, 8, 1, 9];
const sorted = sortArray(numbers);
console.log(sorted); // [1, 2, 5, 8, 9]
\`\`\`

This function creates a copy of the array and sorts it numerically.`
    }
  ]
};

/**
 * Convert examples to Gemini message format
 * @param {Array} examples - Examples to convert
 * @returns {Array} - Gemini-formatted history
 */
function convertExamplesToHistory(examples) {
  const history = [];

  examples.forEach(example => {
    // User message
    history.push({
      role: 'user',
      parts: [{ text: example.user }]
    });

    // Assistant message
    let assistantText;
    if (typeof example.assistant === 'string') {
      assistantText = example.assistant;
    } else if (example.assistant.action) {
      // Function call example
      assistantText = `I will use ${example.assistant.action} to help with that.`;
    } else {
      assistantText = example.assistant.text || "";
    }

    history.push({
      role: 'model',
      parts: [{ text: assistantText }]
    });
  });

  return history;
}

/**
 * Get examples for a specific category
 */
function getExamples(category) {
  return EXAMPLES[category] || [];
}

module.exports = {
  EXAMPLES,
  convertExamplesToHistory,
  getExamples
};
```

**Lines:** ~80

---

### 5. `lib/websocket/services/HistoryProcessor.js`

**Purpose:** Clean and format chat history (NO prompting logic)

**Key Change from V2:**
- ✅ Does NOT inject system prompts (that's in prompts/)
- ✅ Only sanitizes and formats data
- ✅ Pure transformation logic

**Interface:**
```javascript
/**
 * History Processor - Clean and format chat history
 *
 * IMPORTANT: This module does NOT handle prompting.
 * It only cleans and formats data for Gemini.
 *
 * For prompting, see lib/websocket/prompts/
 */

const { getFullPrompt } = require('../prompts/systemPrompts');

/**
 * Sanitize message content
 */
function sanitizeContent(content) {
  // Handle non-string content
  if (typeof content !== 'string') {
    content = content?.text || content?.toString() || String(content);
  }

  // Check for serialization issues
  if (content && content.includes('[object Object]')) {
    console.error('🚨 CRITICAL: Content contains [object Object]!');
    // Try to extract actual text...
  }

  return content;
}

/**
 * Extract attachments from history message
 */
function extractAttachmentsFromHistory(attachments) {
  const parts = [];

  if (!attachments || attachments.length === 0) {
    return parts;
  }

  for (const attachment of attachments) {
    if (attachment.type === 'image' && attachment.url) {
      const base64Data = attachment.url.split(',')[1];
      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType || 'image/jpeg',
            data: base64Data
          }
        });
      }
    }
  }

  return parts;
}

/**
 * Convert single message to Gemini format
 */
function convertMessage(msg) {
  const textContent = sanitizeContent(msg.content);
  const parts = [{ text: textContent }];

  // Add any attachments from history
  const attachmentParts = extractAttachmentsFromHistory(msg.attachments);
  parts.push(...attachmentParts);

  return {
    role: msg.role === 'user' ? 'user' : 'model',
    parts: parts
  };
}

/**
 * Process chat history for Gemini
 * @param {Array} chatHistory - Raw chat history from client
 * @param {Object} options - Options for system prompt
 * @returns {Array} - Gemini-formatted history with system prompts
 */
function processHistory(chatHistory, options = {}) {
  // Get system prompts (from prompts module)
  const systemPrompts = getFullPrompt();

  // Convert chat history
  const history = chatHistory.map(convertMessage);

  // Combine: system prompts + chat history
  return [...systemPrompts, ...history];
}

module.exports = {
  sanitizeContent,
  extractAttachmentsFromHistory,
  convertMessage,
  processHistory
};
```

**Lines:** ~100

**Key Difference from V2:**
```javascript
// V2 ChatHistoryConverter.js: System prompt HARDCODED
const finalHistory = [
  { role: 'user', parts: [{ text: 'You are...' }] }, // 😱
  ...history
];

// V3 HistoryProcessor.js: System prompt from prompts/
const systemPrompts = getFullPrompt(); // ✅ Imported from prompts/
return [...systemPrompts, ...history];
```

---

### 6. `lib/websocket/services/GeminiService.js`

**Purpose:** Gemini API wrapper (NO prompting logic)

**Key Change from V2:**
- ✅ Does NOT define function tools (that's in prompts/)
- ✅ Only handles API communication
- ✅ Pure service layer

**Interface:**
```javascript
/**
 * Gemini Service - API wrapper
 *
 * IMPORTANT: This service does NOT define prompts or tools.
 * It only handles communication with Gemini API.
 *
 * For prompts: see lib/websocket/prompts/systemPrompts.js
 * For tools: see lib/websocket/prompts/functionTools.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildToolsArray } = require('../prompts/functionTools');
const { getStockPrice, getWeather, getTime, getGeneralSearch, searchChatHistory } = require('../../../searchService');

class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.tools = buildToolsArray(); // Get tools from prompts module
  }

  /**
   * Create model instance
   */
  createModel() {
    return this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: this.tools
    });
  }

  /**
   * Create chat session
   */
  createChatSession(history) {
    const model = this.createModel();
    return model.startChat({ history });
  }

  /**
   * Execute a function call
   */
  async executeFunction(name, args, userId) {
    switch (name) {
      case 'get_stock_price':
        return await getStockPrice(args.symbol);
      case 'get_weather':
        return await getWeather(args.location);
      case 'get_time':
        return await getTime(args.location);
      case 'search_web':
        return await getGeneralSearch(args.query);
      case 'search_chat_history':
        return await searchChatHistory(userId, args.query);
      default:
        return `Unknown function: ${name}`;
    }
  }

  /**
   * Send message and stream response
   */
  async sendMessageStream(chat, messageParts, socket, chatId, userId) {
    const result = await chat.sendMessageStream(messageParts);

    let fullResponse = '';
    let functionCalls = [];

    // Stream chunks
    for await (const chunk of result.stream) {
      // Safety filter check
      if (chunk.promptFeedback?.blockReason) {
        socket.emit('message-response', {
          chatId,
          message: `Sorry, content blocked: ${chunk.promptFeedback.blockReason}`,
          isComplete: true
        });
        return { fullResponse: '', hadFunctionCalls: false };
      }

      // Function calls
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        functionCalls = chunk.functionCalls;
        break;
      }

      // Regular text chunk
      const chunkText = chunk.text();
      if (chunkText) {
        fullResponse += chunkText;
        socket.emit('message-response', {
          chatId,
          message: chunkText,
          isComplete: false
        });
      }
    }

    // Process function calls if any
    if (functionCalls.length > 0) {
      fullResponse = await this.processFunctionCalls(
        functionCalls,
        chat,
        socket,
        chatId,
        userId
      );
    }

    return { fullResponse, hadFunctionCalls: functionCalls.length > 0 };
  }

  /**
   * Process function calls
   */
  async processFunctionCalls(functionCalls, chat, socket, chatId, userId) {
    let fullResponse = '';

    for (const functionCall of functionCalls) {
      const { name, args } = functionCall;

      try {
        // Execute function
        const result = await this.executeFunction(name, args, userId);

        // Send result back to Gemini
        const followUp = await chat.sendMessageStream([
          {
            functionResponse: {
              name,
              response: { result }
            }
          }
        ]);

        // Stream follow-up response
        for await (const chunk of followUp.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            fullResponse += chunkText;
            socket.emit('message-response', {
              chatId,
              message: chunkText,
              isComplete: false
            });
          }
        }
      } catch (error) {
        console.error(`Error executing ${name}:`, error);
        const errorMsg = `Error executing ${name}: ${error.message}`;
        fullResponse += errorMsg;
        socket.emit('message-response', {
          chatId,
          message: errorMsg,
          isComplete: false
        });
      }
    }

    return fullResponse;
  }
}

module.exports = { GeminiService };
```

**Lines:** ~200

**Key Difference:**
```javascript
// V2: Tools defined IN GeminiClient.js
const tools = [{ function_declarations: [...] }]; // 😱

// V3: Tools imported FROM prompts/
const { buildToolsArray } = require('../prompts/functionTools'); // ✅
this.tools = buildToolsArray();
```

---

### 7. `lib/websocket/orchestration/MessagePipeline.js`

**Purpose:** Coordinate all services (orchestration)

**Interface:**
```javascript
/**
 * Message Pipeline - Orchestrate message processing
 *
 * This is the main coordinator that uses all services.
 */

const { RateLimiter } = require('../services/RateLimiter');
const { HistoryProcessor } = require('../services/HistoryProcessor');
const { AttachmentHandler } = require('../services/AttachmentHandler');
const { GeminiService } = require('../services/GeminiService');
const { VectorIndexer } = require('../services/VectorIndexer');

class MessagePipeline {
  constructor() {
    this.rateLimiter = new RateLimiter();
    this.geminiService = new GeminiService(process.env.GEMINI_API_KEY);
    this.historyProcessor = HistoryProcessor;
    this.attachmentHandler = AttachmentHandler;
    this.vectorIndexer = VectorIndexer;
  }

  async processMessage(data, socket) {
    const { message, chatHistory, chatId, attachments, userId } = data;

    try {
      // 1. Rate limit
      const rateLimit = this.rateLimiter.checkLimit(userId);
      socket.emit('rate-limit-info', { ...rateLimit });

      if (!rateLimit.allowed) {
        return this.sendRateLimitError(socket, chatId, rateLimit);
      }

      // 2. Typing indicator
      socket.emit('typing', { chatId, isTyping: true });

      // 3. Process history (includes system prompts from prompts/)
      const history = this.historyProcessor.processHistory(chatHistory);

      // 4. Process attachments
      const { enhancedMessage, messageParts } =
        await this.attachmentHandler.processAttachments(attachments || [], message);

      // 5. Create chat session
      const chat = this.geminiService.createChatSession(history);

      // 6. Stream response
      const { fullResponse } = await this.geminiService.sendMessageStream(
        chat,
        messageParts,
        socket,
        chatId,
        userId
      );

      // 7. Index messages (async)
      this.vectorIndexer.indexMessagePair(
        userId,
        chatId,
        message,
        fullResponse,
        chatHistory
      ).catch(err => console.error('Indexing error:', err));

      // 8. Complete
      socket.emit('message-response', { chatId, message: '', isComplete: true });
      socket.emit('typing', { chatId, isTyping: false });

    } catch (error) {
      this.handleError(error, socket, chatId);
    }
  }

  sendRateLimitError(socket, chatId, rateLimit) {
    // Implementation...
  }

  handleError(error, socket, chatId) {
    console.error('Pipeline error:', error);
    socket.emit('message-response', {
      chatId,
      message: `Sorry, an error occurred: ${error.message}`,
      isComplete: true
    });
    socket.emit('typing', { chatId, isTyping: false });
  }
}

module.exports = { MessagePipeline };
```

**Lines:** ~100

---

## 🎯 V3 vs V2: Prompt Engineering Comparison

| Task | V2 (Bad) | V3 (Good) |
|------|----------|-----------|
| **Change system prompt** | Edit ChatHistoryConverter.js line 50 | Edit prompts/systemPrompts.js |
| **Add function** | Edit GeminiClient.js, find tools array | Add to prompts/functionTools.js |
| **Tune function description** | Scroll through GeminiClient.js | Edit prompts/functionTools.js |
| **Add behavior rule** | Edit system prompt string | Add to prompts/behaviorRules.js |
| **A/B test prompts** | Impossible (hardcoded) | Easy (buildSystemPrompt options) |
| **Version prompts** | Git commit (mixed with code) | Git commit (prompts/ only) |
| **See all prompts** | Read 4+ files | Read prompts/ folder |
| **Add few-shot example** | Not possible | Add to prompts/examples.js |

**Winner:** V3 by a landslide! 🏆

---

## 📁 Final Directory Structure

```
lib/websocket/
├── index.js                           # Entry point
│
├── prompts/                           # 🆕 ALL PROMPTING LOGIC HERE
│   ├── systemPrompts.js               # System prompts (editable!)
│   ├── functionTools.js               # Function declarations
│   ├── behaviorRules.js               # AI behavior rules
│   └── examples.js                    # Few-shot examples
│
├── services/                          # Business logic (NO prompts)
│   ├── RateLimiter.js                 # Token bucket
│   ├── HistoryProcessor.js            # Format history
│   ├── AttachmentHandler.js           # Process files
│   ├── GeminiService.js               # API wrapper
│   └── VectorIndexer.js               # Index to DB
│
├── orchestration/                     # Coordination
│   └── MessagePipeline.js             # Main pipeline
│
└── socket/                            # Socket.IO handlers
    └── eventHandlers.js               # Connection, disconnect, etc.
```

**Clear Separation:**
- `prompts/` = What AI says/does (EDIT OFTEN)
- `services/` = How system works (STABLE)
- `orchestration/` = Workflow (STABLE)
- `socket/` = Network (STABLE)

---

## ⏱️ V3 Migration Timeline

| Phase | Task | Time | Difficulty |
|-------|------|------|------------|
| 0 | Setup + prompts/ skeleton | 2h | Easy |
| 1 | Extract prompts to prompts/ | 3h | Easy |
| 2 | Extract RateLimiter | 2h | Easy |
| 3 | Extract HistoryProcessor | 4h | Medium |
| 4 | Extract AttachmentHandler | 6h | Hard |
| 5 | Extract GeminiService | 6h | Hard |
| 6 | Extract VectorIndexer | 2h | Easy |
| 7 | Create MessagePipeline | 4h | Medium |
| 8 | Wire everything in index.js | 3h | Medium |
| 9 | Test + Fix | 8h | Medium |
| 10 | Deploy + Monitor | Variable | - |
| **Total** | | **40h** | |

**Same timeline as V2, but better architecture!**

---

## 🎓 Why V3 is Superior for Your Use Case

### You Said: "intuitive for later coding if we want to adapt prompting"

**V3 Wins Because:**

1. **Prompts are VISIBLE**
   ```bash
   ls lib/websocket/prompts/
   systemPrompts.js      # Oh, system prompts are here!
   functionTools.js      # Oh, function definitions are here!
   behaviorRules.js      # Oh, behavior rules are here!
   ```

2. **Prompts are EDITABLE without code knowledge**
   ```javascript
   // Just edit the strings, no code logic:
   SYSTEM_PROMPTS.base.parts[0].text = "New prompt here";
   ```

3. **Prompts are VERSIONABLE separately**
   ```bash
   git log lib/websocket/prompts/
   # See history of ONLY prompt changes
   ```

4. **Prompts are TESTABLE in isolation**
   ```javascript
   const { getFullPrompt } = require('./prompts/systemPrompts');
   console.log(getFullPrompt()); // See what's being sent to AI
   ```

5. **Future: Load prompts from DB**
   ```javascript
   // Easy to add later:
   const prompt = await db.getPrompt(experimentId);
   ```

---

## 🚀 Quick Start: Proof of Concept

Want to validate V3 architecture? Do this:

**Day 1: Create prompts/ folder (3 hours)**
```bash
mkdir -p lib/websocket/prompts
# Create all 4 prompt files
# Extract prompts from current code
```

**Day 2: Use prompts in current code (2 hours)**
```javascript
// In websocket-server.js, replace hardcoded prompts:
const { getFullPrompt } = require('./lib/websocket/prompts/systemPrompts');
const { buildToolsArray } = require('./lib/websocket/prompts/functionTools');

// Use them:
const tools = buildToolsArray();
const systemPrompts = getFullPrompt();
```

**Result:** All prompts in ONE PLACE, current code still works!

**Then:** Continue with full refactoring if you like the structure.

---

## ✅ Recommendation

**Use V3 Plan** - It's designed specifically for prompt engineering workflow.

**Why:**
- ✅ Prompts are first-class citizens
- ✅ Easy to find and edit
- ✅ Separated from business logic
- ✅ Future-proof for A/B testing, DB loading, etc.
- ✅ Same time estimate as V2 (40h)
- ✅ Better long-term maintainability

**Next Step:** Review prompts/ structure, approve architecture, start Phase 0.
