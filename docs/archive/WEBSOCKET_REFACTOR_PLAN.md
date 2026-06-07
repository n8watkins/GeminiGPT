# WebSocket Server Refactoring Plan

## Current State
- **File:** `websocket-server.js`
- **Lines:** 1,028 lines
- **Issues:** Monolithic file with multiple responsibilities

## Proposed Module Structure

```
lib/websocket/
├── index.js                    # Main entry point (exports setupWebSocketServer)
├── rateLimiter.js              # Rate limiting logic (218 lines)
├── messageHandler.js           # Message processing logic (~400 lines)
├── functionCalling.js          # Function calling integration (~150 lines)
├── attachmentProcessor.js     # Attachment handling (~150 lines)
├── messageIndexer.js          # Vector DB indexing (~100 lines)
└── eventHandlers.js           # WebSocket event handlers (~150 lines)
```

---

## Module Breakdown

### 1. `lib/websocket/rateLimiter.js` (218 lines)
**Responsibilities:**
- Token bucket algorithm implementation
- Per-user rate tracking
- Automatic cleanup of inactive users

**Exports:**
```javascript
class RateLimiter {
  checkLimit(userId)
  getStatus(userId)
  cleanup()
  getStats()
}

module.exports = { RateLimiter };
```

**Lines:** 1-218 from current file

---

### 2. `lib/websocket/messageIndexer.js` (100 lines)
**Responsibilities:**
- Create message objects for indexing
- Extract chat titles
- Index messages to vector database

**Exports:**
```javascript
function createMessageObjects(message, responseText)
function getChatTitle(chatHistory)
async function indexMessages(userId, chatId, userMessage, assistantMessage, chatTitle)
async function indexMessagePair(userId, chatId, message, responseText, chatHistory)

module.exports = {
  createMessageObjects,
  getChatTitle,
  indexMessages,
  indexMessagePair
};
```

**Lines:** 227-284 from current file

---

### 3. `lib/websocket/functionCalling.js` (150 lines)
**Responsibilities:**
- Define function calling tools for Gemini
- Handle function execution (stock, weather, time, search)
- Process function results

**Exports:**
```javascript
const tools = [...]; // Function declarations

async function executeFunctionCall(functionName, functionArgs, userId)
async function processFunctionCalls(functionCalls, chat, socket, chatId, userId)

module.exports = {
  tools,
  executeFunctionCall,
  processFunctionCalls
};
```

**Lines:** 293-369 (tools) + 820-890 (function execution)

---

### 4. `lib/websocket/attachmentProcessor.js` (150 lines)
**Responsibilities:**
- Process image attachments
- Process PDF/DOCX documents
- Handle text files
- Validate file types and sizes

**Exports:**
```javascript
async function processAttachments(attachments, enhancedMessage, messageParts)

module.exports = { processAttachments };
```

**Lines:** 614-726 from current file

---

### 5. `lib/websocket/messageHandler.js` (400 lines)
**Responsibilities:**
- Main message processing logic
- Gemini API integration
- Streaming response handling
- Error handling

**Exports:**
```javascript
async function handleSendMessage(socket, data, rateLimiter, genAI)

module.exports = { handleSendMessage };
```

**Lines:** 399-986 from current file

---

### 6. `lib/websocket/eventHandlers.js` (150 lines)
**Responsibilities:**
- Setup WebSocket connection handlers
- Handle disconnect events
- Handle delete-chat events
- Handle reset-vector-db events

**Exports:**
```javascript
function setupEventHandlers(io, rateLimiter, genAI)

module.exports = { setupEventHandlers };
```

**Lines:** 387-1024 from current file

---

### 7. `lib/websocket/index.js` (50 lines)
**Main Entry Point:**
```javascript
const { Server: SocketIOServer } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RateLimiter } = require('./rateLimiter');
const { setupEventHandlers } = require('./eventHandlers');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const rateLimiter = new RateLimiter();

function setupWebSocketServer(server) {
  console.log('🚀 Setting up WebSocket server...');

  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 10 * 1024 * 1024,
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  console.log('✅ WebSocket server configured');

  setupEventHandlers(io, rateLimiter, genAI);

  console.log('✅ WebSocket event handlers registered');
  return io;
}

module.exports = { setupWebSocketServer };
```

---

## Migration Strategy

### Phase 1: Setup (1 hour)
1. Create `lib/websocket/` directory
2. Create all module files with TODO comments
3. Update imports in `server.js` to use new structure

### Phase 2: Extract Rate Limiter (30 min)
1. Move RateLimiter class to `rateLimiter.js`
2. Add proper exports
3. Test rate limiting functionality

### Phase 3: Extract Message Indexer (30 min)
1. Move indexing functions to `messageIndexer.js`
2. Import vectorDB dependencies
3. Test message indexing

### Phase 4: Extract Function Calling (1 hour)
1. Move tools definition to `functionCalling.js`
2. Move function execution logic
3. Import searchService dependencies
4. Test function calling (stock, weather, search)

### Phase 5: Extract Attachment Processor (1 hour)
1. Move attachment processing to `attachmentProcessor.js`
2. Import documentProcessor
3. Test PDF, DOCX, and image uploads

### Phase 6: Extract Message Handler (2 hours)
1. Move main message handler to `messageHandler.js`
2. Import all dependencies (Gemini, attachmentProcessor, functionCalling, messageIndexer)
3. Test message sending and streaming

