'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Attachment, Message } from '@/types/chat';

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const messageHandlers = useRef<Map<string, (data: WebSocketMessage) => void>>(new Map());
  const typingHandlers = useRef<Map<string, (data: TypingIndicator) => void>>(new Map());

  useEffect(() => {
    // Always use Railway URL if configured, otherwise fall back to localhost
    let wsUrl: string;

    if (typeof window !== 'undefined') {
      const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_URL || '';

      if (railwayUrl && !railwayUrl.includes('your-app-name')) {
        // Railway URL is configured - use it
        wsUrl = railwayUrl;
        console.log('🚀 Connecting to Railway WebSocket server:', wsUrl);
      } else {
        // Railway not configured - fall back to localhost
        wsUrl = 'http://localhost:1337';
        console.log('🏠 Railway not configured, connecting to localhost:1337');
      }
    } else {
      wsUrl = 'http://localhost:1337';
    }

    console.log('🔌 Initializing WebSocket connection to', wsUrl);

    const newSocket = io(wsUrl, {
      timeout: 20000, // 20 second connection timeout
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket server, Socket ID:', newSocket.id);
      console.log('Transport:', newSocket.io.engine.transport.name);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from WebSocket server, Reason:', reason);
      setIsConnected(false);
    });

    newSocket.on('message-response', (data: WebSocketMessage) => {
      console.log('📨 Received message response for chat:', data.chatId);
      const handler = messageHandlers.current.get(data.chatId);
      if (handler) {
        handler(data);
      }
    });

    newSocket.on('typing', (data: TypingIndicator) => {
      console.log('⌨️  Typing indicator for chat:', data.chatId, 'isTyping:', data.isTyping);
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
      console.error('❌ WebSocket error:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'no keys');

      // Don't show empty error objects to user
      if (error && Object.keys(error).length > 0) {
        console.error('Detailed WebSocket error:', JSON.stringify(error, null, 2));
      } else {
        console.error('Empty WebSocket error - likely connection issue');
        console.error('Check if server is running on port 5000');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      console.error('Connection error message:', error.message);
      console.error('Connection error type:', (error as Error & { type?: string }).type);
    });

    newSocket.on('connect_timeout', () => {
      console.error('⏱️  WebSocket connection timeout');
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}...`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts');
    });

    newSocket.on('rate-limit-info', (data: RateLimitInfo) => {
      console.log('📊 Rate limit info:', data);
      setRateLimitInfo(data);
    });

    setSocket(newSocket);
    console.log('📡 WebSocket client setup complete');

    return () => {
      newSocket.close();
    };
  }, []);

  const sendMessage = (chatId: string, message: string, chatHistory: Message[], attachments?: Attachment[], userId?: string) => {
    if (socket && isConnected) {
      socket.emit('send-message', {
        chatId,
        message,
        chatHistory,
        attachments,
        userId
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
