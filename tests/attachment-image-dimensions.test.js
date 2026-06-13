/**
 * Regression test: image attachments must be accepted for all common web
 * formats (PNG, JPEG, GIF, WebP).
 *
 * Bug history: the client accepts any `image/*` file, but the server's
 * dimension validator only parsed PNG and JPEG. GIF and WebP fell through with
 * width/height = 0 and were fail-closed as "[Image dimensions too large: 0x0]",
 * so they were silently dropped before reaching Gemini.
 */

const { AttachmentHandler } = require('../lib/websocket/services/AttachmentHandler');

// Minimal valid 1x1 images, base64-encoded.
const FIXTURES = {
  'image/png': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'image/gif': 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  // VP8 lossy WebP (1x1)
  'image/webp': 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
};

function makeAttachment(mimeType, base64) {
  return {
    type: 'image',
    name: `test.${mimeType.split('/')[1]}`,
    mimeType,
    url: `data:${mimeType};base64,${base64}`,
  };
}

describe('AttachmentHandler image dimension parsing', () => {
  const handler = new AttachmentHandler(async () => ({ success: false }));

  for (const [mimeType, base64] of Object.entries(FIXTURES)) {
    it(`accepts a valid ${mimeType} image and emits inline data`, async () => {
      const result = await handler.processImage(makeAttachment(mimeType, base64));
      expect(result.success).toBe(true);
      expect(result.messageParts).toHaveLength(1);
      expect(result.messageParts[0].inlineData.mimeType).toBe(mimeType);
      expect(result.enhancedText).toBe('');
    });
  }

  it('rejects an image whose dimensions exceed the max', async () => {
    // Forge a GIF logical-screen descriptor of 9999x9999 (> 4096 limit).
    const header = Buffer.from('GIF89a', 'ascii');
    const dims = Buffer.alloc(4);
    dims.writeUInt16LE(9999, 0);
    dims.writeUInt16LE(9999, 2);
    const buf = Buffer.concat([header, dims, Buffer.alloc(20)]);
    const att = makeAttachment('image/gif', buf.toString('base64'));
    const result = await handler.processImage(att);
    expect(result.success).toBe(false);
    expect(result.enhancedText).toContain('dimensions too large');
  });
});
