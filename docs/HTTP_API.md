# HTTP API Documentation

This document describes the HTTP REST API endpoints available in the application.

## Table of Contents
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Chat API](#chat-api)
  - [Share API](#share-api)
  - [Rate Limit Demo](#rate-limit-demo)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)

---

## Base URL

**Development**:
```
http://localhost:3000
```

**Production**:
```
https://your-domain.com
```

---

## Authentication

Most endpoints do not require authentication. The Chat API uses the Gemini API key from environment variables.

For BYOK (Bring Your Own Key) functionality, use the [WebSocket API](WEBSOCKET_API.md) instead.

---

## Endpoints

### Health Check

Check the health status of the application and its dependencies.

#### `GET /healthz`

**Description**: Returns comprehensive health status including database connectivity, memory usage, and uptime.

**Request**:
```bash
curl http://localhost:3000/healthz
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "pass",
      "responseTime": 5
    },
    "vectordb": {
      "status": "pass",
      "responseTime": 12
    },
    "memory": {
      "status": "pass",
      "usage": 150,
      "percentage": 45,
      "limit": 333
    }
  }
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-19T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "fail",
      "responseTime": 5000,
      "error": "Connection timeout"
    },
    "vectordb": {
      "status": "pass",
      "responseTime": 12
    },
    "memory": {
      "status": "pass",
      "usage": 150,
      "percentage": 45,
      "limit": 333
    }
  }
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall health: `"healthy"`, `"degraded"`, or `"unhealthy"` |
| `timestamp` | string | ISO 8601 timestamp of the health check |
| `uptime` | number | Server uptime in seconds |
| `checks.database.status` | string | SQLite database status: `"pass"` or `"fail"` |
| `checks.database.responseTime` | number | Database query response time in milliseconds |
| `checks.database.error` | string | Error message if database check failed (optional) |
| `checks.vectordb.status` | string | LanceDB status: `"pass"` or `"fail"` |
| `checks.vectordb.responseTime` | number | Vector database response time in milliseconds |
| `checks.vectordb.error` | string | Error message if vector DB check failed (optional) |
| `checks.memory.status` | string | Memory check: `"pass"` (< 90%) or `"fail"` (≥ 90%) |
| `checks.memory.usage` | number | Current heap usage in MB |
| `checks.memory.percentage` | number | Heap usage percentage |
| `checks.memory.limit` | number | Heap limit in MB |

**Use Cases**:
- Load balancer health checks
- Monitoring and alerting
- Deployment verification
- Debugging system issues

**Example** (Load Balancer Config):
```yaml
# Railway health check
healthcheckPath: /healthz
healthcheckTimeout: 5
```

---

### Chat API

Simple HTTP endpoint for chat functionality (alternative to WebSocket).

#### `POST /api/chat`

**Description**: Send a message and receive an AI response.

**Note**: This is a simple HTTP endpoint. For real-time streaming and advanced features (attachments, function calling, semantic search), use the [WebSocket API](WEBSOCKET_API.md).

**Request**:
```http
POST /api/chat HTTP/1.1
Content-Type: application/json

{
  "message": "What is the capital of France?",
  "chatHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help you?" }
  ]
}
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User's message |
| `chatHistory` | array | No | Previous conversation history |

**Chat History Entry**:
| Field | Type | Description |
|-------|------|-------------|
| `role` | string | Either `"user"` or `"assistant"` |
| `content` | string | Message content |

**Response** (200 OK):
```json
{
  "response": "The capital of France is Paris.",
  "success": true
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Invalid request payload",
  "success": false
}
```

**Response** (500 Internal Server Error):
```json
{
  "error": "Failed to generate response",
  "success": false
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `response` | string | AI's response text (only on success) |
| `success` | boolean | Whether the request succeeded |
| `error` | string | Error message (only on failure) |

**Example** (cURL):
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather like?",
    "chatHistory": []
  }'
```

**Example** (JavaScript):
```javascript
const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Tell me a joke',
    chatHistory: []
  })
});

const data = await response.json();
if (data.success) {
  console.log('AI:', data.response);
} else {
  console.error('Error:', data.error);
}
```

**Limitations**:
- No streaming responses (you get the full response at once)
- No image attachments
- No function calling
- No semantic search
- Uses server's API key (no BYOK support)

**For Advanced Features**: Use the [WebSocket API](WEBSOCKET_API.md)

---

### Share API

Create and retrieve shareable chat links.

#### `POST /api/share`

**Description**: Create a shareable link for a chat conversation.

**Request**:
```http
POST /api/share HTTP/1.1
Content-Type: application/json

{
  "chat": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "My Chat",
    "messages": [
      {
        "role": "user",
        "content": "Hello",
        "timestamp": "2025-01-19T10:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Hi! How can I help?",
        "timestamp": "2025-01-19T10:00:01.000Z"
      }
    ]
  }
}
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chat` | object | Yes | Chat object to share |
| `chat.id` | string | Yes | Chat UUID |
| `chat.title` | string | No | Chat title |
| `chat.messages` | array | Yes | Array of messages |

**Response** (200 OK):
```json
{
  "shareId": "abc123de-f456-7890-g123-h456i789j012",
  "shareUrl": "http://localhost:3000/share/abc123de-f456-7890-g123-h456i789j012",
  "success": true
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Invalid chat data"
}
```

**Response** (500 Internal Server Error):
```json
{
  "error": "Failed to create share link"
}
```

**Example** (cURL):
```bash
curl -X POST http://localhost:3000/api/share \
  -H "Content-Type: application/json" \
  -d '{
    "chat": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "My Chat",
      "messages": [
        {"role": "user", "content": "Hello"}
      ]
    }
  }'
```

#### `GET /api/share?shareId={id}`

**Description**: Retrieve a shared chat by its share ID.

**Request**:
```http
GET /api/share?shareId=abc123de-f456-7890-g123-h456i789j012 HTTP/1.1
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shareId` | string | Yes | Share ID from POST /api/share |

**Response** (200 OK):
```json
{
  "shareId": "abc123de-f456-7890-g123-h456i789j012",
  "originalChatId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "My Chat",
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": "2025-01-19T10:00:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help?",
      "timestamp": "2025-01-19T10:00:01.000Z"
    }
  ],
  "createdAt": "2025-01-19T10:00:00.000Z",
  "sharedAt": "2025-01-19T10:05:00.000Z"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Share ID is required"
}
```

**Response** (404 Not Found):
```json
{
  "error": "Shared chat not found"
}
```

**Response** (500 Internal Server Error):
```json
{
  "error": "Failed to fetch shared chat"
}
```

**Example** (cURL):
```bash
curl http://localhost:3000/api/share?shareId=abc123de-f456-7890-g123-h456i789j012
```

**Example** (JavaScript):
```javascript
const shareId = 'abc123de-f456-7890-g123-h456i789j012';
const response = await fetch(`http://localhost:3000/api/share?shareId=${shareId}`);
const sharedChat = await response.json();

if (response.ok) {
  console.log('Shared chat:', sharedChat);
} else {
  console.error('Error:', sharedChat.error);
}
```

---

### Rate Limit Demo

Demonstration endpoint showing standard rate limit headers.

#### `GET /api/rate-limit-demo`

**Description**: Demonstrates rate limiting with standard HTTP headers.

**Request**:
```http
GET /api/rate-limit-demo HTTP/1.1
X-User-ID: user-123
```

**Request Headers** (Optional):
| Header | Description |
|--------|-------------|
| `X-User-ID` | User identifier for rate limiting (default: "demo-user") |

**Response** (200 OK):
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1705668000
X-RateLimit-Limit-Hour: 500
X-RateLimit-Remaining-Hour: 480
X-RateLimit-Reset-Hour: 1705670600
Content-Type: application/json

{
  "success": true,
  "message": "Request allowed",
  "rateLimit": {
    "remaining": {
      "minute": 55,
      "hour": 480
    },
    "limit": {
      "minute": 60,
      "hour": 500
    },
    "resetAt": {
      "minute": "2025-01-19T11:00:00.000Z",
      "hour": "2025-01-19T11:45:00.000Z"
    }
  }
}
```

**Response** (429 Too Many Requests):
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705668000
Retry-After: 30
Content-Type: application/json

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 30 seconds.",
  "limitType": "minute",
  "retryAfter": 30000
}
```

**Response Headers**:
| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per minute |
| `X-RateLimit-Remaining` | Requests remaining this minute |
| `X-RateLimit-Reset` | Unix timestamp when minute limit resets |
| `X-RateLimit-Limit-Hour` | Maximum requests per hour |
| `X-RateLimit-Remaining-Hour` | Requests remaining this hour |
| `X-RateLimit-Reset-Hour` | Unix timestamp when hour limit resets |
| `Retry-After` | Seconds to wait before retrying (only when rate limited) |

**Example** (cURL):
```bash
curl -v http://localhost:3000/api/rate-limit-demo \
  -H "X-User-ID: my-user-id"
