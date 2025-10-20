import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { validateUUID } from '@/lib/utils/sqlSanitizer';
import { logger } from '@/lib/logger';
import { validateCsrfToken } from '@/lib/csrf';
import { withTimeout, isTimeoutError } from '@/lib/apiTimeout';
import { rateLimit } from '@/lib/middleware/rateLimit';

const SHARED_CHATS_DIR = path.join(process.cwd(), 'shared-chats');
const MAX_SHARE_SIZE_BYTES = 1024 * 1024; // 1MB limit
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

// Rate limiting for share endpoints
const sharePostRateLimit = rateLimit({
  maxRequests: 10, // 10 share creations per minute
  windowMs: 60 * 1000,
});

const shareGetRateLimit = rateLimit({
  maxRequests: 60, // 60 share fetches per minute
  windowMs: 60 * 1000,
});

export async function POST(request: NextRequest) {
  // Check rate limit first
  const rateLimitResponse = sharePostRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // CSRF Protection - validate token for state-changing operation
    if (!validateCsrfToken(request)) {
      logger.warn('CSRF token validation failed');
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
      );
    }

    // Check Content-Length header for size limit
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > MAX_SHARE_SIZE_BYTES) {
      logger.warn('Share data too large', { contentLength });
      return NextResponse.json(
        { error: 'Share data too large (max 1MB)' },
        { status: 413 } // Payload Too Large
      );
    }

    const { chat } = await withTimeout(
      request.json(),
      5000, // 5 second timeout for parsing request
      'Request body parsing timeout'
    );

    if (!chat || !chat.id || !chat.messages) {
      return NextResponse.json(
        { error: 'Invalid chat data' },
        { status: 400 }
      );
    }

    // Validate chat object size after parsing
    const chatJson = JSON.stringify(chat);
    if (chatJson.length > MAX_SHARE_SIZE_BYTES) {
      logger.warn('Share data exceeds size limit after parsing', { size: chatJson.length });
      return NextResponse.json(
        { error: 'Share data exceeds size limit' },
        { status: 413 }
      );
    }

    // Generate a unique share ID
    const shareId = uuidv4();

    // Prepare the shared chat data
    const sharedChat = {
      shareId,
      originalChatId: chat.id,
      title: chat.title,
      messages: chat.messages,
      createdAt: new Date().toISOString(),
      sharedAt: new Date().toISOString(),
    };

    // Save to file with timeout
    const filePath = path.join(SHARED_CHATS_DIR, `${shareId}.json`);
    await withTimeout(
      writeFile(filePath, JSON.stringify(sharedChat, null, 2), 'utf-8'),
      REQUEST_TIMEOUT_MS,
      'File write timeout'
    );

    logger.info('Share link created', { shareId, chatId: chat.id });

    // Return the share ID and URL
    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:1337'}/share/${shareId}`;

    return NextResponse.json({
      shareId,
      shareUrl,
      success: true,
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      logger.warn('Share link creation timeout', { error });
      return NextResponse.json(
        { error: 'Request timeout. Please try again.' },
        { status: 504 } // Gateway Timeout
      );
    }

    logger.error('Error creating share link', { error });
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check rate limit first
  const rateLimitResponse = shareGetRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Validate shareId is a valid UUID (prevents path traversal)
    if (!validateUUID(shareId)) {
      logger.warn('Invalid share ID format attempted', {
        shareId: shareId.substring(0, 50) // Truncate for logging safety
      });
      return NextResponse.json(
        { error: 'Invalid share ID format' },
        { status: 400 }
      );
    }

    // Now safe to use in file path
    const filePath = path.join(SHARED_CHATS_DIR, `${shareId}.json`);

    // Additional safety: verify resolved path is within SHARED_CHATS_DIR
    const resolvedPath = path.resolve(filePath);
    const baseDir = path.resolve(SHARED_CHATS_DIR);
    if (!resolvedPath.startsWith(baseDir)) {
      logger.error('Path traversal attempt detected', { shareId, resolvedPath });
      return NextResponse.json(
        { error: 'Invalid share ID' },
        { status: 403 }
      );
    }

    if (!existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: 'Shared chat not found' },
        { status: 404 }
      );
    }

    const fileContent = await withTimeout(
      readFile(resolvedPath, 'utf-8'),
      REQUEST_TIMEOUT_MS,
      'File read timeout'
    );
    const sharedChat = JSON.parse(fileContent);

    logger.info('Shared chat accessed', { shareId });

    return NextResponse.json(sharedChat);
  } catch (error) {
    if (isTimeoutError(error)) {
      logger.warn('Shared chat fetch timeout', { error });
      return NextResponse.json(
        { error: 'Request timeout. Please try again.' },
        { status: 504 } // Gateway Timeout
      );
    }

    logger.error('Error fetching shared chat', { error });
    return NextResponse.json(
      { error: 'Failed to fetch shared chat' },
      { status: 500 }
    );
  }
}
