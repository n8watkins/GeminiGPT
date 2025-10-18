/**
 * Generates a random user ID that resets on browser refresh
 * Uses a combination of timestamp and random string for uniqueness
 */

export function generateUserId(): string {
  // Generate a random string of 6 characters
  const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Get current timestamp (last 4 digits for brevity)
  const timestamp = Date.now().toString().slice(-4);
  
  // Combine them with a dash
  return `USER-${randomString}-${timestamp}`;
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
