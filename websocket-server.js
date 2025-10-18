const { Server: SocketIOServer } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getStockPrice, getWeather, getTime, getGeneralSearch, searchChatHistory } = require('./searchService');
// Import real implementations for production
const { addMessage, searchChats } = require('./vectorDB');
const { processDocumentAttachment } = require('./documentProcessor');

/**
 * ============================================
 * RATE LIMITING - Token Bucket Algorithm
 * ============================================
 * Prevents abuse while allowing legitimate bursts
 *
 * Rate Limits (VERY GENEROUS for development/portfolio use):
 * - 60 messages per minute (allows rapid testing and demos)
 * - 500 messages per hour (very generous for extended use)
 * - Tokens refill automatically over time
 *
 * Can be configured via environment variables:
 * - RATE_LIMIT_PER_MINUTE (default: 60)
 * - RATE_LIMIT_PER_HOUR (default: 500)
 */

class RateLimiter {
  constructor() {
    // Store rate limit data per user
    // Structure: { userId: { minute: {...}, hour: {...} } }
    this.userLimits = new Map();

    // Configuration from environment or defaults (VERY GENEROUS)
    const perMinute = parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 60;
    const perHour = parseInt(process.env.RATE_LIMIT_PER_HOUR) || 500;

    console.log(`⚙️  Rate Limiter Configuration:`);
    console.log(`   - ${perMinute} messages per minute`);
    console.log(`   - ${perHour} messages per hour`);

    this.limits = {
      minute: {
        maxTokens: perMinute,      // Max messages per minute
        refillRate: perMinute,     // Tokens refilled per minute
        refillInterval: 60000, // 1 minute in ms
        windowName: 'minute'
      },
      hour: {
        maxTokens: perHour,     // Max messages per hour
        refillRate: perHour,    // Tokens refilled per hour
        refillInterval: 3600000, // 1 hour in ms
        windowName: 'hour'
      }
    };

    // Clean up old entries every 2 hours
    setInterval(() => this.cleanup(), 2 * 60 * 60 * 1000);
  }

  /**
   * Initialize rate limit tracking for a user
   */
  initializeUser(userId) {
    if (!this.userLimits.has(userId)) {
      const now = Date.now();
      this.userLimits.set(userId, {
        minute: {
          tokens: this.limits.minute.maxTokens,
          lastRefill: now
        },
        hour: {
          tokens: this.limits.hour.maxTokens,
          lastRefill: now
        },
        totalRequests: 0,
        firstRequest: now
      });
    }
  }

