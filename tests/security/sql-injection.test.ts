/**
 * SQL Injection Prevention Tests
 *
 * Tests defensive measures against SQL injection attacks in vector database queries.
 */

import {
  escapeSqlString,
  validateUUID,
  validateUUIDs,
  safeSqlWhere,
  safeLimitClause,
} from '../../src/lib/utils/sqlSanitizer';

describe('SQL Injection Prevention', () => {
  describe('escapeSqlString', () => {
    test('escapes single quotes correctly', () => {
      expect(escapeSqlString("test'value")).toBe("test''value");
      expect(escapeSqlString("it's")).toBe("it''s");
      expect(escapeSqlString("multiple'single'quotes")).toBe(
        "multiple''single''quotes"
      );
    });

    test('handles strings without quotes', () => {
      expect(escapeSqlString('normal string')).toBe('normal string');
      expect(escapeSqlString('test123')).toBe('test123');
    });

    test('handles empty strings', () => {
      expect(escapeSqlString('')).toBe('');
    });

    test('throws error for non-string input', () => {
      expect(() => escapeSqlString(123 as any)).toThrow(
        'escapeSqlString expects a string'
      );
      expect(() => escapeSqlString(null as any)).toThrow(
        'escapeSqlString expects a string'
      );
      expect(() => escapeSqlString(undefined as any)).toThrow(
        'escapeSqlString expects a string'
      );
    });

    test('prevents SQL injection via quote escaping', () => {
      const malicious = "'; DROP TABLE users; --";
      const escaped = escapeSqlString(malicious);
      // After escaping, quotes are doubled - SQL will treat as literal string
      expect(escaped).toBe("''; DROP TABLE users; --");
    });
  });

  describe('validateUUID', () => {
    test('accepts valid UUID v4', () => {
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateUUID('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(true);
    });

    test('rejects invalid formats', () => {
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('123e4567-e89b-12d3-a456')).toBe(false); // too short
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(
        false
      ); // too long
      expect(validateUUID('')).toBe(false);
    });

    test('rejects SQL injection attempts', () => {
      // Common SQL injection patterns
      expect(validateUUID("' OR '1'='1")).toBe(false);
      expect(validateUUID("'; DROP TABLE users; --")).toBe(false);
      expect(validateUUID("1' UNION SELECT * FROM users--")).toBe(false);
      expect(validateUUID("admin'--")).toBe(false);
      expect(validateUUID("1' OR '1'='1' /*")).toBe(false);
    });

    test('rejects path traversal attempts', () => {
      expect(validateUUID('../../../etc/passwd')).toBe(false);
      expect(validateUUID('..\\..\\..\\windows\\system32')).toBe(false);
    });

    test('rejects XSS attempts', () => {
      expect(validateUUID("<script>alert('xss')</script>")).toBe(false);
      expect(validateUUID('"><img src=x onerror=alert(1)>')).toBe(false);
    });

    test('handles non-string input gracefully', () => {
      expect(validateUUID(null as any)).toBe(false);
      expect(validateUUID(undefined as any)).toBe(false);
      expect(validateUUID(123 as any)).toBe(false);
      expect(validateUUID({} as any)).toBe(false);
    });

    test('is case-insensitive for hex characters', () => {
      expect(validateUUID('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });
  });

  describe('validateUUIDs', () => {
    test('validates multiple UUIDs', () => {
      const result = validateUUIDs({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        chatId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.valid).toBe(true);
      expect(result.invalid).toEqual([]);
    });

    test('identifies invalid UUIDs', () => {
      const result = validateUUIDs({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        chatId: 'invalid-id',
        messageId: "' OR '1'='1",
      });
      expect(result.valid).toBe(false);
      expect(result.invalid).toEqual(['chatId', 'messageId']);
    });

    test('handles empty object', () => {
      const result = validateUUIDs({});
      expect(result.valid).toBe(true);
      expect(result.invalid).toEqual([]);
    });
  });

  describe('safeSqlWhere', () => {
    test('builds safe WHERE clause for valid input', () => {
      const clause = safeSqlWhere({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(clause).toBe(
        "user_id = '123e4567-e89b-12d3-a456-426614174000'"
      );
    });

    test('builds multiple conditions with AND', () => {
      const clause = safeSqlWhere({
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        chat_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(clause).toContain('AND');
      expect(clause).toContain('user_id =');
      expect(clause).toContain('chat_id =');
    });

    test('escapes single quotes in values', () => {
      const clause = safeSqlWhere({
        user_id: "test'value",
      });
      expect(clause).toBe("user_id = 'test''value'");
    });

    test('rejects invalid column names', () => {
      expect(() => {
        safeSqlWhere({ invalid_column: 'value' });
      }).toThrow('Invalid column name: invalid_column');

      expect(() => {
        safeSqlWhere({ 'malicious; DROP TABLE': 'value' });
      }).toThrow('Invalid column name');

      expect(() => {
        safeSqlWhere({ 'user_id; DELETE FROM messages': 'value' });
      }).toThrow('Invalid column name');
    });

    test('rejects non-string values', () => {
      expect(() => {
        safeSqlWhere({ user_id: 123 as any });
      }).toThrow('Column user_id value must be a string');

      expect(() => {
        safeSqlWhere({ user_id: null as any });
      }).toThrow('Column user_id value must be a string');
    });

    test('prevents column injection via semicolon', () => {
      expect(() => {
        safeSqlWhere({ 'user_id;': 'value' });
      }).toThrow('Invalid column name');
    });

    test('prevents column injection via comment', () => {
      expect(() => {
        safeSqlWhere({ 'user_id--': 'value' });
      }).toThrow('Invalid column name');

      expect(() => {
        safeSqlWhere({ 'user_id/*': 'value' });
      }).toThrow('Invalid column name');
    });
  });

  describe('safeLimitClause', () => {
    test('accepts valid positive integers', () => {
      expect(safeLimitClause(10)).toBe(10);
      expect(safeLimitClause(100)).toBe(100);
      expect(safeLimitClause(999)).toBe(999);
    });

    test('accepts string numbers', () => {
      expect(safeLimitClause('10')).toBe(10);
      expect(safeLimitClause('100')).toBe(100);
    });

    test('enforces maximum limit', () => {
      expect(() => safeLimitClause(2000, 1000)).toThrow(
        'LIMIT cannot exceed 1000'
      );
      expect(() => safeLimitClause(9999)).toThrow('LIMIT cannot exceed 1000');
    });

    test('rejects negative numbers', () => {
      expect(() => safeLimitClause(-1)).toThrow(
        'LIMIT must be a positive integer'
      );
      expect(() => safeLimitClause(-100)).toThrow(
        'LIMIT must be a positive integer'
      );
    });

    test('rejects zero', () => {
      expect(() => safeLimitClause(0)).toThrow(
        'LIMIT must be a positive integer'
      );
    });

    test('rejects non-numeric input', () => {
      expect(() => safeLimitClause('abc' as any)).toThrow(
        'LIMIT must be a positive integer'
      );
      expect(() => safeLimitClause("'; DROP TABLE" as any)).toThrow(
        'LIMIT must be a positive integer'
      );
    });

    test('rejects SQL injection attempts', () => {
      expect(() => safeLimitClause('10; DROP TABLE users' as any)).toThrow(
        'LIMIT must be a positive integer'
      );
      expect(() => safeLimitClause("10' OR '1'='1" as any)).toThrow(
        'LIMIT must be a positive integer'
      );
    });

    test('accepts custom max limit', () => {
      expect(safeLimitClause(50, 100)).toBe(50);
      expect(() => safeLimitClause(150, 100)).toThrow(
        'LIMIT cannot exceed 100'
      );
    });
  });

  describe('Integration Tests', () => {
    test('complete WHERE clause with validated UUID and escaped value', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Validate UUID first
      expect(validateUUID(userId)).toBe(true);

      // Build safe WHERE clause
      const clause = safeSqlWhere({ user_id: userId });
      expect(clause).toBe(`user_id = '${userId}'`);

      // Ensure no injection is possible
      expect(clause).not.toContain('DROP');
      expect(clause).not.toContain('DELETE');
      expect(clause).not.toContain('--');
    });

    test('rejects malicious workflow completely', () => {
      const maliciousId = "'; DROP TABLE users; --";

      // Step 1: Validation should fail
      expect(validateUUID(maliciousId)).toBe(false);

      // Step 2: Even if validation is bypassed, safeSqlWhere escapes
      const clause = safeSqlWhere({ user_id: maliciousId });

      // The attack is neutered by quote escaping
      expect(clause).toBe("user_id = '''; DROP TABLE users; --'");
      // Note: doubled quotes make SQL treat this as a literal string
    });

    test('complex attack scenario', () => {
      const attacks = [
        "1' OR '1'='1",
        "'; DROP TABLE users; --",
        "admin'--",
        "1' UNION SELECT * FROM users--",
        "' OR 1=1--",
      ];

      attacks.forEach((attack) => {
        // UUID validation should reject all of these
        expect(validateUUID(attack)).toBe(false);

        // Even if they get through, they're escaped
        const clause = safeSqlWhere({ user_id: attack });

        // Should not contain active SQL keywords (quotes are doubled)
        expect(clause).toContain("''"); // Doubled quotes
      });
    });
  });
});
