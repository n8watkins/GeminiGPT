# TODO - Manual Tasks Required

This file contains tasks that require manual action before production deployment.

---

## 🔴 CRITICAL - Required Before Production

### 1. Revoke Exposed API Keys

**Priority:** CRITICAL
**Estimated Time:** 5 minutes
**Status:** ⏳ PENDING

API keys were accidentally committed to git history and pushed to GitHub. Even though they've been removed from git history, they may have been scraped by bots.

**Steps:**

1. **Revoke Gemini API Key**
   - Go to: https://aistudio.google.com/apikey
   - Find and delete key: `AIzaSyDScNnwqyPkWgXkKj5iOIzApg4sO136C4w`
   - Generate a new key
   - Save it securely

2. **Revoke Google Search API Key**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Find and delete key: `AIzaSyDpfsyqvczepccVFgxmMapy62pJtBd0cpQ`
   - Generate a new key
   - Save it securely

3. **Update Local Environment**
   ```bash
   # Update .env.local with new keys
   GEMINI_API_KEY=your_new_gemini_key_here
   GOOGLE_SEARCH_API_KEY=your_new_search_key_here
   ```

---

### 2. Configure Railway Environment Variables

**Priority:** CRITICAL
**Estimated Time:** 3 minutes
**Status:** ⏳ PENDING

**Steps:**

1. Go to Railway dashboard: https://railway.app/
2. Select your project
3. Go to **Variables** tab
4. Add/Update these variables:

   ```bash
   # Required
   GEMINI_API_KEY=your_new_gemini_key_here
   NODE_ENV=production

   # CRITICAL NEW VARIABLE (for rate limiting to work properly)
   TRUST_PROXY=true

   # Optional but recommended
   GOOGLE_SEARCH_API_KEY=your_new_search_key_here
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

   # Optional - Error tracking (only if you want Sentry)
   SENTRY_DSN=your_sentry_dsn_here
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_client_dsn_here
   ```

5. **Important:** After adding variables, Railway will automatically redeploy

---

## 🟠 HIGH - Recommended Before Production

### 3. Test Critical Functionality

**Priority:** HIGH
**Estimated Time:** 10 minutes
**Status:** ⏳ PENDING

After deploying with new environment variables, test these critical features:

- [ ] **Share Feature**: Create a share link and verify it works
- [ ] **CSRF Protection**: Verify share creation doesn't get 403 errors
- [ ] **Rate Limiting**: Send 30+ requests in 1 minute, verify 429 response
- [ ] **Chat Functionality**: Send messages and verify AI responses work
- [ ] **File Uploads**: Upload an image and verify it's processed

**Test Commands:**
```bash
# Test health endpoint
curl https://your-app.up.railway.app/healthz

# Test rate limiting (should get 429 after 30 requests)
for i in {1..35}; do curl https://your-app.up.railway.app/api/chat -X POST -H "Content-Type: application/json" -d '{"message":"test"}'; done

# Test CSRF endpoint
curl https://your-app.up.railway.app/api/csrf
```

---

### 4. Review Production Checklist

**Priority:** HIGH
**Estimated Time:** 30 minutes
**Status:** ⏳ PENDING

Go through the production checklist and verify all items:

```bash
# Open the checklist
cat docs/PRODUCTION_CHECKLIST.md
```

Key items to verify:
- [ ] All security headers enabled (Helmet)
- [ ] HTTPS/WSS enabled
- [ ] Database persistence configured (Railway volumes)
- [ ] Health checks working
- [ ] Logs are accessible
- [ ] Backups configured

---

## 🟡 MEDIUM - Nice to Have

### 5. Set Up Sentry (Optional)

**Priority:** MEDIUM
**Estimated Time:** 10 minutes
**Status:** ⏳ OPTIONAL

If you want error tracking in production:

1. Sign up at: https://sentry.io/
2. Create a new project (Node.js)
3. Copy the DSN
4. Add to Railway variables:
   ```bash
   SENTRY_DSN=https://...@sentry.io/...
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   ```

5. (Optional) Install profiling for performance monitoring:
   ```bash
   npm install @sentry/profiling-node
   ```
   Then uncomment profiling lines in `sentry.server.config.js`

---

### 6. Configure Custom Domain (Optional)

**Priority:** LOW
**Estimated Time:** 15 minutes
**Status:** ⏳ OPTIONAL

Follow the guide: `docs/deployment/RAILWAY.md#custom-domain`

Steps:
1. In Railway dashboard → Settings → Domains → Add Custom Domain
2. Add CNAME record to your DNS provider
3. Wait for SSL certificate provisioning
4. Update environment variables with your domain

---

### 7. Set Up Automated Backups

**Priority:** MEDIUM
**Estimated Time:** 5 minutes
**Status:** ⏳ PENDING

Configure automated database backups:

1. Option 1: Railway Platform Backups
   - Go to Settings → Backups
   - Enable automated backups

2. Option 2: Manual Backup Script
   ```bash
   # SSH into Railway
   railway run bash

   # Run backup script
   ./scripts/backup-databases.sh

   # Verify backup created
   ls -la backups/
   ```

---

## 📋 Checklist Summary

Before going to production, ensure:

- [x] Code review issues fixed (DONE)
- [x] Security vulnerabilities patched (DONE)
- [ ] **API keys revoked and replaced**
- [ ] **TRUST_PROXY=true added to Railway**
- [ ] Share functionality tested
- [ ] Rate limiting tested
- [ ] Production checklist reviewed
- [ ] Backups configured

---

## 🚀 Deployment Steps

Once all critical tasks are complete:

1. **Test locally:**
   ```bash
   npm run dev
   # Verify everything works
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Railway will auto-deploy**
   - Monitor deployment logs
   - Check health endpoint after deploy
   - Test critical features

4. **Verify deployment:**
   ```bash
   curl https://your-app.up.railway.app/healthz
   ```

---

## 📞 Need Help?

- 📖 [Production Checklist](docs/PRODUCTION_CHECKLIST.md)
- 🚀 [Railway Deployment Guide](docs/deployment/RAILWAY.md)
- 🔒 [Security Architecture](docs/SECURITY.md)
- 📊 [Code Review Report](CODE_REVIEW_REPORT.md)

---

**Last Updated:** 2025-01-19
**Status:** Ready for deployment after completing CRITICAL tasks
