const { Server: SocketIOServer } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getStockPrice, getWeather, getTime, getGeneralSearch, searchChatHistory } = require('./searchService');
// Import real implementations for production
const { addMessage, searchChats } = require('./vectorDB');
const { processDocumentAttachment } = require('./documentProcessor');

// 🆕 Import prompts module (V3 Architecture)
const { getFullPrompt, buildToolsArray } = require('./lib/websocket/prompts');

// 🆕 Import services (V3 Architecture)
const { RateLimiter } = require('./lib/websocket/services/RateLimiter');

/**
 * ============================================
 * RATE LIMITING
 * ============================================
 * Now handled by lib/websocket/services/RateLimiter.js
 * See that file for configuration and implementation details.
 */

// 🆕 V3 Architecture: Services extracted to lib/websocket/services/
const rateLimiter = new RateLimiter();
console.log('✅ Rate limiter initialized:', rateLimiter.getStats());

const { HistoryProcessor } = require('./lib/websocket/services/HistoryProcessor');
const historyProcessor = new HistoryProcessor();

const { AttachmentHandler } = require('./lib/websocket/services/AttachmentHandler');
const attachmentHandler = new AttachmentHandler(processDocumentAttachment);

const { GeminiService } = require('./lib/websocket/services/GeminiService');

const { VectorIndexer } = require('./lib/websocket/services/VectorIndexer');
const vectorIndexer = new VectorIndexer(addMessage);

// REMOVED: Pre-emptive pattern matching
// Now letting Gemini decide when to search chat history via function calling

console.log('Environment check:');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🆕 V3 Architecture: Function tools now defined in lib/websocket/prompts/functionTools.js
// To edit function descriptions, edit that file instead of this one!
const tools = buildToolsArray();
console.log(`✅ Loaded ${tools[0].function_declarations.length} function tools from prompts module`);

// Initialize GeminiService with function handlers
const geminiService = new GeminiService(genAI, tools, {
  get_stock_price: async (args) => await getStockPrice(args.symbol),
  get_weather: async (args) => await getWeather(args.location),
  get_time: async (args) => await getTime(args.location),
  search_web: async (args) => await getGeneralSearch(args.query),
  search_chat_history: async (args, context) => await searchChatHistory(context.userId, args.query)
});

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
          const retryInMinutes = Math.ceil(retryInSeconds / 60);
          const limitTypeText = rateLimit.limitType === 'minute' ? 'minute' : 'hour';

          console.log(`🚫 Rate limit exceeded for user ${userId}. Retry after ${retryInSeconds}s`);

          // Calculate the exact time when they can send again (in their timezone)
          const resetTime = new Date(rateLimit.resetAt[rateLimit.limitType]);
          const resetTimeString = resetTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          // Create a friendly message without mentioning "rate limit"
          let waitMessage;
          if (retryInSeconds < 60) {
            waitMessage = `${retryInSeconds} seconds`;
          } else if (retryInMinutes < 60) {
            waitMessage = `${retryInMinutes} minute${retryInMinutes > 1 ? 's' : ''}`;
          } else {
            const hours = Math.ceil(retryInMinutes / 60);
            waitMessage = `${hours} hour${hours > 1 ? 's' : ''}`;
          }

          // Send friendly message to client
          socket.emit('message-response', {
            chatId,
            message: `### You've reached your message limit\n\nTo prevent abuse, there's a limit on how many messages you can send per ${limitTypeText}.\n\n**You can send more messages in ${waitMessage}** (at ${resetTimeString}).\n\n**Current usage:**\n- ${rateLimit.remaining.minute} of ${rateLimit.limit.minute} messages remaining this minute\n- ${rateLimit.remaining.hour} of ${rateLimit.limit.hour} messages remaining this hour\n\nThank you for your patience! 🙏`,
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

        // 🆕 V3 Architecture: History processing now handled by HistoryProcessor service
        // This converts chat history to Gemini format and adds system prompts
        const finalHistory = historyProcessor.processHistory(chatHistory);

        // 🆕 V3 Architecture: Attachment processing now handled by AttachmentHandler service
        const { messageParts, enhancedMessage } = await attachmentHandler.processAttachments(attachments, message);

        // 🆕 V3 Architecture: Gemini API interaction now handled by GeminiService
        const result = await geminiService.sendMessage(
          socket,
          chatId,
          finalHistory,
          messageParts,
          message,
          chatHistory,
          { userId }
        );

        // Handle result - index messages if response was successful
        if (result && result.response && !result.blocked && !result.error) {
          await vectorIndexer.indexMessagePair(userId, chatId, message, result.response, chatHistory);
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
