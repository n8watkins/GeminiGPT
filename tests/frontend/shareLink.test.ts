/**
 * Self-contained share link codec (Wave 2, Agent E).
 *
 * Share links embed the whole chat in the URL fragment:
 *   /share#<base64url(gzip(JSON payload))>
 * These tests run the exact code the browser runs (CompressionStream /
 * DecompressionStream are native in Node 18+ as well).
 */

import {
  buildSharePayload,
  buildShareUrl,
  decodeShareData,
  encodeShareData,
  MAX_SHARE_FRAGMENT_LENGTH,
  ShareDecodeError,
  SharePayload,
  ShareTooLargeError,
} from '@/lib/shareLink';

function sampleChat(messageCount = 4, contentLength = 80) {
  return {
    title: 'RAG questions & answers',
    createdAt: new Date('2026-06-01T12:00:00Z'),
    messages: Array.from({ length: messageCount }, (_, i) => ({
      id: `m${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i}: ${'lorem ipsum dolor sit amet '.repeat(Math.ceil(contentLength / 27)).slice(0, contentLength)}`,
      timestamp: new Date('2026-06-01T12:01:00Z'),
    })),
  };
}

describe('buildSharePayload', () => {
  it('produces a v1 payload with serialized timestamps and no attachments', () => {
    const chat = {
      ...sampleChat(2),
      messages: sampleChat(2).messages.map((m) => ({
        ...m,
        attachments: [{ id: 'a', type: 'image' as const, name: 'cat.png', url: 'blob:dead' }],
      })),
    };

    const payload = buildSharePayload(chat);

    expect(payload.v).toBe(1);
    expect(payload.title).toBe(chat.title);
    expect(payload.messages).toHaveLength(2);
    expect(payload.messages[0].timestamp).toBe('2026-06-01T12:01:00.000Z');
    // Attachment blob: URLs are session-local and would be dead links for the
    // recipient - they must not travel in the share payload.
    expect(JSON.stringify(payload)).not.toContain('blob:');
    expect(JSON.stringify(payload)).not.toContain('attachments');
  });
});

describe('encodeShareData / decodeShareData round trip', () => {
  it('round-trips a typical chat', async () => {
    const payload = buildSharePayload(sampleChat());

    const fragment = await encodeShareData(payload);
    expect(fragment.length).toBeGreaterThan(0);
    // base64url alphabet only - safe inside a URL fragment
    expect(fragment).toMatch(/^[A-Za-z0-9_-]+$/);

    const decoded = await decodeShareData(fragment);
    expect(decoded).toEqual(payload);
  });

  it('accepts a fragment with the leading # (as read from location.hash)', async () => {
    const payload = buildSharePayload(sampleChat(1));
    const fragment = await encodeShareData(payload);

    const decoded = await decodeShareData(`#${fragment}`);
    expect(decoded.title).toBe(payload.title);
  });

  it('compresses well enough that a long chat stays linkable', async () => {
    // ~20KB of chat text should comfortably fit after gzip
    const payload = buildSharePayload(sampleChat(40, 500));
    const fragment = await encodeShareData(payload);
    expect(fragment.length).toBeLessThan(MAX_SHARE_FRAGMENT_LENGTH);

    const url = buildShareUrl('https://example.com', fragment);
    expect(url.startsWith('https://example.com/share#')).toBe(true);
  });

  it('rejects chats too large for a sane URL with ShareTooLargeError', async () => {
    // Incompressible content (random hex) to defeat gzip
    const bigChat = sampleChat(1, 1);
    bigChat.messages[0].content = Array.from({ length: 40000 }, () =>
      Math.floor(Math.random() * 0xffff).toString(16)
    ).join('');

    await expect(encodeShareData(buildSharePayload(bigChat))).rejects.toThrow(ShareTooLargeError);
  });
});

describe('decodeShareData on legacy/invalid links', () => {
  it.each([
    ['empty fragment', ''],
    ['just a hash', '#'],
    ['legacy share UUID', 'd5b1cfa7-9df7-4d3e-9c5a-1f2e3d4c5b6a'],
    ['not base64url at all', '%%%///'],
    ['valid base64url but not gzip', Buffer.from('hello world').toString('base64url')],
  ])('throws ShareDecodeError for %s', async (_label, fragment) => {
    await expect(decodeShareData(fragment)).rejects.toThrow(ShareDecodeError);
  });

  it('throws ShareDecodeError for gzip of non-payload JSON', async () => {
    const gzipped = new Uint8Array(
      await new Response(
        new Blob([JSON.stringify({ hello: 'world' })]).stream().pipeThrough(new CompressionStream('gzip'))
      ).arrayBuffer()
    );
    const fragment = Buffer.from(gzipped).toString('base64url');

    await expect(decodeShareData(fragment)).rejects.toThrow(ShareDecodeError);
  });

  it('round-trip of a manually built payload preserves message roles', async () => {
    const payload: SharePayload = {
      v: 1,
      title: 'Tiny',
      sharedAt: new Date().toISOString(),
      messages: [
        { role: 'user', content: 'hi', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'hello!', timestamp: new Date().toISOString() },
      ],
    };
    const decoded = await decodeShareData(await encodeShareData(payload));
    expect(decoded.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
  });
});
