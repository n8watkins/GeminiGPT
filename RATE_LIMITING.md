# Rate Limiting Documentation

## Overview

GeminiGPT implements a **dual-tier rate limiting system** based on API key ownership, not authentication status.

## Rate Limiting Tiers

### 🔓 Unlimited Access (BYOK - Bring Your Own Key)

**Who:** Users who provide their own Google Gemini API key

**Limits:** **NONE** - Completely bypass all rate limits

**How it works:**
- User adds their API key via "Settings" → "API Key Setup"
- API key stored locally in browser's localStorage (never sent to server database)
- WebSocket sends API key with each message
- Server detects API key presence and bypasses rate limiting entirely

**Why unlimited:**
- Users are using their own Google quota
- They pay Google directly for API usage
- No cost to our server infrastructure

**Rate limit display:**
- UI shows `999999/999999` to indicate unlimited access
- No rate limit warnings or restrictions

---

### 🔒 Rate Limited (Shared Server Key)

**Who:** Users without their own API key (using our shared server key)

**Limits:**
- **60 messages per minute**
- **500 messages per hour**

**How it works:**
- User connects without providing an API key
- Server uses shared Gemini API key (from `GEMINI_API_KEY` env var)
- Token bucket algorithm tracks usage per user ID
- Rate limits apply to protect server quota and prevent abuse

**Rate limit algorithm:**
- Dual-bucket system (minute + hour)
- Tokens refill automatically over time
- Fair queuing - tokens can't be "saved up" beyond max

**When rate limited:**
- User receives friendly message with exact wait time
- UI displays remaining tokens in sidebar
- Warning when approaching limits (yellow = 10 remaining, red = 5 remaining)

---

## Authentication vs. Rate Limiting

**CRITICAL: These are INDEPENDENT**

| Scenario | Authentication | Rate Limiting |
|----------|---------------|---------------|
| Anonymous user + No API key | ❌ Not authenticated | ⚠️ **Rate limited** |
| Anonymous user + Own API key | ❌ Not authenticated | ✅ **Unlimited** |
| Google user + No API key | ✅ Authenticated | ⚠️ **Rate limited** |
| Google user + Own API key | ✅ Authenticated | ✅ **Unlimited** |

**Key insight:** Authentication provides chat sync across devices. API key ownership determines rate limits.

---

## Security Considerations

### API Key Storage

**Client-side (localStorage only):**
- ✅ API keys stored per device in browser localStorage
- ✅ Zero risk of mass API key compromise
- ✅ Users maintain full control
- ❌ Must re-enter key on each device

**Why NOT stored in cloud database:**
- 🔒 Security liability - database breach would expose all keys
- 🔒 Google ToS compliance - don't store third-party credentials
- 🔒 User trust - users may not trust us with their keys
- 🔒 Best practice - never store credentials you don't need

### Rate Limit Bypass Detection

**Server validates API key presence:**
```javascript
if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
  // Bypass rate limits
}
```

**Important:** Server doesn't validate if the API key actually works. If a user provides a fake/invalid API key:
- They bypass rate limits
- But Google API will reject their messages
- They get error responses instead of AI responses
- Net effect: Self-defeating (no benefit to user)

---

## Rate Limit Configuration

### Environment Variables

```bash
# Rate limit settings (optional - defaults shown)
RATE_LIMIT_PER_MINUTE=60    # Messages per minute (shared key users)
RATE_LIMIT_PER_HOUR=500     # Messages per hour (shared key users)
```

### Defaults (generous for portfolio projects)

- **Per minute:** 60 messages (1 per second sustained)
- **Per hour:** 500 messages (8.3 per minute sustained)

These are intentionally generous to allow for:
- Rapid-fire testing during demos
- Burst conversations with AI
- Multiple users in portfolio demos

### Production Recommendations

For production deployment with high traffic:
- Reduce to `RATE_LIMIT_PER_MINUTE=15`
- Reduce to `RATE_LIMIT_PER_HOUR=100`
- Monitor usage with rate limiter stats

---

## Implementation Details

### Token Bucket Algorithm

Each user gets two buckets:
1. **Minute bucket:** Refills to 60 tokens every 60 seconds
2. **Hour bucket:** Refills to 500 tokens every 3600 seconds

**Request flow:**
1. Check if user has ≥1 token in BOTH buckets
2. If yes: Consume 1 token from each, allow request
3. If no: Reject request, tell user when next token available

**Clock jump protection:**
- Handles NTP sync, DST changes, VM migrations
- Caps forward jumps at 2x interval (prevents token farming)
- Resets on backward jumps (prevents negative tokens)

### Memory Management

- **Max tracked users:** 100,000
- **Cleanup interval:** Every 2 hours
- **Eviction policy:** Remove users inactive for 24+ hours
- **Emergency eviction:** If at capacity, remove oldest user by lastRequest

---

## User Experience

### BYOK Users

```
Rate Limits: ∞
Status: Unlimited (Using own API key)
```

### Shared Key Users

```
Rate Limits:
- Per Minute: 45/60 ●●●●●●●●●○
- Per Hour: 380/500 ●●●●●●●●○○

Status: Using shared server key
```

### When Rate Limited

```markdown
### You've reached your message limit

To prevent abuse, there's a limit on how many messages you can send per minute.

**You can send more messages in 30 seconds** (at 3:45 PM).

**Current usage:**
- 0 of 60 messages remaining this minute
- 450 of 500 messages remaining this hour

Thank you for your patience! 🙏
```

---

## Monitoring & Analytics

### Get Rate Limiter Stats

```javascript
const stats = rateLimiter.getStats();
console.log(stats);
// {
//   totalUsers: 1523,
//   limits: {
//     minute: { maxTokens: 60, refillRate: 60, refillInterval: 60000 },
//     hour: { maxTokens: 500, refillRate: 500, refillInterval: 3600000 }
//   }
// }
```

### Get User Status (without consuming tokens)

```javascript
const status = rateLimiter.getStatus(userId);
console.log(status);
// {
//   remaining: { minute: 45, hour: 380 },
//   limit: { minute: 60, hour: 500 },
//   resetAt: { minute: 1635790800000, hour: 1635792000000 },
//   totalRequests: 120
// }
```

---

## FAQs

**Q: Why do authenticated users still get rate limited if they don't have an API key?**

A: Authentication (Google sign-in) is about syncing your chats across devices. Rate limiting is about managing API costs. These are separate concerns. If you want unlimited access, add your own API key.

**Q: Can I use someone else's API key to bypass rate limits?**

A: Technically yes, but it's pointless. The API key goes to Google's servers, so you'd just be using their quota/billing. Plus it's a violation of their terms of service.

**Q: What happens if my API key is invalid?**

A: You'll bypass rate limits, but all your messages will fail with Google API errors. The server doesn't pre-validate API keys for performance reasons.

**Q: Do rate limits apply to chat history search?**

A: No. Rate limits only apply to new AI message generation. Searching your existing chats is unlimited for all users.

**Q: Can I increase my rate limits?**

A: Yes, two ways:
1. Add your own API key (unlimited)
2. Ask the server admin to increase `RATE_LIMIT_PER_MINUTE` and `RATE_LIMIT_PER_HOUR` environment variables

---

## Code References

- **Rate Limiter:** `lib/websocket/services/RateLimiter.js`
- **Message Pipeline:** `lib/websocket/services/MessagePipeline.js:44-100`
- **WebSocket Server:** `websocket-server.js:169-189`
- **Frontend Display:** `src/components/Sidebar.tsx:129-190`
