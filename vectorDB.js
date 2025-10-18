const { GoogleGenerativeAI } = require('@google/generative-ai');
const lancedb = require('@lancedb/lancedb');
const path = require('path');
const fs = require('fs');

// Initialize Gemini AI for embeddings
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Database path
const DB_PATH = path.join(__dirname, 'data/lancedb');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

let db = null;
let table = null;

// Cache for embeddings to avoid redundant API calls
const embeddingCache = new Map();

/**
 * Generate embedding for a single text using Gemini's embedding model
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The embedding vector
 */
async function generateEmbedding(text) {
  try {
    // Check cache first
    const cacheKey = text.toLowerCase().trim();
    if (embeddingCache.has(cacheKey)) {
      console.log('Using cached embedding for:', text.substring(0, 50) + '...');
      return embeddingCache.get(cacheKey);
    }

    // Get the embedding model - use text-embedding-004 (768 dimensions)
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    // Generate embedding
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    
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
      // Generate a dummy embedding (768 dimensions for text-embedding-004)
      const dummyEmbedding = new Array(768).fill(0);

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
 * Add a message to the vector database
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @param {Object} message - Message object
 * @param {string} chatTitle - Chat title
 * @param {Object} metadata - Additional metadata
 */
async function addMessage(userId, chatId, message, chatTitle = '', metadata = {}) {
  try {
    if (!table) {
      const initSuccess = await initializeDB();
      if (!initSuccess) {
        console.error('Failed to initialize LanceDB');
        return false;
      }
    }

    console.log(`Adding message to vector DB: User ${userId}, Chat ${chatId}, Message: ${message.content?.substring(0, 50)}...`);
    
    // Generate embedding for the message content
    const embedding = await generateEmbedding(message.content);
    
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
 * @returns {Promise<Array>} - Array of search results
 */
async function searchChats(userId, query, topK = 5) {
  try {
    if (!table) {
      const initSuccess = await initializeDB();
      if (!initSuccess) {
        console.error('Failed to initialize LanceDB');
        return [];
      }
    }

    console.log(`Searching chat history for user ${userId} with query: ${query}`);
    
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for similar vectors within the user's chats
    const results = await table
      .search(queryEmbedding)
      .where(`user_id = '${userId}'`)
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