```

**Example** (JavaScript):
```javascript
const response = await fetch('http://localhost:3000/api/rate-limit-demo', {
  headers: {
    'X-User-ID': 'my-user-id'
  }
});

// Check rate limit headers
const remaining = response.headers.get('X-RateLimit-Remaining');
const limit = response.headers.get('X-RateLimit-Limit');
const reset = response.headers.get('X-RateLimit-Reset');

console.log(`Rate limit: ${remaining}/${limit}`);
console.log(`Resets at: ${new Date(parseInt(reset) * 1000).toLocaleString()}`);

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry in ${retryAfter} seconds`);
} else {
  const data = await response.json();
  console.log('Success:', data);
}
```

#### `POST /api/rate-limit-demo`

Same as GET, for demonstration purposes.

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message here",
  "success": false
}
```

### HTTP Status Codes

| Code | Description | When It Occurs |
|------|-------------|----------------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Invalid request data |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | System is unhealthy |

### Common Errors

**Invalid Request**:
```json
{
  "error": "Invalid request payload",
  "success": false
}
```

**Not Found**:
```json
{
  "error": "Shared chat not found",
  "success": false
}
```

**Server Error**:
```json
{
  "error": "Failed to generate response",
  "success": false
}
```

**Rate Limited**:
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 30 seconds."
}
```

