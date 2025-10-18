import { userOps, chatOps, messageOps  } from './database';

// Types for migration data
interface ChatData {
  id: string;
  title: string;
  messages: MessageData[];
  isActive?: boolean;
}

interface MessageData {
  id: string;
  content: string;
  role: string;
  timestamp: string;
  attachments?: Record<string, unknown>[];
}

interface LocalStorageData {
  chats: ChatData[];
  userId: string;
}

/**
 * Migration service to move data from localStorage to SQLite
 */
class MigrationService {
  private migrationKey: string;
  
  constructor() {
    this.migrationKey = 'gemini-chat-migration-completed';
  }

  /**
   * Check if migration has already been completed
   */
  isMigrationCompleted(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.migrationKey) === 'true';
  }

  /**
   * Mark migration as completed
   */
  markMigrationCompleted(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.migrationKey, 'true');
    }
  }

  /**
   * Get localStorage data
   */
  getLocalStorageData(): LocalStorageData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const chatData = localStorage.getItem('gemini-chat-app');
      const userId = localStorage.getItem('gemini-chat-user-id');
      
      if (!userId) {
        return null;
      }
      
      return {
        chats: chatData ? JSON.parse(chatData).chats || [] : [],
        userId: userId
      };
    } catch (error) {
      console.error('Error reading localStorage data:', error);
      return null;
    }
  }

  /**
   * Migrate user data
   */
  migrateUser(userId: string) {
    try {
      // Create user in database
      userOps.create(userId);
      userOps.updateLastActive(userId);
      console.log(`✅ Migrated user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error migrating user:', error);
      return false;
    }
  }

  /**
   * Migrate chat data
   */
  migrateChats(userId: string, chats: ChatData[]) {
    try {
      let migratedCount = 0;
      
      for (const chat of chats) {
        // Create chat in database
        chatOps.create(chat.id, userId, chat.title);
        
        // Set active chat if needed
        if (chat.id === chats.find(c => c.isActive)?.id) {
          chatOps.setActive(chat.id, userId);
        }
        
        migratedCount++;
      }
      
      console.log(`✅ Migrated ${migratedCount} chats for user ${userId}`);
      return migratedCount;
    } catch (error) {
      console.error('Error migrating chats:', error);
      return 0;
    }
  }

  /**
   * Migrate messages
   */
  migrateMessages(userId: string, chats: ChatData[]) {
    try {
      let migratedCount = 0;
      
      for (const chat of chats) {
        for (const message of chat.messages) {
          // Parse attachments if they exist
          const attachments = message.attachments || [];
          
          // Create message in database
          messageOps.create(
            message.id,
            chat.id,
            userId,
            message.content,
            message.role,
            attachments,
            { timestamp: message.timestamp }
          );
          
          migratedCount++;
        }
      }
      
      console.log(`✅ Migrated ${migratedCount} messages for user ${userId}`);
      return migratedCount;
    } catch (error) {
      console.error('Error migrating messages:', error);
      return 0;
    }
  }

  /**
   * Perform complete migration
   */
  async performMigration() {
    if (this.isMigrationCompleted()) {
      console.log('Migration already completed, skipping...');
      return { success: true, message: 'Migration already completed' };
    }

    console.log('🔄 Starting migration from localStorage to SQLite...');
    
    const localStorageData = this.getLocalStorageData();
    if (!localStorageData || !localStorageData.userId) {
      console.log('No localStorage data found to migrate');
      return { success: true, message: 'No data to migrate' };
    }

    const { chats, userId } = localStorageData;
    
    if (!chats || chats.length === 0) {
      console.log('No chat data found to migrate');
      return { success: true, message: 'No chat data to migrate' };
    }

    try {
      // Migrate user
      const userMigrated = this.migrateUser(userId);
      if (!userMigrated) {
        throw new Error('Failed to migrate user');
      }

      // Migrate chats
      const chatsMigrated = this.migrateChats(userId, chats);
      if (chatsMigrated === 0) {
        console.log('No chats to migrate');
      }

      // Migrate messages
      const messagesMigrated = this.migrateMessages(userId, chats);
      if (messagesMigrated === 0) {
        console.log('No messages to migrate');
      }

      // Mark migration as completed
      this.markMigrationCompleted();

      const result = {
        success: true,
        message: 'Migration completed successfully',
        stats: {
          user: userId,
          chats: chatsMigrated,
          messages: messagesMigrated
        }
      };

      console.log('✅ Migration completed:', result);
      return result;

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error
      };
    }
  }

  /**
   * Verify migration by comparing data
   */
  verifyMigration() {
    const localStorageData = this.getLocalStorageData();
    if (!localStorageData || !localStorageData.chats) {
      return { success: true, message: 'No localStorage data to verify' };
    }

    const { chats, userId } = localStorageData;
    const dbChats = chatOps.getByUser(userId);
    const dbMessages = messageOps.getByUser(userId);

    const localStorageChatCount = chats.length;
    const localStorageMessageCount = chats.reduce((total, chat) => total + chat.messages.length, 0);

    const dbChatCount = dbChats.length;
    const dbMessageCount = dbMessages.length;

    const verification = {
      success: localStorageChatCount === dbChatCount && localStorageMessageCount === dbMessageCount,
      localStorage: {
        chats: localStorageChatCount,
        messages: localStorageMessageCount
      },
      database: {
        chats: dbChatCount,
        messages: dbMessageCount
      }
    };

    console.log('🔍 Migration verification:', verification);
    return verification;
  }

  /**
   * Clear localStorage after successful migration (optional)
   */
  clearLocalStorage() {
    if (typeof window === 'undefined') return false;
    
    try {
      localStorage.removeItem('gemini-chat-app');
      console.log('✅ Cleared localStorage chat data');
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
}

// Create singleton instance
const migrationService = new MigrationService();

export {
  MigrationService,
  migrationService
};
