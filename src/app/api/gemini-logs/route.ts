import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { geminiLogOps } from '@/lib/database';

/**
 * GET /api/gemini-logs
 *
 * Fetch Gemini API logs for the current user or chat
 *
 * Query params:
 * - chatId: Filter by chat ID
 * - limit: Number of logs to return (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session (for authenticated users)
    const session = await getServerSession(authOptions);

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('chatId');
    const userId = searchParams.get('userId'); // Get userId from query params
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50;

    console.log('[API] GET /api/gemini-logs - Params:', { chatId, userId, limit, hasSession: !!session });

    let logs;

    if (chatId) {
      // Filter by chat ID
      console.log('[API] Querying by chatId:', chatId);
      logs = geminiLogOps.getByChat(chatId, limit);
    } else if (session?.user?.id) {
      // Get logs for authenticated user
      console.log('[API] Querying by session userId:', session.user.id);
      logs = geminiLogOps.getByUser(session.user.id, limit);
    } else if (userId) {
      // Get logs for anonymous user (from query param)
      console.log('[API] Querying by anonymous userId:', userId);
      logs = geminiLogOps.getByUser(userId, limit);
    } else {
      // No user ID available - return all recent logs
      console.log('[API] No userId, fetching recent logs');
      logs = geminiLogOps.getRecent(limit);
    }

    console.log('[API] Raw logs from DB:', logs?.length || 0);

    // Parse JSON strings back to objects for the client
    const parsedLogs = logs.map((log: any) => ({
      ...log,
      request_data: log.request_data ? JSON.parse(log.request_data) : null,
      response_data: log.response_data ? JSON.parse(log.response_data) : null,
      error_data: log.error_data ? JSON.parse(log.error_data) : null,
      function_calls: log.function_calls ? JSON.parse(log.function_calls) : [],
      metadata: log.metadata ? JSON.parse(log.metadata) : {}
    }));

    console.log('[API] Returning', parsedLogs.length, 'parsed logs');

    return NextResponse.json({
      success: true,
      logs: parsedLogs,
      count: parsedLogs.length
    });
  } catch (error) {
    console.error('[API] Error fetching Gemini logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gemini-logs/stats
 *
 * Get statistics about Gemini API usage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const { chatId, userId: bodyUserId } = body;

    const userId = session?.user?.id || bodyUserId;
    const stats = geminiLogOps.getStats(chatId, userId);

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching Gemini stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stats'
      },
      { status: 500 }
    );
  }
}
