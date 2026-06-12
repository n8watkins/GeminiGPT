/**
 * Usage Tracker Service
 *
 * Tracks consumption of the shared server Gemini key ("the pool") and per-user
 * request/token totals, sourced from the existing `gemini_logs` table (every
 * Gemini request is already logged there with a `key_class` tag).
 *
 * Pool budget:
 * - Env-configurable daily request budget (POOL_DAILY_REQUEST_BUDGET, default 300)
 * - Resets at UTC midnight. SQLite counters are ephemeral on Render's free
 *   tier (fresh DB per boot) — that's accepted; the Google-console budget cap
 *   on the shared key is the true spend ceiling.
 *
 * Performance:
 * - The current-day pool count is cached in memory and incremented in-process
 *   (single server instance), so the hot path does zero SQL. The cache is
 *   re-seeded from SQLite on boot and on UTC day rollover. No polling loops.
 *
 * Contract (see docs/RAG_OVERHAUL_PLAN.md):
 * - `usage-info` socket event / GET /api/usage:
 *   { pool: { used, budget, resetAt, available }, user: { requests, tokens } }
 * - Pool exhaustion → standard `message-error` path with code 'POOL_EXHAUSTED'.
 */

const DEFAULT_POOL_DAILY_REQUEST_BUDGET = 300;

class UsageTracker {
  /**
   * @param {Object} geminiLogOps - gemini_logs operations from lib/database.cjs
   * @param {number} [budget] - Daily pool request budget (overrides env)
   */
  constructor(geminiLogOps, budget = null) {
    this.geminiLogOps = geminiLogOps;

    const envBudget = parseInt(process.env.POOL_DAILY_REQUEST_BUDGET, 10);
    this.budget = budget ?? (Number.isFinite(envBudget) && envBudget >= 0
      ? envBudget
      : DEFAULT_POOL_DAILY_REQUEST_BUDGET);

    // In-memory cache of today's pool request count (re-seeded on day rollover)
    this.cacheDay = null; // 'YYYY-MM-DD' (UTC)
    this.poolUsed = 0;

    console.log('✅ UsageTracker initialized', { poolDailyRequestBudget: this.budget });
  }

  /**
   * Current UTC day as 'YYYY-MM-DD'
   * @private
   */
  _utcDay() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Make sure the cached pool count belongs to today (UTC); re-seed from
   * SQLite otherwise (boot, or day rollover).
   * @private
   */
  _ensureFreshCache() {
    const today = this._utcDay();
    if (this.cacheDay !== today) {
      try {
        this.poolUsed = this.geminiLogOps.countPoolRequestsToday();
      } catch (error) {
        console.error('❌ [UsageTracker] Failed to seed pool count from DB:', error);
        this.poolUsed = 0;
      }
      this.cacheDay = today;
    }
  }

  /**
   * Record one request against the pool (call when a pool-key generation starts).
   * BYOK requests must NOT be recorded here.
   */
  recordPoolRequest() {
    this._ensureFreshCache();
    this.poolUsed += 1;
  }

  /**
   * Is there pool budget left for another request?
   * @returns {boolean}
   */
  hasPoolBudget() {
    return this.getPoolUsage().available > 0;
  }

  /**
   * Pool meter snapshot.
   * @returns {{ used: number, budget: number, resetAt: string, available: number }}
   */
  getPoolUsage() {
    this._ensureFreshCache();

    // Next UTC midnight
    const now = new Date();
    const resetAt = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1
    )).toISOString();

    return {
      used: this.poolUsed,
      budget: this.budget,
      resetAt,
      available: Math.max(0, this.budget - this.poolUsed)
    };
  }

  /**
   * Per-user stats for today (UTC). Counts both pool and BYOK requests made
   * by that user.
   *
   * @param {string|null} userId
   * @returns {{ requests: number, tokens: number }|null} null when the user is unknown
   */
  getUserUsage(userId) {
    if (!userId) return null;
    try {
      const row = this.geminiLogOps.getUserUsageToday(userId);
      return { requests: row?.requests || 0, tokens: row?.tokens || 0 };
    } catch (error) {
      console.error('❌ [UsageTracker] Failed to read user usage:', error);
      return null;
    }
  }

  /**
   * Full `usage-info` payload for one user (contract shape).
   *
   * @param {string|null} userId
   * @returns {{ pool: Object, user: Object|null }}
   */
  buildUsageInfo(userId = null) {
    return {
      pool: this.getPoolUsage(),
      user: this.getUserUsage(userId)
    };
  }
}

module.exports = { UsageTracker, DEFAULT_POOL_DAILY_REQUEST_BUDGET };
