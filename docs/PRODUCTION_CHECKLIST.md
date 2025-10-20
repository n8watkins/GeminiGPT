# Production Readiness Checklist

Use this checklist before deploying to production to ensure your application is secure, performant, and reliable.

## Table of Contents
- [Security](#security)
- [Environment Configuration](#environment-configuration)
- [Database](#database)
- [Monitoring & Logging](#monitoring--logging)
- [Performance](#performance)
- [Reliability](#reliability)
- [Documentation](#documentation)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Security

### API Keys & Secrets

- [ ] **All API keys are in environment variables** (never hard-coded)
- [ ] **`.env.local` is in `.gitignore`** (not committed to Git)
- [ ] **Production API keys are different** from development keys
- [ ] **API keys have proper permissions** (least privilege principle)
- [ ] **Gemini API key format validated** (starts with `AIzaSy`)
- [ ] **Sentry DSN configured** (optional but recommended)

**Verify**:
```bash
# Check no secrets in code
git grep -i "AIzaSy" -- ':!.env.example' ':!docs/'

# Check .gitignore
cat .gitignore | grep .env.local
```

### HTTPS & SSL

- [ ] **HTTPS enabled** (not HTTP)
- [ ] **WSS enabled for WebSocket** (not WS)
- [ ] **SSL certificate valid** and not expired
- [ ] **Certificate auto-renewal configured** (if self-managed)
- [ ] **HTTP redirects to HTTPS** (if applicable)

**Test**:
```bash
# Check HTTPS
curl -I https://your-domain.com

# Check WebSocket upgrade
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://your-domain.com
```

### Security Headers

- [ ] **Helmet middleware installed and configured**
- [ ] **CSP (Content Security Policy) headers set**
- [ ] **HSTS headers enabled** (Strict-Transport-Security)
- [ ] **X-Content-Type-Options: nosniff**
- [ ] **X-Frame-Options: DENY** or SAMEORIGIN
- [ ] **Referrer-Policy configured**

**Verify**:
```bash
# Check security headers
curl -I https://your-domain.com

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

### SQL Injection Prevention

- [ ] **All database queries use parameterized statements**
- [ ] **SQL sanitization utilities used** (`src/lib/utils/sqlSanitizer.ts`)
- [ ] **UUID validation before database queries**
- [ ] **No string interpolation in SQL queries**
- [ ] **Security tests passing** (`tests/security/sql-injection.test.ts`)

**Verify**:
```bash
# Run security tests
npm test tests/security/sql-injection.test.ts

# Check for unsafe SQL
git grep "SELECT.*\${" src/
git grep "INSERT.*\${" src/
```

### Rate Limiting

- [ ] **Rate limiter configured** (60 per minute, 500 per hour default)
- [ ] **Rate limit values appropriate** for expected traffic
- [ ] **Rate limit headers returned** (X-RateLimit-*)
- [ ] **Per-user rate limiting enabled**
- [ ] **Per-API-key rate limiting enabled** (BYOK mode)

**Test**:
```bash
# Test rate limiting
for i in {1..65}; do
  curl https://your-domain.com/api/chat -X POST \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}'
done

# Should see 429 after 60 requests
```

### CORS Configuration

- [ ] **CORS origins restricted** (not `*` in production)
- [ ] **Production URL in CORS whitelist**
- [ ] **WebSocket CORS configured**
- [ ] **Credentials handling correct**

**Verify in `server.js`**:
```javascript
// Should have production URL
const allowedOrigins = [
  process.env.NEXT_PUBLIC_RAILWAY_URL,
  process.env.PRODUCTION_URL
];
```

---

## Environment Configuration

### Required Variables

- [ ] **`GEMINI_API_KEY`** set and valid
- [ ] **`NODE_ENV=production`** set
- [ ] **`PORT`** set (or using platform default)

### Optional Variables

- [ ] **`GOOGLE_SEARCH_API_KEY`** (for function calling)
- [ ] **`GOOGLE_SEARCH_ENGINE_ID`** (for function calling)
- [ ] **`SENTRY_DSN`** (error tracking)
- [ ] **`NEXT_PUBLIC_SENTRY_DSN`** (client error tracking)
- [ ] **`RATE_LIMIT_PER_MINUTE`** (custom limits)
- [ ] **`RATE_LIMIT_PER_HOUR`** (custom limits)

### Validation

- [ ] **Environment validation runs on startup**
- [ ] **App fails to start if required vars missing**
- [ ] **Environment variables logged** (without values)

**Test**:
```bash
# Start without GEMINI_API_KEY
unset GEMINI_API_KEY
npm start

# Should fail with clear error message
```

---

## Database

### SQLite

- [ ] **Database file persists** across deployments
- [ ] **WAL mode enabled** (`PRAGMA journal_mode = WAL`)
- [ ] **Foreign keys enabled** (`PRAGMA foreign_keys = ON`)
- [ ] **All indexes created** (check `src/lib/database.ts`)
- [ ] **Database file has correct permissions** (600 or 644)

**Verify**:
```bash
# Check database exists
ls -la data/chat.db

# Check WAL mode
sqlite3 data/chat.db "PRAGMA journal_mode;"
# Should return: wal

# Check indexes
sqlite3 data/chat.db ".indexes"
```

### LanceDB

- [ ] **LanceDB directory persists** across deployments
- [ ] **Embeddings are being created**
- [ ] **Vector search working**
- [ ] **Database optimization runs periodically**

**Verify**:
```bash
# Check LanceDB exists
ls -la data/lancedb/

# Check table exists
node -e "require('./src/lib/vectordb.js').getDB().then(db => db.tableNames().then(console.log))"
```

### Backups

- [ ] **Backup script tested** (`scripts/backup-databases.sh`)
- [ ] **Restore script tested** (`scripts/restore-databases.sh`)
- [ ] **Automated backups scheduled** (cron or platform)
- [ ] **Backups stored securely** (encrypted if sensitive)
- [ ] **Restore procedure documented and tested**

**Test**:
```bash
# Test backup
./scripts/backup-databases.sh

# Check backup created
ls -la backups/

# Test restore
./scripts/restore-databases.sh $(ls backups/ | head -1 | sed 's/chat_\(.*\)\.db\.gz/\1/')
```

### Volume Persistence

- [ ] **Persistent volume mounted** at `/app/data` (Railway) or equivalent
- [ ] **Volume size sufficient** (1GB+ recommended)
- [ ] **Volume backup configured** (platform-level)

---

## Monitoring & Logging

### Health Checks

- [ ] **Health endpoint working** (`GET /healthz`)
- [ ] **Database connectivity checked**
- [ ] **Vector DB connectivity checked**
- [ ] **Memory usage monitored**
- [ ] **Platform health checks configured**

**Test**:
```bash
# Check health
curl https://your-domain.com/healthz

# Should return 200 with status details
```

### Logging

- [ ] **Structured logging enabled** (`lib/logger.js`)
- [ ] **No `console.log` in production code**
- [ ] **Log levels appropriate** (ERROR, WARN, INFO, DEBUG)
- [ ] **Sensitive data not logged** (API keys, tokens)
- [ ] **Request logging enabled** (`middleware.ts`)
- [ ] **Slow request detection** (>1s warnings)

**Verify**:
```bash
# Check for console.log
git grep "console\.log" src/ lib/ -- ':!*.md'

# Should find none (all should use logger)
```

### Error Tracking

- [ ] **Sentry initialized** (server and client)
- [ ] **Sentry DSN configured**
- [ ] **Error sampling rate set** (10% for production)
- [ ] **Privacy protection enabled** (API key redaction)
- [ ] **Test error sent to Sentry**

**Test**:
```bash
# Trigger test error
curl https://your-domain.com/api/test-error

# Check Sentry dashboard for error
```

### Metrics

- [ ] **Platform metrics enabled** (CPU, memory, network)
- [ ] **Custom metrics tracked** (optional)
- [ ] **Response time monitoring**
- [ ] **WebSocket connection metrics**

---

## Performance

### Response Times

- [ ] **Health check < 100ms**
- [ ] **API responses < 500ms** (p95)
- [ ] **WebSocket connection < 1s**
- [ ] **Database queries < 50ms** (p95)

**Test**:
```bash
# Measure response times
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://your-domain.com/healthz

# Should be < 0.1s
```

### Database Performance

- [ ] **All queries use indexes**
- [ ] **Query plan analyzed** (`EXPLAIN QUERY PLAN`)
- [ ] **No full table scans** on large tables
- [ ] **Connection pooling configured** (if applicable)

**Verify**:
```bash
# Check query plans
sqlite3 data/chat.db "EXPLAIN QUERY PLAN SELECT * FROM messages WHERE chat_id = '123';"

# Should show index usage
```

### Frontend Performance

- [ ] **Bundle size optimized** (<500KB gzipped)
- [ ] **Code splitting enabled**
- [ ] **Images optimized** (WebP, lazy loading)
- [ ] **Lighthouse score >90**

**Test**:
```bash
# Check bundle size
npm run build
# Review .next/static/chunks/ sizes

# Run Lighthouse
npx lighthouse https://your-domain.com --view
```

### Caching

- [ ] **Embedding cache enabled** (LRU cache)
- [ ] **Cache size limits set** (10K entries, 100MB)
- [ ] **Cache hit rate monitored**

---

## Reliability

### Graceful Shutdown

- [ ] **Shutdown handler configured** (`lib/shutdown.js`)
- [ ] **Signal handlers registered** (SIGTERM, SIGINT, SIGHUP)
- [ ] **HTTP server closes gracefully**
- [ ] **WebSocket connections close cleanly**
- [ ] **Databases close properly**
- [ ] **30-second shutdown timeout**

**Test**:
```bash
# Test graceful shutdown
./tests/manual/test-graceful-shutdown.sh

# Should exit cleanly
```

### Error Handling

- [ ] **All errors caught and logged**
- [ ] **Error responses user-friendly**
- [ ] **No unhandled promise rejections**
- [ ] **Fallback behavior for failures**

**Verify**:
```bash
# Check for unhandled rejections
node server.js 2>&1 | grep "UnhandledPromiseRejection"

# Should find none
```

### Restart Policy

- [ ] **Auto-restart on crash** (PM2, Railway, etc.)
- [ ] **Max restart attempts configured** (10)
- [ ] **Restart delay configured** (1s)

---

## Documentation

### User Documentation

- [ ] **README up to date**
- [ ] **Quick start guide clear**
- [ ] **API documentation complete**
- [ ] **Deployment guides accurate**

### Developer Documentation

- [ ] **Code comments for complex logic**
- [ ] **API reference complete** (`docs/WEBSOCKET_API.md`, `docs/HTTP_API.md`)
- [ ] **Database schema documented** (`docs/DATABASE_SCHEMA.md`)
- [ ] **Architecture documented**

### Operational Documentation

- [ ] **Deployment process documented**
- [ ] **Backup/restore procedure documented**
- [ ] **Troubleshooting guide complete**
- [ ] **Monitoring dashboard setup documented**

---

## Testing

### Test Coverage

- [ ] **Security tests passing** (`tests/security/`)
- [ ] **Integration tests passing** (`tests/integration/`)
- [ ] **Manual tests performed**
- [ ] **Load testing completed** (if expecting high traffic)

**Run all tests**:
```bash
npm test
```

### Production Testing

- [ ] **Test in production-like environment** first
- [ ] **BYOK mode tested** (user provides API key)
- [ ] **Server mode tested** (server API key)
- [ ] **Chat creation and persistence tested**
- [ ] **WebSocket connection tested**
- [ ] **Function calling tested** (search, stock, weather)
- [ ] **Semantic search tested**
- [ ] **Rate limiting tested**

---

## Deployment

### Pre-Deployment

- [ ] **All code merged to main branch**
- [ ] **All tests passing**
- [ ] **Build successful** (`npm run build`)
- [ ] **Dependencies up to date** (check for vulnerabilities)

**Verify**:
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Deployment

- [ ] **Deployment platform configured** (Railway, Vercel, etc.)
- [ ] **Environment variables set**
- [ ] **Persistent storage configured**
- [ ] **Custom domain configured** (optional)
- [ ] **SSL certificate active**

### Post-Deployment

- [ ] **Application accessible** at deployment URL
- [ ] **Health check returns 200**
- [ ] **WebSocket connection works**
- [ ] **Chat functionality works**
- [ ] **Database persists** across restarts
- [ ] **Logs are accessible**
- [ ] **Monitoring is working**

**Verify**:
```bash
# Test deployment
curl https://your-domain.com/healthz
curl -I https://your-domain.com

# Test WebSocket (use browser console)
# const socket = io('wss://your-domain.com');
# socket.on('connect', () => console.log('Connected'));
```

### Rollback Plan

- [ ] **Rollback procedure documented**
- [ ] **Previous deployment accessible**
- [ ] **Database backup before deployment**
- [ ] **Team knows how to rollback**

---

## Final Checklist

Before going live:

### Critical (Must-Have)

- [ ] All security items checked
- [ ] All environment variables set
- [ ] Database persistence configured
- [ ] Health checks working
- [ ] Error tracking configured
- [ ] All tests passing

### Important (Should-Have)

- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Documentation complete
- [ ] Rate limiting tested
- [ ] Performance validated

### Nice-to-Have

- [ ] Custom domain configured
- [ ] Load testing completed
- [ ] CDN configured
- [ ] Advanced metrics tracked

---

## Post-Launch

### Week 1

- [ ] **Monitor error rates** (should be <1%)
- [ ] **Check performance metrics** (response times, CPU, memory)
- [ ] **Verify backups running**
- [ ] **Test restore procedure**
- [ ] **Review logs for issues**

### Month 1

- [ ] **Analyze usage patterns**
- [ ] **Optimize based on metrics**
- [ ] **Update documentation** (if needed)
- [ ] **Plan improvements** based on feedback

---

## Need Help?

- 📖 [Read the docs](../README.md)
- 🚀 [Railway Deployment Guide](deployment/RAILWAY.md)
- 🐳 [Docker Deployment Guide](deployment/DOCKER.md)
- 💬 [Open an issue](https://github.com/OWNER/gemini-chat-app/issues)

---

**Good luck with your deployment! 🚀**
