const { Server } = require('socket.io');
const { createServer } = require('http');
const { setupWebSocketServer } = require('../websocket-server');

describe('WebSocket Server Tests', () => {
  let server;
  let io;
  let clientSocket;

  beforeAll((done) => {
    // Set up test environment
    process.env.GEMINI_API_KEY = 'test_gemini_key';
    process.env.GOOGLE_SEARCH_API_KEY = 'test_search_key';
    process.env.GOOGLE_SEARCH_ENGINE_ID = 'test_engine_id';

    server = createServer();
    io = setupWebSocketServer(server);

    server.listen(5001, () => {
      done();
    });
  });

  afterAll((done) => {
    server.close(() => {
      done();
    });
  });

  beforeEach((done) => {
    // Create a client socket for each test
    clientSocket = require('socket.io-client')('http://localhost:5001');
    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Function Detection', () => {
    test('should detect stock price queries', (done) => {
      const testData = {
        message: 'What is the stock price of Apple?',
        chatHistory: [],
        chatId: 'test-chat-3'
      };

      clientSocket.emit('send-message', testData);

      clientSocket.on('message-response', (data) => {
        expect(data.chatId).toBe('test-chat-3');
        expect(data.message).toContain('Stock Information for AAPL');
        expect(data.isComplete).toBe(true);
        done();
      });
    });

    test('should detect weather queries', (done) => {
      const testData = {
        message: 'What is the weather in Oregon?',
        chatHistory: [],
        chatId: 'test-chat-4'
      };

      clientSocket.emit('send-message', testData);

      clientSocket.on('message-response', (data) => {
        expect(data.chatId).toBe('test-chat-4');
        expect(data.message).toContain('Weather in Oregon');
        expect(data.isComplete).toBe(true);
        done();
      });
    });

    test('should detect search queries', (done) => {
      const testData = {
        message: 'Search for AI news',
        chatHistory: [],
        chatId: 'test-chat-5'
      };

      clientSocket.emit('send-message', testData);

      clientSocket.on('message-response', (data) => {
        expect(data.chatId).toBe('test-chat-5');
        expect(data.message).toContain('Search Results for "Search for AI news"');
        expect(data.isComplete).toBe(true);
        done();
      });
    });
  });
});
