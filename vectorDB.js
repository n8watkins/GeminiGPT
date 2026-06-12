const { GoogleGenerativeAI } = require('@google/generative-ai');
const lancedb = require('@lancedb/lancedb');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Initialize Gemini AI for embeddings. The server key is optional (BYOK):
// without it, embedding-based features (cross-chat semantic search) only work
// for visitors who bring their own key (passed per-call as `apiKey`).
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;
if (!genAI) {
  console.warn('⚠️ GEMINI_API_KEY not set — server-key embeddings disabled; semantic search works only for BYOK users');
}

// Embedding model configuration.
// text-embedding-004 was retired by Google (404 as of mid-2026); its successor
// gemini-embedding-001 defaults to 3072 dims but supports Matryoshka truncation
// via outputDimensionality. We keep 768 to match the existing table schema.
// NOTE: at non-3072 dims the API returns UN-normalized vectors, so we
// L2-normalize them ourselves — this keeps LanceDB's squared-L2 `_distance`
// equal to 2 * (1 - cosineSimilarity), which the retrieval threshold relies on.
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;

// Database path. Defaults to the project's data/ dir; override with LANCEDB_PATH
// to point at a persistent volume in production (mirrors DATABASE_PATH for SQLite).
const DB_PATH = process.env.LANCEDB_PATH || path.join(__dirname, 'data/lancedb');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

let db = null;
let table = null;

/**
 * LRU Cache implementation to prevent unbounded memory growth
 */
class LRUCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    // Remove if already exists (to re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Check size limit and remove oldest (first) entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      console.log(`🧹 LRU Cache: Evicted oldest entry. Cache size: ${this.cache.size}/${this.maxSize}`);
    }

    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  get size() {
    return this.cache.size;
  }
}

// Cache for embeddings to avoid redundant API calls (max 1000 entries)
// Embeddings are key-independent (same model → same vector), so the cache is
// shared across server-key and BYOK requests.
const embeddingCache = new LRUCache(1000);

// Bounded cache of GoogleGenerativeAI clients for BYOK embedding keys,
// keyed by a SHA-256 fingerprint of the key (never the key itself).
const byokClientCache = new LRUCache(50);

/**
 * Resolve the GoogleGenerativeAI client to use for embeddings.
 * Prefers the visitor's own key (BYOK); falls back to the server key.
 *
 * @param {string|null} apiKey - Optional visitor-provided Gemini API key
 * @returns {Object|null} GoogleGenerativeAI instance, or null if no key available
 */
function getEmbeddingClient(apiKey) {
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    const fingerprint = crypto.createHash('sha256').update(apiKey.trim()).digest('hex').substring(0, 16);
    let client = byokClientCache.get(fingerprint);
    if (!client) {
      client = new GoogleGenerativeAI(apiKey.trim());
      byokClientCache.set(fingerprint, client);
    }
    return client;
  }
  return genAI;
}

/**
 * L2-normalize a vector to unit length (no-op for zero vectors)
 * @param {number[]} values - Raw embedding values
 * @returns {number[]} Unit-length vector
 */
function normalizeVector(values) {
  let sumSquares = 0;
  for (const v of values) sumSquares += v * v;
  const norm = Math.sqrt(sumSquares);
  if (norm === 0) return values;
  return values.map((v) => v / norm);
}

/**
 * Generate embedding for a single text using Gemini's embedding model
 * @param {string} text - The text to embed
 * @param {string|null} apiKey - Optional visitor-provided API key (BYOK);
 *                               falls back to the server key when omitted
 * @returns {Promise<number[]>} - The unit-normalized embedding vector
 */
async function generateEmbedding(text, apiKey = null) {
  const client = getEmbeddingClient(apiKey);
  if (!client) {
    throw new Error('Embeddings unavailable: no server GEMINI_API_KEY configured and no client key provided');
  }
  try {
    // Check cache first
    const cacheKey = text.toLowerCase().trim();
    if (embeddingCache.has(cacheKey)) {
      console.log('Using cached embedding for:', text.substring(0, 50) + '...');
      return embeddingCache.get(cacheKey);
    }

    // Get the embedding model (see EMBEDDING_MODEL note above)
    const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });

    // Generate embedding. The SDK passes extra request fields straight through
    // to the REST body, so outputDimensionality works even though the typings
    // don't declare it.
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS
    });
    const embedding = normalizeVector(result.embedding.values);

    // Cache the result
    embeddingCache.set(cacheKey, embedding);
    
    console.log('Generated embedding for:', text.substring(0, 50) + '...');
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initialize the LanceDB database and create the chat embeddings table
 */
