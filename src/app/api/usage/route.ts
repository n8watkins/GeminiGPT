import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { geminiLogOps } from '@/lib/database';

/**
 * GET /api/usage
 *
 * Shared-pool + per-user Gemini usage, sourced from the gemini_logs table
 * (each request row is tagged with key_class: 'pool' | 'byok').
 *
 * Contract (docs/RAG_OVERHAUL_PLAN.md — keep in sync with the `usage-info`
 * socket event emitted by lib/websocket/services/UsageTracker.js):
 *   { pool: { used, budget, resetAt, available }, user: { requests, tokens } }
 *
 * `user` is null when no user is identifiable (no session and no ?userId=).
 * The pool budget resets at UTC midnight; counters live in ephemeral SQLite
 * on Render's free tier (the Google-console cap is the true spend ceiling).
 *
 * Query params:
 * - userId: anonymous user ID (used only when there is no session)
 */

// Keep in sync with lib/websocket/services/UsageTracker.js
const DEFAULT_POOL_DAILY_REQUEST_BUDGET = 300;

function getPoolBudget(): number {
  const envBudget = parseInt(process.env.POOL_DAILY_REQUEST_BUDGET ?? '', 10);
  return Number.isFinite(envBudget) && envBudget >= 0
    ? envBudget
    : DEFAULT_POOL_DAILY_REQUEST_BUDGET;
}

function nextUtcMidnight(): string {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1
  )).toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || request.nextUrl.searchParams.get('userId') || null;

    const budget = getPoolBudget();
    const used = geminiLogOps.countPoolRequestsToday();

    const pool = {
      used,
      budget,
      resetAt: nextUtcMidnight(),
      available: Math.max(0, budget - used)
    };

    const user = userId ? geminiLogOps.getUserUsageToday(userId) : null;

    return NextResponse.json({ pool, user });
  } catch (error) {
    console.error('[API] Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
