'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Socket } from 'socket.io-client';
import { Chat, Message, ChatState, Attachment } from '@/types/chat';
import { saveChatState, loadChatState, generateChatTitle, clearStorageIfNeeded } from '@/lib/storage';
import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket';
import { getSessionUserId } from '@/lib/userId';

type ChatAction =
  | { type: 'CREATE_CHAT'; payload: { title: string; id: string } }
  | { type: 'CREATE_CHAT_WITH_MESSAGE'; payload: { title: string; id: string; content: string; attachments?: Attachment[] } }
  | { type: 'SELECT_CHAT'; payload: { chatId: string } }
  | { type: 'SEND_MESSAGE'; payload: { chatId: string; content: string; attachments?: Attachment[] } }
  | { type: 'RECEIVE_MESSAGE'; payload: { chatId: string; content: string; attachments?: Attachment[]; messageId?: string } }
  | { type: 'UPDATE_STREAMING_MESSAGE'; payload: { chatId: string; content: string; messageId: string } }
  | { type: 'COMPLETE_STREAMING_MESSAGE'; payload: { chatId: string; messageId: string } }
  | { type: 'LOAD_STATE'; payload: ChatState }
  | { type: 'DELETE_CHAT'; payload: { chatId: string } }
  | { type: 'REMOVE_LAST_ASSISTANT_MESSAGE'; payload: { chatId: string } };

