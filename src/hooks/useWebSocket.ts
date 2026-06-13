'use client';

/**
 * Consumer hook for the app-wide WebSocket connection.
 *
 * The socket itself lives in WebSocketProvider (src/contexts/WebSocketContext.tsx),
 * mounted ONCE in Providers - every component that calls `useWebSocket()`
 * shares that single connection. Mounting/unmounting a consumer (e.g. when
 * switching chats) does NOT reconnect the socket; only an actual session
 * user change (login/logout) does.
 *
 * The public API is unchanged from the previous one-socket-per-component
 * implementation, so call sites did not need to change.
 */

import { useWebSocketContext } from '@/contexts/WebSocketContext';

export {
  ALL_CHATS,
} from '@/contexts/WebSocketContext';

export type {
  WebSocketMessage,
  TypingIndicator,
  RetrievalInfo,
  MessageErrorInfo,
  RateLimitInfo,
} from '@/contexts/WebSocketContext';

export function useWebSocket() {
  return useWebSocketContext();
}
