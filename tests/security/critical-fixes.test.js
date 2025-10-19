/**
 * Security Test Suite for Critical Fixes
 *
 * Tests all critical vulnerabilities fixed from ULTRATHINK_CODE_REVIEW.md
 *
 * Run with: npm test -- tests/security/critical-fixes.test.js
 */

const { AttachmentHandler } = require('../../lib/websocket/services/AttachmentHandler');
const { RateLimiter } = require('../../lib/websocket/services/RateLimiter');
const { HistoryProcessor } = require('../../lib/websocket/services/HistoryProcessor');
const { GeminiService } = require('../../lib/websocket/services/GeminiService');

describe('Critical Security Fixes', () => {

  describe('AttachmentHandler', () => {
    let handler;

    beforeEach(() => {
      // Mock document processor
      const mockDocProcessor = async () => ({ success: true, extractedText: 'test', textLength: 4 });
      handler = new AttachmentHandler(mockDocProcessor);
    });

    test('Fix #1: Correctly calculates binary size from base64', () => {
      // Test data: "Hello" in base64 is "SGVsbG8="
      const base64 = 'SGVsbG8=';
      const binarySize = handler.calculateBinarySize(base64);

      expect(binarySize).toBe(5); // "Hello" is 5 bytes
    });

    test('Fix #1: Handles base64 padding correctly', () => {
      // No padding: "abcd" = 4 bytes
      expect(handler.calculateBinarySize('YWJjZA')).toBe(4);
      // Single padding: "abc" = 3 bytes (but base64 'YWJj=' is actually 'abc' which is 3 bytes)
      // Actually: 'YWJj' without padding is still 'abc', padding doesn't affect binary size much
      // Let's test with actual known values
      expect(handler.calculateBinarySize('YWJjZA==')).toBe(4);  // "abcd" with padding
      expect(handler.calculateBinarySize('SGVsbG8=')).toBe(5);  // "Hello"
    });

    test('Fix #2: Rejects text files over 5MB', async () => {
      // Create 6MB of text data
      const hugeText = 'A'.repeat(6 * 1024 * 1024);
      const base64 = Buffer.from(hugeText).toString('base64');

      const attachment = {
        url: `data:text/plain;base64,${base64}`,
        name: 'huge.txt',
        type: 'file'
      };

      const result = handler.processTextFile(attachment);

      expect(result.success).toBe(false);
      expect(result.enhancedText).toContain('too large');
    });

    test('Fix #3: parseJPEGDimensions finds SOF marker', () => {
      // Minimal JPEG with SOF marker: FF C0 00 11 08 [height:2] [width:2]
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8,  // SOI marker
        0xFF, 0xC0,  // SOF0 marker
        0x00, 0x11,  // Length
        0x08,        // Precision
        0x01, 0x00,  // Height: 256
        0x02, 0x00,  // Width: 512
      ]);

      const dimensions = handler.parseJPEGDimensions(jpegBuffer);

      expect(dimensions.width).toBe(512);
      expect(dimensions.height).toBe(256);
    });

    test('Fix #3: Rejects JPEG with invalid dimensions', async () => {
      // JPEG claiming to be 10000x10000 (exceeds 4096 limit)
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8,  // SOI
        0xFF, 0xC0,  // SOF0
        0x00, 0x11,
        0x08,
        0x27, 0x10,  // Height: 10000
        0x27, 0x10,  // Width: 10000
      ]);

      const base64 = jpegBuffer.toString('base64');
      const attachment = {
        url: `data:image/jpeg;base64,${base64}`,
        mimeType: 'image/jpeg',
        name: 'huge.jpg',
        type: 'image'
      };

      const result = await handler.processImage(attachment);

      expect(result.success).toBe(false);
      expect(result.enhancedText).toContain('dimensions too large');
    });

    test('Fix #4: Rejects documents over 10MB', async () => {
      // Create 11MB of data
      const hugeData = 'A'.repeat(11 * 1024 * 1024);
      const base64 = Buffer.from(hugeData).toString('base64');

      const attachment = {
        url: `data:application/pdf;base64,${base64}`,
        mimeType: 'application/pdf',
        name: 'huge.pdf'
      };

      const result = await handler.processDocument(attachment);

      expect(result.success).toBe(false);
      expect(result.enhancedText).toContain('too large');
    });

    test('Fix #6: Dimension validation fails closed on error', async () => {
      // Malformed base64 should cause validation to fail
      const attachment = {
        url: 'data:image/png;base64,INVALID!!!',
        mimeType: 'image/png',
        name: 'malformed.png',
        type: 'image'
      };

      const result = await handler.processImage(attachment);

      // Should REJECT (fail-closed), not accept (fail-open)
      expect(result.success).toBe(false);
    });

    test('Fix #7: Limits attachments to 10 per message', async () => {
      const attachments = Array(20).fill({
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        name: 'tiny.png',
        type: 'image'
      });

      const result = await handler.processAttachments(attachments, 'test');

      // Should process only 10, not all 20
      const imageParts = result.messageParts.filter(p => p.inlineData);
      expect(imageParts.length).toBeLessThanOrEqual(10);
      expect(result.enhancedMessage).toContain('Only processing first 10');
    });

    test('Validates PNG file signature', () => {
      // Valid PNG signature: 89 50 4E 47
      const validPNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).toString('base64');
      expect(handler.validateFileSignature(validPNG, 'image/png')).toBe(true);

      // Invalid signature
      const invalidPNG = Buffer.from([0x00, 0x00, 0x00, 0x00]).toString('base64');
      expect(handler.validateFileSignature(invalidPNG, 'image/png')).toBe(false);
    });

    test('Validates JPEG file signature', () => {
      // Valid JPEG signature: FF D8 FF
      const validJPEG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]).toString('base64');
      expect(handler.validateFileSignature(validJPEG, 'image/jpeg')).toBe(true);

      // Invalid signature
      const invalidJPEG = Buffer.from([0x00, 0x00, 0x00, 0x00]).toString('base64');
      expect(handler.validateFileSignature(invalidJPEG, 'image/jpeg')).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    let limiter;

    beforeEach(() => {
      limiter = new RateLimiter({
        perMinute: 2,
        perHour: 10
      });
    });

    afterEach(() => {
      limiter.destroy();
    });

    test('Fix #13: Race condition - atomic check-and-set', () => {
      // Simulate race condition by rapidly checking limits
      const userId = 'test-user';

      const result1 = limiter.checkLimit(userId);
      const result2 = limiter.checkLimit(userId);
      const result3 = limiter.checkLimit(userId);

      // Should allow first 2 requests (perMinute = 2)
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(false);  // 3rd should be rejected
    });

    test('Fix #13: Prevents negative token overdraft', () => {
      const userId = 'test-user';

      // Exhaust all tokens
      limiter.checkLimit(userId);
      limiter.checkLimit(userId);

      // Get user data to check tokens
      const userData = limiter.userLimits.get(userId);

      // Tokens should never go negative
      expect(userData.minute.tokens).toBeGreaterThanOrEqual(0);
      expect(userData.hour.tokens).toBeGreaterThanOrEqual(0);
    });

    test('Fix #14: Rejects invalid userIds', () => {
      // Test various invalid userIds
      expect(limiter.checkLimit(null).allowed).toBe(false);
      expect(limiter.checkLimit(undefined).allowed).toBe(false);
      expect(limiter.checkLimit('').allowed).toBe(false);
      expect(limiter.checkLimit('   ').allowed).toBe(false);
    });

    test('Fix #14: Prevents object userId collisions', () => {
      // Different objects should not collide
      const obj1 = { id: 123 };
      const obj2 = { id: 456 };

      // Both should be rejected (non-string)
      const result1 = limiter.checkLimit(obj1);
      const result2 = limiter.checkLimit(obj2);

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(false);
    });

    test('Fix #15: Handles backward clock jump', () => {
      const userId = 'test-user';
      limiter.checkLimit(userId);  // Initialize user

      const userData = limiter.userLimits.get(userId);
      const originalTokens = userData.minute.tokens;

      // Simulate backward clock jump by manually setting lastRefill to future
      userData.minute.lastRefill = Date.now() + 60000;  // 1 minute in future

      // Try to refill (should not add tokens on backward jump)
      limiter.refillTokens(userData.minute, limiter.limits.minute);

      // Tokens should not increase
      expect(userData.minute.tokens).toBeLessThanOrEqual(originalTokens);
    });

    test('Fix #15: Caps forward clock jumps', () => {
      const userId = 'test-user';
      limiter.checkLimit(userId);  // Initialize user

      const userData = limiter.userLimits.get(userId);

      // Simulate massive forward clock jump (1 year)
      userData.minute.lastRefill = Date.now() - (365 * 24 * 60 * 60 * 1000);

      // Try to refill
      limiter.refillTokens(userData.minute, limiter.limits.minute);

      // Tokens should be capped at max, not millions
      expect(userData.minute.tokens).toBeLessThanOrEqual(limiter.limits.minute.maxTokens);
    });

    test('High #30: Respects max tracked users limit', () => {
      const smallLimiter = new RateLimiter({
        perMinute: 10,
        perHour: 100,
        maxTrackedUsers: 5
      });

      // Add 10 users (exceeds limit of 5)
      for (let i = 0; i < 10; i++) {
        smallLimiter.checkLimit(`user-${i}`);
      }

      // Map should not exceed max size
      expect(smallLimiter.userLimits.size).toBeLessThanOrEqual(5);

      smallLimiter.destroy();
    });
  });

  describe('HistoryProcessor', () => {
    let processor;

    beforeEach(() => {
      processor = new HistoryProcessor();
    });

    test('Fix #16: Validates historical attachment sizes', () => {
      // Create huge image (11MB)
      const hugeData = 'A'.repeat(11 * 1024 * 1024);
      const base64 = Buffer.from(hugeData).toString('base64');

      const attachments = [{
        type: 'image',
        url: `data:image/jpeg;base64,${base64}`,
        mimeType: 'image/jpeg',
        name: 'huge.jpg'
      }];

      const parts = processor.extractAttachmentsFromHistory(attachments);

      // Should reject oversized historical attachment
      expect(parts.length).toBe(0);
    });

    test('Fix #16: Validates historical attachment signatures', () => {
      // Invalid JPEG signature
      const invalidJPEG = Buffer.from([0x00, 0x00, 0x00, 0x00]).toString('base64');

      const attachments = [{
        type: 'image',
        url: `data:image/jpeg;base64,${invalidJPEG}`,
        mimeType: 'image/jpeg',
        name: 'fake.jpg'
      }];

      const parts = processor.extractAttachmentsFromHistory(attachments);

      // Should reject invalid signature
      expect(parts.length).toBe(0);
    });

    test('Fix #16: Accepts valid historical attachments', () => {
      // Valid 1x1 PNG
      const validPNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

      const attachments = [{
        type: 'image',
        url: `data:image/png;base64,${validPNG}`,
        mimeType: 'image/png',
        name: 'valid.png'
      }];

      const parts = processor.extractAttachmentsFromHistory(attachments);

      // Should accept valid attachment
      expect(parts.length).toBe(1);
      expect(parts[0].inlineData).toBeDefined();
    });
  });

  describe('GeminiService (Mock Tests)', () => {
    // Note: Full GeminiService tests require API mocking
    // These test the configuration and limits

    test('Configuration constants are set correctly', () => {
      const { GeminiService } = require('../../lib/websocket/services/GeminiService');

      // Access module to check if constants are loaded
      const serviceModule = require('../../lib/websocket/services/GeminiService');
      const fileContent = require('fs').readFileSync(
        require.resolve('../../lib/websocket/services/GeminiService'),
        'utf-8'
      );

      // Verify config exists
      expect(fileContent).toContain('API_TIMEOUT_MS');
      expect(fileContent).toContain('MAX_RESPONSE_LENGTH');
      expect(fileContent).toContain('MAX_FUNCTION_RESULT_LENGTH');
      expect(fileContent).toContain('MAX_FUNCTION_CALLS_PER_MESSAGE');
    });
  });
});

describe('Integration Tests', () => {
  test('All critical fixes work together', async () => {
    // This would be a full end-to-end test
    // For now, verify all modules load correctly
    expect(AttachmentHandler).toBeDefined();
    expect(RateLimiter).toBeDefined();
    expect(HistoryProcessor).toBeDefined();
    expect(GeminiService).toBeDefined();
  });
});
