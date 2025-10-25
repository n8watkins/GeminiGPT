const { Server: SocketIOServer } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getStockPrice, getWeather, getTime, getGeneralSearch, searchChatHistory } = require('./searchService');
// Import real implementations for production
const { addMessage } = require('./vectorDB');
const { processDocumentAttachment } = require('./documentProcessor');

// Import logger
const { wsLogger, geminiLogger, securityLogger } = require('./lib/logger');

// 🆕 Import prompts module (V3 Architecture)
const { buildToolsArray } = require('./lib/websocket/prompts');

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
wsLogger.info('✅ Rate limiter initialized', rateLimiter.getStats());

const { HistoryProcessor } = require('./lib/websocket/services/HistoryProcessor');
const historyProcessor = new HistoryProcessor();

const { AttachmentHandler } = require('./lib/websocket/services/AttachmentHandler');
const attachmentHandler = new AttachmentHandler(processDocumentAttachment);

const { GeminiService } = require('./lib/websocket/services/GeminiService');

const { VectorIndexer } = require('./lib/websocket/services/VectorIndexer');
const vectorIndexer = new VectorIndexer(addMessage);

// REMOVED: Pre-emptive pattern matching
// Now letting Gemini decide when to search chat history via function calling

geminiLogger.info('Environment check - GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🆕 V3 Architecture: Function tools now defined in lib/websocket/prompts/functionTools.js
// To edit function descriptions, edit that file instead of this one!
const tools = buildToolsArray();
geminiLogger.info(`✅ Loaded ${tools[0].function_declarations.length} function tools from prompts module`);

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
  wsLogger.info('🚀 Setting up WebSocket server...');

  // SECURITY: Strict CORS policy - only allow specific origins
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        process.env.NEXT_PUBLIC_RAILWAY_URL,
        process.env.PRODUCTION_URL
      ].filter(Boolean)
    : [
        'http://localhost:3000',
        'http://localhost:1337',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:1337'
      ];

  securityLogger.info('✅ CORS allowed origins:', allowedOrigins);

  const io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          securityLogger.warn(`❌ CORS blocked origin: ${origin}`);
          callback(new Error('CORS policy violation: Origin not allowed'));
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    maxHttpBufferSize: 10 * 1024 * 1024, // 10MB limit for large documents
    pingTimeout: 60000, // 60 second timeout
    pingInterval: 25000, // Check connection every 25 seconds
    transports: ['websocket', 'polling']
  });

  wsLogger.info('✅ WebSocket server configured');

  // Middleware to verify authentication token
  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth.token;

      if (authToken) {
        // Parse the session data sent from client
        const sessionData = JSON.parse(authToken);

        if (sessionData?.user?.id) {
          // Store authenticated user ID in socket
          socket.data.authenticatedUserId = sessionData.user.id;
          socket.data.isAuthenticated = true;
          wsLogger.info('✅ Authenticated WebSocket connection', {
            socketId: socket.id,
            userId: sessionData.user.id,
            email: sessionData.user.email
          });
        } else {
          // No user in session data - anonymous user
          socket.data.isAuthenticated = false;
          wsLogger.debug('Anonymous WebSocket connection', { socketId: socket.id });
        }
      } else {
        // No auth token - anonymous user
        socket.data.isAuthenticated = false;
        wsLogger.debug('Anonymous WebSocket connection (no token)', { socketId: socket.id });
      }

      next();
    } catch (error) {
      wsLogger.error('Error parsing auth token', { socketId: socket.id, error: error.message });
      // Allow connection anyway (fall back to anonymous)
      socket.data.isAuthenticated = false;
      next();
    }
  });

  io.on('connection', (socket) => {
    const logContext = {
      socketId: socket.id,
      transport: socket.conn.transport.name,
      authenticated: socket.data.isAuthenticated,
      userId: socket.data.authenticatedUserId || 'anonymous'
    };
    wsLogger.info('✅ Client connected', logContext);

    // Handle connection errors
    socket.on('error', (error) => {
      wsLogger.error('Socket error', { socketId: socket.id, error: error.message });
    });

    socket.on('connect_error', (error) => {
      wsLogger.error('Connection error', { socketId: socket.id, error: error.message });
    });

    socket.on('send-message', async (data) => {
      try {
        // SECURITY: Use authenticated user ID if available, otherwise fall back to client-provided ID
        const effectiveUserId = socket.data.authenticatedUserId || data.userId;

        wsLogger.debug('Received message', {
          messagePreview: data.message?.substring(0, 100) + '...',
          chatId: data.chatId,
          hasAttachments: !!data.attachments?.length,
          userId: effectiveUserId,
          authenticated: socket.data.isAuthenticated
        });

        // Override userId in data with authenticated ID
        const secureData = {
          ...data,
          userId: effectiveUserId
        };

        // 🆕 V3 Architecture: MessagePipeline orchestrates entire message processing flow
        await messagePipeline.processMessage(socket, secureData);

      } catch (error) {
        wsLogger.error('Error processing message', error);
        wsLogger.debug('Message data', {
          messagePreview: data.message?.substring(0, 100),
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
        // SECURITY: Use authenticated user ID if available
        const effectiveUserId = socket.data.authenticatedUserId || data.userId;
        const { chatId } = data;
        wsLogger.info(`Deleting chat ${chatId} for user ${effectiveUserId} from vector database`, {
          authenticated: socket.data.isAuthenticated
        });

        const { deleteChat } = require('./vectorDB');
        await deleteChat(effectiveUserId, chatId);

        wsLogger.info(`Successfully deleted chat ${chatId} from vector database`);
      } catch (error) {
        wsLogger.error('Error deleting chat from vector database', error);
      }
    });

    socket.on('reset-vector-db', async (data) => {
      try {
        // SECURITY: Use authenticated user ID if available
        const effectiveUserId = socket.data.authenticatedUserId || data.userId;
        wsLogger.info(`Resetting vector database for user ${effectiveUserId}`, {
          authenticated: socket.data.isAuthenticated
        });

        const { deleteUserChats } = require('./vectorDB');
        await deleteUserChats(effectiveUserId);

        wsLogger.info(`Successfully reset vector database for user ${effectiveUserId}`);
        socket.emit('vector-db-reset', { success: true });
      } catch (error) {
        wsLogger.error('Error resetting vector database', error);
        socket.emit('vector-db-reset', { success: false, error: error.message });
      }
    });

    socket.on('disconnect', (reason) => {
      wsLogger.info('🔌 Client disconnected', { socketId: socket.id, reason });
    });
  });

  wsLogger.info('✅ WebSocket event handlers registered');
  return io;
}

module.exports = { setupWebSocketServer };