  /**
   * Refill tokens based on time elapsed
   */
  refillTokens(bucket, config) {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const intervalsElapsed = timePassed / config.refillInterval;

    if (intervalsElapsed >= 1) {
      // Refill tokens (cap at max)
      const tokensToAdd = Math.floor(intervalsElapsed * config.refillRate);
      bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  /**
   * Check if user can make a request
   * Returns: { allowed: boolean, retryAfter: number (ms), remaining: {...} }
   */
  checkLimit(userId) {
    this.initializeUser(userId);
    const userData = this.userLimits.get(userId);

    // Refill tokens for both buckets
    this.refillTokens(userData.minute, this.limits.minute);
    this.refillTokens(userData.hour, this.limits.hour);

    // Check if user has tokens in both buckets
    const hasMinuteToken = userData.minute.tokens >= 1;
    const hasHourToken = userData.hour.tokens >= 1;

    if (hasMinuteToken && hasHourToken) {
      // Consume tokens
      userData.minute.tokens -= 1;
      userData.hour.tokens -= 1;
      userData.totalRequests += 1;

      return {
        allowed: true,
        retryAfter: 0,
        remaining: {
          minute: Math.floor(userData.minute.tokens),
          hour: Math.floor(userData.hour.tokens)
        },
        limit: {
          minute: this.limits.minute.maxTokens,
          hour: this.limits.hour.maxTokens
        },
        resetAt: {
          minute: userData.minute.lastRefill + this.limits.minute.refillInterval,
          hour: userData.hour.lastRefill + this.limits.hour.refillInterval
        }
      };
    } else {
      // Calculate retry time (when next token available)
      let retryAfter;
      let limitType;

      if (!hasMinuteToken) {
        retryAfter = (userData.minute.lastRefill + this.limits.minute.refillInterval) - Date.now();
        limitType = 'minute';
      } else {
        retryAfter = (userData.hour.lastRefill + this.limits.hour.refillInterval) - Date.now();
        limitType = 'hour';
      }

      return {
        allowed: false,
        retryAfter: Math.max(0, retryAfter),
        remaining: {
          minute: Math.floor(userData.minute.tokens),
          hour: Math.floor(userData.hour.tokens)
        },
        limit: {
          minute: this.limits.minute.maxTokens,
          hour: this.limits.hour.maxTokens
        },
        limitType,
        resetAt: {
          minute: userData.minute.lastRefill + this.limits.minute.refillInterval,
          hour: userData.hour.lastRefill + this.limits.hour.refillInterval
        }
      };
    }
  }

  /**
   * Get current rate limit status for a user (without consuming tokens)
   */
  getStatus(userId) {
    this.initializeUser(userId);
    const userData = this.userLimits.get(userId);

    // Refill tokens first
    this.refillTokens(userData.minute, this.limits.minute);
    this.refillTokens(userData.hour, this.limits.hour);

    return {
      remaining: {
        minute: Math.floor(userData.minute.tokens),
        hour: Math.floor(userData.hour.tokens)
      },
      limit: {
        minute: this.limits.minute.maxTokens,
        hour: this.limits.hour.maxTokens
      },
      resetAt: {
        minute: userData.minute.lastRefill + this.limits.minute.refillInterval,
        hour: userData.hour.lastRefill + this.limits.hour.refillInterval
      },
      totalRequests: userData.totalRequests
    };
  }

  /**
   * Clean up old user data to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [userId, userData] of this.userLimits.entries()) {
      // Remove users who haven't made requests in 24 hours
      if (now - userData.firstRequest > maxAge) {
        this.userLimits.delete(userId);
        console.log(`🧹 Cleaned up rate limit data for inactive user: ${userId}`);
      }
    }
  }

  /**
   * Get statistics about rate limiting
   */
  getStats() {
    return {
      totalUsers: this.userLimits.size,
      limits: this.limits
    };
  }
}

// Create global rate limiter instance
const rateLimiter = new RateLimiter();
console.log('✅ Rate limiter initialized:', rateLimiter.getStats());

/**
 * Create message objects for indexing
 */
function createMessageObjects(message, responseText) {
  const userMessage = {
    id: `user-${Date.now()}`,
    content: message,
    role: 'user',
    timestamp: new Date()
  };

  const assistantMessage = {
    id: `assistant-${Date.now()}`,
    content: responseText,
    role: 'assistant',
    timestamp: new Date()
  };

  return { userMessage, assistantMessage };
}

/**
 * Get chat title from history or generate default
 */
function getChatTitle(chatHistory) {
  return chatHistory.length > 0 ?
    (chatHistory[0].role === 'user' && chatHistory[0].parts && chatHistory[0].parts[0] ?
      chatHistory[0].parts[0].text.substring(0, 50) + '...' : 'Chat') :
    'New Chat';
}

/**
 * Index messages to vector database
 */
async function indexMessages(userId, chatId, userMessage, assistantMessage, chatTitle) {
  if (!userId) return;

  try {
    // Index both messages asynchronously
    await Promise.all([
      addMessage(userId, chatId, userMessage, chatTitle).catch(err =>
        console.error('Error indexing user message:', err)
      ),
      addMessage(userId, chatId, assistantMessage, chatTitle).catch(err =>
        console.error('Error indexing assistant message:', err)
      )
    ]);
  } catch (error) {
    console.error('Error in background indexing:', error);
  }
}

/**
 * Handle message indexing with chat title extraction
 */
async function indexMessagePair(userId, chatId, message, responseText, chatHistory) {
  const chatTitle = getChatTitle(chatHistory);
  const { userMessage, assistantMessage } = createMessageObjects(message, responseText);
  await indexMessages(userId, chatId, userMessage, assistantMessage, chatTitle);
}

// REMOVED: Pre-emptive pattern matching
// Now letting Gemini decide when to search chat history via function calling

console.log('Environment check:');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define function calling tools for Gemini
const tools = [
  {
    function_declarations: [
      {
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
      {
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
      {
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
      {
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
      {
        name: "search_chat_history",
        description: "Search through ALL of the user's past conversations (across different chat sessions) to find relevant information. IMPORTANT: You can already see the current chat session's full history - use this function ONLY to search OTHER chat sessions. Use this when:\n\n1. User asks about people/entities not mentioned in THIS conversation (e.g., 'who is Nathan Watkins' when no Nathan was mentioned in current chat)\n2. User references documents uploaded in previous chats (e.g., 'what was in my resume' when no resume in current chat)\n3. User asks about their preferences, favorites, or past statements (e.g., 'what's my favorite X', 'what did I say about Y')\n4. User asks 'do you remember when I told you about X' and X isn't in current chat\n5. Questions starting with 'my' that reference context not in current chat (e.g., 'my document', 'my resume', 'my favorite')\n\nDO NOT use this if the information is already visible in the current conversation history.",
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
    ]
  }
];

function setupWebSocketServer(server) {
  console.log('🚀 Setting up WebSocket server...');

  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 10 * 1024 * 1024, // 10MB limit for large documents
    pingTimeout: 60000, // 60 second timeout
    pingInterval: 25000, // Check connection every 25 seconds
    transports: ['websocket', 'polling']
  });

  console.log('✅ WebSocket server configured');

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id, 'Transport:', socket.conn.transport.name);

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', socket.id, error);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', socket.id, error);
    });

    socket.on('send-message', async (data) => {
      try {
        console.log('Received message:', {
          message: data.message?.substring(0, 100) + '...',
          chatId: data.chatId,
          hasAttachments: !!data.attachments?.length,
          userId: data.userId
        });

        const { message, chatHistory, chatId, attachments, userId } = data;

        // ============================================
        // RATE LIMITING CHECK
        // ============================================
        const rateLimit = rateLimiter.checkLimit(userId);

        // Send rate limit info to client (for UI display)
        socket.emit('rate-limit-info', {
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetAt: rateLimit.resetAt
        });

        // If rate limited, reject the request
        if (!rateLimit.allowed) {
          const retryInSeconds = Math.ceil(rateLimit.retryAfter / 1000);
          const limitTypeText = rateLimit.limitType === 'minute' ? 'per minute' : 'per hour';

          console.log(`🚫 Rate limit exceeded for user ${userId}. Retry after ${retryInSeconds}s`);

          // Send rate limit error to client
          socket.emit('message-response', {
            chatId,
            message: `⚠️ **Rate Limit Exceeded**\n\nYou've sent too many messages (${rateLimit.limit[rateLimit.limitType]} ${limitTypeText}).\n\nPlease wait ${retryInSeconds} seconds before sending another message.\n\n**Remaining:**\n- ${rateLimit.remaining.minute} messages this minute\n- ${rateLimit.remaining.hour} messages this hour`,
            isComplete: true,
            rateLimited: true
          });

          socket.emit('typing', { chatId, isTyping: false });
          return; // Stop processing
        }

        console.log(`✅ Rate limit check passed for user ${userId}. Remaining: ${rateLimit.remaining.minute}/min, ${rateLimit.remaining.hour}/hr`);
        
        // Debug: Log chat history details
        console.log('📝 Chat History Debug:');
        console.log('  - Chat ID:', chatId);
        console.log('  - History length:', chatHistory ? chatHistory.length : 'undefined');
        console.log('  - User ID:', userId);
        if (chatHistory && chatHistory.length > 0) {
          console.log('  - First message:', {
            role: chatHistory[0].role,
            content: chatHistory[0].content?.substring(0, 50) + '...',
            hasAttachments: !!chatHistory[0].attachments?.length
          });
          console.log('  - Last message:', {
            role: chatHistory[chatHistory.length - 1].role,
            content: chatHistory[chatHistory.length - 1].content?.substring(0, 50) + '...',
            hasAttachments: !!chatHistory[chatHistory.length - 1].attachments?.length
          });
        } else {
          console.log('  - No chat history provided!');
        }
        
        // Emit typing indicator
        socket.emit('typing', { chatId, isTyping: true });

        // Real Gemini 2.5 Flash integration with function calling
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash',
          tools: tools
        });
        
        // Convert chat history to Gemini format
        const history = chatHistory.map((msg) => {
          // CRITICAL: Deep clean the message object to remove Date objects and other non-serializable data
          // Socket.io may have already partially serialized these, causing [object Object] issues

          // Ensure content is a string, handle if it's an object
          let textContent = msg.content;
          if (typeof textContent !== 'string') {
            console.warn('⚠️ Message content is not a string:', typeof textContent, textContent);
            // Try to extract text if it's an object
            textContent = textContent?.text || textContent?.toString() || String(textContent);
          }

          // CRITICAL: Ensure no Date objects or other objects leak into the text
          // Check if textContent contains [object Object] which indicates serialization issues
          if (textContent && textContent.includes('[object Object]')) {
            console.error('🚨 CRITICAL: textContent contains [object Object]!');
            console.error('Original msg:', JSON.stringify(msg, null, 2));
            console.error('textContent:', textContent);

            // Try to extract just the actual text content
            if (typeof msg.content === 'object' && msg.content !== null && 'text' in msg.content) {
              textContent = String(msg.content.text);
            } else {
              // Last resort: try to find any string property
              const stringProps = Object.entries(msg.content || {})
                .filter(([key, val]) => typeof val === 'string' && val.length > 0)
                .map(([key, val]) => val);

              if (stringProps.length > 0) {
                textContent = stringProps[0];
              }
            }
          }

          // Build parts array - start with text
          const parts = [{ text: textContent }];

          // CRITICAL FIX: Include image attachments from chat history
          // This allows Gemini to see images from previous messages for context
          if (msg.attachments && msg.attachments.length > 0) {
            console.log(`📎 Processing ${msg.attachments.length} attachments from chat history`);
            for (const attachment of msg.attachments) {
              if (attachment.type === 'image' && attachment.url) {
                try {
                  const base64Data = attachment.url.split(',')[1];
                  if (base64Data) {
                    const sizeInMB = (base64Data.length / (1024 * 1024)).toFixed(2);
                    console.log(`🖼️  Adding image from history: ${attachment.name}, size: ${sizeInMB}MB`);

                    // Add image to parts array
                    parts.push({
                      inlineData: {
                        mimeType: attachment.mimeType || 'image/jpeg',
                        data: base64Data
                      }
                    });
                    console.log(`✓ Image from history added to parts. Total parts: ${parts.length}`);
                  }
                } catch (error) {
                  console.error(`Error processing attachment from history: ${attachment.name}`, error);
                }
              }
            }
          }

          return {
            role: msg.role === 'user' ? 'user' : 'model',
            parts: parts
          };
        });
        
        // Debug: Log converted history
        console.log('🔄 Converted History for Gemini:');
        console.log('  - Total messages:', history.length);
        if (history.length > 0) {
          console.log('  - First converted:', {
            role: history[0].role,
            contentType: typeof history[0].parts[0].text,
            content: history[0].parts[0].text?.substring(0, 50) + '...'
          });
          console.log('  - Last converted:', {
            role: history[history.length - 1].role,
            contentType: typeof history[history.length - 1].parts[0].text,
            content: history[history.length - 1].parts[0].text?.substring(0, 50) + '...'
          });
          // Log ALL messages to see where [object Object] comes from
          console.log('📋 Full history being sent to Gemini:');
          history.forEach((msg, idx) => {
            console.log(`  [${idx}] ${msg.role}: ${typeof msg.parts[0].text} = "${msg.parts[0].text?.substring(0, 100)}..."`);
          });
        }

        // Prepare final history for Gemini with improved system prompt
        const finalHistory = [
          {
            role: 'user',
            parts: [{ text: 'You are a helpful AI assistant with access to the user\'s full conversation history across multiple chat sessions.\n\nCRITICAL: When a user asks about someone or something NOT in the current conversation (like "who is X" or "what\'s in my resume"), you MUST call the search_chat_history function to search their previous conversations in OTHER chat sessions.\n\nExamples of when to use search_chat_history:\n- "who is Nathan Watkins?" → Search for "Nathan Watkins" in past conversations\n- "what\'s in my resume?" → Search for "resume" in past conversations  \n- "what did I tell you about my preferences?" → Search for "preferences" in past conversations\n- "do you remember when I mentioned X?" → Search for "X" in past conversations\n\nDO NOT use search_chat_history if the information is already visible in THIS conversation.\n\nYou also have access to:\n- search_web: For current events and general knowledge\n- get_stock_price, get_weather, get_time: For real-time data\n\nWhen writing code, ALWAYS use actual values - NEVER use placeholders like [object Object].' }]
          },
          {
            role: 'model',
            parts: [{ text: 'Understood! I will:\n1. Check if information is in the current conversation first\n2. Call search_chat_history when users ask about things from OTHER chat sessions\n3. Use search_web for current information\n4. Provide accurate, helpful responses with real code (no placeholders)' }]
          },
          ...history
        ];

        // Debug: Log final history being sent to Gemini
        console.log('🎯 Final History for Gemini:');
        console.log('  - Total messages in final history:', finalHistory.length);
        console.log('  - System messages: 2');
        console.log('  - Chat history messages:', history.length);
        
        // Start chat with history and system prompt
        const chat = model.startChat({
          history: finalHistory
        });

        // Prepare message parts (text + images + PDFs)
        let enhancedMessage = message;
        const messageParts = [];
        
        // Process attachments
        if (attachments && attachments.length > 0) {
          console.log(`📎 Processing ${attachments.length} attachments`);
          for (const attachment of attachments) {
            try {
              console.log(`📎 Attachment details:`, {
                name: attachment.name,
                type: attachment.type,
                mimeType: attachment.mimeType,
                hasUrl: !!attachment.url,
                urlLength: attachment.url?.length
              });

              if (attachment.type === 'image' && attachment.url) {
                // Handle images
                const base64Data = attachment.url.split(',')[1];
                if (base64Data) {
                  const sizeInMB = (base64Data.length / (1024 * 1024)).toFixed(2);
                  console.log(`🖼️  Processing image: ${attachment.name}, size: ${sizeInMB}MB (${base64Data.length} chars)`);

                  // Check image size (limit to 10MB base64 to match document limit)
                  if (base64Data.length > 10 * 1024 * 1024) {
                    console.warn(`❌ Image too large: ${attachment.name} (${sizeInMB}MB), skipping`);
                    enhancedMessage += `\n\n**Image: ${attachment.name}**\n[Image too large to process - please use an image under 10MB]`;
                  } else {
                    console.log(`✅ Image accepted: ${attachment.name} (${sizeInMB}MB)`);
                    console.log(`📤 Adding image to message parts with mimeType: ${attachment.mimeType || 'image/jpeg'}`);
                    messageParts.push({
                      inlineData: {
                        mimeType: attachment.mimeType || 'image/jpeg',
                        data: base64Data
                      }
                    });
                    console.log(`✓ Image successfully added to messageParts. Total parts so far: ${messageParts.length}`);
                  }
                } else {
                  console.warn(`⚠️  No base64 data found for image: ${attachment.name}`);
                }
              } else if ((attachment.mimeType === 'application/pdf' || 
                         attachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                         attachment.mimeType === 'application/msword' ||
                         attachment.name?.toLowerCase().endsWith('.pdf') ||
                         attachment.name?.toLowerCase().endsWith('.docx') ||
                         attachment.name?.toLowerCase().endsWith('.doc')) && attachment.url) {
              // Handle PDFs and DOCX files - extract text content with timeout
              try {
                const base64Data = attachment.url.split(',')[1];
                console.log(`Document attachment details:`, {
                  name: attachment.name,
                  mimeType: attachment.mimeType,
                  urlPrefix: attachment.url?.substring(0, 50),
                  base64Length: base64Data?.length
                });
                
                if (base64Data) {
                  console.log(`Processing document: ${attachment.name}`);
                  
                  // Add timeout to document processing to prevent hanging
                  const documentProcessingPromise = processDocumentAttachment(base64Data, attachment.name, attachment.mimeType);
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Document processing timeout after 30 seconds')), 30000)
                  );
                  
                  const documentResult = await Promise.race([documentProcessingPromise, timeoutPromise]);
                  
                  if (documentResult.success) {
                    // Limit document text to prevent token overflow
                    const maxTextLength = 8000; // Reasonable limit for Gemini
                    const truncatedText = documentResult.extractedText.length > maxTextLength 
                      ? documentResult.extractedText.substring(0, maxTextLength) + '\n\n[Text truncated due to length]'
                      : documentResult.extractedText;
                    
                    // Add document text content to the message
                    const docType = attachment.mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
                    enhancedMessage += `\n\n**${docType} Document: ${attachment.name}**\n${truncatedText}`;
                    console.log(`Document processed successfully: ${documentResult.textLength} characters extracted (${truncatedText.length} sent)`);
                  } else {
                    const docType = attachment.mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
                    enhancedMessage += `\n\n**${docType} Document: ${attachment.name}**\n[Error processing document: ${documentResult.error}]`;
                    console.log(`Document processing failed: ${documentResult.error}`);
                  }
                }
              } catch (error) {
                console.error('Error processing document:', error);
                console.error('Document error details:', {
                  fileName: attachment.name,
                  mimeType: attachment.mimeType,
                  urlLength: attachment.url?.length,
                  errorMessage: error.message,
                  errorStack: error.stack
                });
                const docType = attachment.mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
                enhancedMessage += `\n\n**${docType} Document: ${attachment.name}**\n[Error processing document: ${error.message}]`;
              }
            } else if (attachment.type === 'file' && attachment.url) {
              // Handle other text files
              try {
                const base64Data = attachment.url.split(',')[1];
                if (base64Data) {
                  const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
                  enhancedMessage += `\n\n**File: ${attachment.name}**\n${textContent}`;
                  console.log(`Text file processed: ${attachment.name}`);
                }
              } catch (error) {
                console.error('Error processing text file:', error);
                enhancedMessage += `\n\n**File: ${attachment.name}**\n[Error processing file: ${error.message}]`;
              }
            }
            } catch (attachmentError) {
              console.error('Error processing attachment:', attachmentError);
              enhancedMessage += `\n\n**Attachment Error: ${attachment.name}**\n[Error: ${attachmentError.message}]`;
            }
          }
        }
        
        // Add the enhanced message (with any file content) as text
        messageParts.push({ text: enhancedMessage });

        console.log(`📨 Sending to Gemini with ${messageParts.length} parts:`);
        messageParts.forEach((part, index) => {
          if (part.text) {
            console.log(`  Part ${index}: text (${part.text.length} chars)`);
          } else if (part.inlineData) {
            console.log(`  Part ${index}: ${part.inlineData.mimeType} (${part.inlineData.data.length} chars)`);
          }
        });

        // Send message and get response
        console.log('🚀 Calling Gemini API...');

        // Emit debug info for request
        socket.emit('debug-info', {
          type: 'request',
          timestamp: new Date().toISOString(),
          chatId,
          message: enhancedMessage,
          historyLength: finalHistory.length,
          parts: messageParts.map(part => part.text ? 'text' : part.inlineData ? part.inlineData.mimeType : 'unknown')
        });

        // Use streaming API for better UX
        const result = await chat.sendMessageStream(messageParts);

        let fullResponse = '';
        let hasFunctionCalls = false;
        let functionCalls = [];

        console.log('✅ Streaming response from Gemini...');

        // Stream the response chunks
        for await (const chunk of result.stream) {
          // Check for prompt feedback (safety/content filtering issues)
          if (chunk.promptFeedback) {
            console.log('📋 Prompt Feedback:', JSON.stringify(chunk.promptFeedback, null, 2));
            if (chunk.promptFeedback.blockReason) {
              console.error('🚫 Content blocked by safety filter:', chunk.promptFeedback.blockReason);
              socket.emit('message-response', {
                chatId,
                message: `Sorry, I cannot respond to this request due to content safety filters. Block reason: ${chunk.promptFeedback.blockReason}`,
                isComplete: true
              });
              socket.emit('typing', { chatId, isTyping: false });
              return;
            }
          }

          // Check for safety ratings in candidates
          if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].safetyRatings) {
            console.log('🛡️ Safety Ratings:', chunk.candidates[0].safetyRatings);
          }

