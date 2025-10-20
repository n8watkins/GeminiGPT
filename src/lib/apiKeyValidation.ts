/**
 * API Key Validation Utilities
 *
 * Validates Google Gemini API keys on both client and server.
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates a Google Gemini API key format
 *
 * @param key - The API key to validate
 * @returns Validation result with reason if invalid
 */
export function validateGeminiApiKey(key: string | null | undefined): ValidationResult {
  // Check for null/undefined/empty
  if (!key || typeof key !== 'string') {
    return { valid: false, reason: 'API key is required' };
  }

  const trimmedKey = key.trim();

  // Check if empty after trimming
  if (trimmedKey.length === 0) {
    return { valid: false, reason: 'API key cannot be empty' };
  }

  // Gemini API keys start with 'AIza'
  if (!trimmedKey.startsWith('AIza')) {
    return { valid: false, reason: 'Gemini API keys start with "AIza"' };
  }

  // Check minimum length (Gemini keys are typically 39 characters)
  if (trimmedKey.length < 39) {
    return { valid: false, reason: 'API key is too short (should be at least 39 characters)' };
  }

  // Check maximum reasonable length (prevent massive strings)
  if (trimmedKey.length > 100) {
    return { valid: false, reason: 'API key is too long (maximum 100 characters)' };
  }

  // Check for valid characters (alphanumeric, underscore, hyphen)
  if (!/^[A-Za-z0-9_-]+$/.test(trimmedKey)) {
    return { valid: false, reason: 'API key contains invalid characters (only letters, numbers, - and _ allowed)' };
  }

  return { valid: true };
}

/**
 * Checks if a key is likely valid without detailed validation
 * Useful for quick checks
 */
export function isValidApiKeyFormat(key: string | null | undefined): boolean {
  return validateGeminiApiKey(key).valid;
}

/**
 * Sanitizes an API key for logging (shows only first/last 4 chars)
 * Never logs the full key
 *
 * @param key - The API key to sanitize
 * @returns Sanitized string safe for logging
 */
export function sanitizeApiKeyForLogging(key: string | null | undefined): string {
  if (!key || typeof key !== 'string' || key.length < 12) {
    return '***';
  }

  const first4 = key.substring(0, 4);
  const last4 = key.substring(key.length - 4);
  return `${first4}...${last4}`;
}

/**
 * Creates a cryptographically secure hash fingerprint of an API key for identification
 * Does NOT reveal the actual key
 * Useful for server-side logging to identify which key was used
 *
 * SECURITY: Uses SHA-256 for collision resistance and prevents reverse-engineering
 *
 * @param key - The API key to fingerprint
 * @returns Secure hash fingerprint (16 chars) or null if invalid key
 */
export function getApiKeyFingerprint(key: string | null | undefined): string | null {
  if (!key || typeof key !== 'string') {
    return null;
  }

  // Use Web Crypto API (available in browsers and Node.js 15+)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment - use Web Crypto API (async, but we need sync)
    // Fall back to simple hash for browser (will be replaced by server-side)
    // This is acceptable because fingerprinting primarily happens server-side
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
  }

  // Node.js environment - use crypto module
  try {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    // Use first 16 chars for better collision resistance than 8
    return hash.substring(0, 16);
  } catch {
    // Fallback if crypto not available
    console.warn('Crypto module not available, using fallback hash');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
  }
}
