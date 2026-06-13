/**
 * Self-contained share links.
 *
 * The server used to persist shared chats to `shared-chats/` on disk, which
 * is ephemeral on Render's free tier - every restart killed every share link.
 * Instead, the entire shared chat now travels INSIDE the link itself:
 *
 *   /share#<base64url(gzip(JSON payload))>
 *
 * - Compression uses the browser-native CompressionStream('gzip') API
 *   (no dependencies; also available in Node 18+, so it unit-tests cleanly).
 * - The data lives in the URL *fragment* (#...), which is never sent to the
 *   server - no server storage, no privacy leak into server logs.
 * - The share page decodes and renders it entirely client-side.
 */

import { Chat } from '@/types/chat';

/** Versioned payload embedded in the link (bump `v` on breaking changes). */
export interface SharePayload {
  v: 1;
  title: string;
  sharedAt: string;
  createdAt?: string;
  messages: ShareMessage[];
}

export interface ShareMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Hard cap on the encoded fragment length. The full URL stays comfortably
 * under what browsers, clipboards and chat apps handle (~16k chars total).
 * gzip on conversational text typically compresses 3-5x, so this allows
 * roughly 30-60 KB of chat text.
 */
export const MAX_SHARE_FRAGMENT_LENGTH = 12_000;

/** Refuse to even compress absurd inputs (keeps the UI snappy). */
export const MAX_SHARE_JSON_BYTES = 512 * 1024;

/** Thrown when a chat cannot fit in a self-contained link. */
export class ShareTooLargeError extends Error {
  constructor() {
    super(
      'This chat is too large to share as a link. Try downloading it instead (Download button), or share a shorter chat.'
    );
    this.name = 'ShareTooLargeError';
  }
}

/** Thrown when a link's fragment is missing, corrupted, or from a dead legacy share. */
export class ShareDecodeError extends Error {
  constructor(message = 'Invalid or expired share link') {
    super(message);
    this.name = 'ShareDecodeError';
  }
}

// ---------------------------------------------------------------------------
// base64url <-> bytes (no dependencies; works in browsers and Node)
// ---------------------------------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000; // avoid call-stack limits with String.fromCharCode
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const base64 =
    encoded.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (encoded.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new ShareDecodeError();
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// gzip via the native streams API
// ---------------------------------------------------------------------------

async function gzipBytes(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipBytes(data: Uint8Array): Promise<Uint8Array> {
  try {
    const stream = new Blob([data as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    throw new ShareDecodeError();
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the share payload for a chat. Attachments are intentionally dropped:
 * their URLs are session-local blob: object URLs that would be dead in the
 * recipient's browser anyway (the old disk-based shares had the same flaw).
 */
export function buildSharePayload(chat: Pick<Chat, 'title' | 'messages' | 'createdAt'>): SharePayload {
  return {
    v: 1,
    title: chat.title,
    sharedAt: new Date().toISOString(),
    createdAt: chat.createdAt ? new Date(chat.createdAt).toISOString() : undefined,
    messages: chat.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp).toISOString(),
    })),
  };
}

/**
 * Encode a payload into the URL fragment string (without the leading '#').
 * Throws ShareTooLargeError when the chat can't fit in a sane URL.
 */
export async function encodeShareData(payload: SharePayload): Promise<string> {
  const json = JSON.stringify(payload);
  if (new TextEncoder().encode(json).length > MAX_SHARE_JSON_BYTES) {
    throw new ShareTooLargeError();
  }
  const compressed = await gzipBytes(new TextEncoder().encode(json));
  const fragment = bytesToBase64Url(compressed);
  if (fragment.length > MAX_SHARE_FRAGMENT_LENGTH) {
    throw new ShareTooLargeError();
  }
  return fragment;
}

/**
 * Decode a URL fragment (with or without the leading '#') back into a
 * payload. Throws ShareDecodeError for anything malformed or legacy.
 */
export async function decodeShareData(fragment: string): Promise<SharePayload> {
  const encoded = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  if (!encoded) {
    throw new ShareDecodeError();
  }

  const json = new TextDecoder().decode(await gunzipBytes(base64UrlToBytes(encoded)));

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    throw new ShareDecodeError();
  }

  if (!isValidPayload(payload)) {
    throw new ShareDecodeError();
  }
  return payload;
}

function isValidPayload(value: unknown): value is SharePayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as SharePayload;
  return (
    candidate.v === 1 &&
    typeof candidate.title === 'string' &&
    typeof candidate.sharedAt === 'string' &&
    Array.isArray(candidate.messages) &&
    candidate.messages.every(
      (msg) =>
        !!msg &&
        typeof msg === 'object' &&
        (msg.role === 'user' || msg.role === 'assistant') &&
        typeof msg.content === 'string'
    )
  );
}

/** Build the full share URL for the current origin. */
export function buildShareUrl(origin: string, fragment: string): string {
  return `${origin}/share#${fragment}`;
}
