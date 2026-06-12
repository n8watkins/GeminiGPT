/**
 * CommonJS wrapper for database module
 * Used by websocket-server.js to access TypeScript database module
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

// Database path — anchored to the working directory (project root) so this
// (the WebSocket server's DB layer) and src/lib/database.ts always open the
// SAME file. Keep these two in sync.
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/chat.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

let db = null;

/**
 * Initialize the SQLite database and create tables
 */
function initializeDatabase() {
  try {
    console.log('Initializing SQLite database');

    // Connect to SQLite database
    db = new Database(DB_PATH);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create tables
    createTables();

    console.log('SQLite database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing SQLite database', error);
    throw error;
  }
}

/**
 * Create database tables with proper schema
 */
function createTables() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      image TEXT,
      google_id TEXT UNIQUE,
      account_type TEXT DEFAULT 'anonymous' CHECK (account_type IN ('anonymous', 'google')),
      migrated_from TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      preferences TEXT DEFAULT '{}'
    )
  `);

  // Accounts table for NextAuth
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider, provider_account_id)
    )
  `);

  // Chats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      attachments TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER,
      url TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
    )
  `);

  // Gemini API Logs table - for debugging and monitoring
  db.exec(`
    CREATE TABLE IF NOT EXISTS gemini_logs (
      id TEXT PRIMARY KEY,
      chat_id TEXT,
      user_id TEXT,
      request_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      response_timestamp DATETIME,
      duration_ms INTEGER,
      request_data TEXT NOT NULL,
      response_data TEXT,
      error_data TEXT,
      status TEXT CHECK (status IN ('pending', 'success', 'error')),
      model_name TEXT,
      token_count INTEGER,
      function_calls TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  // Migrate legacy `users` tables that pre-date the OAuth columns. CREATE TABLE
  // IF NOT EXISTS never alters an existing table, so older databases are missing
  // these columns and the email index below would fail with "no such column".
  // Keep this in sync with src/lib/database.ts.
  const userColumns = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
  const ensureUserColumn = (name, definition) => {
    if (!userColumns.has(name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${definition}`);
    }
  };
  ensureUserColumn('email', 'email TEXT');
  ensureUserColumn('name', 'name TEXT');
  ensureUserColumn('image', 'image TEXT');
  ensureUserColumn('google_id', 'google_id TEXT');
  ensureUserColumn('account_type', "account_type TEXT DEFAULT 'anonymous'");
  ensureUserColumn('migrated_from', 'migrated_from TEXT');

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
    CREATE INDEX IF NOT EXISTS idx_users_account_type ON users (account_type);
    CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts (provider, provider_account_id);
    CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats (user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp);
    CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments (message_id);
    CREATE INDEX IF NOT EXISTS idx_gemini_logs_chat_id ON gemini_logs (chat_id);
    CREATE INDEX IF NOT EXISTS idx_gemini_logs_user_id ON gemini_logs (user_id);
    CREATE INDEX IF NOT EXISTS idx_gemini_logs_timestamp ON gemini_logs (request_timestamp);
    CREATE INDEX IF NOT EXISTS idx_gemini_logs_status ON gemini_logs (status);
  `);
}

/**
 * Get database instance
 */
function getDatabase() {
  if (!db) {
    initializeDatabase();
  }
  if (!db) throw new Error('Failed to initialize database');
  return db;
}

/**
 * Gemini API logs operations
 */
const geminiLogOps = {
  /**
   * Create a new Gemini API log entry (request sent)
   */
  create: (logId, chatId, userId, requestData, metadata = {}) => {
    const db = getDatabase();

    // chat_id/user_id have FK constraints, but with BYOK/anonymous usage chats
    // live in the browser and may not exist in the server DB. Store NULL in the
    // FK columns when the row is missing and keep the raw IDs in metadata.
    const chatExists = chatId && db.prepare('SELECT 1 FROM chats WHERE id = ?').get(chatId);
    const userExists = userId && db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
    const fullMetadata = { ...metadata, rawChatId: chatId || null, rawUserId: userId || null };

    const stmt = db.prepare(`
      INSERT INTO gemini_logs (id, chat_id, user_id, request_data, status, metadata)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);
    return stmt.run(
      logId,
      chatExists ? chatId : null,
      userExists ? userId : null,
      JSON.stringify(requestData),
      JSON.stringify(fullMetadata)
    );
  },

  /**
   * Update log entry with response (success)
   */
  updateSuccess: (logId, responseData, durationMs, tokenCount = null, functionCalls = []) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE gemini_logs
      SET response_data = ?,
          response_timestamp = CURRENT_TIMESTAMP,
          duration_ms = ?,
          status = 'success',
          token_count = ?,
          function_calls = ?
      WHERE id = ?
    `);
    return stmt.run(JSON.stringify(responseData), durationMs, tokenCount, JSON.stringify(functionCalls), logId);
  },

  /**
   * Update log entry with error
   */
  updateError: (logId, errorData, durationMs) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE gemini_logs
      SET error_data = ?,
          response_timestamp = CURRENT_TIMESTAMP,
          duration_ms = ?,
          status = 'error'
      WHERE id = ?
    `);
    return stmt.run(JSON.stringify(errorData), durationMs, logId);
  },

  /**
   * Get logs for a specific chat
   */
  getByChat: (chatId, limit = 50) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM gemini_logs
      WHERE chat_id = ?
      ORDER BY request_timestamp DESC
      LIMIT ?
    `);
    return stmt.all(chatId, limit);
  },

  /**
   * Get logs for a specific user
   */
  getByUser: (userId, limit = 100) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM gemini_logs
      WHERE user_id = ?
      ORDER BY request_timestamp DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  /**
   * Get recent logs (for debugging)
   */
  getRecent: (limit = 50) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM gemini_logs
      ORDER BY request_timestamp DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  /**
   * Delete old logs (for cleanup)
   */
  deleteOlderThan: (days) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM gemini_logs
      WHERE request_timestamp < datetime('now', '-' || ? || ' days')
    `);
    return stmt.run(days);
  },

  /**
   * Get log statistics
   */
  getStats: (chatId = null, userId = null) => {
    const db = getDatabase();
    let query = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
        AVG(duration_ms) as avg_duration,
        SUM(token_count) as total_tokens
      FROM gemini_logs
    `;

    const params = [];

    if (chatId) {
      query += ' WHERE chat_id = ?';
      params.push(chatId);
    } else if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

    const stmt = db.prepare(query);
    return stmt.get(...params);
  }
};

/**
 * Close the database connection
 */
async function closeDatabase() {
  if (db) {
    try {
      db.close();
      console.log('SQLite database connection closed');
      db = null;
    } catch (error) {
      console.error('Error closing SQLite database', error);
      throw error;
    }
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  geminiLogOps,
  DB_PATH
};
