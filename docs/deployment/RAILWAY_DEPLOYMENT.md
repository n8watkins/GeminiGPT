# 🚀 Railway Deployment Guide

## 📋 **Prerequisites**
- GitHub repository with your code
- Railway account (free at [railway.app](https://railway.app))
- Gemini API key

## 🔧 **Deployment Steps**

### 1. **Connect to Railway**
1. Go to [railway.app](https://railway.app) and sign up/login
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `gemini-chat-app` repository

### 2. **Configure Environment Variables**
In Railway dashboard, go to your project → Variables tab and add:

```
NEXT_PUBLIC_GEMINI_API_KEY=your_actual_gemini_api_key
GOOGLE_SEARCH_API_KEY=your_google_search_api_key (optional)
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id (optional)
NODE_ENV=production
```

### 3. **Deploy**
Railway will automatically:
- Install dependencies (`npm ci`)
- Build the project (`npm run build`)
- Start the server (`npm start`)

### 4. **Get Your Server URL**
After deployment, Railway will give you a URL like:
`https://your-app-name-production.up.railway.app`

## 🔗 **Update Frontend**

Once deployed, update your frontend to connect to the Railway server:

1. **Get the Railway URL** from your deployment
2. **Update the WebSocket connection** in `src/hooks/useWebSocket.ts`
3. **Redeploy to Vercel**

## 📊 **What Gets Deployed**

- ✅ **WebSocket Server** (Socket.IO)
- ✅ **Next.js Frontend** (served by the server)
- ✅ **Gemini AI Integration**
- ✅ **Vector Database** (LanceDB)
- ✅ **SQLite Database**

## 🎯 **Result**

You'll have:
- **Frontend**: `https://your-vercel-app.vercel.app` (Vercel)
- **Backend**: `https://your-railway-app.up.railway.app` (Railway)
- **Full WebSocket functionality** in production!

## 💰 **Cost**

- **Railway**: Free tier (500 hours/month)
- **Vercel**: Free tier (unlimited)
- **Total**: $0/month for development use
