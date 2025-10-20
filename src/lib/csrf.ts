import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Generates a cryptographically secure CSRF token
 *
 * @returns A 64-character hexadecimal CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validates CSRF token from request headers against cookie value
 *
 * @param request - Next.js request object
 * @returns true if CSRF token is valid, false otherwise
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const token = request.headers.get(CSRF_TOKEN_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!token || !cookieToken || token !== cookieToken) {
    return false;
  }

  return true;
}

/**
 * Gets the CSRF token from cookies
 *
 * @param request - Next.js request object
 * @returns CSRF token or null if not found
 */
export function getCsrfToken(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

export const CSRF_CONSTANTS = {
  HEADER: CSRF_TOKEN_HEADER,
  COOKIE: CSRF_COOKIE_NAME,
};
