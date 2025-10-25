/**
 * Generates a cryptographically secure random user ID
 *
 * CRITICAL SECURITY FIX: Uses Web Crypto API instead of Math.random()
 * - Math.random() is predictable and not cryptographically secure
 * - crypto.getRandomValues() provides secure randomness
 * - 16 bytes (128 bits) of entropy = 2^128 possible values (~3.4 x 10^38)
 * - Collision probability with 1 billion users: ~1.47 x 10^-19 (negligible)
 */
export function generateUserId(): string {
  // CRITICAL FIX: Use Web Crypto API for cryptographically secure random generation
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Generate 16 random bytes (128 bits of entropy)
    const buffer = new Uint8Array(16);
    window.crypto.getRandomValues(buffer);

    // Convert to hex string
    const hexString = Array.from(buffer)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    // Format as USER-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX (UUID-like)
    return `USER-${hexString.substring(0, 8)}-${hexString.substring(8, 16)}-${hexString.substring(16, 24)}-${hexString.substring(24, 32)}`.toUpperCase();
  }

  // Fallback for environments without crypto.getRandomValues (should never happen in modern browsers)
  // Use timestamp + multiple random values as weak fallback
  console.warn('crypto.getRandomValues not available, using weaker fallback');
  const timestamp = Date.now().toString(36).toUpperCase();
  const random1 = Math.random().toString(36).substring(2, 10).toUpperCase();
  const random2 = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `USER-${timestamp}-${random1}-${random2}`;
}

/**
 * Gets or creates a user ID for the current session
 * This will persist across browser sessions using localStorage
 */
export function getSessionUserId(): string {
  // Check if we already have a user ID in local storage
  if (typeof window !== 'undefined') {
    const existingUserId = localStorage.getItem('gemini-chat-user-id');
    if (existingUserId) {
      return existingUserId;
    }
    
    // Generate new user ID and store it
    const newUserId = generateUserId();
    localStorage.setItem('gemini-chat-user-id', newUserId);
    return newUserId;
  }
  
  // Fallback for server-side rendering
  return generateUserId();
}

/**
 * Manually set a user ID (useful for migrating data or testing)
 */
export function setUserId(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gemini-chat-user-id', userId);
  }
}

/**
 * Get the current user ID without generating a new one
 */
export function getCurrentUserId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gemini-chat-user-id');
  }
  return null;
}

/**
 * Clear the current user ID (useful for testing or resetting)
 */
export function clearUserId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gemini-chat-user-id');
  }
}
