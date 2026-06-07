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

    let logs;

    if (chatId) {
      // Filter by chat ID
      logs = geminiLogOps.getByChat(chatId, limit);
    } else if (session?.user?.id) {
      // Get logs for authenticated user
      logs = geminiLogOps.getByUser(session.user.id, limit);
    } else if (userId) {
      // Get logs for anonymous user (from query param)
      logs = geminiLogOps.getByUser(userId, limit);
    } else {
      // No user ID available - return all recent logs
      logs = geminiLogOps.getRecent(limit);
    }

    // Parse JSON strings back to objects for the client
    const parsedLogs = (logs as Array<Record<string, unknown>>).map((log) => ({
      ...log,
      request_data: log.request_data ? JSON.parse(log.request_data as string) : null,
      response_data: log.response_data ? JSON.parse(log.response_data as string) : null,
      error_data: log.error_data ? JSON.parse(log.error_data as string) : null,
      function_calls: log.function_calls ? JSON.parse(log.function_calls as string) : [],
      metadata: log.metadata ? JSON.parse(log.metadata as string) : {}
    }));

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
