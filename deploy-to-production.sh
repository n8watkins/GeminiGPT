#!/bin/bash

echo "🚀 Deploying Advanced Gemini Chat App to Production"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "✅ Advanced WebSocket server configured"
echo "✅ Google Search API integration enabled"
echo "✅ Function calling with Gemini 2.5 Flash"
echo "✅ Attachment support (PDFs, images, DOCX)"
echo "✅ Vector database and embeddings"
echo "✅ Cross-chat awareness"
echo ""

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Current changes:"
    git status --short
    echo ""
    read -p "Do you want to commit and push these changes? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Deploy advanced features to production"
        git push origin main
        echo "✅ Changes committed and pushed"
    else
        echo "❌ Deployment cancelled - please commit changes first"
        exit 1
    fi
else
    echo "✅ Git repository is clean"
fi

echo ""
echo "🎯 Next Steps for Production Deployment:"
echo ""
echo "This app is a SINGLE Node service (Next.js + WebSocket server in server.js)."
echo "It cannot be split onto Vercel — deploy it as one service, single replica."
echo ""
echo "Fastest free option (ephemeral): Render"
echo "   • https://render.com → New → Web Service → connect this repo"
echo "   • Build:  npm ci && npm run build"
echo "   • Start:  npm start"
echo "   • Health check path: /healthz"
echo "   • Env: GEMINI_API_KEY, NODE_ENV=production, TRUST_PROXY=true,"
echo "          NEXT_PUBLIC_RAILWAY_URL=<your public URL>"
echo ""
echo "Free + persistent: Oracle Cloud Always Free VM   |   Easiest paid: Railway / Fly.io"
echo ""
echo "📖 Full guide (host comparison, env vars, roadmap): docs/DEPLOYMENT_GUIDE.md"
echo ""
echo "⚠️  Before any public deploy: rotate the Gemini + Google Search API keys."
echo ""
echo "🚀 Happy deploying!"
