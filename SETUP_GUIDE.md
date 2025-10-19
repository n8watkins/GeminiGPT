# 🚀 Complete Setup Guide - GeminiGPT

This guide covers everything you need to get GeminiGPT running locally and deploying to Railway.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Getting API Keys](#getting-api-keys)
4. [Running the Application](#running-the-application)
5. [Railway Deployment](#railway-deployment)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Prerequisites

### Required Software

- **Node.js 18+** - [Download here](https://nodejs.org/)
  ```bash
  # Check your version
  node --version  # Should be v18 or higher
  npm --version   # Should be v9 or higher
  ```

- **Git** - [Download here](https://git-scm.com/)
  ```bash
  git --version
  ```

### Optional (but recommended)

- **VS Code** - [Download here](https://code.visualstudio.com/)
- **Railway CLI** - For easier deployments
  ```bash
  npm install -g @railway/cli
  ```

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
# Clone the repo
git clone https://github.com/yourusername/geminigpt.git
cd geminigpt

# Or if you forked it
git clone https://github.com/YOUR_USERNAME/geminigpt.git
cd geminigpt
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js (React framework)
- Socket.IO (WebSocket communication)
- Google Generative AI SDK
- LanceDB (vector database)
- Better-sqlite3 (SQL database)
- And more...

**Expected output:**
```
added 500+ packages in 30s
```

### Step 3: Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Optional - Gemini AI API Key (server-side fallback)
# Users can provide their own keys via the BYOK system
GEMINI_API_KEY=your_gemini_api_key_here

# Optional - Google Search (for web search function calling)
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Development
NODE_ENV=development
PORT=1337
```

**Note:** With the BYOK (Bring Your Own API Key) system, the `GEMINI_API_KEY` is optional. Users can provide their own keys through the web interface, which are stored in their browser's localStorage.

---

## Getting API Keys

### 1. Google Gemini API Key (Required)

**⚠️ IMPORTANT: Billing Safety**

To protect yourself from unexpected charges, **ALWAYS create a new, separate Google Cloud project** for your Gemini API key. This isolates billing from your other projects.

**For server-side use OR as a fallback:**

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. **CRITICAL:** Select **"Create new project"** instead of using an existing project
   - This creates a separate billing account
   - Protects your other Google Cloud projects
   - Makes it easy to monitor costs for just this app
5. Copy the generated key (starts with `AIza...`)
6. Paste it in your `.env.local` file

**Billing Protection Tips:**

🔒 **Create a Separate Project**
- Always use a NEW Google Cloud project for API keys
- Never use an existing project with production services
- This isolates billing and prevents surprise charges

💳 **Use Free Tier Safely**
- Google provides $300 in free credits (plenty for personal use)
- Free tier includes ~15 million input tokens per month
- Typical conversation uses 1,000-5,000 tokens

📊 **Set Up Billing Alerts**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Gemini API project
3. Go to "Billing" → "Budgets & alerts"
4. Create alert at $10, $50, $100 (or your comfort level)
5. You'll get email notifications if usage approaches limits

🛡️ **Monitor Usage**
- Check usage at [Google AI Studio](https://aistudio.google.com/apikey)
- Review costs in Google Cloud Console billing dashboard
- Delete API key if you see unexpected usage

**Benefits:**
- Free tier includes $300 in credits (lasts months for personal use)
- 60 requests per minute
- Generous token limits
- Pay-as-you-go pricing after free credits

**For client-side BYOK (recommended for users):**
- Users will get their own keys using the same steps above
- Their keys are stored in browser localStorage only
- Never transmitted to your backend server
- Each user manages their own billing and quotas

### 2. Google Custom Search API (Optional)

**Only needed if you want web search function calling:**

#### A. Create API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **"Custom Search API"**:
   - Go to "APIs & Services" → "Library"
   - Search for "Custom Search API"
   - Click "Enable"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the API key

#### B. Create Search Engine ID

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click **"Add"** or **"Create"**
3. Configure:
   - **What to search**: "Search the entire web"
   - **Name**: Any name you want
4. Click **"Create"**
5. Go to "Control Panel" → "Basics"
6. Copy the **Search engine ID** (looks like `abc123xyz...`)

#### C. Add to Environment

```env
GOOGLE_SEARCH_API_KEY=your_api_key_from_step_A
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_from_step_B
```

**Free Tier:**
- 100 search queries per day
- Costs $5 per 1000 queries after free tier

---

## Running the Application

### Start the Development Server

```bash
npm run dev
```

**Expected output:**
```
✓ Ready in 2.5s
○ Local:    http://localhost:1337
○ Network:  http://192.168.1.x:1337
```

**If port 1337 is in use:**
- The server automatically tries port 1338
- Or set a custom port: `PORT=3000 npm run dev`

### Open in Browser

Navigate to: **http://localhost:1337**

**First-time flow:**
1. **API Key Setup Modal** appears (if no key in localStorage)
   - Click through the tutorial
   - Get a free API key from Google AI Studio
   - Enter your key (stored locally in your browser)
2. **About Modal** appears (introduces the project)
3. Start chatting!

### Verify Everything Works

#### ✅ Basic Chat
1. Type a message: "Hello, who are you?"
2. You should get a response from Gemini
3. Check browser console (F12) for any errors

#### ✅ File Upload
1. Click the paperclip icon
2. Upload a PDF or image
3. Ask a question about it
4. Verify it processes correctly

#### ✅ Function Calling
Try these prompts:
- "What's the weather in New York?"
- "What's Apple's stock price?"
- "Search for the latest AI news"
- "What time is it in Tokyo?"

#### ✅ Cross-Chat Search
1. Create a new chat
2. Ask "What did we discuss about weather?"
3. Should find info from previous chat

---

## Railway Deployment

### Why Railway?

- ✅ Easy deployment from GitHub
- ✅ Persistent volumes for databases
- ✅ WebSocket support built-in
- ✅ Free tier available
- ✅ Auto-deploys on git push

### Step 1: Prepare Your Repository

```bash
# Ensure code is committed
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### Step 2: Create Railway Project

1. Go to [Railway.app](https://railway.app/)
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Authorize Railway to access your repos
6. Select your `geminigpt` repository
7. Railway auto-detects Node.js and starts deploying

### Step 3: Add Environment Variables

In Railway dashboard:

1. Click on your service
2. Go to **"Variables"** tab
3. Add these variables:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_SEARCH_API_KEY=your_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
NODE_ENV=production
PORT=1337
```

**Important:**
- With BYOK, `GEMINI_API_KEY` is optional (used as fallback)
- Users will provide their own keys via the web interface
- Search API keys are optional (only needed for web search)

### Step 4: Add Persistent Volume

**Critical for data persistence!**

1. Go to **"Settings"** → **"Volumes"**
2. Click **"New Volume"**
3. Configure:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB (free tier)
4. Click **"Add"**

**Why this matters:**
- SQLite database stored in `/app/data`
- LanceDB vector database stored in `/app/data`
- Without volume, data is lost on each deployment

### Step 5: Deploy

1. Railway automatically starts building and deploying
2. Wait for deployment to complete (2-5 minutes)
3. Click **"Generate Domain"** to get a public URL
4. Visit: `https://your-app.up.railway.app`

### Step 6: Verify Deployment

#### ✅ Check Deployment Logs

In Railway dashboard:
1. Go to **"Deployments"** tab
2. Click on latest deployment
3. Check logs for:
   ```
   ✅ GeminiService initialized
   ✅ Rate limiter initialized
   ✅ MessagePipeline initialized
   🚀 Server running on port 1337
   ```

#### ✅ Test the Live App

1. Visit your Railway URL
2. Go through API key setup (or use server fallback)
3. Send a test message
4. Verify it responds correctly

#### ✅ Check WebSocket Connection

In browser console (F12):
```
WebSocket connected to wss://your-app.up.railway.app
✅ Connected to server
```

### Step 7: Enable Auto-Deployments

In Railway:
1. Go to **"Settings"** → **"Deployments"**
2. Enable **"Auto-Deploy"** from main branch
3. Now every `git push` auto-deploys!

---

## Troubleshooting

### Local Development Issues

#### Issue: `npm install` Fails

**Symptoms:** Errors during `npm install`

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Issue: Port 1337 Already in Use

**Symptoms:** `Error: listen EADDRINUSE: address already in use :::1337`

**Solutions:**
```bash
# Option 1: Use different port
PORT=3000 npm run dev

# Option 2: Kill process using port 1337
# Linux/Mac:
lsof -ti:1337 | xargs kill

# Windows:
netstat -ano | findstr :1337
taskkill /PID <pid> /F
```

#### Issue: Database Locked

**Symptoms:** `Error: database is locked`

**Solutions:**
```bash
# Stop all instances
# Delete lock files
rm -rf data/*.db-shm data/*.db-wal

# Restart server
npm run dev
```

#### Issue: WebSocket Connection Failed

**Symptoms:** `WebSocket failed to connect`

**Check:**
1. Server is running (`npm run dev`)
2. No firewall blocking WebSocket
3. Using correct URL (http:// not https:// for local)
4. Check browser console for errors

#### Issue: API Key Not Working

**Symptoms:** `API key invalid` or `401 Unauthorized`

**Check:**
1. Key starts with `AIza`
2. Key has no extra spaces
3. API is enabled in Google Cloud Console
4. Billing is enabled (required even for free tier)

### Railway Deployment Issues

#### Issue: Build Fails

**Symptoms:** Deployment fails during build

**Check Railway logs for:**
```bash
# Missing environment variable
Error: GEMINI_API_KEY is not defined
Solution: Add in Railway dashboard Variables tab

# Out of memory
Error: JavaScript heap out of memory
Solution: Use Railway Pro plan or optimize build

# Wrong Node version
Error: Unsupported engine
Solution: Check package.json engines field
```

#### Issue: App Crashes on Startup

**Check Railway logs:**
```bash
# Port binding issue
Error: listen EADDRINUSE
Solution: Remove PORT from env vars (Railway sets automatically)

# Database directory missing
Error: ENOENT: no such file or directory, open 'data/chats.db'
Solution: Add volume mounted at /app/data

# Missing dependencies
Error: Cannot find module 'better-sqlite3'
Solution: npm install --save better-sqlite3
```

#### Issue: Data Not Persisting

**Symptoms:** Chats disappear after redeployment

**Solution:**
1. Add volume at `/app/data` (see Step 4 above)
2. Verify volume is mounted:
   ```bash
   # In Railway shell:
   ls -la /app/data
   ```
3. Check logs for database write errors

#### Issue: WebSocket Not Connecting

**Symptoms:** `WebSocket connection to 'wss://...' failed`

**Check:**
1. Railway domain is correct
2. Using `wss://` not `ws://`
3. No firewall/proxy blocking
4. Check Railway logs for WebSocket errors

---

## FAQ

### Q: Do I need to provide my own API key as a user?

**A:** With BYOK (Bring Your Own API Key), you have two options:
1. **Provide your own key** (recommended): Get a free key from Google AI Studio, enter it in the app. It's stored in your browser only.
2. **Use server fallback**: If you don't provide a key, the app uses the server's API key (if configured).

### Q: Are my API keys stored on your server?

**A:** **No.** When you use BYOK:
- Your API key is stored in your browser's `localStorage` only
- It's sent directly from your browser to Google's API
- Our server never logs, stores, or saves your API key
- You can verify this in the source code or browser DevTools

### Q: How much does it cost to run this?

**Costs:**
- **Google Gemini API**: $300 free credits, then ~$0.001-0.01 per request
- **Google Search API**: 100 free queries/day, then $5/1000 queries
- **Railway Hosting**: $5/month (free tier available with limits)
- **Your Time**: Priceless 😊

**Free Tier Limits:**
- Gemini: $300 credit (lasts months for personal use)
- Railway: 500 hours/month, 512 MB RAM
- Search: 100 queries/day

### Q: Can I deploy somewhere other than Railway?

**A:** Yes! Alternatives:
- **Vercel**: Frontend only, need separate backend
- **AWS/DigitalOcean**: Full control, requires more setup
- **Docker**: Run anywhere Docker is supported
- **Self-hosted**: VPS with Node.js

See README.md for deployment guides.

### Q: How do I update to the latest version?

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart server
npm run dev
```

For Railway: Just push to GitHub, auto-deploys!

### Q: Can multiple people use the same deployment?

**A:** Yes! Each user gets:
- Their own User ID (generated in browser)
- Their own chat history (isolated by User ID)
- Their own API key (if using BYOK)
- Rate limits per User ID

### Q: What are the rate limits?

**Default limits:**
- 60 messages per minute per user
- 500 messages per hour per user

**Configurable via env vars:**
```env
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=500
```

### Q: Where is my data stored?

**Local development:**
- `data/chats.db` - SQLite database (chat messages)
- `data/lancedb` - LanceDB vector database (embeddings)

**Railway deployment:**
- Same structure, but in persistent volume at `/app/data`

### Q: How do I reset everything?

**In the app:**
- Click "Reset Everything" in sidebar
- Confirms before deleting all data

**Manually:**
```bash
# Local
rm -rf data/*.db data/lancedb

# Railway
# Use Railway shell to delete /app/data contents
```

### Q: Can I use a different AI model?

**Yes!** Edit `lib/websocket/services/GeminiService.js`:
```javascript
// Change model name
createModel(modelName = 'gemini-2.5-flash') {
  // Options: gemini-2.5-flash, gemini-1.5-pro, etc.
}
```

---

## Next Steps

- ✅ Got it running locally? Try deploying to Railway!
- ✅ Deployed to Railway? Customize the UI in `src/components/`
- ✅ Want to contribute? Check `CONTRIBUTING.md`
- ✅ Found a bug? Open an issue on GitHub

---

## Support & Resources

- **Documentation**: See `/docs` folder
- **GitHub Issues**: Report bugs and request features
- **Portfolio**: [n8sportfolio.vercel.app](https://n8sportfolio.vercel.app/)
- **Source Code**: Fully open source on GitHub

---

**Happy coding! 🎉**

If you found this helpful, star the repo on GitHub! ⭐