const initialState: ChatState = {
  chats: [],
  activeChatId: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'CREATE_CHAT': {
      const newChat: Chat = {
        id: action.payload.id,
        title: action.payload.title,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return {
        ...state,
        chats: [newChat, ...state.chats],
        activeChatId: newChat.id,
      };
    }

    case 'CREATE_CHAT_WITH_MESSAGE': {
      const { id, content, attachments } = action.payload;
      const newMessage: Message = {
        id: uuidv4(),
        content,
        role: 'user',
        timestamp: new Date(),
        attachments,
      };
      const newChat: Chat = {
        id,
        title: generateChatTitle(content),
        messages: [newMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return {
        ...state,
        chats: [newChat, ...state.chats],
        activeChatId: newChat.id,
      };
    }

    case 'SELECT_CHAT': {
      return {
        ...state,
        activeChatId: action.payload.chatId,
      };
    }

    case 'SEND_MESSAGE': {
      const { chatId, content, attachments } = action.payload;
      const newMessage: Message = {
        id: uuidv4(),
        content,
        role: 'user',
        timestamp: new Date(),
        attachments,
      };

      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, newMessage],
                updatedAt: new Date(),
                title: chat.messages.length === 0 ? generateChatTitle(content) : chat.title,
              }
            : chat
        ),
      };
    }

    case 'RECEIVE_MESSAGE': {
      const { chatId, content, attachments, messageId } = action.payload;
      const newMessage: Message = {
        id: messageId || uuidv4(),
        content,
        role: 'assistant',
        timestamp: new Date(),
        attachments,
      };

      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, newMessage],
                updatedAt: new Date(),
              }
            : chat
        ),
      };
    }

    case 'UPDATE_STREAMING_MESSAGE': {
      const { chatId, content, messageId } = action.payload;
      
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === messageId
                    ? { ...msg, content: msg.content + content }
                    : msg
                ),
                updatedAt: new Date(),
              }
            : chat
        ),
      };
    }

    case 'COMPLETE_STREAMING_MESSAGE': {
      const { chatId, messageId } = action.payload;
      
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map(msg =>
                  msg.id === messageId
                    ? { ...msg, timestamp: new Date() }
                    : msg
                ),
                updatedAt: new Date(),
              }
            : chat
        ),
      };
    }

    case 'LOAD_STATE': {
      return action.payload;
    }

    case 'DELETE_CHAT': {
      const { chatId } = action.payload;
      const newChats = state.chats.filter(chat => chat.id !== chatId);
      const newActiveChatId = state.activeChatId === chatId
        ? (newChats.length > 0 ? newChats[0].id : null)
        : state.activeChatId;

      return {
        ...state,
        chats: newChats,
        activeChatId: newActiveChatId,
      };
    }

    case 'REMOVE_LAST_ASSISTANT_MESSAGE': {
      const { chatId } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.slice(0, -1), // Remove last message
                updatedAt: new Date(),
              }
            : chat
        ),
      };
    }

    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  createChat: (title: string) => string;
  selectChat: (chatId: string) => void;
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  regenerateMessage: () => Promise<void>;
  deleteChat: (chatId: string) => void;
  getActiveChat: () => Chat | null;
  socket: Socket | null; // Expose socket for debug panel
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { socket, isConnected, sendMessage: sendWebSocketMessage, onMessage, onTyping, removeMessageHandler, removeTypingHandler } = useWebSocket();

  // Load state from localStorage on mount
  useEffect(() => {
    // Clear storage if quota exceeded
    clearStorageIfNeeded();

    const savedState = loadChatState();
    dispatch({ type: 'LOAD_STATE', payload: savedState });
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    // Always save state to localStorage, even if chats are empty
    // This ensures deletions are persisted
    saveChatState(state).catch(error => {
      console.error('Error saving chat state:', error);
    });
  }, [state]);

  // Setup WebSocket message handlers
  useEffect(() => {
    // Track streaming messages by chatId
    const streamingMessages = new Map<string, { id: string; content: string }>();

    const handleWebSocketMessage = (data: WebSocketMessage) => {
      if (data.isComplete) {
        // Streaming complete - finalize the message
        const streamingMsg = streamingMessages.get(data.chatId);
        if (streamingMsg) {
          // Message already exists from streaming, just mark as complete
          dispatch({
            type: 'COMPLETE_STREAMING_MESSAGE',
            payload: {
              chatId: data.chatId,
              messageId: streamingMsg.id,
            },
          });
          streamingMessages.delete(data.chatId);
        } else if (data.message && data.message.trim()) {
          // Fallback: if no streaming happened, add complete message
          dispatch({
            type: 'RECEIVE_MESSAGE',
            payload: {
              chatId: data.chatId,
              content: data.fullResponse ?? data.message,
              attachments: data.attachments,
            },
          });
        }
      } else {
        // Streaming chunk received
        let streamingMsg = streamingMessages.get(data.chatId);

        if (!streamingMsg) {
          // First chunk - create new message with the first chunk content
          const newMessageId = uuidv4();
          streamingMsg = { id: newMessageId, content: data.message };
          streamingMessages.set(data.chatId, streamingMsg);

          // Add message with first chunk to chat, with explicit message ID
          dispatch({
            type: 'RECEIVE_MESSAGE',
            payload: {
              chatId: data.chatId,
              content: data.message,
              attachments: data.attachments,
              messageId: newMessageId,
            },
          });
        } else {
          // Subsequent chunk - update existing message
          dispatch({
            type: 'UPDATE_STREAMING_MESSAGE',
            payload: {
              chatId: data.chatId,
              content: data.message,
              messageId: streamingMsg.id,
            },
          });

          streamingMsg.content += data.message;
        }
      }
    };

    // Set up handlers for all active chats
    state.chats.forEach(chat => {
      onMessage(chat.id, handleWebSocketMessage);
    });

    return () => {
      // Clean up handlers
      state.chats.forEach(chat => {
        removeMessageHandler(chat.id);
        removeTypingHandler(chat.id);
      });
    };
  }, [state.chats, onMessage, onTyping, removeMessageHandler, removeTypingHandler]);

  const createChat = useCallback((title: string): string => {
    const newChatId = uuidv4();
    dispatch({ type: 'CREATE_CHAT', payload: { title, id: newChatId } });
    return newChatId;
  }, []);

  const selectChat = useCallback((chatId: string) => {
    dispatch({ type: 'SELECT_CHAT', payload: { chatId } });
  }, []);

  const sendMessage = async (content: string, attachments?: Attachment[]) => {
    let chatId = state.activeChatId;
    let chatHistoryBeforeCurrentMessage: Message[] = [];

    // If no active chat, create one with the message atomically
    if (!chatId) {
      const newChatId = uuidv4();
      const now = new Date();
      const title = `Chat ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

      dispatch({
        type: 'CREATE_CHAT_WITH_MESSAGE',
        payload: { title, id: newChatId, content, attachments }
      });

      chatId = newChatId;
      // No chat history for first message
      chatHistoryBeforeCurrentMessage = [];
    } else {
      // Get current chat messages BEFORE dispatching (to avoid race condition)
      const activeChat = state.chats.find(chat => chat.id === chatId);
      if (!activeChat) {
        throw new Error('Active chat not found');
      }

      // Get the chat history BEFORE the current message
      // This is what we'll send to Gemini as context
      chatHistoryBeforeCurrentMessage = activeChat.messages;

      // Add user message to existing chat
      dispatch({ type: 'SEND_MESSAGE', payload: { chatId, content, attachments } });
    }

    // Check if Railway is configured (regardless of where we're running)
    const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_URL || '';
    const isRailwayConfigured = railwayUrl && !railwayUrl.includes('your-app-name');
    const isProduction = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      window.location.hostname !== '[::1]';

    if (isProduction && !isRailwayConfigured) {
      // In production without Railway configured, simulate a response
      console.log('🚫 Production mode: Railway not configured, simulating AI response');
      
      // Simulate AI response after a delay
      setTimeout(() => {
        if (chatId) {
          dispatch({
            type: 'RECEIVE_MESSAGE',
            payload: {
              chatId: chatId,
              content: "I'm running in production mode. To enable real AI responses, please deploy the WebSocket server to Railway and configure the NEXT_PUBLIC_RAILWAY_URL environment variable.",
              attachments: [],
            },
          });
        }
      }, 1000);
      
      return;
    }

    if (!isConnected) {
      console.error('Cannot send message: Not connected to server');
      throw new Error('Not connected to server. Please check your connection.');
    }

    try {
      // Get user ID and send message via WebSocket
      const userId = getSessionUserId();
      
      // Debug: Log what we're sending to WebSocket
      console.log('📤 Sending to WebSocket:');
      console.log('  - Chat ID:', chatId);
      console.log('  - Current Message:', content.substring(0, 50) + '...');
      console.log('  - Chat History Length (BEFORE current message):', chatHistoryBeforeCurrentMessage.length);
      console.log('  - User ID:', userId);
      if (chatHistoryBeforeCurrentMessage.length > 0) {
        console.log('  - First message in history:', {
          role: chatHistoryBeforeCurrentMessage[0].role,
          content: chatHistoryBeforeCurrentMessage[0].content.substring(0, 30) + '...'
        });
        console.log('  - Last message in history:', {
          role: chatHistoryBeforeCurrentMessage[chatHistoryBeforeCurrentMessage.length - 1].role,
          content: chatHistoryBeforeCurrentMessage[chatHistoryBeforeCurrentMessage.length - 1].content.substring(0, 30) + '...'
        });
      } else {
        console.log('  - No previous chat history (first message in chat)');
      }

      // CRITICAL FIX: Serialize chat history to ensure Date objects are converted to strings
      // Socket.io can serialize Dates, but something in the chain corrupts them to [object Object]
      const serializedChatHistory = chatHistoryBeforeCurrentMessage.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(), // Convert Date to ISO string
        createdAt: undefined, // Remove if exists
        updatedAt: undefined  // Remove if exists
      })) as unknown as Message[];

      // Send chat history BEFORE the current message
      // The current message will be sent separately by the WebSocket server
      sendWebSocketMessage(chatId, content, serializedChatHistory, attachments, userId);
    } catch (error) {
      console.error('Error sending message:', error);
      // Re-throw the error so the UI can handle it
      throw error;
    }
  };

  const regenerateMessage = async () => {
    if (!state.activeChatId) {
      throw new Error('No active chat selected');
    }

    const activeChat = state.chats.find(chat => chat.id === state.activeChatId);
    if (!activeChat || activeChat.messages.length < 2) {
      throw new Error('Not enough messages to regenerate');
    }

    // Get the last user message
    const lastUserMessage = [...activeChat.messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) {
      throw new Error('No user message found to regenerate from');
    }

    // Remove the last assistant message
    dispatch({ type: 'REMOVE_LAST_ASSISTANT_MESSAGE', payload: { chatId: state.activeChatId } });

    // Wait a bit for state to update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Re-send the last user message
    await sendMessage(lastUserMessage.content, lastUserMessage.attachments);
  };

  const deleteChat = useCallback(async (chatId: string) => {
    // Delete from vector database via WebSocket
    try {
      const userId = getSessionUserId();
      // Send delete request to server via WebSocket
      if (socket && isConnected) {
        socket.emit('delete-chat', { chatId, userId });
        console.log(`Requested deletion of chat ${chatId} from vector database`);
      }
    } catch (error) {
      console.error('Error requesting chat deletion from vector database:', error);
      // Continue with local deletion even if vector DB deletion fails
    }

    // Delete from local state
    dispatch({ type: 'DELETE_CHAT', payload: { chatId } });
  }, [socket, isConnected]);

  const getActiveChat = useCallback((): Chat | null => {
    return state.chats.find(chat => chat.id === state.activeChatId) || null;
  }, [state.chats, state.activeChatId]);

  return (
    <ChatContext.Provider
      value={{
        state,
        createChat,
        selectChat,
        sendMessage,
        regenerateMessage,
        deleteChat,
        getActiveChat,
        socket, // Expose socket for debug panel
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