---

## Rate Limiting

### Default Limits

**HTTP API** (demo endpoint):
- **60 requests per minute** per user
- **500 requests per hour** per user

**WebSocket API**:
- **60 messages per minute** per user
- **500 messages per hour** per user

### Configuration

Rate limits can be configured via environment variables:

```bash
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=500
```

### Rate Limit Headers

All HTTP API responses include rate limit information in headers:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1705668000
X-RateLimit-Limit-Hour: 500
X-RateLimit-Remaining-Hour: 480
X-RateLimit-Reset-Hour: 1705670600
```

When rate limited (429 response):
```http
Retry-After: 30
```

### Handling Rate Limits

```javascript
async function makeRequest() {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello' })
  });

  // Check rate limit headers
  const remaining = response.headers.get('X-RateLimit-Remaining');

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Rate limited. Wait ${retryAfter}s before retrying`);

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeRequest();
  }

  // Warn if approaching limit
  if (parseInt(remaining) < 5) {
    console.warn('Approaching rate limit');
  }

  return response.json();
}
```

---

## Code Examples

### Health Check Monitoring

```javascript
// Check server health before making requests
async function ensureHealthy() {
  const response = await fetch('http://localhost:3000/healthz');
  const health = await response.json();

  if (health.status === 'unhealthy') {
    throw new Error('Server is unhealthy');
  }

  // Check specific systems
  if (health.checks.database.status === 'fail') {
    throw new Error('Database is unavailable');
  }

  return health;
}

// Use in your app
try {
  await ensureHealthy();
  // Proceed with requests
} catch (error) {
  console.error('Server health check failed:', error);
  showMaintenanceMessage();
}
```

### Chat with History

```javascript
// Maintain conversation history
const chatHistory = [];

async function sendMessage(message) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      chatHistory
    })
  });

  const data = await response.json();

  if (data.success) {
    // Add to history
    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'assistant', content: data.response });

    return data.response;
  } else {
    throw new Error(data.error);
  }
}

// Usage
await sendMessage('Hello');
await sendMessage('What is 2+2?'); // Has context from previous message
```

### Share Chat

```javascript
async function shareChat(chat) {
  // Create share link
  const response = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat })
  });

  const data = await response.json();

  if (data.success) {
    // Copy to clipboard
    await navigator.clipboard.writeText(data.shareUrl);
    console.log('Share link copied:', data.shareUrl);

    return data.shareUrl;
  } else {
    throw new Error(data.error);
  }
}

// Retrieve shared chat
async function getSharedChat(shareId) {
  const response = await fetch(`/api/share?shareId=${shareId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}
```

---

## Related Documentation

- [WebSocket API Documentation](WEBSOCKET_API.md) - Real-time chat API
- [Database Schema](DATABASE_SCHEMA.md) - Database structure
- [Architecture Overview](ARCHITECTURE.md) - System design
- [Security Architecture](SECURITY.md) - Security details