### Phase 7: Extract Event Handlers (1 hour)
1. Move event setup to `eventHandlers.js`
2. Wire up all handlers
3. Test connection, disconnect, delete-chat, reset-vector-db

### Phase 8: Create Main Entry Point (30 min)
1. Create `index.js` with minimal setup
2. Wire all modules together
3. Update `server.js` import

### Phase 9: Testing (2 hours)
1. Test all WebSocket functionality end-to-end
2. Test rate limiting
3. Test function calling
4. Test attachments
5. Test message streaming
6. Test delete/reset operations

### Phase 10: Cleanup (30 min)
1. Remove old `websocket-server.js`
2. Update documentation
3. Commit changes

**Total Estimated Time:** 10-12 hours

---

## Benefits of Refactoring

### Code Quality
- ✅ **Single Responsibility:** Each module has one clear purpose
- ✅ **Easier Testing:** Smaller modules are easier to unit test
- ✅ **Better Maintainability:** Easier to find and fix bugs
- ✅ **Improved Readability:** ~200 lines per file vs 1,028

### Development Velocity
- ✅ **Faster Onboarding:** New developers can understand modules faster
- ✅ **Parallel Development:** Multiple developers can work on different modules
- ✅ **Easier Debugging:** Isolated concerns make debugging simpler

### Performance
- ✅ **Better Tree Shaking:** Unused modules won't be loaded
- ✅ **Easier Optimization:** Can optimize individual modules

---

## Testing Checklist

After refactoring, verify:

- [ ] WebSocket connection works
- [ ] Rate limiting works (try exceeding limits)
- [ ] Message sending works
- [ ] Streaming responses work
- [ ] Image uploads work
- [ ] PDF uploads work
- [ ] DOCX uploads work
- [ ] Function calling works:
  - [ ] Stock prices
  - [ ] Weather
  - [ ] Time
  - [ ] Web search
  - [ ] Chat history search
- [ ] Chat deletion works
- [ ] Vector DB reset works
- [ ] Typing indicators work
- [ ] Error handling works
- [ ] Reconnection works
- [ ] Multiple concurrent users work

---

## Example: How to Extract Rate Limiter

### Step 1: Create `lib/websocket/rateLimiter.js`

```javascript
/**
 * Rate Limiting - Token Bucket Algorithm
 * Prevents abuse while allowing legitimate bursts
 */

class RateLimiter {
  constructor() {
    // ... existing constructor code ...
  }

  initializeUser(userId) {
    // ... existing code ...
  }

  refillTokens(bucket, config) {
    // ... existing code ...
  }

  checkLimit(userId) {
    // ... existing code ...
  }

  getStatus(userId) {
    // ... existing code ...
  }

  cleanup() {
    // ... existing code ...
  }

  getStats() {
    // ... existing code ...
  }
}

module.exports = { RateLimiter };
```

### Step 2: Update `lib/websocket/index.js`

```javascript
const { RateLimiter } = require('./rateLimiter');

const rateLimiter = new RateLimiter();
console.log('✅ Rate limiter initialized:', rateLimiter.getStats());
```

### Step 3: Update imports in dependent modules

```javascript
// In messageHandler.js
async function handleSendMessage(socket, data, rateLimiter, genAI) {
  const rateLimit = rateLimiter.checkLimit(data.userId);
  // ... rest of code
}
```

---

## Alternative: Incremental Refactoring

If you prefer a less risky approach, refactor incrementally:

### Week 1: Extract Utilities
- Move RateLimiter to `lib/websocket/rateLimiter.js`
- Move message indexing to `lib/websocket/messageIndexer.js`

### Week 2: Extract Processors
- Move attachment processing to `lib/websocket/attachmentProcessor.js`
- Move function calling to `lib/websocket/functionCalling.js`

### Week 3: Extract Handlers
- Move message handler to `lib/websocket/messageHandler.js`
- Move event handlers to `lib/websocket/eventHandlers.js`

### Week 4: Finalize
- Create main entry point
- Remove old file
- Full testing

---

## Risk Mitigation

1. **Keep old file temporarily:** Don't delete `websocket-server.js` until new structure is fully tested
2. **Use feature flags:** Add env var to switch between old/new implementation
3. **Test incrementally:** Test each extracted module before moving to next
4. **Backup database:** Ensure vector DB and SQLite backups exist
5. **Monitor in production:** Watch for errors after deploying refactored code

---

## Future Enhancements

After refactoring, consider:

1. **Add unit tests** for each module
2. **Add integration tests** for WebSocket flows
3. **Convert to TypeScript** for better type safety
4. **Add JSDoc comments** to all exported functions
5. **Add metrics/monitoring** for each module
6. **Add circuit breakers** for external API calls
7. **Add retry logic** for failed operations

---

## Questions to Consider

1. **Should we convert to TypeScript now?** Might be easier to refactor in JS first, then convert
2. **Should we add more error recovery?** e.g., retry failed Gemini API calls
3. **Should we add request queuing?** To prevent overwhelming Gemini API
4. **Should we add health checks?** For each module
5. **Should we add OpenTelemetry tracing?** For better observability

---

**Recommendation:** Start with Phase 1-3 (Rate Limiter and Message Indexer) as a proof of concept. If successful, continue with the rest.
