'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import { Attachment, Message } from '@/types/chat';
import { wsLogger } from '@/lib/logger';

export interface WebSocketMessage {
  chatId: string;
  message: string;
  isComplete: boolean;
  fullResponse?: string;
  attachments?: Attachment[];
  rateLimited?: boolean;
}

interface TypingIndicator {
  chatId: string;
  isTyping: boolean;
}

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

export function useWebSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const messageHandlers = useRef<Map<string, (data: WebSocketMessage) => void>>(new Map());
  const typingHandlers = useRef<Map<string, (data: TypingIndicator) => void>>(new Map());

  useEffect(() => {
    // CRITICAL SECURITY: Enforce WSS (WebSocket Secure) in production
    let wsUrl: string;

    if (typeof window !== 'undefined') {
      const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_URL || '';
      const isLocalhost = window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '[::1]';
      const isProduction = window.location.protocol === 'https:';

      if (railwayUrl && !railwayUrl.includes('your-app-name')) {
        // Railway URL is configured - use it
        wsUrl = railwayUrl;

        // CRITICAL: Validate Railway URL uses HTTPS/WSS in production
        if (isProduction && !wsUrl.startsWith('https://') && !wsUrl.startsWith('wss://')) {
          wsLogger.error('SECURITY ERROR: Production requires HTTPS/WSS connection', { wsUrl });
          throw new Error('Security violation: WSS required in production. Configure NEXT_PUBLIC_RAILWAY_URL with https://');
        }

        wsLogger.info('Connecting to Railway WebSocket server', { wsUrl, isProduction });
      } else {
        // Railway not configured - fall back to localhost
        if (isProduction && !isLocalhost) {
          // Production environment without proper configuration
          wsLogger.error('SECURITY ERROR: Production deployment without WSS configuration');
          throw new Error('Production deployment requires NEXT_PUBLIC_RAILWAY_URL with https:// URL');
        }

        // Only allow HTTP for localhost
        wsUrl = isLocalhost ? 'http://localhost:1337' : 'https://localhost:1337';
        wsLogger.info('Development mode: connecting to localhost', { wsUrl, isLocalhost });
      }
    } else {
      wsUrl = 'http://localhost:1337';
    }

    wsLogger.debug('Initializing WebSocket connection', { wsUrl });

    // Get auth token from session if available
    // Note: We use getSession from client-side to get the JWT token
    const getAuthToken = async () => {
      if (typeof window !== 'undefined') {
        try {
          // Get the session cookie which contains the JWT
          const response = await fetch('/api/auth/session');
          const sessionData = await response.json();
          return sessionData?.user ? JSON.stringify(sessionData) : null;
        } catch (error) {
          wsLogger.warn('Failed to get auth token', error);
          return null;
        }
      }
      return null;
    };

    // Create socket connection with auth
    const initializeSocket = async () => {
      const authToken = await getAuthToken();

      const newSocket = io(wsUrl, {
        timeout: 20000, // 20 second connection timeout
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
        auth: {
          token: authToken
        }
      });

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
      const handler = messageHandlers.current.get(data.chatId);
      if (handler) {
        handler(data);
      }
    });

    newSocket.on('typing', (data: TypingIndicator) => {
      wsLogger.debug('Typing indicator', { chatId: data.chatId, isTyping: data.isTyping });
      setTypingStates(prev => ({
        ...prev,
        [data.chatId]: data.isTyping
      }));

      const handler = typingHandlers.current.get(data.chatId);
      if (handler) {
        handler(data);
      }
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

      setSocket(newSocket);
      wsLogger.debug('WebSocket client setup complete');

      return newSocket;
    };

    // Initialize socket and handle cleanup
    let socketInstance: Socket | null = null;
    initializeSocket().then(sock => {
      socketInstance = sock;
    });

    return () => {
      if (socketInstance) {
        socketInstance.close();
      }
    };
  }, [session]); // Re-initialize when session changes (login/logout)

  const sendMessage = (chatId: string, message: string, chatHistory: Message[], attachments?: Attachment[], userId?: string, apiKey?: string) => {
    if (socket && isConnected) {
      socket.emit('send-message', {
        chatId,
        message,
        chatHistory,
        attachments,
        userId,
        apiKey
      });
    }
  };

  const onMessage = (chatId: string, handler: (data: WebSocketMessage) => void) => {
    messageHandlers.current.set(chatId, handler);
  };

  const onTyping = (chatId: string, handler: (data: TypingIndicator) => void) => {
    typingHandlers.current.set(chatId, handler);
  };

  const removeMessageHandler = (chatId: string) => {
    messageHandlers.current.delete(chatId);
  };

  const removeTypingHandler = (chatId: string) => {
    typingHandlers.current.delete(chatId);
  };

  return {
    socket,
    isConnected,
    typingStates,
    rateLimitInfo,
    sendMessage,
    onMessage,
    onTyping,
    removeMessageHandler,
    removeTypingHandler
  };
}
