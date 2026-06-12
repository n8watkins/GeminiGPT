import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { userOps } from '@/lib/database';

/**
 * POST /api/migrate
 *
 * Migrates an anonymous user's data to an authenticated Google user.
 * This is a one-way, irreversible operation.
 *
 * Request body:
 * {
 *   anonymousUserId: string  // The anonymous user ID to migrate from
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   message: string
 *   chatsMigrated?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL SECURITY: CSRF protection - validate request origin
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // Get expected origins from environment. In dev the server port is
    // randomized (see server.js), so any localhost origin is accepted.
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction
      ? [
          process.env.NEXT_PUBLIC_APP_URL,
          process.env.PRODUCTION_URL,
          process.env.NEXTAUTH_URL
        ].filter(Boolean)
      : [];
    const devOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+/;

    // Validate origin or referer matches allowed origins
    const matchesAllowed = (value: string) =>
      isProduction
        ? allowedOrigins.some(allowed => value.startsWith(allowed as string))
        : devOriginPattern.test(value);
    const isValidOrigin = origin && matchesAllowed(origin);
    const isValidReferer = referer && matchesAllowed(referer);

    if (!isValidOrigin && !isValidReferer) {
      console.error('🚨 CSRF attempt detected', { origin, referer, allowedOrigins });
      return NextResponse.json(
        { success: false, message: 'Invalid request origin (CSRF protection)' },
        { status: 403 }
      );
    }

    // Verify user is authenticated
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const googleUserId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { anonymousUserId } = body;

    // Validate anonymous user ID
    if (!anonymousUserId || typeof anonymousUserId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid anonymous user ID' },
        { status: 400 }
      );
    }

    // Ensure it's actually an anonymous user ID
    if (!anonymousUserId.startsWith('USER-')) {
      return NextResponse.json(
        { success: false, message: 'Not an anonymous user ID' },
        { status: 400 }
      );
    }

    // Prevent migrating to yourself (shouldn't happen, but safety check)
    if (anonymousUserId === googleUserId) {
      return NextResponse.json(
        { success: false, message: 'Cannot migrate to same user' },
        { status: 400 }
      );
    }

    // Check if anonymous user exists
    const anonymousUser = userOps.get(anonymousUserId);
    if (!anonymousUser) {
      return NextResponse.json(
        { success: false, message: 'Anonymous user not found' },
        { status: 404 }
      );
    }

    // Check if Google user already exists (should exist from sign-in callback)
    const googleUser = userOps.get(googleUserId);
    if (!googleUser) {
      return NextResponse.json(
        { success: false, message: 'Google user not found' },
        { status: 404 }
      );
    }

    console.log(`🔄 Starting migration: ${anonymousUserId} → ${googleUserId}`);

    // Perform migration using database transaction
    const chatsMigrated = userOps.migrateToGoogle(
      anonymousUserId,
      googleUserId,
      session.user.email,
      session.user.name,
      session.user.image
    );

    console.log(`✅ Migration complete: ${chatsMigrated} chats migrated`);

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${chatsMigrated} chats`,
      chatsMigrated
    });

  } catch (error) {
    console.error('❌ Migration error:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Migration failed'
      },
      { status: 500 }
    );
  }
}