async function initializeDB() {
  try {
    console.log('Initializing LanceDB...');
    
    // Connect to LanceDB
    db = await lancedb.connect(DB_PATH);
    
    // Check if table already exists
    const tableNames = await db.tableNames();
    
    if (tableNames.includes('chat_embeddings')) {
      console.log('✅ LanceDB table already exists');
      table = await db.openTable('chat_embeddings');
    } else {
      console.log('Creating new LanceDB table...');

      // Create table with a sample record to define the schema
      const dummyEmbedding = new Array(EMBEDDING_DIMENSIONS).fill(0);

      const initialData = [{
        chat_id: '_init',
        user_id: '_init',
        message_id: '_init',
        content: 'Initialization record',
        role: 'system',
        timestamp: Date.now(),
        vector: dummyEmbedding,
        chat_title: 'Init',
        metadata: '{}'
      }];

      table = await db.createTable('chat_embeddings', initialData);

      // Delete the initialization record
      await table.delete("message_id = '_init'");

      console.log('✅ LanceDB table created successfully');
    }
  } catch (error) {
    console.error('Error initializing LanceDB:', error);
    // Don't throw - return false to indicate failure
    return false;
  }
  return true;
}

/**
 * Escape a value for use inside a single-quoted LanceDB SQL filter literal
 * @param {string} value - Raw value
 * @returns {string} Escaped value
 */
function escapeFilterValue(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * Add a message to the vector database
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @param {Object} message - Message object
 * @param {string} chatTitle - Chat title
 * @param {Object} metadata - Additional metadata
 * @param {string|null} apiKey - Optional visitor-provided API key for embedding (BYOK)
 */
async function addMessage(userId, chatId, message, chatTitle = '', metadata = {}, apiKey = null) {
  try {
    if (!table) {
      const initSuccess = await initializeDB();
      if (!initSuccess) {
        console.error('Failed to initialize LanceDB');
        return false;
      }
    }

    console.log(`Adding message to vector DB: User ${userId}, Chat ${chatId}, Message: ${message.content?.substring(0, 50)}...`);
    
    // Generate embedding for the message content (visitor key first, server fallback)
    const embedding = await generateEmbedding(message.content, apiKey);
    
    // Create message record
    const messageRecord = {
      chat_id: chatId,
      user_id: userId,
      message_id: message.id || `msg-${Date.now()}`,
      content: message.content,
      role: message.role,
      timestamp: message.timestamp ? new Date(message.timestamp).getTime() : Date.now(),
      vector: embedding,
      chat_title: chatTitle,
      metadata: JSON.stringify(metadata)
    };
    
    // Add to LanceDB table
    await table.add([messageRecord]);
    
    console.log(`✅ Message indexed successfully: ${messageRecord.message_id}`);
    return true;
  } catch (error) {
    console.error('Error adding message to vector DB:', error);
    // Don't throw - we don't want to break the chat flow
    return false;
  }
}

/**
 * Search for similar messages in user's chat history
 * @param {string} userId - User ID to search within
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return (default: 5)
 * @param {Object} options - Optional search options
 * @param {string|null} options.apiKey - Visitor-provided API key for the query embedding (BYOK)
 * @param {string|null} options.excludeChatId - Exclude results from this chat (cross-chat retrieval)
 * @returns {Promise<Array>} - Array of search results (each row includes LanceDB's `_distance`)
 */
async function searchChats(userId, query, topK = 5, options = {}) {
  const { apiKey = null, excludeChatId = null } = options;
  try {
    if (!table) {
      const initSuccess = await initializeDB();
      if (!initSuccess) {
        console.error('Failed to initialize LanceDB');
        return [];
      }
    }

    console.log(`Searching chat history for user ${userId} with query: ${query}`);

    // Generate embedding for the search query (visitor key first, server fallback)
    const queryEmbedding = await generateEmbedding(query, apiKey);

    // Search for similar vectors within the user's chats
    let whereClause = `user_id = '${escapeFilterValue(userId)}'`;
    if (excludeChatId) {
      whereClause += ` AND chat_id != '${escapeFilterValue(excludeChatId)}'`;
    }

    const results = await table
      .search(queryEmbedding)
      .where(whereClause)
      .limit(topK)
      .toArray();

    console.log(`Found ${results.length} similar messages for query: ${query.substring(0, 50)}...`);
    return results;
  } catch (error) {
    console.error('Error searching chat history:', error);
    return [];
  }
}

/**
 * Delete a specific chat for a user
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID to delete
 */
async function deleteChat(userId, chatId) {
  try {
    if (!table) {
      const initSuccess = await initializeDB();
      if (!initSuccess) {
        console.error('Failed to initialize LanceDB');
        return false;
      }
    }

    console.log(`Deleting chat ${chatId} for user ${userId}`);
    
    // Delete all messages for this chat
    await table.delete(`user_id = '${userId}' AND chat_id = '${chatId}'`);
    
    console.log(`✅ Deleted chat ${chatId} for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
}

/**
 * Delete all chats for a user (reset vector database)
 * @param {string} userId - User ID
 */
async function deleteUserChats(userId) {
  try {
    if (!table) {
      const initSuccess = await initializeDB();
      if (!initSuccess) {
        console.error('Failed to initialize LanceDB');
        return false;
      }
    }

    console.log(`Deleting all chats for user ${userId}`);
    
    // Delete all messages for this user
    await table.delete(`user_id = '${userId}'`);
    
    console.log(`✅ Deleted all chats for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error deleting user chats:', error);
    return false;
  }
}

module.exports = {
  addMessage,
  searchChats,
  deleteChat,
  deleteUserChats,
  generateEmbedding
};
