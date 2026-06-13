const { GoogleGenerativeAI } = require('@google/generative-ai');
const lancedb = require('@lancedb/lancedb');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { extractKeywords, reciprocalRankFusion } = require('./lib/websocket/services/HybridSearch');

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

// Backslash used as the LIKE ESCAPE character below.
const LIKE_ESCAPE_CHAR = '\\';

/**
 * Escape a term for safe use inside a single-quoted SQL `LIKE '%...%'` literal.
 *
 * Two layers of escaping are needed:
 *   1. SQL string-literal escaping (single quotes) via escapeFilterValue.
 *   2. LIKE-pattern escaping so a user-supplied term cannot inject the wildcard
 *      metacharacters `%` and `_` (which would broaden the match) or the escape
 *      character itself. We prefix each of `\`, `%`, `_` with a backslash and
 *      pair this with an explicit `ESCAPE '\'` clause on the query.
 *
 * Order matters: escape the backslash FIRST, then the wildcards, so we don't
 * double-escape the backslashes we just added.
 *
 * @param {string} term - Raw keyword term (already lowercased by the caller)
 * @returns {string} Escaped inner pattern (without the surrounding %), ready to
 *                   embed between `%` wildcards inside a single-quoted literal
 */
function escapeLikeTerm(term) {
  const wildcardEscaped = String(term)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
  // Then escape single quotes for the SQL string literal.
  return escapeFilterValue(wildcardEscaped);
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
 * Build the shared user/excludeChatId WHERE clause used by both the vector and
 * keyword searches so they query the exact same candidate pool.
 * @param {string} userId
 * @param {string|null} excludeChatId
 * @returns {string} SQL WHERE clause
 * @private
 */
function buildScopeFilter(userId, excludeChatId) {
  let whereClause = `user_id = '${escapeFilterValue(userId)}'`;
  if (excludeChatId) {
    whereClause += ` AND chat_id != '${escapeFilterValue(excludeChatId)}'`;
  }
  return whereClause;
}

/**
 * Run a lexical keyword search over the same scoped candidate pool.
 *
 * Builds a `LOWER(content) LIKE '%term%'` clause for each keyword (LanceDB LIKE
 * is case-sensitive, so we lower-case both the column and the terms), OR'd
 * together and AND'd with the scope filter. Each term is escaped for both the
 * SQL literal and the LIKE wildcards (see escapeLikeTerm) with an explicit
 * ESCAPE clause so user terms cannot inject `%`/`_` wildcards.
 *
 * The fetched rows are then scored in JS by the count of DISTINCT query terms
 * they contain (case-insensitively), ranked by that count descending, and each
 * is tagged with `_keywordScore` = that integer count. Rows have NO meaningful
 * vector distance, so `_distance` is left as whatever the row carried (the
 * caller nulls it for keyword-only hits during fusion).
 *
 * Never throws — a keyword-search failure must never break overall search.
 *
 * @param {string[]} keywords - Lowercased significant terms
 * @param {string} scopeFilter - Shared user/excludeChatId WHERE clause
 * @param {number} limit - Max rows to fetch
 * @returns {Promise<Array>} Keyword-ranked rows (best-first), or [] on failure
 * @private
 */
async function keywordSearch(keywords, scopeFilter, limit) {
  try {
    const likeClauses = keywords
      .map((term) => `LOWER(content) LIKE '%${escapeLikeTerm(term)}%' ESCAPE '${LIKE_ESCAPE_CHAR}'`)
      .join(' OR ');

    const whereClause = `(${scopeFilter}) AND (${likeClauses})`;

    const rows = await table
      .query()
      .where(whereClause)
      .limit(limit)
      .toArray();

    // Score each row by how many DISTINCT query terms it contains.
    for (const row of rows) {
      const lowerContent = String(row.content || '').toLowerCase();
      let count = 0;
      for (const term of keywords) {
        if (lowerContent.includes(term)) count++;
      }
      row._keywordScore = count;
    }

    // Keep only real matches and rank by distinct-term count descending.
    return rows
      .filter((row) => row._keywordScore >= 1)
      .sort((a, b) => b._keywordScore - a._keywordScore);
  } catch (error) {
    // A keyword-search failure must never break overall search.
    console.error('Keyword search failed (falling back to vector-only):', error);
    return [];
  }
}

/**
 * Search for relevant messages in the user's OTHER chats using HYBRID search:
 * a vector (semantic) search fused with a lexical keyword search via Reciprocal
 * Rank Fusion (RRF). Pure vector search misses exact-term / proper-noun / rare
 * token matches; the keyword layer recovers those.
 *
 * Output contract (ChatRetriever + rerank depend on these exact fields):
 *  - Returns an array of rows ordered by fused rank (best first), length <= topK.
 *  - Rows present in the vector candidate set KEEP their real numeric `_distance`.
 *  - Rows that matched ONLY via keyword have `_distance = null` and `_keywordScore >= 1`.
 *  - EVERY row additionally carries `_rrf` (number) and `_keywordScore` (integer,
 *    0 if it wasn't a keyword match) and retains all original columns.
 *
 * Graceful degradation: if there are no significant keywords (or the keyword
 * query errors), falls back to pure vector results — still attaching `_rrf`
 * (from the single list) and `_keywordScore = 0`.
 *
 * @param {string} userId - User ID to search within
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return (default: 5)
 * @param {Object} options - Optional search options
 * @param {string|null} options.apiKey - Visitor-provided API key for the query embedding (BYOK)
 * @param {string|null} options.excludeChatId - Exclude results from this chat (cross-chat retrieval)
 * @returns {Promise<Array>} - Fused search results (best-first), each row carrying `_rrf` + `_keywordScore`
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

    const scopeFilter = buildScopeFilter(userId, excludeChatId);

    // Fetch a larger candidate set than topK so fusion has room to re-rank.
    const candidateLimit = Math.max(topK * 3, 15);

    // --- Vector-ranked list (rows have real `_distance`) ---
    const vectorRanked = await table
      .search(queryEmbedding)
      .where(scopeFilter)
      .limit(candidateLimit)
      .toArray();

    // --- Keyword-ranked list ---
    const keywords = extractKeywords(query);
    let keywordRanked = [];
    if (keywords.length > 0) {
      keywordRanked = await keywordSearch(keywords, scopeFilter, candidateLimit);
    }

    // Graceful degradation: no keywords → pure vector results, but still honor
    // the output contract (`_rrf` from the single list, `_keywordScore = 0`).
    if (keywordRanked.length === 0) {
      const fused = reciprocalRankFusion(vectorRanked, []);
      for (const row of fused) {
        if (typeof row._keywordScore !== 'number') row._keywordScore = 0;
      }
      const results = fused.slice(0, topK);
      console.log(`Found ${results.length} messages (vector-only) for query: ${query.substring(0, 50)}...`);
      return results;
    }

    // Mark which message_ids came from the vector candidate set so we can null
    // `_distance` on keyword-only hits (they have no meaningful vector distance).
    const vectorIds = new Set(
      vectorRanked.map((row) => row.message_id).filter((id) => id != null)
    );
    for (const row of keywordRanked) {
      if (!vectorIds.has(row.message_id)) {
        row._distance = null;
      }
    }

    // Map message_id -> keyword score so we can stamp it onto the FINAL fused
    // rows. RRF prefers the vector list's row object as the base when a
    // message_id appears in both lists, and that object wouldn't otherwise carry
    // the keyword score computed on the keyword-list copy.
    const keywordScoreById = new Map();
    for (const row of keywordRanked) {
      keywordScoreById.set(row.message_id, row._keywordScore);
    }

    // --- Fuse the two ranked lists via RRF ---
    const fused = reciprocalRankFusion(vectorRanked, keywordRanked);

    // Ensure every row honors the output contract.
    for (const row of fused) {
      row._keywordScore = keywordScoreById.get(row.message_id) || 0;
    }

    const results = fused.slice(0, topK);
    console.log(
      `Found ${results.length} hybrid messages (vector=${vectorRanked.length}, keyword=${keywordRanked.length}) for query: ${query.substring(0, 50)}...`
    );
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
