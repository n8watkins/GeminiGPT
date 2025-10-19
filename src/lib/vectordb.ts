/* eslint-disable @typescript-eslint/no-explicit-any */
import lancedb from '@lancedb/lancedb';
import path from 'path';
import fs from 'fs';
import { generateEmbedding } from './embeddingService';
import {
  safeSqlWhere,
  validateUUID,
  validateUUIDs,
  safeLimitClause,
} from './utils/sqlSanitizer';
import { logger } from './logger';

// Database path
const DB_PATH = path.join(__dirname, '../../data/lancedb');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

let db: any = null;
let table: any = null;

/**
 * Initialize the LanceDB database and create the chat embeddings table
 */
async function initializeDB() {
  try {
    logger.info('Initializing LanceDB...');

    // Connect to LanceDB
    db = await lancedb.connect(DB_PATH);

    // Check if table already exists
    const tableNames = await db.tableNames();

    if (tableNames.includes('chat_embeddings')) {
      logger.info('Loading existing chat_embeddings table...');
      table = await db.openTable('chat_embeddings');
    } else {
      logger.info('Creating new chat_embeddings table...');

      // Create table with sample data to establish schema
      const sampleData = [
        {
          chat_id: 'sample',
          user_id: 'sample',
          message_id: 'sample',
          content: 'sample',
          role: 'user',
          timestamp: Date.now(),
          vector: new Array(768).fill(0), // text-embedding-004 uses 768 dimensions
          chat_title: 'sample',
          metadata: '{}',
        },
      ];

      table = await db.createTable('chat_embeddings', sampleData);

      // Remove the sample data
      await table.delete('message_id = "sample"');
    }

    logger.info('LanceDB initialized successfully');
    return true;
  } catch (error) {
    logger.error('Error initializing LanceDB:', error);
    throw error;
  }
}

/**
 * Add a message to the vector database
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @param {Object} message - Message object with id, content, role, timestamp
 * @param {string} chatTitle - Title of the chat
 * @param {Object} metadata - Additional metadata (attachments, etc.)
 */
async function addMessage(
  userId: string,
  chatId: string,
  message: any,
  chatTitle = '',
  metadata: any = {}
) {
  try {
    if (!table) {
      await initializeDB();
    }

    // SECURITY: Validate UUIDs before using in database
    const validation = validateUUIDs({ userId, chatId, messageId: message.id });
    if (!validation.valid) {
      logger.error('Invalid UUID(s) in addMessage:', validation.invalid);
      return;
    }

    // Skip empty messages
    if (!message.content || message.content.trim().length === 0) {
      logger.debug('Skipping empty message');
      return;
    }

    // Generate embedding for the message content
    const embedding = await generateEmbedding(message.content);

    // Prepare data for insertion
    const data = {
      chat_id: chatId,
      user_id: userId,
      message_id: message.id,
      content: message.content,
      role: message.role,
      timestamp: message.timestamp.getTime(),
      vector: embedding,
      chat_title: chatTitle,
      metadata: JSON.stringify(metadata),
    };

    // Insert into table
    await table.add([data]);

    logger.info(
      `Added message to vector DB: ${message.role} - ${message.content.substring(0, 50)}...`
    );
  } catch (error) {
    logger.error('Error adding message to vector DB:', error);
    // Don't throw - we don't want to break the chat flow
  }
}

/**
 * Search for similar messages in user's chat history
 * @param {string} userId - User ID to search within
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return (default: 5)
 * @returns {Promise<Array>} - Array of search results
 */
