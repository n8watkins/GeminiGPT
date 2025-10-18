/**
 * Few-Shot Examples
 *
 * These examples teach the AI how to respond in specific scenarios.
 * Add examples to improve AI behavior without changing code.
 *
 * Few-shot learning is a powerful technique where showing the AI
 * examples of desired behavior improves its responses.
 */

const EXAMPLES = {
  /**
   * Function Calling Examples
   * Shows the AI when and how to use different functions
   */
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
    },
    {
      user: "what time is it in London?",
      assistant: {
        thought: "User wants current time for London.",
        action: "get_time",
        args: { location: "London" }
      }
    },
    {
      user: "search for information about quantum computing",
      assistant: {
        thought: "User wants general web information.",
        action: "search_web",
        args: { query: "quantum computing" }
      }
    }
  ],

  /**
   * Code Generation Examples
   * Shows the AI how to write good code examples
   */
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
    },
    {
      user: "how do I fetch data from an API?",
      assistant: `Here's how to fetch data from an API using modern JavaScript:

\`\`\`javascript
async function fetchData(url) {
  try {
    const response = await fetch(url);

    // Check if request was successful
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

// Example usage:
fetchData('https://api.example.com/data')
  .then(data => console.log(data))
  .catch(error => console.error('Failed:', error));
\`\`\`

This includes proper error handling and uses async/await for clean code.`
    }
  ],

  /**
   * Context Awareness Examples
   * Shows the AI how to use conversation history
   */
  contextAwareness: [
    {
      conversation: [
        { user: "My name is Alice" },
        { assistant: "Nice to meet you, Alice!" },
        { user: "what's my name?" },
        { assistant: "Your name is Alice, as you just told me." }
      ]
    },
    {
      conversation: [
        { user: "I'm working on a React project" },
        { assistant: "Great! What are you building with React?" },
        { user: "how do I handle state in it?" },
        { assistant: "For state management in your React project, you have several options..." }
      ]
    }
  ],

  /**
   * Error Handling Examples
   * Shows the AI how to gracefully handle errors
   */
  errorHandling: [
    {
      user: "get the stock price for INVALIDSTOCK",
      assistant: "I tried to get the stock price for INVALIDSTOCK, but it appears this isn't a valid stock symbol. Could you double-check the symbol? Common ones include AAPL (Apple), GOOGL (Google), or MSFT (Microsoft)."
    },
    {
      user: "what's the weather in Atlantis?",
      assistant: "I couldn't find weather information for 'Atlantis' - this might not be a recognized location. Could you provide a real city name? For example, 'New York', 'London', or 'Tokyo'."
    }
  ]
};

/**
 * Convert examples to Gemini message format
 *
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
      // Function call example - show the thought process
      assistantText = example.assistant.thought || `I will use ${example.assistant.action} to help with that.`;
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
 *
 * @param {string} category - The category name
 * @returns {Array} - Array of examples
 */
function getExamples(category) {
  return EXAMPLES[category] || [];
}

/**
 * Get all example categories
 *
 * @returns {Array<string>} - Array of category names
 */
function getExampleCategories() {
  return Object.keys(EXAMPLES);
}

/**
 * Add a new example to a category
 *
 * @param {string} category - The category name
 * @param {Object} example - The example to add
 */
function addExample(category, example) {
  if (!EXAMPLES[category]) {
    EXAMPLES[category] = [];
  }
  EXAMPLES[category].push(example);
}

/**
 * Build examples text for injection into prompts
 * (Alternative to using convertExamplesToHistory)
 *
 * @param {string} category - The category name
 * @returns {string} - Formatted examples text
 */
function buildExamplesText(category) {
  const examples = getExamples(category);
  if (examples.length === 0) return "";

  const lines = [`\nExamples of ${category}:\n`];

  examples.forEach((example, index) => {
    lines.push(`Example ${index + 1}:`);
    lines.push(`User: ${example.user}`);
    if (typeof example.assistant === 'string') {
      lines.push(`Assistant: ${example.assistant}`);
    } else if (example.assistant.action) {
      lines.push(`Action: ${example.assistant.action}(${JSON.stringify(example.assistant.args)})`);
    }
    lines.push('');
  });

  return lines.join('\n');
}

module.exports = {
  EXAMPLES,
  convertExamplesToHistory,
  getExamples,
  getExampleCategories,
  addExample,
  buildExamplesText
};
