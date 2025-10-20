import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, getCsrfToken, CSRF_CONSTANTS } from '@/lib/csrf';

/**
 * GET /api/csrf
 * Returns or generates a CSRF token for the client
 */
export async function GET(request: NextRequest) {
  // Check if token already exists in cookies
  let token = getCsrfToken(request);

  // Generate new token if doesn't exist
  if (!token) {
    token = generateCsrfToken();
  }

  const response = NextResponse.json({
    token,
    header: CSRF_CONSTANTS.HEADER,
  });

  // Set CSRF token in httpOnly cookie
  response.cookies.set(CSRF_CONSTANTS.COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return response;
}
