import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = path.join(__dirname, '../../data/chat.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

let db: Database.Database | null = null;


/**
 * Initialize the SQLite database and create tables
 */
function initializeDatabase() {
  try {
    console.log('Initializing SQLite database...');
    
    // Connect to SQLite database
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables
    createTables();
    
    console.log('SQLite database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
}

/**
 * Create database tables with proper schema
 */
function createTables() {
  // Users table
  db!.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      preferences TEXT DEFAULT '{}'
    )
  `);

  // Chats table
  db!.exec(`
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
  db!.exec(`
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
  db!.exec(`
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

  // Create indexes for better performance
  db!.exec(`
    CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats (user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp);
    CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments (message_id);
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
 * User operations
 */
const userOps = {
  create: (userId: string) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)');
    return stmt.run(userId);
  },

  updateLastActive: (userId: string) => {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(userId);
  },

  get: (userId: string) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(userId);
  },

  updatePreferences: (userId: string, preferences: Record<string, unknown>) => {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE users SET preferences = ? WHERE id = ?');
    return stmt.run(JSON.stringify(preferences), userId);
  }
};

/**
 * Chat operations
 */
const chatOps = {
  create: (chatId: string, userId: string, title: string) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO chats (id, user_id, title) 
      VALUES (?, ?, ?)
    `);
    return stmt.run(chatId, userId, title);
  },

  getByUser: (userId: string) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM chats 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `);
    return stmt.all(userId);
  },

  getById: (chatId: string) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM chats WHERE id = ?');
    return stmt.get(chatId);
  },

  update: (chatId: string, updates: Record<string, unknown>) => {
    const db = getDatabase();
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = db.prepare(`UPDATE chats SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    return stmt.run(...values, chatId);
  },

  delete: (chatId: string) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM chats WHERE id = ?');
    return stmt.run(chatId);
  },

  setActive: (chatId: string, userId: string) => {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      // Clear all active chats for user
      db.prepare('UPDATE chats SET is_active = 0 WHERE user_id = ?').run(userId);
      // Set this chat as active
      db.prepare('UPDATE chats SET is_active = 1 WHERE id = ?').run(chatId);
    });
    return transaction();
  },

  getActive: (userId: string) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM chats WHERE user_id = ? AND is_active = 1');
    return stmt.get(userId);
  }
};

/**
 * Message operations
 */
const messageOps = {
  create: (messageId: string, chatId: string, userId: string, content: string, role: string, attachments: Record<string, unknown>[] = [], metadata: Record<string, unknown> = {}) => {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      // Insert message
      const messageStmt = db.prepare(`
        INSERT INTO messages (id, chat_id, user_id, content, role, attachments, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      messageStmt.run(
        messageId, 
        chatId, 
        userId, 
        content, 
        role, 
        JSON.stringify(attachments), 
        JSON.stringify(metadata)
      );

      // Insert attachments if any
      if (attachments.length > 0) {
        const attachmentStmt = db.prepare(`
          INSERT INTO attachments (id, message_id, name, type, size, url, data)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        attachments.forEach(attachment => {
          attachmentStmt.run(
            attachment.id || randomUUID(),
            messageId,
            attachment.name,
            attachment.type,
            attachment.size,
            attachment.url,
            attachment.data
          );
        });
      }

      // Update chat timestamp
      db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(chatId);
    });
    
    return transaction();
  },

  getByChat: (chatId: string) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT m.*, a.id as attachment_id, a.name as attachment_name, 
             a.type as attachment_type, a.size as attachment_size, 
             a.url as attachment_url, a.data as attachment_data
      FROM messages m
      LEFT JOIN attachments a ON m.id = a.message_id
      WHERE m.chat_id = ?
      ORDER BY m.timestamp ASC
    `);
    return stmt.all(chatId);
  },

  getByUser: (userId: string, limit: number = 100) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  delete: (messageId: string) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
    return stmt.run(messageId);
  },

  search: (userId: string, query: string, limit: number = 10) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT m.*, c.title as chat_title
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE m.user_id = ? AND m.content LIKE ?
      ORDER BY m.timestamp DESC
      LIMIT ?
    `);
    return stmt.all(userId, `%${query}%`, limit);
  }
};

/**
 * Database statistics
 */
const stats = {
  getUserStats: (userId: string) => {
    const db = getDatabase();
    const chatCount = db.prepare('SELECT COUNT(*) as count FROM chats WHERE user_id = ?').get(userId);
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ?').get(userId);
    const attachmentCount = db.prepare(`
      SELECT COUNT(*) as count FROM attachments a
      JOIN messages m ON a.message_id = m.id
      WHERE m.user_id = ?
    `).get(userId);
    
    return {
      chats: (chatCount as { count: number }).count,
      messages: (messageCount as { count: number }).count,
      attachments: (attachmentCount as { count: number }).count
    };
  },

  getDatabaseSize: () => {
    const db = getDatabase();
    const result = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
    return (result as { size: number }).size;
  }
};

/**
 * Migration from localStorage
 */
const migration = {
  fromLocalStorage: () => {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      // This would be called to migrate existing localStorage data
      // Implementation depends on your current localStorage structure
      console.log('Migration from localStorage would be implemented here');
    });
    return transaction();
  }
};

/**
 * Close the database connection
 * Called during graceful shutdown to ensure clean exit
 */
async function closeDatabase(): Promise<void> {
  if (db) {
    try {
      db.close();
      console.log('✅ SQLite database connection closed');
      db = null;
    } catch (error) {
      console.error('Error closing SQLite database:', error);
      throw error;
    }
  }
}

export {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  userOps,
  chatOps,
  messageOps,
  stats,
  migration,
  DB_PATH
};
