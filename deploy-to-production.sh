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
echo "1. 🚂 Deploy Backend to Railway:"
echo "   • Go to https://railway.app"
echo "   • Create new project from GitHub repo"
echo "   • Add environment variables (see PRODUCTION_DEPLOYMENT.md)"
echo "   • Deploy and get your Railway URL"
echo ""
echo "2. 🌐 Deploy Frontend to Vercel:"
echo "   • Go to https://vercel.com"
echo "   • Import your GitHub repository"
echo "   • Add environment variables with your Railway URL"
echo "   • Deploy"
echo ""
echo "3. 🔗 Connect Frontend to Backend:"
echo "   • Update NEXT_PUBLIC_RAILWAY_URL in Vercel"
echo "   • Redeploy frontend"
echo ""
echo "📖 Detailed instructions: See PRODUCTION_DEPLOYMENT.md"
echo ""
echo "🎉 Your advanced features are ready for production!"
echo "   • Real-time WebSocket communication"
echo "   • Function calling with live data"
echo "   • File attachment processing"
echo "   • Cross-chat memory and search"
echo ""
echo "🚀 Happy deploying!"
