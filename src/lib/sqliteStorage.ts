/* eslint-disable @typescript-eslint/no-explicit-any */
import { userOps, chatOps, messageOps, stats } from './database';
import { migrationService  } from './migration';
import { randomUUID } from 'crypto';

/**
 * SQLite-based storage service to replace localStorage
 */
class SQLiteStorageService {
  private currentUserId: string | null;
  private initialized: boolean;
  
  constructor() {
    this.currentUserId = null;
    this.initialized = false;
  }

  /**
   * Initialize the storage service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Get or create user ID
      this.currentUserId = this.getOrCreateUserId();
      
      // Ensure user exists in database
      userOps.create(this.currentUserId);
      userOps.updateLastActive(this.currentUserId);
      
      // Perform migration if needed
      await this.performMigrationIfNeeded();
      
      this.initialized = true;
      console.log('✅ SQLite storage service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize SQLite storage service:', error);
      throw error;
    }
  }

  /**
   * Get or create user ID (compatible with existing localStorage approach)
   */
  getOrCreateUserId() {
    if (typeof window !== 'undefined') {
      let userId = localStorage.getItem('gemini-chat-user-id');
      if (!userId) {
        // Generate new user ID (same format as existing system)
        const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestamp = Date.now().toString().slice(-4);
        userId = `USER-${randomString}-${timestamp}`;
        localStorage.setItem('gemini-chat-user-id', userId);
      }
      return userId;
    }
    return 'SERVER-USER';
  }

  /**
   * Perform migration if needed
   */
  async performMigrationIfNeeded() {
    if (!migrationService.isMigrationCompleted()) {
      console.log('🔄 Performing migration from localStorage...');
      const result = await migrationService.performMigration();
      if (result.success) {
        console.log('✅ Migration completed successfully');
      } else {
        console.warn('⚠️ Migration failed, continuing with new data');
      }
    }
  }

  /**
   * Save chat state (replaces localStorage saveChatState)
   */
  async saveChatState(state: Record<string, unknown>) {
    await this.initialize();
    
    try {
      // Update user last active
      if (this.currentUserId) {
        userOps.updateLastActive(this.currentUserId);
      }
      
      // Process each chat
      for (const chat of (state as any).chats) {
        // Ensure chat exists
        const existingChat = chatOps.getById(chat.id);
        if (!existingChat) {
          chatOps.create((chat as any).id, this.currentUserId!, (chat as any).title);
        } else {
          // Update chat if needed
          chatOps.update((chat as any).id, { title: (chat as any).title });
        }
        
        // Set active chat
        if ((chat as any).id === (state as any).activeChatId) {
          chatOps.setActive((chat as any).id, this.currentUserId!);
        }
        
        // Process messages
        for (const message of (chat as any).messages) {
          // Check if message already exists
          const existingMessages = messageOps.getByChat((chat as any).id);
          const messageExists = existingMessages.some((m: any) => m.id === (message as any).id);
          
          if (!messageExists) {
            // Create new message
            messageOps.create(
              (message as any).id,
              (chat as any).id,
              this.currentUserId!,
              (message as any).content,
              (message as any).role,
              (message as any).attachments || [],
              { timestamp: (message as any).timestamp }
            );
          }
        }
      }
      
      console.log(`✅ Saved chat state to SQLite (${(state as any).chats.length} chats)`);
    } catch (error) {
      console.error('❌ Error saving chat state to SQLite:', error);
      throw error;
    }
  }

  /**
   * Load chat state (replaces localStorage loadChatState)
   */
  async loadChatState(): Promise<Record<string, unknown> | null> {
    await this.initialize();
    
    try {
      if (!this.currentUserId) {
        return null;
      }
      
      // Get all chats for user
      const chats = chatOps.getByUser(this.currentUserId);
      
      // Get active chat
      const activeChat = chatOps.getActive(this.currentUserId);
      
      // Convert to expected format
      const chatState = {
        chats: chats.map((chat: any) => ({
          id: chat.id,
          title: chat.title,
          createdAt: new Date(chat.created_at),
          updatedAt: new Date(chat.updated_at),
          messages: this.getMessagesForChat((chat as any).id)
        })),
        activeChatId: activeChat ? (activeChat as any).id : null
      };
      
      console.log(`✅ Loaded chat state from SQLite (${chatState.chats.length} chats)`);
      return chatState;
    } catch (error) {
      console.error('❌ Error loading chat state from SQLite:', error);
      return { chats: [], activeChatId: null };
    }
  }

  /**
   * Get messages for a specific chat
   */
  getMessagesForChat(chatId: string) {
    const messages = messageOps.getByChat(chatId);
    
    // Group messages and their attachments
    const messageMap = new Map();
    
    messages.forEach((row: any) => {
      if (!messageMap.has(row.id)) {
        messageMap.set(row.id, {
          id: row.id,
          content: row.content,
          role: row.role,
          timestamp: new Date(row.timestamp),
          attachments: []
        });
      }
      
      // Add attachment if present
      if (row.attachment_id) {
        messageMap.get(row.id).attachments.push({
          id: row.attachment_id,
          name: row.attachment_name,
          type: row.attachment_type,
          size: row.attachment_size,
          url: row.attachment_url,
          data: row.attachment_data
        });
      }
    });
    
    return Array.from(messageMap.values());
  }

  /**
   * Create a new chat
   */
  async createChat(title: string) {
    await this.initialize();
    
    if (!this.currentUserId) {
      throw new Error('User not initialized');
    }
    
    const chatId = randomUUID();
    chatOps.create(chatId, this.currentUserId, title);
    chatOps.setActive(chatId, this.currentUserId);
    
    return {
      id: chatId,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };
  }

  /**
   * Add a message to a chat
   */
  async addMessage(chatId: string, message: any) {
    await this.initialize();
    
    if (!this.currentUserId) {
      throw new Error('User not initialized');
    }
    
    messageOps.create(
      message.id,
      chatId,
      this.currentUserId,
      message.content,
      message.role,
      message.attachments || [],
      { timestamp: message.timestamp }
    );
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string) {
    await this.initialize();
    chatOps.delete(chatId);
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, limit = 10) {
    await this.initialize();
    if (!this.currentUserId) {
      return [];
    }
    return messageOps.search(this.currentUserId, query, limit);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<Record<string, unknown>> {
    await this.initialize();
    if (!this.currentUserId) {
      return { userId: null };
    }
    return {
      userId: this.currentUserId,
      ...stats.getUserStats(this.currentUserId)
    };
  }

  /**
   * Clear all data (for testing)
   */
  async clearAllData(): Promise<void> {
    await this.initialize();
    
    if (!this.currentUserId) {
      return;
    }
    
    // Delete all chats (messages and attachments will be deleted via CASCADE)
    const chats = chatOps.getByUser(this.currentUserId);
    for (const chat of chats) {
      chatOps.delete((chat as any).id);
    }
    
    console.log('✅ Cleared all SQLite data');
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

// Create singleton instance
const sqliteStorage = new SQLiteStorageService();

export {
  SQLiteStorageService,
  sqliteStorage
};