          // Check if response was blocked
          if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].finishReason === 'SAFETY') {
            console.error('🚫 Response blocked due to safety concerns');
            socket.emit('message-response', {
              chatId,
              message: 'Sorry, I cannot provide a response due to content safety filters.',
              isComplete: true
            });
            socket.emit('typing', { chatId, isTyping: false });
            return;
          }

          const chunkText = chunk.text();
          console.log('📨 Chunk received, length:', chunkText?.length || 0);

          // Check for function calls in this chunk
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
            hasFunctionCalls = true;
            functionCalls = chunk.functionCalls;
            console.log('Function calls detected:', functionCalls);
            break; // Stop streaming if function calls are needed
          }

          if (chunkText) {
            fullResponse += chunkText;

            // Send streaming chunk to client
            socket.emit('message-response', {
              chatId,
              message: chunkText,
              isComplete: false
            });
          }
        }

        // Check if the response contains function calls
        if (hasFunctionCalls && functionCalls.length > 0) {
          let functionResponse = '';

          // Process each function call
          for (const functionCall of functionCalls) {
            const functionName = functionCall.name;
            const functionArgs = functionCall.args;

            console.log(`Calling function: ${functionName} with args:`, functionArgs);

            let functionResult = '';

            try {
              switch (functionName) {
                case 'get_stock_price':
                  functionResult = await getStockPrice(functionArgs.symbol);
                  break;
                case 'get_weather':
                  functionResult = await getWeather(functionArgs.location);
                  break;
                case 'get_time':
                  functionResult = await getTime(functionArgs.location);
                  break;
                case 'search_web':
                  functionResult = await getGeneralSearch(functionArgs.query);
                  break;
                case 'search_chat_history':
                  functionResult = await searchChatHistory(userId, functionArgs.query);
                  break;
                default:
                  functionResult = `Unknown function: ${functionName}`;
              }

              // Send function result back to Gemini with streaming
              const followUpResult = await chat.sendMessageStream([
                {
                  functionResponse: {
                    name: functionName,
                    response: { result: functionResult }
                  }
                }
              ]);

              // Stream the follow-up response
              for await (const chunk of followUpResult.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                  functionResponse += chunkText;

                  // Send streaming chunk to client
                  socket.emit('message-response', {
                    chatId,
                    message: chunkText,
                    isComplete: false
                  });
                }
              }

            } catch (error) {
              console.error(`Error executing function ${functionName}:`, error);
              const errorMsg = `Error executing ${functionName}: ${error.message}`;
              functionResponse += errorMsg;

              socket.emit('message-response', {
                chatId,
                message: errorMsg,
                isComplete: false
              });
            }
          }

          // Emit debug info for response
          socket.emit('debug-info', {
            type: 'response',
            timestamp: new Date().toISOString(),
            chatId,
            response: functionResponse,
            hadFunctionCalls: true,
            functionNames: functionCalls.map(fc => fc.name)
          });

          // Send completion signal
          socket.emit('message-response', {
            chatId,
            message: '',
            isComplete: true
          });

          // Index the messages
          await indexMessagePair(userId, chatId, message, functionResponse, chatHistory);
          
        } else {
          // No function calls - streaming already completed
          // fullResponse contains the complete streamed text

          console.log('Gemini streamed response complete');
          console.log('Response text length:', fullResponse.length);

          // Check if response is empty (potential issue)
          if (fullResponse.length === 0) {
            console.error('🚨 CRITICAL: Gemini returned empty response!');
            console.error('This could be due to:');
            console.error('  1. Content safety filters blocking the response');
            console.error('  2. API quota/rate limits');
            console.error('  3. Model refusing to generate content for this prompt');
            console.error('Original message:', message);
            console.error('Chat history length:', chatHistory?.length || 0);

            // Send helpful error message to user
            socket.emit('message-response', {
              chatId,
              message: 'I apologize, but I was unable to generate a response. This could be due to content safety filters or the nature of the request. Could you please rephrase your question?',
              isComplete: true
            });

            socket.emit('typing', { chatId, isTyping: false });
            return;
          }

          // CRITICAL: Check if response contains [object Object] placeholder
          if (fullResponse.includes('[object Object]')) {
            console.error('🚨 CRITICAL: Gemini response contains [object Object] placeholder!');
            console.error('Full response:', fullResponse);
          }

          // Emit debug info for response
          socket.emit('debug-info', {
            type: 'response',
            timestamp: new Date().toISOString(),
            chatId,
            response: fullResponse,
            hadFunctionCalls: false,
            wasStreamed: true
          });

          // Send completion signal
          socket.emit('message-response', {
            chatId,
            message: '',
            isComplete: true
          });

          // Index the messages
          await indexMessagePair(userId, chatId, message, fullResponse, chatHistory);
        }
        
        socket.emit('typing', { chatId, isTyping: false });
        
      } catch (error) {
        console.error('Error processing message:', error);
        console.error('Error stack:', error.stack);
        console.error('Message data:', { 
          message: data.message?.substring(0, 100), 
          chatId: data.chatId, 
          hasAttachments: !!data.attachments?.length 
        });
        
        // Send error response to client
        socket.emit('message-response', {
          chatId: data.chatId,
          message: `Sorry, I encountered an error processing your message: ${error.message}. Please try again.`,
          isComplete: true
        });
        
        socket.emit('typing', { chatId: data.chatId, isTyping: false });
      }
    });

    socket.on('delete-chat', async (data) => {
      try {
        const { chatId, userId } = data;
        console.log(`Deleting chat ${chatId} for user ${userId} from vector database`);
        
        const { deleteChat } = require('./vectorDB');
        await deleteChat(userId, chatId);
        
        console.log(`Successfully deleted chat ${chatId} from vector database`);
      } catch (error) {
        console.error('Error deleting chat from vector database:', error);
      }
    });

    socket.on('reset-vector-db', async (data) => {
      try {
        const { userId } = data;
        console.log(`Resetting vector database for user ${userId}`);
        
        const { deleteUserChats } = require('./vectorDB');
        await deleteUserChats(userId);
        
        console.log(`Successfully reset vector database for user ${userId}`);
        socket.emit('vector-db-reset', { success: true });
      } catch (error) {
        console.error('Error resetting vector database:', error);
        socket.emit('vector-db-reset', { success: false, error: error.message });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
    });
  });

  console.log('✅ WebSocket event handlers registered');
  return io;
}

module.exports = { setupWebSocketServer };
