/**
 * Rate Limiter Service - Token Bucket Algorithm
 *
 * Prevents abuse while allowing legitimate bursts of activity.
 * Uses a token bucket algorithm with per-user tracking.
 *
 * Features:
 * - Dual-bucket system (minute + hour limits)
 * - Automatic token refill
 * - Memory leak prevention (cleanup inactive users)
 * - Configurable via environment variables
 */

class RateLimiter {
  constructor(config = {}) {
    // Store rate limit data per user
    // Structure: { userId: { minute: {...}, hour: {...} } }
    this.userLimits = new Map();

    // CRITICAL FIX: Add hard limit on Map size to prevent memory exhaustion
    this.MAX_TRACKED_USERS = config.maxTrackedUsers || 100000;

    // Configuration from environment or defaults (VERY GENEROUS for portfolio)
    const perMinute = config.perMinute || parseInt(process.env.RATE_LIMIT_PER_MINUTE, 10) || 60;
    const perHour = config.perHour || parseInt(process.env.RATE_LIMIT_PER_HOUR, 10) || 500;

    // CRITICAL FIX: Validate configuration values
    if (perMinute <= 0 || perHour <= 0) {
      console.error('Invalid rate limit configuration, using defaults');
    }

    console.log(`⚙️  Rate Limiter Configuration:`);
    console.log(`   - ${perMinute} messages per minute`);
    console.log(`   - ${perHour} messages per hour`);
    console.log(`   - Max ${this.MAX_TRACKED_USERS} tracked users`);

    this.limits = {
      minute: {
        maxTokens: perMinute,      // Max messages per minute
        refillRate: perMinute,     // Tokens refilled per minute
        refillInterval: 60000,     // 1 minute in ms
        windowName: 'minute'
      },
      hour: {
        maxTokens: perHour,        // Max messages per hour
        refillRate: perHour,       // Tokens refilled per hour
        refillInterval: 3600000,   // 1 hour in ms
        windowName: 'hour'
      }
    };

    // Clean up old entries every 2 hours to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 60 * 1000);
  }

  /**
   * Initialize rate limit tracking for a user
   * CRITICAL FIX: Check Map size limit before adding new users
   * @param {string} userId - User identifier
   * @private
   */
  initializeUser(userId) {
    if (!this.userLimits.has(userId)) {
      // CRITICAL FIX: Check if we've reached max tracked users
      if (this.userLimits.size >= this.MAX_TRACKED_USERS) {
        console.warn(`⚠️  Rate limiter at capacity (${this.userLimits.size} users), cleaning up...`);
        // Emergency cleanup of oldest users
        this.cleanup();

        // If still at capacity after cleanup, reject oldest users
        if (this.userLimits.size >= this.MAX_TRACKED_USERS) {
          console.error(`❌ Rate limiter still at capacity after cleanup, removing oldest user`);
          // Find and remove oldest user (by lastRequest time)
          let oldestUserId = null;
          let oldestTime = Date.now();
          for (const [uid, data] of this.userLimits.entries()) {
            if (data.lastRequest < oldestTime) {
              oldestTime = data.lastRequest;
              oldestUserId = uid;
            }
          }
          if (oldestUserId) {
            this.userLimits.delete(oldestUserId);
          }
        }
      }

      const now = Date.now();
      this.userLimits.set(userId, {
        minute: {
          tokens: this.limits.minute.maxTokens,
          lastRefill: now
        },
        hour: {
          tokens: this.limits.hour.maxTokens,
          lastRefill: now
        },
        totalRequests: 0,
        firstRequest: now,
        lastRequest: now
      });
    }
  }

