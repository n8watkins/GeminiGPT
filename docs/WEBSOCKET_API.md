# WebSocket API Documentation

This document describes the WebSocket API for real-time communication between the frontend and backend.

## Table of Contents
- [Connection](#connection)
- [Authentication](#authentication)
- [Client Events (Client → Server)](#client-events)
- [Server Events (Server → Client)](#server-events)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Code Examples](#code-examples)

---

## Connection

### Endpoint
```
ws://localhost:3000
```

In production:
```
wss://your-domain.com
```

### Connection Flow
1. Client establishes WebSocket connection using Socket.IO
2. Server validates connection
3. Connection is established
4. Client can now send/receive messages

### Socket.IO Client Setup
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

## Authentication

### BYOK (Bring Your Own Key) Mode
The application supports two authentication modes:

1. **Client-Side API Key (BYOK)** - User provides their own Gemini API key
   - API key is stored in browser localStorage
   - API key is sent with each message
   - Server does NOT store the API key
   - More secure for end users

2. **Server-Side API Key** - Server uses its own API key
   - User does not need an API key
   - Server uses `GEMINI_API_KEY` from environment
   - Rate limiting per user ID

### Sending API Key (BYOK Mode)
```typescript
socket.emit('send-message', {
  chatId: 'chat-uuid',
  message: 'Hello',
  userId: 'user-uuid',
  apiKey: 'AIzaSy...', // Optional: BYOK mode
  // ... other fields
});
```

**Security Note**: The API key is sent over WebSocket but:
- Connection should use WSS (secure WebSocket) in production
- API key is never logged or stored on server
- API key is hashed for rate limiting purposes only

---

## Client Events

Events sent from client to server.

### `send-message`

Send a chat message to the AI.

**Event Name**: `send-message`

**Payload**:
```typescript
{
  chatId: string;           // UUID of the chat
  message: string;          // User's message text
  userId: string;           // UUID of the user
  apiKey?: string;          // Optional: Gemini API key (BYOK mode)
  attachments?: Array<{     // Optional: Image attachments
    data: string;           // Base64 encoded image
    mimeType: string;       // e.g., "image/jpeg"
  }>;
  settings?: {              // Optional: Generation settings
    temperature?: number;   // 0.0 to 2.0 (default: 1.0)
    topP?: number;          // 0.0 to 1.0 (default: 0.95)
    topK?: number;          // 1 to 100 (default: 40)
    maxOutputTokens?: number; // Max tokens in response
  };
}
```

**Example**:
```typescript
socket.emit('send-message', {
  chatId: '123e4567-e89b-12d3-a456-426614174000',
  message: 'What is the weather in San Francisco?',
  userId: 'user-123',
  apiKey: 'AIzaSy...',
  settings: {
    temperature: 0.7,
    maxOutputTokens: 2048
  }
});
```

**Response Events**:
- `typing` - Indicates AI is processing
- `message-response` - AI's response (may be sent multiple times for streaming)
- `rate-limit-info` - Current rate limit status
- `debug-info` - Debug information (function calls, etc.)

---

### `delete-chat`

Delete a chat and all its messages.

**Event Name**: `delete-chat`

**Payload**:
```typescript
{
  chatId: string;  // UUID of chat to delete
  userId: string;  // UUID of the user (must match chat owner)
}
```

**Example**:
```typescript
socket.emit('delete-chat', {
  chatId: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123'
});
```

**Response**:
No specific response event. Chat is deleted from database and vector store.

---

### `reset-vector-db`

Reset the vector database (delete all embeddings for a user).

**Event Name**: `reset-vector-db`

**Payload**:
```typescript
{
  userId: string;  // UUID of the user
}
```

**Example**:
```typescript
socket.emit('reset-vector-db', {
  userId: 'user-123'
});
```

**Response Events**:
- `vector-db-reset` - Confirmation of reset

---

## Server Events

Events sent from server to client.

### `message-response`

AI's response to a user message. May be sent multiple times for streaming responses.

**Event Name**: `message-response`

**Payload**:
```typescript
{
  chatId: string;                 // Chat UUID
  message: string;                // AI's response text
  isComplete: boolean;            // true if this is the final chunk
  timestamp?: string;             // ISO 8601 timestamp
  messageId?: string;             // UUID of the saved message
  error?: string;                 // Error message if request failed

  // Function calling metadata (if applicable)
  functionCall?: {
    name: string;                 // Function name called
    arguments: object;            // Function arguments
  };

  // Semantic search metadata (if applicable)
  searchResults?: Array<{
    text: string;
    similarity: number;
    metadata: object;
  }>;
}
```

**Example - Streaming Response**:
```typescript
// First chunk
socket.on('message-response', (data) => {
  console.log(data);
  // {
  //   chatId: '123e4567...',
  //   message: 'The weather in',
  //   isComplete: false
  // }
});

// Second chunk
// {
//   chatId: '123e4567...',
//   message: 'The weather in San Francisco is',
//   isComplete: false
// }

// Final chunk
// {
//   chatId: '123e4567...',
//   message: 'The weather in San Francisco is sunny and 72°F.',
//   isComplete: true,
//   messageId: '456e7890...',
//   timestamp: '2025-01-19T10:30:00.000Z'
// }
```

**Example - Error Response**:
```typescript
{
  chatId: '123e4567...',
  message: '',
  isComplete: true,
  error: 'Rate limit exceeded. Please try again in 30 seconds.'
}
```

---

### `typing`

Indicates whether AI is currently processing a message.

**Event Name**: `typing`

**Payload**:
```typescript
{
  chatId: string;      // Chat UUID
  isTyping: boolean;   // true when processing, false when done
}
```

**Example**:
```typescript
socket.on('typing', (data) => {
  if (data.isTyping) {
    // Show "AI is typing..." indicator
  } else {
    // Hide typing indicator
  }
});
```

---

### `rate-limit-info`

Current rate limit status for the user. Sent with every message.

**Event Name**: `rate-limit-info`

**Payload**:
```typescript
{
  remaining: {
    minute: number;  // Messages remaining this minute
    hour: number;    // Messages remaining this hour
  };
  limit: {
    minute: number;  // Total messages allowed per minute
    hour: number;    // Total messages allowed per hour
  };
  resetAt: {
    minute: number;  // Unix timestamp when minute limit resets
    hour: number;    // Unix timestamp when hour limit resets
  };
}
```

**Example**:
```typescript
socket.on('rate-limit-info', (data) => {
  console.log(`${data.remaining.minute}/${data.limit.minute} messages remaining this minute`);
  console.log(`${data.remaining.hour}/${data.limit.hour} messages remaining this hour`);

  // Show warning if low
  if (data.remaining.minute < 5) {
    showWarning('Rate limit almost reached');
  }
});
```

---

### `debug-info`

Debug information about the request processing (function calls, search results, etc.).

**Event Name**: `debug-info`

**Payload**:
```typescript
{
  type: string;              // Type of debug info: 'function-call' | 'search-results' | 'embedding'

  // For function calls
  functionCall?: {
    name: string;            // Function name
    arguments: object;       // Function arguments
    result?: any;            // Function execution result
  };

  // For semantic search
  searchResults?: Array<{
    text: string;
    similarity: number;
    metadata: object;
  }>;

  // For embeddings
  embedding?: {
    model: string;
    dimensions: number;
    text: string;
  };
}
```

**Example - Function Call**:
```typescript
socket.on('debug-info', (data) => {
  if (data.type === 'function-call') {
    console.log('Function called:', data.functionCall.name);
    console.log('Arguments:', data.functionCall.arguments);
    console.log('Result:', data.functionCall.result);
  }
});

// Output:
// Function called: getStockPrice
// Arguments: { symbol: 'AAPL' }
// Result: { symbol: 'AAPL', price: 150.25, change: +2.5 }
```

---

### `vector-db-reset`

Confirmation that vector database has been reset.

**Event Name**: `vector-db-reset`

**Payload**:
```typescript
{
  success: boolean;  // true if reset successful
  error?: string;    // Error message if failed
}
```

**Example**:
```typescript
socket.on('vector-db-reset', (data) => {
  if (data.success) {
    console.log('Vector database reset successfully');
  } else {
    console.error('Reset failed:', data.error);
  }
});
```

---

### `error`

Generic error event for connection or processing errors.

**Event Name**: `error`

**Payload**:
```typescript
{
  message: string;     // Error message
  code?: string;       // Error code (e.g., 'RATE_LIMIT_EXCEEDED')
  chatId?: string;     // Chat ID if error is related to a specific chat
}
```

**Example**:
```typescript
socket.on('error', (data) => {
  console.error('WebSocket error:', data.message);

  // Handle specific errors
  if (data.code === 'RATE_LIMIT_EXCEEDED') {
    showRateLimitError();
  }
});
```

---

## Error Handling

### Connection Errors

```typescript
socket.on('connect_error', (error) => {
  console.error('Failed to connect:', error.message);
  // Retry connection or show error to user
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected the client, reconnect manually
    socket.connect();
  }
  // else the client disconnected, no need to reconnect
});
```

### Message Errors

Errors during message processing are sent via `message-response` event:

```typescript
socket.on('message-response', (data) => {
  if (data.error) {
    console.error('Message error:', data.error);
    showErrorMessage(data.error);
  } else {
    displayAIResponse(data.message);
  }
});
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | Wait for reset time, reduce message frequency |
| `INVALID_API_KEY` | API key is invalid or missing | Check API key format, get new key |
| `DATABASE_ERROR` | Database operation failed | Retry request, contact support |
| `EMBEDDING_ERROR` | Failed to generate embedding | Retry with different text |
| `FUNCTION_CALL_ERROR` | Function execution failed | Check function arguments, API keys |

---

## Rate Limiting

### Default Limits

**Default (very generous for portfolio demo)**:
- **60 messages per minute** per user
- **500 messages per hour** per user

**Configurable via environment variables**:
```bash
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=500
```

### How Rate Limiting Works

1. **Token Bucket Algorithm**
   - Each user has two token buckets (minute and hour)
   - Each message consumes 1 token from both buckets
   - Tokens refill automatically over time

2. **Per-User Limiting**
   - Rate limits are tracked per `userId`
   - Separate limits for each user

3. **Per-API-Key Limiting (BYOK mode)**
   - Additionally limited per API key fingerprint
   - Prevents API key sharing abuse
   - Uses SHA-256 hash of API key (first 16 characters)

### Rate Limit Response

When rate limited, you receive:

```typescript
{
  chatId: '123e4567...',
  message: '',
  isComplete: true,
  error: 'Rate limit exceeded (minute limit). Please try again in 30 seconds.'
}
```

Rate limit info is sent with every request:

```typescript
{
  remaining: { minute: 0, hour: 480 },
  limit: { minute: 60, hour: 500 },
  resetAt: { minute: 1705668000000, hour: 1705670600000 }
}
```

### Handling Rate Limits

```typescript
socket.on('rate-limit-info', (data) => {
  // Calculate time until reset
  const resetIn = data.resetAt.minute - Date.now();
  const resetInSeconds = Math.ceil(resetIn / 1000);

  if (data.remaining.minute === 0) {
    disableSendButton();
    showMessage(`Rate limit reached. Try again in ${resetInSeconds}s`);

    // Enable button after reset
    setTimeout(() => {
      enableSendButton();
    }, resetIn);
  }
});
```

---

## Code Examples

### Complete Chat Flow

```typescript
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// Initialize connection
const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: true
});

// User and chat IDs (persist these in your app)
const userId = uuidv4();
const chatId = uuidv4();

// Connection handlers
socket.on('connect', () => {
  console.log('✅ Connected to server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error);
});

// Message handlers
socket.on('typing', (data) => {
  if (data.chatId === chatId) {
    setTypingIndicator(data.isTyping);
  }
});

socket.on('message-response', (data) => {
  if (data.chatId === chatId) {
    if (data.error) {
      showError(data.error);
    } else {
      updateAIResponse(data.message);

      if (data.isComplete) {
        console.log('Message complete:', data.messageId);
        saveMessageToHistory(data);
      }
    }
  }
});

socket.on('rate-limit-info', (data) => {
  updateRateLimitDisplay(data);
});

socket.on('debug-info', (data) => {
  console.log('Debug:', data);
});

// Send a message
function sendMessage(text: string, apiKey?: string) {
  socket.emit('send-message', {
    chatId,
    message: text,
    userId,
    apiKey, // Optional: BYOK mode
    settings: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  });
}

// Send message with image attachment
function sendMessageWithImage(text: string, imageBase64: string, apiKey?: string) {
  socket.emit('send-message', {
    chatId,
    message: text,
    userId,
    apiKey,
    attachments: [{
      data: imageBase64,
      mimeType: 'image/jpeg'
    }]
  });
}

// Delete chat
function deleteChat() {
  socket.emit('delete-chat', {
    chatId,
    userId
  });
}

// Usage
sendMessage('What is the weather in San Francisco?', 'AIzaSy...');
```

### Function Calling Example

```typescript
// Ask a question that triggers function calling
sendMessage('What is the current price of Apple stock?');

// Server will emit debug-info for function call
socket.on('debug-info', (data) => {
  if (data.type === 'function-call' && data.functionCall) {
    console.log(`📞 Function called: ${data.functionCall.name}`);
    console.log('Arguments:', data.functionCall.arguments);
    // Example:
    // Function called: getStockPrice
    // Arguments: { symbol: 'AAPL' }
  }
});

// AI response will include the stock price
socket.on('message-response', (data) => {
  if (data.isComplete) {
    console.log('AI:', data.message);
    // "The current price of Apple (AAPL) is $150.25, up $2.50 (+1.7%) today."
  }
});
```

### Semantic Search Example

```typescript
// Ask a question about previous conversation
sendMessage('What did we discuss about Python earlier?');

// Server performs semantic search and emits debug info
socket.on('debug-info', (data) => {
  if (data.type === 'search-results' && data.searchResults) {
    console.log('🔍 Found relevant context:');
    data.searchResults.forEach(result => {
      console.log(`  - [${result.similarity.toFixed(2)}] ${result.text}`);
    });
  }
});

// AI response includes context from previous messages
socket.on('message-response', (data) => {
  if (data.isComplete) {
    console.log('AI:', data.message);
    // "Earlier we discussed Python's list comprehensions and how they..."
  }
});
```

### Error Recovery

```typescript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

socket.on('connect_error', (error) => {
  reconnectAttempts++;

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Failed to connect after', MAX_RECONNECT_ATTEMPTS, 'attempts');
    showFatalError('Unable to connect to server. Please refresh the page.');
  } else {
    console.log(`Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  }
});

socket.on('connect', () => {
  reconnectAttempts = 0;
  console.log('Reconnected successfully');
});

// Handle message errors
socket.on('message-response', (data) => {
  if (data.error) {
    if (data.error.includes('Rate limit exceeded')) {
      // Extract retry time from error message
      const match = data.error.match(/(\d+) seconds/);
      const retryIn = match ? parseInt(match[1]) : 60;

      showRateLimitError(retryIn);
      disableSendButton(retryIn);
    } else if (data.error.includes('Invalid API key')) {
      showError('Invalid API key. Please check your settings.');
      promptForNewAPIKey();
    } else {
      showError(data.error);
    }
  }
});
```

---

## Best Practices

### 1. Always Handle Errors

```typescript
// ✅ Good - Handle all error scenarios
socket.on('message-response', (data) => {
  if (data.error) {
    handleError(data.error);
  } else {
    displayMessage(data.message);
  }
});

socket.on('connect_error', handleConnectionError);
socket.on('error', handleGeneralError);

// ❌ Bad - No error handling
socket.on('message-response', (data) => {
  displayMessage(data.message);
});
```

### 2. Respect Rate Limits

```typescript
// ✅ Good - Check rate limits before sending
socket.on('rate-limit-info', (data) => {
  if (data.remaining.minute < 1) {
    disableSendButton();
    const resetIn = data.resetAt.minute - Date.now();
    setTimeout(enableSendButton, resetIn);
  }
});

// ❌ Bad - Ignore rate limits
socket.emit('send-message', data); // Spam the server
```

### 3. Clean Up Resources

```typescript
// ✅ Good - Disconnect when done
useEffect(() => {
  const socket = io('http://localhost:3000');

  // ... setup listeners

  return () => {
    socket.disconnect();
  };
}, []);

// ❌ Bad - Never disconnect
const socket = io('http://localhost:3000');
```

### 4. Validate Data

```typescript
// ✅ Good - Validate before sending
function sendMessage(text: string) {
  if (!text || text.trim().length === 0) {
    return;
  }

  if (text.length > 10000) {
    showError('Message too long (max 10,000 characters)');
    return;
  }

  socket.emit('send-message', { chatId, message: text, userId });
}

// ❌ Bad - Send without validation
socket.emit('send-message', { message: text });
```

### 5. Handle Streaming Responses

```typescript
// ✅ Good - Accumulate streaming responses
let currentResponse = '';

socket.on('message-response', (data) => {
  if (data.isComplete) {
    // Final response
    displayCompleteMessage(data.message, data.messageId);
    currentResponse = '';
  } else {
    // Streaming chunk
    currentResponse += data.message;
    displayPartialMessage(currentResponse);
  }
});

// ❌ Bad - Treat each chunk as separate message
socket.on('message-response', (data) => {
  addMessageToList(data.message); // Creates duplicate messages
});
```

---

## Troubleshooting

### Connection Issues

**Problem**: Can't connect to WebSocket server

**Solutions**:
1. Check server is running: `npm run dev`
2. Verify port (default: 3000)
3. Check firewall settings
4. Try different transport: `socket = io(url, { transports: ['polling', 'websocket'] })`

### Rate Limiting

**Problem**: Getting rate limited immediately

**Solutions**:
1. Check if you're reusing `userId` across sessions
2. Verify rate limit settings in `.env.local`
3. Clear rate limit data: Restart server

### Messages Not Receiving

**Problem**: Sent message but no response

**Solutions**:
1. Check console for errors
2. Verify API key is valid (BYOK mode)
3. Check `typing` event - if never `false`, server may be stuck
4. Check `debug-info` for function call errors

### Slow Responses

**Problem**: AI responses take a long time

**Solutions**:
1. Reduce `maxOutputTokens` in settings
2. Check internet connection to Gemini API
3. Simplify prompt/question
4. Check server logs for errors

---

## Related Documentation

- [HTTP API Documentation](HTTP_API.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Security Architecture](SECURITY.md)
