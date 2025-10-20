# Database Schema Documentation

This document describes the database schema for both SQLite (relational data) and LanceDB (vector embeddings).

## Table of Contents
- [Overview](#overview)
- [SQLite Database](#sqlite-database)
  - [Users Table](#users-table)
  - [Chats Table](#chats-table)
  - [Messages Table](#messages-table)
  - [Attachments Table](#attachments-table)
  - [Indexes](#indexes)
  - [Relationships](#relationships)
- [LanceDB (Vector Database)](#lancedb-vector-database)
  - [Chat Embeddings](#chat-embeddings)
- [Backup and Restore](#backup-and-restore)

---

## Overview

The application uses a hybrid database architecture:

1. **SQLite** - Relational data (users, chats, messages, attachments)
2. **LanceDB** - Vector embeddings for semantic search

**Database Files**:
- `data/chat.db` - SQLite database
- `data/lancedb/` - LanceDB directory

---

## SQLite Database

### Users Table

Stores user information and preferences.

**Table Name**: `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | User UUID |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| `last_active` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last activity timestamp |
| `preferences` | TEXT | DEFAULT '{}' | JSON string of user preferences |

**Example Row**:
```json
{
  "id": "user-123e4567-e89b-12d3-a456-426614174000",
  "created_at": "2025-01-19 10:00:00",
  "last_active": "2025-01-19 15:30:00",
  "preferences": "{\"theme\":\"dark\",\"language\":\"en\"}"
}
```

**Operations**:
```typescript
// Create user
userOps.create(userId);

// Update last active
userOps.updateLastActive(userId);

// Get user
userOps.get(userId);

// Update preferences
userOps.updatePreferences(userId, { theme: 'dark' });
```

---

### Chats Table

Stores chat conversations.

**Table Name**: `chats`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Chat UUID |
| `user_id` | TEXT | NOT NULL, FOREIGN KEY | Owner user ID |
| `title` | TEXT | NOT NULL | Chat title (e.g., "Python Discussion") |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Chat creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last message timestamp |
| `is_active` | BOOLEAN | DEFAULT 0 | Whether chat is currently active (0 or 1) |

**Foreign Keys**:
- `user_id` REFERENCES `users(id)` ON DELETE CASCADE

**Example Row**:
```json
{
  "id": "chat-123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-123e4567-e89b-12d3-a456-426614174000",
  "title": "Python Discussion",
  "created_at": "2025-01-19 10:00:00",
  "updated_at": "2025-01-19 15:30:00",
  "is_active": 1
}
```

**Operations**:
```typescript
// Create chat
chatOps.create(chatId, userId, title);

// Get user's chats (ordered by updated_at DESC)
chatOps.getByUser(userId);

// Get specific chat
chatOps.getById(chatId);

// Update chat
chatOps.update(chatId, { title: 'New Title' });

// Delete chat (cascade deletes messages and attachments)
chatOps.delete(chatId);

// Set active chat
chatOps.setActive(chatId, userId);

// Get active chat
chatOps.getActive(userId);
```

---

### Messages Table

Stores individual messages in chats.

**Table Name**: `messages`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Message UUID |
| `chat_id` | TEXT | NOT NULL, FOREIGN KEY | Parent chat ID |
| `user_id` | TEXT | NOT NULL, FOREIGN KEY | Message owner ID |
| `content` | TEXT | NOT NULL | Message text content |
| `role` | TEXT | NOT NULL, CHECK | Either 'user' or 'assistant' |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Message timestamp |
| `attachments` | TEXT | DEFAULT '[]' | JSON array of attachment references |
| `metadata` | TEXT | DEFAULT '{}' | JSON object for additional data |

**Foreign Keys**:
- `chat_id` REFERENCES `chats(id)` ON DELETE CASCADE
- `user_id` REFERENCES `users(id)` ON DELETE CASCADE

**Constraints**:
- `role` must be IN ('user', 'assistant')

**Example Row**:
```json
{
  "id": "msg-123e4567-e89b-12d3-a456-426614174000",
  "chat_id": "chat-123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-123e4567-e89b-12d3-a456-426614174000",
  "content": "What is Python?",
  "role": "user",
  "timestamp": "2025-01-19 10:00:00",
  "attachments": "[{\"id\":\"att-123\",\"type\":\"image/jpeg\"}]",
  "metadata": "{\"model\":\"gemini-2.5-flash\",\"temperature\":0.7}"
}
```

**Operations**:
```typescript
// Create message
messageOps.create(messageId, chatId, userId, content, role, attachments, metadata);

// Get messages for chat
messageOps.getByChatId(chatId);

// Get single message
messageOps.getById(messageId);

// Get messages by user
messageOps.getByUserId(userId);

// Delete message
messageOps.delete(messageId);
```

---

### Attachments Table

Stores file attachments for messages.

**Table Name**: `attachments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Attachment UUID |
| `message_id` | TEXT | NOT NULL, FOREIGN KEY | Parent message ID |
| `name` | TEXT | NOT NULL | File name |
| `type` | TEXT | NOT NULL | MIME type (e.g., 'image/jpeg') |
| `size` | INTEGER | | File size in bytes |
| `url` | TEXT | | External URL (if applicable) |
| `data` | TEXT | | Base64 encoded data (for small files) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Upload timestamp |

**Foreign Keys**:
- `message_id` REFERENCES `messages(id)` ON DELETE CASCADE

**Example Row**:
```json
{
  "id": "att-123e4567-e89b-12d3-a456-426614174000",
  "message_id": "msg-123e4567-e89b-12d3-a456-426614174000",
  "name": "screenshot.png",
  "type": "image/png",
  "size": 524288,
  "url": null,
  "data": "iVBORw0KGgoAAAANSUhEUgA...",
  "created_at": "2025-01-19 10:00:00"
}
```

**Operations**:
```typescript
// Create attachment
attachmentOps.create(attachmentId, messageId, name, type, size, url, data);

// Get attachments for message
attachmentOps.getByMessageId(messageId);

// Get single attachment
attachmentOps.getById(attachmentId);

// Delete attachment
attachmentOps.delete(attachmentId);
```

---

### Indexes

Performance indexes for faster queries:

```sql
-- Chats by user (for sidebar chat list)
CREATE INDEX idx_chats_user_id ON chats (user_id);

// Messages by chat (for message history)
CREATE INDEX idx_messages_chat_id ON messages (chat_id);

-- Messages by user (for user analytics)
CREATE INDEX idx_messages_user_id ON messages (user_id);

-- Messages by timestamp (for chronological sorting)
CREATE INDEX idx_messages_timestamp ON messages (timestamp);

-- Attachments by message (for loading message attachments)
CREATE INDEX idx_attachments_message_id ON attachments (message_id);
```

**Query Performance**:
- Chat list for user: O(log n) via `idx_chats_user_id`
- Message history: O(log n) via `idx_messages_chat_id`
- Chronological sort: O(log n) via `idx_messages_timestamp`

---

### Relationships

```
users (1) ─────┬───── (n) chats
               │
               └───── (n) messages


chats (1) ───── (n) messages


messages (1) ───── (n) attachments
```

**Cascade Deletions**:
1. Delete user → deletes all their chats and messages
2. Delete chat → deletes all messages in that chat
3. Delete message → deletes all attachments for that message

**Example**:
```sql
-- Deleting a user cascades to everything
DELETE FROM users WHERE id = 'user-123';
-- Also deletes:
--   - All chats owned by user-123
--   - All messages in those chats
--   - All attachments in those messages
```

---

## LanceDB (Vector Database)

LanceDB stores vector embeddings for semantic search functionality.

### Chat Embeddings

**Table Name**: `chat_embeddings`

**Schema**:
```typescript
{
  id: string;              // Message ID (matches messages.id)
  chat_id: string;         // Chat ID (matches chats.id)
  user_id: string;         // User ID (matches users.id)
  content: string;         // Original message text
  embedding: number[];     // 768-dimensional vector from Gemini embeddings
  role: string;            // 'user' or 'assistant'
  timestamp: number;       // Unix timestamp
  metadata: object;        // Additional metadata
}
```

**Vector Dimensions**: 768 (Gemini embedding model: `text-embedding-004`)

**Example Entry**:
```json
{
  "id": "msg-123e4567-e89b-12d3-a456-426614174000",
  "chat_id": "chat-123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-123e4567-e89b-12d3-a456-426614174000",
  "content": "What is Python?",
  "embedding": [0.023, -0.145, 0.334, ...], // 768 dimensions
  "role": "user",
  "timestamp": 1705668000000,
  "metadata": {
    "model": "gemini-2.5-flash",
    "language": "en"
  }
}
```

**Operations**:
```typescript
// Save embedding
await saveEmbedding(chatId, userId, messageId, content, role, embedding);

// Semantic search (finds similar messages)
const results = await searchChats(userId, queryText, topK = 5);
// Returns: Array<{ id, content, similarity, metadata }>

// Search within specific chat
const results = await searchChatHistory(chatId, userId, queryText, topK = 5);

// Delete chat embeddings
await deleteChatEmbeddings(chatId, userId);

// Delete all user embeddings
await deleteUserEmbeddings(userId);
```

**Index Type**: IVF (Inverted File Index) for efficient approximate nearest neighbor search

**Distance Metric**: Cosine similarity

**Performance**:
- Search time: ~20-100ms for 10K embeddings
- Insertion time: ~5-10ms per embedding
- Storage: ~3KB per embedding (768 * 4 bytes)

---

## Backup and Restore

### Automated Backups

Use the provided backup script:

```bash
# Backup both databases
./scripts/backup-databases.sh

# Backups saved to: ./backups/
# - chat_YYYYMMDD_HHMMSS.db.gz (SQLite)
# - lancedb_YYYYMMDD_HHMMSS.tar.gz (LanceDB)
```

**Backup Schedule** (via cron):
```bash
# Daily at 2 AM
0 2 * * * /path/to/backup-databases.sh >> /var/log/backup.log 2>&1
```

### Restore from Backup

```bash
# Restore from specific timestamp
./scripts/restore-databases.sh 20250119_140530

# Creates safety backup before restoring
# Validates database integrity after restore
```

### Manual Backup

**SQLite**:
```bash
# Backup
sqlite3 data/chat.db ".backup data/chat.backup.db"

# Restore
cp data/chat.backup.db data/chat.db
```

**LanceDB**:
```bash
# Backup
tar -czf lancedb.backup.tar.gz data/lancedb/

# Restore
tar -xzf lancedb.backup.tar.gz -C data/
```

---

## Database Migrations

### Current Version: v1.0

No migrations required yet. Future schema changes will be documented here.

### Adding a New Table

1. Update `src/lib/database.ts` - add table in `createTables()`
2. Add indexes if needed
3. Create migration script (if needed for existing data)
4. Update this documentation
5. Increment version number

### Example Migration

```typescript
// Migration v1.1: Add 'favorite' field to chats
function migrateV1_1() {
  db.exec('ALTER TABLE chats ADD COLUMN favorite BOOLEAN DEFAULT 0');
  db.exec('CREATE INDEX idx_chats_favorite ON chats (favorite)');
}
```

---

## Database Maintenance

### VACUUM (SQLite)

Reclaim unused space and defragment:

```sql
VACUUM;
```

Run periodically (monthly) or after large deletions.

### ANALYZE (SQLite)

Update query planner statistics:

```sql
ANALYZE;
```

Run after bulk inserts or schema changes.

### LanceDB Optimization

```typescript
// Compact vector database
await db.optimize();
```

Run after large batch operations.

---

## Query Examples

### Get User's Recent Chats

```sql
SELECT
  c.id,
  c.title,
  c.updated_at,
  COUNT(m.id) as message_count,
  MAX(m.timestamp) as last_message_at
FROM chats c
LEFT JOIN messages m ON c.id = m.chat_id
WHERE c.user_id = ?
GROUP BY c.id
ORDER BY c.updated_at DESC
LIMIT 20;
```

### Get Full Chat History

```sql
SELECT
  m.id,
  m.content,
  m.role,
  m.timestamp,
  m.attachments,
  m.metadata
FROM messages m
WHERE m.chat_id = ?
ORDER BY m.timestamp ASC;
```

### Search Messages by Content

```sql
SELECT
  m.id,
  m.chat_id,
  c.title as chat_title,
  m.content,
  m.timestamp
FROM messages m
JOIN chats c ON m.chat_id = c.id
WHERE m.user_id = ?
  AND m.content LIKE ?
ORDER BY m.timestamp DESC
LIMIT 50;
```

### Get Message with Attachments

```sql
SELECT
  m.*,
  a.id as attachment_id,
  a.name as attachment_name,
  a.type as attachment_type,
  a.size as attachment_size
FROM messages m
LEFT JOIN attachments a ON m.id = a.message_id
WHERE m.id = ?;
```

### User Statistics

```sql
SELECT
  u.id,
  u.created_at,
  u.last_active,
  COUNT(DISTINCT c.id) as total_chats,
  COUNT(m.id) as total_messages,
  COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages,
  COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as ai_responses
FROM users u
LEFT JOIN chats c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.chat_id
WHERE u.id = ?
GROUP BY u.id;
```

---

## Security Considerations

### SQL Injection Prevention

All queries use parameterized statements:

```typescript
// ✅ Safe
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
stmt.get(userId);

// ❌ Unsafe (never do this)
db.prepare(`SELECT * FROM users WHERE id = '${userId}'`);
```

See `src/lib/utils/sqlSanitizer.ts` for additional sanitization utilities.

### Data Privacy

**User Data**:
- API keys are NEVER stored in the database (BYOK mode)
- User preferences are JSON strings (can store encrypted data)
- Message content is stored in plain text (consider encryption for sensitive apps)

**Backup Security**:
- Backups contain sensitive data - store securely
- Use encryption for backup files in production
- Restrict backup directory permissions (chmod 700)

---

## Performance Tuning

### WAL Mode (Write-Ahead Logging)

Enabled by default for better concurrency:

```sql
PRAGMA journal_mode = WAL;
```

**Benefits**:
- Readers don't block writers
- Writers don't block readers
- Better performance for concurrent access

### Connection Pooling

Currently uses single connection. For production with high concurrency, consider connection pooling (see IMPLEMENTATION_PLAN.md Phase 4).

### Cache Size

```sql
-- Increase cache size for better performance
PRAGMA cache_size = 10000; -- 10,000 pages (~40MB)
```

---

## Related Documentation

- [WebSocket API Documentation](WEBSOCKET_API.md)
- [HTTP API Documentation](HTTP_API.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Security Architecture](SECURITY.md)
