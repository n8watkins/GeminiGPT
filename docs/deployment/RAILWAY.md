# Railway Deployment Guide

This guide walks you through deploying GeminiGPT to [Railway](https://railway.app/), a platform that provides easy deployment with persistent storage.

## Table of Contents
- [Why Railway?](#why-railway)
- [Prerequisites](#prerequisites)
- [Deployment Steps](#deployment-steps)
- [Environment Variables](#environment-variables)
- [Persistent Storage](#persistent-storage)
- [Custom Domain](#custom-domain)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Why Railway?

Railway is the **recommended deployment platform** for GeminiGPT because:

✅ **Persistent Volumes** - Built-in support for persistent file storage (critical for SQLite and LanceDB)
✅ **WebSocket Support** - Native WebSocket support (required for real-time chat)
✅ **Auto-Deploy** - Automatic deployments from Git
✅ **Free Tier** - Generous free tier for testing and portfolios
✅ **Easy Configuration** - Simple environment variable management
✅ **Monitoring** - Built-in logs and metrics
✅ **Custom Domains** - Easy custom domain setup

---

## Prerequisites

Before deploying, ensure you have:

1. **Railway Account**
   - Sign up at [railway.app](https://railway.app/)
   - Connect your GitHub account

2. **Git Repository**
   - Your code must be in a Git repository (GitHub, GitLab, or Bitbucket)
   - Push all your changes to the repository

3. **API Keys**
   - **Gemini API Key** (required) - Get from [Google AI Studio](https://aistudio.google.com/apikey)
   - **Google Search API Key** (optional) - For function calling features
   - **Sentry DSN** (optional) - For error tracking

---

## Deployment Steps

### Step 1: Prepare Your Repository

Ensure your code is committed and pushed:

```bash
# Commit any changes
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app/)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository from the list
5. Railway will auto-detect it as a Node.js application

### Step 3: Configure Build Settings

Railway auto-detects Node.js apps, but verify the settings:

**Build Command** (auto-detected):
```bash
npm install && npm run build
```

**Start Command** (auto-detected from `package.json`):
```bash
node server.js
```

**Port**: Railway automatically sets `PORT` environment variable (default: 3000)

### Step 4: Set Environment Variables

In the Railway dashboard, go to **"Variables"** tab and add:

#### Required Variables

```env
# Gemini API Key (Required)
GEMINI_API_KEY=AIzaSy...your_key_here

# Node Environment
NODE_ENV=production
```

#### Optional Variables

```env
# Google Search API (for function calling)
GOOGLE_SEARCH_API_KEY=your_search_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Rate Limiting (optional, uses generous defaults)
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=500

# Sentry Error Tracking (optional)
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# Production URL (for CORS)
NEXT_PUBLIC_RAILWAY_URL=https://your-app.up.railway.app
PRODUCTION_URL=https://your-app.up.railway.app
```

**Pro Tip**: You can also use Railway's CLI to set variables:
```bash
railway variables set GEMINI_API_KEY=your_key_here
```

### Step 5: Add Persistent Volume

**Critical Step** - Without this, your chat history will be lost on every deployment!

1. In Railway dashboard, go to **"Settings"**
2. Scroll to **"Volumes"**
3. Click **"+ New Volume"**
4. Configure:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB (sufficient for thousands of chats)
5. Click **"Add"**

This ensures your SQLite and LanceDB data persists across deployments.

### Step 6: Deploy

Railway will automatically deploy your app:

1. Watch the deployment logs in real-time
2. First deployment typically takes 2-3 minutes
3. Subsequent deployments are faster (~1 minute)

Once deployed, you'll see:
```
✅ Build successful
✅ Deployment live
🌐 https://your-app.up.railway.app
```

### Step 7: Verify Deployment

Test your deployment:

1. **Visit your app**: `https://your-app.up.railway.app`
2. **Check health**: `https://your-app.up.railway.app/healthz`
3. **Test chat**: Send a message and verify it works
4. **Check persistence**: Refresh the page, verify chat history is saved

---

## Environment Variables

### Complete Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | - | Google Gemini API key |
| `NODE_ENV` | ✅ Yes | `development` | Set to `production` |
| `PORT` | ⚠️ Auto-set | `3000` | Railway sets this automatically |
| `GOOGLE_SEARCH_API_KEY` | ❌ No | - | For web search function calling |
| `GOOGLE_SEARCH_ENGINE_ID` | ❌ No | - | For web search function calling |
| `RATE_LIMIT_PER_MINUTE` | ❌ No | `60` | Messages per minute |
| `RATE_LIMIT_PER_HOUR` | ❌ No | `500` | Messages per hour |
| `SENTRY_DSN` | ❌ No | - | Server-side error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ No | - | Client-side error tracking |
| `NEXT_PUBLIC_RAILWAY_URL` | ❌ No | - | Your Railway app URL |
| `PRODUCTION_URL` | ❌ No | - | Production URL for CORS |

### Setting Variables via CLI

Install Railway CLI:
```bash
npm install -g @railway/cli
railway login
```

Set variables:
```bash
railway variables set GEMINI_API_KEY=your_key_here
railway variables set NODE_ENV=production
railway variables set RATE_LIMIT_PER_MINUTE=100
```

View variables:
```bash
railway variables
```

---

## Persistent Storage

### Volume Configuration

The `/app/data` volume stores:
- **SQLite database**: `data/chat.db` (~1-10 MB)
- **LanceDB vectors**: `data/lancedb/` (~100 KB per chat)
- **Backups**: `backups/` (if using backup scripts)

### Monitoring Storage Usage

Check storage usage in Railway dashboard:
1. Go to **"Metrics"**
2. View **"Volume Usage"**
3. Increase volume size if approaching limit

### Backup Strategy

**Automated Backups** (recommended):

Add a cron job to Railway:
```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "cron": [
    {
      "schedule": "0 2 * * *",
      "command": "./scripts/backup-databases.sh"
    }
  ]
}
```

**Manual Backups**:

Connect to Railway shell and run:
```bash
railway run bash
./scripts/backup-databases.sh
```

Download backups:
```bash
railway run cat backups/chat_20250119_140000.db.gz > local_backup.db.gz
```

---

## Custom Domain

### Add Custom Domain

1. In Railway dashboard, go to **"Settings"**
2. Scroll to **"Domains"**
3. Click **"+ Custom Domain"**
4. Enter your domain: `chat.yourdomain.com`
5. Railway provides DNS records:
   ```
   Type: CNAME
   Name: chat
   Value: your-app.up.railway.app
   ```
6. Add these records to your DNS provider
7. Wait for DNS propagation (5-60 minutes)
8. Railway automatically provisions SSL certificate

### Update Environment Variables

After adding custom domain, update:
```env
NEXT_PUBLIC_RAILWAY_URL=https://chat.yourdomain.com
PRODUCTION_URL=https://chat.yourdomain.com
```

---

## Monitoring

### View Logs

**Real-time logs**:
```bash
railway logs
```

**Filter logs**:
```bash
railway logs --filter "error"
railway logs --filter "websocket"
```

**View in dashboard**:
1. Go to **"Deployments"**
2. Click on a deployment
3. View logs in real-time

### Metrics

Railway provides built-in metrics:
- **CPU Usage**
- **Memory Usage**
- **Network Traffic**
- **Volume Usage**

Access metrics in **"Metrics"** tab.

### Health Checks

Railway can automatically check your app health:

1. Go to **"Settings"**
2. Scroll to **"Health Check"**
3. Configure:
   ```
   Path: /healthz
   Timeout: 5s
   Interval: 30s
   ```

Railway will restart your app if health checks fail.

### Sentry Integration

For advanced monitoring:

1. Sign up at [sentry.io](https://sentry.io/)
2. Create a project
3. Copy the DSN
4. Add to Railway variables:
   ```env
   SENTRY_DSN=https://...@sentry.io/...
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   ```
5. View errors in Sentry dashboard

---

## Troubleshooting

### Deployment Fails

**Check build logs**:
```bash
railway logs --deployment
```

**Common issues**:
- Missing `package.json` or `package-lock.json`
- Node version mismatch (Railway uses Node 18 by default)
- Build command failures

**Solution**:
```bash
# Ensure package-lock.json exists
npm install

# Commit and push
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### App Crashes on Start

**Check runtime logs**:
```bash
railway logs
```

**Common issues**:
- Missing `GEMINI_API_KEY`
- Invalid API key format
- Port binding issues

**Solution**:
1. Verify environment variables in Railway dashboard
2. Check API key is valid
3. Ensure `PORT` is not hard-coded (Railway sets it dynamically)

### WebSocket Connection Fails

**Symptoms**:
- Chat doesn't connect
- Messages don't send
- Console shows `WebSocket connection failed`

**Solution**:
1. Ensure Railway URL uses `wss://` (not `ws://`)
2. Check CORS settings in `server.js`
3. Verify WebSocket upgrade is working:
   ```bash
   railway logs --filter "websocket"
   ```

### Database Not Persisting

**Symptoms**:
- Chat history lost after deployment
- New deployment resets data

**Solution**:
1. Verify volume is mounted at `/app/data`
2. Check volume in **Settings** → **Volumes**
3. Ensure database files are created in `/app/data/`:
   ```bash
   railway run ls -la /app/data
   ```

### Out of Memory

**Symptoms**:
- App crashes with `ENOMEM` error
- Railway shows high memory usage

**Solution**:
1. Upgrade Railway plan for more memory
2. Optimize memory usage:
   - Clear embedding cache: reduce LRU cache size
   - Limit concurrent connections
   - Enable garbage collection

### Rate Limit Issues

**Symptoms**:
- Users getting rate limited too quickly
- "Rate limit exceeded" errors

**Solution**:
1. Increase rate limits:
   ```env
   RATE_LIMIT_PER_MINUTE=120
   RATE_LIMIT_PER_HOUR=1000
   ```
2. Implement per-API-key limiting (BYOK mode)
3. Monitor rate limit logs:
   ```bash
   railway logs --filter "rate limit"
   ```

---

## Railway CLI Reference

### Installation

```bash
npm install -g @railway/cli
railway login
```

### Common Commands

```bash
# Link to project
railway link

# Deploy
railway up

# View logs
railway logs

# Run command in Railway environment
railway run node -v

# Open dashboard
railway open

# Connect to shell
railway run bash

# Set variables
railway variables set KEY=value

# View variables
railway variables
```

---

## Cost Optimization

### Free Tier Limits

Railway free tier includes:
- **500 hours/month** of runtime
- **100 GB** of network egress
- **1 GB** of storage

For a portfolio project, this is usually sufficient.

### Reducing Costs

1. **Optimize Build Times**
   - Use Railway's build cache
   - Minimize dependencies

2. **Reduce Memory Usage**
   - Clear caches periodically
   - Optimize database queries

3. **Implement Caching**
   - Cache API responses
   - Use Redis for session storage (optional)

4. **Monitor Usage**
   - Check Railway dashboard regularly
   - Set up usage alerts

---

## Next Steps

After deploying to Railway:

1. ✅ [Configure Custom Domain](#custom-domain)
2. ✅ [Set up Monitoring](#monitoring)
3. ✅ [Configure Backups](#backup-strategy)
4. ✅ [Test Health Checks](#health-checks)
5. ✅ [Review Production Checklist](../PRODUCTION_CHECKLIST.md)

---

## Related Documentation

- [Docker Deployment](DOCKER.md) - Alternative containerized deployment
- [Production Checklist](../PRODUCTION_CHECKLIST.md) - Pre-deployment validation
- [HTTP API](../HTTP_API.md) - Health check endpoint details
- [Database Schema](../DATABASE_SCHEMA.md) - Backup and restore procedures
