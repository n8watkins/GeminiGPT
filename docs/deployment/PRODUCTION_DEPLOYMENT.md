# 🚀 Production Deployment Guide - Advanced Features

## ✅ **What's Ready for Production**

Your app now has **ALL advanced features** working:
- ✅ **Advanced WebSocket Server** with function calling
- ✅ **Google Search API** integration (stock prices, weather, web search)
- ✅ **Gemini 2.5 Flash** with function calling
- ✅ **Attachment Support** (PDFs, images, DOCX)
- ✅ **Vector Database** (LanceDB with embeddings)
- ✅ **Cross-Chat Awareness** (semantic search)
- ✅ **Real-time Streaming** responses

## 🚂 **Step 1: Deploy Backend to Railway**

### **1.1 Connect to Railway**
1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `gemini-chat-app` repository

### **1.2 Configure Environment Variables**
In Railway dashboard → Variables tab, add:

```bash
# Required
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Advanced Features (optional)
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Production Settings
NODE_ENV=production
```

### **1.3 Deploy**
Railway will automatically:
- Install dependencies (`npm ci`)
- Build the project (`npm run build`)
- Start the server (`npm start`)

### **1.4 Get Your Railway URL**
After deployment, Railway gives you a URL like:
`https://geminigpt-production.up.railway.app`

## 🌐 **Step 2: Deploy Frontend to Vercel**

### **2.1 Connect to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "New Project" → Import your `gemini-chat-app` repository

### **2.2 Configure Environment Variables**
In Vercel dashboard → Settings → Environment Variables, add:

```bash
# Gemini API
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Railway Backend URL
NEXT_PUBLIC_RAILWAY_URL=https://geminigpt-production.up.railway.app
```

### **2.3 Deploy**
Vercel will automatically deploy your frontend.

## 🔗 **Step 3: Connect Frontend to Backend**

### **3.1 Update Railway URL**
Once you have your Railway URL, update the frontend:

1. **In Vercel Dashboard**:
   - Go to Settings → Environment Variables
   - Update `NEXT_PUBLIC_RAILWAY_URL` with your actual Railway URL
   - Redeploy

2. **Or update locally and push**:
   ```bash
   # Update src/hooks/useWebSocket.ts line 36
   const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_URL || 'https://YOUR-ACTUAL-RAILWAY-URL.up.railway.app';
   ```

## 🎯 **Step 4: Test Production Features**

Once deployed, test these advanced features:

### **Function Calling**
- "What's Apple's stock price?" → Real Yahoo Finance data
- "What's the weather in New York?" → Real weather data
- "What time is it in Tokyo?" → Accurate timezone
- "Search for AI news" → Real Google Search results

### **Attachments**
- Upload a PDF and ask questions about it
- Upload an image and ask Gemini to analyze it
- Upload a DOCX file and extract content

### **Cross-Chat Awareness**
- Create multiple chats
- In one chat: "My favorite sport is tennis"
- In another chat: "What's my favorite sport?" → Should remember!

## 📊 **Production Architecture**

```
┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │
│   (Frontend)    │◄──►│   (Backend)     │
│                 │    │                 │
│ • Next.js UI    │    │ • WebSocket     │
│ • React App     │    │ • Gemini API    │
│ • Static Files  │    │ • Google Search │
└─────────────────┘    │ • Vector DB     │
                       │ • Attachments   │
                       └─────────────────┘
```

## 🔧 **Troubleshooting**

### **WebSocket Not Connecting**
1. Check Railway URL is correct in Vercel environment variables
2. Verify Railway deployment is running (check logs)
3. Test Railway health endpoint: `https://your-railway-url/healthz`

### **Function Calling Not Working**
1. Verify Google Search API keys in Railway environment variables
2. Check Railway logs for API errors
3. Test with simple queries first

### **Attachments Not Working**
1. Check file size limits (10MB max)
2. Verify supported file types (PDF, DOCX, images)
3. Check Railway logs for processing errors

## 💰 **Costs**

- **Railway**: Free tier (500 hours/month) - plenty for development
- **Vercel**: Free tier (unlimited) - perfect for frontend
- **Google APIs**: Free tier limits - should be sufficient for testing
- **Total**: $0/month for development use

## 🎉 **Result**

You'll have a **fully-featured AI chat app** in production with:
- Real-time WebSocket communication
- Function calling with live data
- File attachment processing
- Cross-chat memory and search
- Professional deployment architecture

**Your advanced features are now production-ready!** 🚀
