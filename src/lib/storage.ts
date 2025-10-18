import { ChatState, Attachment } from '@/types/chat';
import { getSessionUserId } from './userId';

const STORAGE_KEY_PREFIX = 'gemini-chat-app';
const MAX_CHATS = 10; // Limit number of stored chats
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB limit per attachment (matches FileUpload component)

// Get user-specific storage key
function getStorageKey(): string {
  const userId = getSessionUserId();
  return `${STORAGE_KEY_PREFIX}-${userId}`;
}


// Process attachments to reduce size
function processAttachmentsForStorage(attachments: Attachment[]): Attachment[] {
  const processedAttachments: Attachment[] = [];
  
  for (const attachment of attachments) {
    // Skip very large attachments
    if (attachment.size && attachment.size > MAX_ATTACHMENT_SIZE) {
      console.warn(`Skipping large attachment: ${attachment.name} (${attachment.size} bytes)`);
      continue;
    }
    
    // For now, just add all attachments as-is
    // TODO: Implement proper compression later
    processedAttachments.push(attachment);
  }
  
  return processedAttachments;
}

export async function saveChatState(state: ChatState): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = getStorageKey();

    // Limit number of chats
    const limitedChats = state.chats.slice(-MAX_CHATS);

    // Process attachments for each chat
    const processedChats = limitedChats.map((chat) => ({
      ...chat,
      messages: chat.messages.map((message) => ({
        ...message,
        attachments: message.attachments
          ? processAttachmentsForStorage(message.attachments)
          : undefined
      }))
    }));

    const processedState = {
      ...state,
      chats: processedChats
    };

    const serialized = JSON.stringify(processedState);

    // Check if data is too large
    if (serialized.length > 4 * 1024 * 1024) { // 4MB limit
      console.warn('Chat state too large, removing oldest chats');
      // Remove oldest chats until we're under the limit
      let reducedChats = processedChats;
      while (JSON.stringify({ ...processedState, chats: reducedChats }).length > 4 * 1024 * 1024 && reducedChats.length > 1) {
        reducedChats = reducedChats.slice(1);
      }

      const finalState = { ...processedState, chats: reducedChats };
      localStorage.setItem(storageKey, JSON.stringify(finalState));
    } else {
      localStorage.setItem(storageKey, serialized);
    }
  } catch (error) {
    console.error('Error saving chat state:', error);
    // Fallback: save without attachments
    const storageKey = getStorageKey();
    const fallbackState = {
      ...state,
      chats: state.chats.map(chat => ({
        ...chat,
        messages: chat.messages.map(msg => ({
          ...msg,
          attachments: undefined // Remove attachments to save space
        }))
      }))
    };
    localStorage.setItem(storageKey, JSON.stringify(fallbackState));
  }
}

export function loadChatState(): ChatState {
  if (typeof window === 'undefined') {
    return { chats: [], activeChatId: null };
  }

  try {
    const storageKey = getStorageKey();
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      parsed.chats = parsed.chats.map((chat: { createdAt: string; updatedAt: string; messages: { timestamp: string }[] }) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        messages: chat.messages.map((msg: { timestamp: string }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      return parsed;
    }
  } catch (error) {
    console.error('Error loading chat state:', error);
  }

  return { chats: [], activeChatId: null };
}

export function generateChatTitle(firstMessage: string): string {
  // Generate a title from the first message (first 50 characters)
  const title = firstMessage.slice(0, 50).trim();
  return title.length < firstMessage.length ? title + '...' : title;
}

// Clear localStorage if quota exceeded
export function clearStorageIfNeeded(): void {
  if (typeof window === 'undefined') return;

  try {
    // Try to set a test item
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old data');
      // Clear current user's chat data
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
      // Clear any other large items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX) || key.includes('attachment')) {
          localStorage.removeItem(key);
        }
      });
    }
  }
}
