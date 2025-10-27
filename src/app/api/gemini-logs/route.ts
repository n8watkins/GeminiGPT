import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { geminiLogOps } from '@/lib/database';
import { getSessionUserId } from '@/lib/userId';

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

    // Get session user ID (works for both authenticated and anonymous users)
    const sessionUserId = getSessionUserId();

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('chatId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50;

    let logs;

    if (chatId) {
      // Filter by chat ID
      logs = geminiLogOps.getByChat(chatId, limit);
    } else {
      // Get all logs for user (either authenticated or anonymous session user)
      const userId = session?.user?.id || sessionUserId;
      logs = geminiLogOps.getByUser(userId, limit);
    }

    // Parse JSON strings back to objects for the client
    const parsedLogs = logs.map((log: any) => ({
      ...log,
      request_data: log.request_data ? JSON.parse(log.request_data) : null,
      response_data: log.response_data ? JSON.parse(log.response_data) : null,
      error_data: log.error_data ? JSON.parse(log.error_data) : null,
      function_calls: log.function_calls ? JSON.parse(log.function_calls) : [],
      metadata: log.metadata ? JSON.parse(log.metadata) : {}
    }));

    return NextResponse.json({
      success: true,
      logs: parsedLogs,
      count: parsedLogs.length
    });
  } catch (error) {
    console.error('Error fetching Gemini logs:', error);
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
    const sessionUserId = getSessionUserId();

    const body = await request.json();
    const { chatId } = body;

    const userId = session?.user?.id || sessionUserId;
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