async function searchChats(userId: string, query: string, topK = 5) {
  try {
    if (!table) {
      await initializeDB();
    }

    // SECURITY: Validate userId before using in query
    if (!validateUUID(userId)) {
      logger.error('Invalid userId format in searchChats:', userId);
      return [];
    }

    // SECURITY: Validate and sanitize limit
    const safeLimit = safeLimitClause(topK, 100); // Max 100 results

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      logger.error('Invalid query in searchChats');
      return [];
    }

    // Try vector search first
    try {
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);

      // FIXED: Use safe SQL builder instead of string interpolation
      const whereClause = safeSqlWhere({ user_id: userId });

      // Search for similar vectors within the user's chats
      const results = await table
        .search(queryEmbedding)
        .where(whereClause)
        .limit(safeLimit)
        .toArray();

      logger.info(
        `Found ${results.length} similar messages for query: ${query.substring(0, 50)}...`
      );
      return results;
    } catch (embeddingError) {
      logger.warn(
        'Vector search failed, falling back to text search:',
        embeddingError instanceof Error ? embeddingError.message : 'Unknown error'
      );

      // FIXED: Fallback to simple text-based search with LIMIT to prevent OOM
      const whereClause = safeSqlWhere({ user_id: userId });

      const allMessages = await table
        .where(whereClause)
        .limit(1000) // FIXED: Add limit to prevent loading all messages into memory
        .toArray();

      // Simple text matching
      const queryWords = query.toLowerCase().split(/\s+/);
      const scoredMessages = allMessages.map((msg: any) => {
        const content = msg.content.toLowerCase();
        let score = 0;

        // Count word matches
        queryWords.forEach((word) => {
          if (content.includes(word)) {
            score += 1;
          }
        });

        // Boost score for exact phrase matches
        if (content.includes(query.toLowerCase())) {
          score += 5;
        }

        return { ...msg, score };
      });

      // Sort by score and return top results
      const results = scoredMessages
        .filter((msg: any) => msg.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, safeLimit);

      logger.info(
        `Found ${results.length} text-matched messages for query: ${query.substring(0, 50)}...`
      );
      return results;
    }
  } catch (error) {
    logger.error('Error searching chat history:', error);
    return [];
  }
}

/**
 * Delete a specific chat for a user
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID to delete
 */
async function deleteChat(userId: string, chatId: string) {
  try {
    if (!table) {
      await initializeDB();
    }

    // SECURITY: Validate UUIDs before using in query
    const validation = validateUUIDs({ userId, chatId });
    if (!validation.valid) {
      throw new Error(`Invalid UUID(s): ${validation.invalid.join(', ')}`);
    }

    // FIXED: Use safe SQL builder instead of string interpolation
    const whereClause = safeSqlWhere({ user_id: userId, chat_id: chatId });

    // Delete all records for this specific chat
    await table.delete(whereClause);

    logger.info(`Deleted chat ${chatId} for user: ${userId}`);
  } catch (error) {
    logger.error('Error deleting chat:', error);
    throw error;
  }
}

/**
 * Delete all chats for a specific user
 * @param {string} userId - User ID
 */
async function deleteUserChats(userId: string) {
  try {
    if (!table) {
      await initializeDB();
    }

    // SECURITY: Validate userId before using in query
    if (!validateUUID(userId)) {
      throw new Error(`Invalid userId format: ${userId}`);
    }

    // FIXED: Use safe SQL builder instead of string interpolation
    const whereClause = safeSqlWhere({ user_id: userId });

    // Delete all records for this user
    await table.delete(whereClause);

    logger.info(`Deleted all chat history for user: ${userId}`);
  } catch (error) {
    logger.error('Error deleting user chats:', error);
    throw error;
  }
}

/**
 * Update embeddings for a specific chat (useful if chat is edited)
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @param {Array} messages - Array of message objects
 * @param {string} chatTitle - Title of the chat
 */
async function updateChatEmbeddings(
  userId: string,
  chatId: string,
  messages: any[],
  chatTitle = ''
) {
  try {
    if (!table) {
      await initializeDB();
    }

    // SECURITY: Validate UUIDs before using in query
    const validation = validateUUIDs({ userId, chatId });
    if (!validation.valid) {
      throw new Error(`Invalid UUID(s): ${validation.invalid.join(', ')}`);
    }

    // FIXED: Use safe SQL builder instead of string interpolation
    const whereClause = safeSqlWhere({ user_id: userId, chat_id: chatId });

    // First, delete existing embeddings for this chat
    await table.delete(whereClause);

    // Then add all messages back with new embeddings
    for (const message of messages) {
      await addMessage(userId, chatId, message, chatTitle);
    }

    logger.info(`Updated embeddings for chat: ${chatId}`);
  } catch (error) {
    logger.error('Error updating chat embeddings:', error);
    throw error;
  }
}

/**
 * Get database statistics
 * @returns {Promise<Object>} - Database stats
 */
async function getDBStats() {
  try {
    if (!table) {
      await initializeDB();
    }

    const count = await table.countRows();
    const tableNames = await db.tableNames();

    return {
      totalMessages: count,
      tables: tableNames,
      dbPath: DB_PATH,
    };
  } catch (error) {
    logger.error('Error getting DB stats:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Close the database connection
 */
async function closeDB() {
  try {
    if (db) {
      await db.close();
      logger.info('LanceDB connection closed');
    }
  } catch (error) {
    logger.error('Error closing LanceDB:', error);
  }
}

export {
  initializeDB,
  addMessage,
  searchChats,
  deleteChat,
  deleteUserChats,
  updateChatEmbeddings,
  getDBStats,
  closeDB
};
