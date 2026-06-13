'use client';

/**
 * App-wide WebSocket provider.
 *
 * There is exactly ONE Socket.IO connection per page, owned by this provider
 * (mounted once in Providers). Components consume it through `useWebSocket()`
 * (src/hooks/useWebSocket.ts), which keeps its original public API.
 *
 * Previously every `useWebSocket()` call created its own socket, so a page
 * with Sidebar + ChatContext + ChatInterface + DebugPanel opened four
 * connections, and remounts on chat switches caused visible
 * connect/disconnect churn. The socket now only reconnects when the
 * authenticated user actually changes (login/logout), never on chat switches
 * or consumer unmounts.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Attachment, Message, RetrievalSource } from '@/types/chat';
import { publishUsageInfo } from '@/hooks/useUsageInfo';
import { wsLogger } from '@/lib/logger';

export interface WebSocketMessage {
  chatId: string;
  message: string;
  isComplete: boolean;
  fullResponse?: string;
  attachments?: Attachment[];
  rateLimited?: boolean;
}

export interface TypingIndicator {
  chatId: string;
  isTyping: boolean;
}

/**
 * Contract: `retrieval-info` arrives before the message-response stream for
 * a message that used cross-chat memory.
 */
export interface RetrievalInfo {
  chatId: string;
  sources: RetrievalSource[];
}

/**
 * Contract: message-error path. `code: 'POOL_EXHAUSTED'` means the shared
 * demo key ran out of budget and the user should add their own key.
 */
export interface MessageErrorInfo {
  chatId?: string;
  code?: string;
  error?: string;
  message?: string;
}

/** Register a handler under this key to receive events for every chat. */
export const ALL_CHATS = '*';

export interface RateLimitInfo {
  remaining: {
    minute: number;
    hour: number;
  };
  limit: {
    minute: number;
    hour: number;
  };
  resetAt: {
    minute: number;
    hour: number;
  };
}

type Handler<T> = (data: T) => void;

/**
 * Per-event registry: a Map of chatId -> Set of handlers, so multiple
 * subscribers can listen to the same chat without clobbering each other
 * (required now that all consumers share one socket).
 */
type Registry<T> = Map<string, Set<Handler<T>>>;

function addHandler<T>(registry: Registry<T>, chatId: string, handler: Handler<T>): void {
  let set = registry.get(chatId);
  if (!set) {
    set = new Set();
    registry.set(chatId, set);
  }
  set.add(handler);
}

function removeHandlers<T>(registry: Registry<T>, chatId: string, handler?: Handler<T>): void {
  if (!handler) {
    registry.delete(chatId);
    return;
  }
  const set = registry.get(chatId);
  if (set) {
    set.delete(handler);
    if (set.size === 0) registry.delete(chatId);
  }
}

/**
 * Dispatch to all handlers registered for the exact chatId; when none exist,
 * fall back to wildcard (ALL_CHATS) handlers. This preserves the original
 * "exact || wildcard" semantics.
 */
function dispatch<T>(registry: Registry<T>, chatId: string | undefined, data: T): void {
  const exact = chatId ? registry.get(chatId) : undefined;
  const targets = exact && exact.size > 0 ? exact : registry.get(ALL_CHATS);
  if (targets) {
    targets.forEach((handler) => handler(data));
  }
}

export interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  typingStates: Record<string, boolean>;
  rateLimitInfo: RateLimitInfo | null;
  sendMessage: (
    chatId: string,
    message: string,
    chatHistory: Message[],
    attachments?: Attachment[],
    userId?: string,
    apiKey?: string
  ) => void;
  onMessage: (chatId: string, handler: Handler<WebSocketMessage>) => void;
  onTyping: (chatId: string, handler: Handler<TypingIndicator>) => void;
  onRetrievalInfo: (chatId: string, handler: Handler<RetrievalInfo>) => void;
  onMessageError: (chatId: string, handler: Handler<MessageErrorInfo>) => void;
  removeMessageHandler: (chatId: string, handler?: Handler<WebSocketMessage>) => void;
  removeTypingHandler: (chatId: string, handler?: Handler<TypingIndicator>) => void;
  removeRetrievalHandler: (chatId: string, handler?: Handler<RetrievalInfo>) => void;
  removeMessageErrorHandler: (chatId: string, handler?: Handler<MessageErrorInfo>) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messageHandlers = useRef<Registry<WebSocketMessage>>(new Map());
  const typingHandlers = useRef<Registry<TypingIndicator>>(new Map());
  const retrievalHandlers = useRef<Registry<RetrievalInfo>>(new Map());
  const messageErrorHandlers = useRef<Registry<MessageErrorInfo>>(new Map());

  // The ONLY thing that should force a reconnect is the authenticated user
  // changing (login/logout). Depending on the session object itself would
  // reconnect on every session refresh, so derive the stable user id.
  const sessionUserId = session?.user?.id ?? null;

  useEffect(() => {
    // CRITICAL SECURITY: Enforce WSS (WebSocket Secure) in production
    let wsUrl: string;

    if (typeof window !== 'undefined') {
      // The server runs Next.js and Socket.IO on one port, so the WebSocket
      // target is the page's own origin. NEXT_PUBLIC_APP_URL can override it
      // if the socket server is ever hosted separately.
      const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      wsUrl = configuredUrl || window.location.origin;

      // CRITICAL: A secure page must not downgrade to an insecure socket
      if (window.location.protocol === 'https:' && wsUrl.startsWith('http://')) {
        wsLogger.error('SECURITY ERROR: insecure WebSocket target on a secure page', { wsUrl });
        throw new Error('Security violation: WSS required in production. Use an https:// NEXT_PUBLIC_APP_URL');
      }

      wsLogger.info('Connecting to WebSocket server', { wsUrl });
    } else {
      wsUrl = '';
    }

    // CRITICAL SECURITY FIX: Get minimal auth token (only user ID)
    // Previous implementation sent entire session object, exposing unnecessary data
    const getAuthToken = async (): Promise<string | null> => {
      if (typeof window !== 'undefined') {
        try {
          // Get the session cookie which contains the JWT
          const response = await fetch('/api/auth/session');
          const sessionData = await response.json();

          // CRITICAL FIX: Only send user ID, not entire session
          // This minimizes data exposure in WebSocket auth payload
          if (sessionData?.user?.id) {
            return JSON.stringify({ user: { id: sessionData.user.id } });
          }

          return null;
        } catch (error) {
          wsLogger.warn('Failed to get auth token', error);
          return null;
        }
      }
      return null;
    };

    let cancelled = false;
    let socketInstance: Socket | null = null;

    const initializeSocket = async () => {
      const authToken = await getAuthToken();

      // The effect was cleaned up while we were fetching the token
      // (user changed / provider unmounted) - don't open a stale socket.
      if (cancelled) return;

      const newSocket = io(wsUrl, {
        timeout: 20000, // 20 second connection timeout
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
        auth: {
          token: authToken
        }
      });

      socketInstance = newSocket;
      socketRef.current = newSocket;

      newSocket.on('connect', () => {
        wsLogger.info('Connected to WebSocket server', {
          socketId: newSocket.id,
          transport: newSocket.io.engine.transport.name
        });
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        wsLogger.warn('Disconnected from WebSocket server', { reason });
        setIsConnected(false);
      });

      newSocket.on('message-response', (data: WebSocketMessage) => {
        wsLogger.debug('Received message response', { chatId: data.chatId });
        dispatch(messageHandlers.current, data.chatId, data);
      });

      newSocket.on('typing', (data: TypingIndicator) => {
        wsLogger.debug('Typing indicator', { chatId: data.chatId, isTyping: data.isTyping });
        setTypingStates(prev => ({
          ...prev,
          [data.chatId]: data.isTyping
        }));

        dispatch(typingHandlers.current, data.chatId, data);
      });

      newSocket.on('error', (error) => {
        wsLogger.error('WebSocket error', error);

        // Log additional details if error object has properties
        if (error && typeof error === 'object' && Object.keys(error).length > 0) {
          wsLogger.error('Detailed WebSocket error', error);
        } else {
          wsLogger.error('Empty WebSocket error - likely connection issue. Check if server is running');
        }
      });

      newSocket.on('connect_error', (error) => {
        wsLogger.error('WebSocket connection error', {
          message: error.message,
          type: (error as Error & { type?: string }).type
        });
      });

      newSocket.on('connect_timeout', () => {
        wsLogger.error('WebSocket connection timeout');
      });

      newSocket.on('reconnect_attempt', (attempt) => {
        wsLogger.info(`Reconnection attempt ${attempt}`);
      });

      newSocket.on('reconnect_failed', () => {
        wsLogger.error('Reconnection failed after all attempts');
      });

      newSocket.on('rate-limit-info', (data: RateLimitInfo) => {
        wsLogger.debug('Rate limit info received', data);
        setRateLimitInfo(data);
      });

      // Contract: { pool: { used, budget, resetAt, available }, user: { requests, tokens } }
      newSocket.on('usage-info', (data: unknown) => {
        wsLogger.debug('Usage info received', data as object);
        publishUsageInfo(data);
      });

      // Contract: arrives BEFORE the message-response stream when cross-chat
      // memory was used. Dispatch to the chat-specific handlers, falling back
      // to the wildcard handlers registered by ChatContext.
      newSocket.on('retrieval-info', (data: RetrievalInfo) => {
        wsLogger.debug('Retrieval info received', { chatId: data?.chatId, sourceCount: data?.sources?.length });
        if (!data?.chatId || !Array.isArray(data.sources)) return;
        dispatch(retrievalHandlers.current, data.chatId, data);
      });

      // Contract: standard error path; code 'POOL_EXHAUSTED' signals that the
      // shared demo key budget is used up.
      newSocket.on('message-error', (data: MessageErrorInfo) => {
        wsLogger.warn('Message error received', { chatId: data?.chatId, code: data?.code });
        dispatch(messageErrorHandlers.current, data?.chatId, data ?? {});
      });

      setSocket(newSocket);
      wsLogger.debug('WebSocket client setup complete (single shared connection)');
    };

    initializeSocket();

    return () => {
      cancelled = true;
      if (socketInstance) {
        socketInstance.close();
      }
      if (socketRef.current === socketInstance) {
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [sessionUserId]); // Reconnect ONLY when the actual user changes (login/logout)

  const sendMessage = useCallback((
    chatId: string,
    message: string,
    chatHistory: Message[],
    attachments?: Attachment[],
    userId?: string,
    apiKey?: string
  ) => {
    const activeSocket = socketRef.current;
    if (activeSocket && activeSocket.connected) {
      activeSocket.emit('send-message', {
        chatId,
        message,
        chatHistory,
        attachments,
        userId,
        apiKey
      });
    }
  }, []);

  // Stable registration callbacks: consumer effects can safely list these in
  // their dependency arrays without re-running on every render.
  const onMessage = useCallback((chatId: string, handler: Handler<WebSocketMessage>) => {
    addHandler(messageHandlers.current, chatId, handler);
  }, []);

  const onTyping = useCallback((chatId: string, handler: Handler<TypingIndicator>) => {
    addHandler(typingHandlers.current, chatId, handler);
  }, []);

  const onRetrievalInfo = useCallback((chatId: string, handler: Handler<RetrievalInfo>) => {
    addHandler(retrievalHandlers.current, chatId, handler);
  }, []);

  const onMessageError = useCallback((chatId: string, handler: Handler<MessageErrorInfo>) => {
    addHandler(messageErrorHandlers.current, chatId, handler);
  }, []);

  const removeMessageHandler = useCallback((chatId: string, handler?: Handler<WebSocketMessage>) => {
    removeHandlers(messageHandlers.current, chatId, handler);
  }, []);

  const removeTypingHandler = useCallback((chatId: string, handler?: Handler<TypingIndicator>) => {
    removeHandlers(typingHandlers.current, chatId, handler);
  }, []);

  const removeRetrievalHandler = useCallback((chatId: string, handler?: Handler<RetrievalInfo>) => {
    removeHandlers(retrievalHandlers.current, chatId, handler);
  }, []);

  const removeMessageErrorHandler = useCallback((chatId: string, handler?: Handler<MessageErrorInfo>) => {
    removeHandlers(messageErrorHandlers.current, chatId, handler);
  }, []);

  const value = useMemo<WebSocketContextType>(() => ({
    socket,
    isConnected,
    typingStates,
    rateLimitInfo,
    sendMessage,
    onMessage,
    onTyping,
    onRetrievalInfo,
    onMessageError,
    removeMessageHandler,
    removeTypingHandler,
    removeRetrievalHandler,
    removeMessageErrorHandler,
  }), [
    socket,
    isConnected,
    typingStates,
    rateLimitInfo,
    sendMessage,
    onMessage,
    onTyping,
    onRetrievalInfo,
    onMessageError,
    removeMessageHandler,
    removeTypingHandler,
    removeRetrievalHandler,
    removeMessageErrorHandler,
  ]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
