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

// 🆕 V3 Architecture: MessagePipeline orchestrates all services
const { MessagePipeline } = require('./lib/websocket/services/MessagePipeline');
const messagePipeline = new MessagePipeline(
  rateLimiter,
  historyProcessor,
  attachmentHandler,
  geminiService,
  vectorIndexer
);

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

        // 🆕 V3 Architecture: MessagePipeline orchestrates entire message processing flow
        await messagePipeline.processMessage(socket, data);

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