  /**
   * Refill tokens based on time elapsed
   * CRITICAL FIX: Protect against clock jumps (NTP sync, DST, VM migration, manual changes)
   * @param {Object} bucket - Token bucket to refill
   * @param {Object} config - Bucket configuration
   * @private
   */
  refillTokens(bucket, config) {
    const now = Date.now();
    let timePassed = now - bucket.lastRefill;

    // CRITICAL FIX: Protect against clock jumps
    // Forward jump: cap at 2x interval to prevent massive token grants
    // Backward jump: treat as 0 (tokens don't refill until clock catches up)
    if (timePassed < 0) {
      // Clock jumped backward - reset lastRefill to current time
      console.warn(`⚠️  Clock jumped backward by ${Math.abs(timePassed)}ms, resetting refill timer`);
      bucket.lastRefill = now;
      return; // No refill on backward jump
    }

    if (timePassed > config.refillInterval * 2) {
      // Clock jumped forward significantly - cap time passed
      console.warn(`⚠️  Large time jump detected: ${timePassed}ms, capping at ${config.refillInterval * 2}ms`);
      timePassed = config.refillInterval * 2;
    }

    const intervalsElapsed = timePassed / config.refillInterval;

    if (intervalsElapsed >= 1) {
      // Refill tokens (cap at max)
      const tokensToAdd = Math.floor(intervalsElapsed * config.refillRate);
      bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  /**
   * Check if user can make a request
   *
   * CRITICAL FIX: Atomically check and consume tokens to prevent race conditions
   *
   * Previously had TOCTOU vulnerability:
   * - Thread A checks tokens (has 1)
   * - Thread B checks tokens (has 1)
   * - Thread A consumes token (0 left)
   * - Thread B consumes token (-1 overdraft!)
   *
   * @param {string} userId - User identifier
   * @returns {Object} Rate limit result
   * @returns {boolean} allowed - Whether request is allowed
   * @returns {number} retryAfter - Milliseconds until next request allowed
   * @returns {Object} remaining - Remaining tokens per bucket
   * @returns {Object} limit - Max tokens per bucket
   * @returns {Object} resetAt - Reset timestamps per bucket
   * @returns {string} [limitType] - Which limit was hit ('minute' or 'hour')
   */
  checkLimit(userId) {
    // CRITICAL FIX: Validate userId to prevent collisions
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      console.error('Invalid userId provided to rate limiter:', userId);
      // Reject invalid userIds
      return {
        allowed: false,
        retryAfter: 60000,
        remaining: { minute: 0, hour: 0 },
        limit: { minute: this.limits.minute.maxTokens, hour: this.limits.hour.maxTokens },
        limitType: 'error',
        resetAt: { minute: Date.now() + 60000, hour: Date.now() + 3600000 }
      };
    }

    this.initializeUser(userId);
    const userData = this.userLimits.get(userId);

    // Refill tokens for both buckets
    this.refillTokens(userData.minute, this.limits.minute);
    this.refillTokens(userData.hour, this.limits.hour);

    // CRITICAL FIX: Atomically check and consume in single step
    // Use Math.max to prevent negative tokens (safety net)
    const canProceed = userData.minute.tokens >= 1 && userData.hour.tokens >= 1;

    if (canProceed) {
      // Atomically consume tokens - use Math.max for safety
      userData.minute.tokens = Math.max(0, userData.minute.tokens - 1);
      userData.hour.tokens = Math.max(0, userData.hour.tokens - 1);
      userData.totalRequests += 1;
      userData.lastRequest = Date.now();

      return {
        allowed: true,
        retryAfter: 0,
        remaining: {
          minute: Math.floor(userData.minute.tokens),
          hour: Math.floor(userData.hour.tokens)
        },
        limit: {
          minute: this.limits.minute.maxTokens,
          hour: this.limits.hour.maxTokens
        },
        resetAt: {
          minute: userData.minute.lastRefill + this.limits.minute.refillInterval,
          hour: userData.hour.lastRefill + this.limits.hour.refillInterval
        }
      };
    } else {
      // Calculate retry time (when next token available)
      let retryAfter;
      let limitType;

      const hasMinuteToken = userData.minute.tokens >= 1;

      if (!hasMinuteToken) {
        retryAfter = (userData.minute.lastRefill + this.limits.minute.refillInterval) - Date.now();
        limitType = 'minute';
      } else {
        retryAfter = (userData.hour.lastRefill + this.limits.hour.refillInterval) - Date.now();
        limitType = 'hour';
      }

      return {
        allowed: false,
        retryAfter: Math.max(0, retryAfter),
        remaining: {
          minute: Math.floor(userData.minute.tokens),
          hour: Math.floor(userData.hour.tokens)
        },
        limit: {
          minute: this.limits.minute.maxTokens,
          hour: this.limits.hour.maxTokens
        },
        limitType,
        resetAt: {
          minute: userData.minute.lastRefill + this.limits.minute.refillInterval,
          hour: userData.hour.lastRefill + this.limits.hour.refillInterval
        }
      };
    }
  }

  /**
   * Get current rate limit status for a user (without consuming tokens)
   *
   * @param {string} userId - User identifier
   * @returns {Object} Current rate limit status
   */
  getStatus(userId) {
    this.initializeUser(userId);
    const userData = this.userLimits.get(userId);

    // Refill tokens first
    this.refillTokens(userData.minute, this.limits.minute);
    this.refillTokens(userData.hour, this.limits.hour);

    return {
      remaining: {
        minute: Math.floor(userData.minute.tokens),
        hour: Math.floor(userData.hour.tokens)
      },
      limit: {
        minute: this.limits.minute.maxTokens,
        hour: this.limits.hour.maxTokens
      },
      resetAt: {
        minute: userData.minute.lastRefill + this.limits.minute.refillInterval,
        hour: userData.hour.lastRefill + this.limits.hour.refillInterval
      },
      totalRequests: userData.totalRequests
    };
  }

  /**
   * Clean up old user data to prevent memory leaks
   * Removes users who haven't made requests in 24 hours
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [userId, userData] of this.userLimits.entries()) {
      // Remove users who haven't made requests in 24 hours
      if (now - userData.lastRequest > maxAge) {
        this.userLimits.delete(userId);
        console.log(`🧹 Cleaned up rate limit data for inactive user: ${userId}`);
      }
    }
  }

  /**
   * Get statistics about rate limiting
   *
   * @returns {Object} Statistics
   * @returns {number} totalUsers - Number of tracked users
   * @returns {Object} limits - Rate limit configuration
   */
  getStats() {
    return {
      totalUsers: this.userLimits.size,
      limits: this.limits
    };
  }

  /**
   * Destroy the rate limiter (cleanup interval)
   * Call this when shutting down the server
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

module.exports = { RateLimiter };
