# 🤖 GeminiGPT

A modern, full-featured AI chat application powered by Google's Gemini AI with advanced capabilities including multi-chat management, cross-chat semantic search, document processing, and real-time WebSocket communication.

> **Portfolio Project** - This project demonstrates modern full-stack development practices including Next.js, TypeScript, WebSocket communication, vector databases, and AI integration.

## 📖 Quick Links

- **[WebSocket API Documentation](docs/WEBSOCKET_API.md)** - Real-time communication API reference
- **[HTTP API Documentation](docs/HTTP_API.md)** - REST API endpoints
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - SQLite & LanceDB schema
- **[Railway Deployment Guide](docs/deployment/RAILWAY.md)** - Production deployment
- **[Docker Deployment Guide](docs/deployment/DOCKER.md)** - Containerized deployment
- **[Contributing Guide](CONTRIBUTING.md)** - Development guidelines
- **[Production Checklist](docs/PRODUCTION_CHECKLIST.md)** - Pre-deployment checklist
- **[Implementation Plan](IMPLEMENTATION_PLAN.md)** - Development phases and timeline

## ✨ Features

### 🔑 **Bring Your Own API Key (BYOK)**
- **No Signup Required**: Use your own Google Gemini API key - stored only in your browser
- **Privacy First**: Your API key never leaves your browser or touches our servers
- **Full Control**: Manage your own usage and costs with Google's generous free tier ($300 in credits)
- **Easy Setup**: Interactive tutorial walks you through getting a free API key in 2 minutes

### 🧠 **Core AI Features**
- **Gemini 2.5 Flash Integration**: Advanced AI conversations with Google's latest model
- **Function Calling**: Real-time web search, stock prices, weather, and time queries
- **Cross-Chat Awareness**: AI remembers context across different chat sessions
- **Semantic Search**: Find relevant information from previous conversations

### 💬 **Chat Management**
- **Multiple Chat Sessions**: Create and manage unlimited chat conversations
- **Smart Chat Titles**: Auto-generated titles with timestamps
- **Chat Export**: Export conversations as JSON or Markdown
- **Chat Statistics**: Message counts, word counts, and duration tracking
- **Recent Chats**: Quick access to recently used conversations

### 📎 **Document Processing**
- **PDF Support**: Upload and analyze PDF documents
- **DOCX Support**: Process Microsoft Word documents
- **Image Analysis**: Upload images for AI analysis
- **Text Extraction**: Automatic content extraction from documents
- **Vector Indexing**: Documents are indexed for semantic search

### 🔍 **Advanced Search**
- **Vector Database**: LanceDB-powered semantic search across all chats
- **Full-Text Search**: Search within individual chats
- **Cross-Chat Search**: Find information across all conversations
- **Smart Results**: Contextual search results with chat titles and timestamps

### ⚡ **Real-Time Features**
- **WebSocket Communication**: Real-time bidirectional messaging
- **Typing Indicators**: See when AI is responding
- **Streaming Responses**: Real-time response streaming
- **Connection Status**: Visual connection indicators

### 🎨 **User Experience**
- **Responsive Design**: Works perfectly on desktop and mobile
- **Keyboard Shortcuts**: Quick actions with keyboard shortcuts
- **Dark/Light Theme**: Modern UI with Tailwind CSS
- **Chat Utilities**: Export, statistics, and management tools
- **Quick Actions**: Pre-defined prompts for common tasks

## 🚀 Getting Started

### Two Ways to Use GeminiGPT

#### Option 1: **Quick Start with BYOK** (Recommended for Users)

No installation needed! Just visit the deployed app and use your own Google Gemini API key:

1. **Visit the App**: [Your Deployment URL]
2. **Get a Free API Key** (Takes 2 minutes):
   - Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy your key (starts with `AIza...`)
3. **Enter Your Key**: The app will prompt you on first visit with a helpful tutorial
4. **Start Chatting**: Your key is stored locally in your browser - never sent to our servers!

**Why BYOK?**
- ✅ **Free**: Google provides $300 in free credits
- ✅ **Private**: Your key stays in your browser (localStorage)
- ✅ **No Account**: No signup or authentication required
- ✅ **Full Control**: You manage your own usage and costs

#### Option 2: **Self-Hosted Development**

For developers who want to run their own instance:

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Google AI Studio API Key** (optional for server-side) - ([Get one here](https://aistudio.google.com/apikey))
- **Google Search API credentials** (optional, for web search function calling)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/geminigpt.git
cd geminigpt
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Get Your API Keys

##### **Required: Google AI Studio API Key**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

##### **Optional: Google Search API (for web search function calling)**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Custom Search API"
4. Create credentials (API Key)
5. Set up a [Programmable Search Engine](https://programmablesearchengine.google.com/)
6. Copy both the API key and Search Engine ID

#### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp .env.example .env.local
```

Edit `.env.local` with your API keys:

```env
# Optional - Gemini AI API Key (server-side fallback)
# Note: With BYOK, users provide their own keys in the browser
# This is only used if no client-side key is provided
GEMINI_API_KEY=your_gemini_api_key_here

# Optional - Google Search (for web search functionality)
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Development Settings
NODE_ENV=development
```

**Note about BYOK**: When users provide their own API key through the web interface, it's stored in their browser's localStorage and sent directly to the Gemini API. The server-side `GEMINI_API_KEY` is only used as a fallback if no client key is provided.

#### 5. Run the Development Server

```bash
npm run dev
```

The application will start on **http://localhost:1337** (or port 1338 if 1337 is in use).

Open your browser and navigate to the displayed URL to start chatting!

### First-Time Setup

When you first run the app:
1. An **API Key Setup** modal will appear if you haven't provided a key yet
   - Follow the tutorial to get a free Google Gemini API key
   - Your key is stored locally in your browser (never sent to our servers)
   - You can update or remove your key anytime in Settings
2. An **About** modal will appear explaining the portfolio project (after you've added a key)
3. A unique User ID will be generated for your session
4. The app creates local SQLite and LanceDB databases in the `data/` directory
5. You're ready to start chatting!

### Managing Your API Key

**Accessing Settings**:
- Click the "API Key Settings" button in the sidebar
- Or click the settings icon in the app

**What You Can Do**:
- ✏️ **Update Your Key**: Replace with a different API key
- 🗑️ **Remove Your Key**: Delete the stored key from your browser
- ℹ️ **View Tutorial**: See the setup instructions again

**Security & Privacy**:
- Your API key is stored in `localStorage` (your browser's local storage)
- It's never sent to our backend servers
- It's sent directly from your browser to Google's Gemini API
- You can inspect the network traffic to verify this
- Clearing your browser data will remove the stored key

## 🏗️ Architecture

### **Frontend (Next.js)**
```
src/
├── app/                    # Next.js app router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main chat interface
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ChatInterface.tsx  # Main chat UI
│   ├── Sidebar.tsx        # Chat sidebar
│   ├── ChatShortcuts.tsx  # Quick actions panel
│   ├── ChatUtils.tsx      # Chat utilities
│   └── ...               # Other components
├── contexts/              # React contexts
│   └── ChatContext.tsx    # Chat state management
├── hooks/                 # Custom hooks
│   └── useWebSocket.ts    # WebSocket integration
├── lib/                   # Utility libraries
│   ├── database.ts        # SQLite database
│   ├── vectordb.ts        # Vector database
│   ├── embeddingService.ts # AI embeddings
│   └── ...               # Other utilities
└── types/                 # TypeScript definitions
    └── chat.ts            # Chat-related types
```

### **Backend (Node.js + WebSocket)**
```
├── server.js              # Main server entry point
├── websocket-server.js    # Advanced WebSocket server
├── searchService.js       # Function calling services
├── vectorDB.js           # Vector database operations
├── documentProcessor.js   # Document processing
└── railway.json          # Railway deployment config
```

### **Database Layer**
- **SQLite**: Persistent chat storage with ACID compliance
- **LanceDB**: Vector database for semantic search
- **Persistent Volumes**: Data survives server restarts

## 🎯 Function Calling Examples

### **Stock Prices**
```
"What's Apple's current stock price?"
"How is Tesla performing today?"
"Show me GOOGL stock data"
```

### **Weather Information**
```
"What's the weather in New York?"
"How's the temperature in Tokyo?"
"Will it rain in Seattle today?"
```

### **Web Search**
```
"Search for the latest AI news"
"What are the current tech trends?"
"Find information about renewable energy"
```

### **Time Queries**
```
"What time is it in London?"
"Show me the current time in Tokyo"
"What's the timezone in California?"
```

## 🧪 Testing

### **Test Structure**
```
tests/
├── database/              # Database functionality tests
├── integration/           # System integration tests
├── performance/           # Performance and load tests
├── utilities/             # Utility and helper tests
└── run-all-tests.js       # Test runner
```

### **Running Tests**
```bash
# Run all tests
npm run test:all

# Run specific test categories
node tests/database/test-sqlite-db.js
node tests/integration/test-websocket-integration.js
node tests/performance/test-attachment-flow.js
```

## 🚀 Deployment

This application can be deployed to various platforms. The recommended approach is to deploy as a single full-stack application since the backend and frontend are tightly integrated.

### **Deployment Options**

#### **Option 1: Railway (Recommended - Full-Stack)**

Railway provides the easiest deployment with persistent storage for both SQLite and LanceDB.

1. **Prepare for Deployment**
   ```bash
   # Ensure your code is committed to Git
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Deploy to Railway**
   - Go to [Railway.app](https://railway.app/)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the Node.js app

3. **Configure Environment Variables**

   Add these in Railway dashboard under "Variables":
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_SEARCH_API_KEY=your_search_api_key
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   NODE_ENV=production
   PORT=1337
   ```

4. **Add Persistent Volume**
   - Go to "Settings" → "Volumes"
   - Add volume at mount path: `/app/data`
   - This ensures your chat history persists across deployments

5. **Deploy**
   - Railway will automatically build and deploy
   - Your app will be available at: `https://your-app.up.railway.app`

#### **Option 2: Vercel (Frontend) + Railway (Backend)**

For a split deployment with Vercel handling the frontend:

**Backend (Railway):**
1. Follow steps above for Railway
2. Note your Railway backend URL

**Frontend (Vercel):**
1. Go to [Vercel](https://vercel.com/)
2. Import your GitHub repository
3. Add environment variable:
   ```env
   NEXT_PUBLIC_WS_URL=wss://your-railway-app.up.railway.app
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Deploy

#### **Option 3: Self-Hosted (VPS/Cloud)**

For deployment on your own server (AWS, DigitalOcean, etc.):

1. **Install Node.js on your server**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and build the app**
   ```bash
   git clone https://github.com/yourusername/geminigpt.git
   cd geminigpt
   npm install
   npm run build
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local with your production values
   nano .env.local
   ```

4. **Use PM2 for process management**
   ```bash
   npm install -g pm2
   pm2 start server.js --name geminigpt
   pm2 save
   pm2 startup
   ```

5. **Set up Nginx as reverse proxy** (optional)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:1337;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

#### **Option 4: Docker**

Deploy using Docker and Docker Compose:

1. **Create `Dockerfile`**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 1337
   CMD ["npm", "run", "dev"]
   ```

2. **Create `docker-compose.yml`**
   ```yaml
   version: '3.8'
   services:
     geminigpt:
       build: .
       ports:
         - "1337:1337"
       environment:
         - GEMINI_API_KEY=${GEMINI_API_KEY}
         - GOOGLE_SEARCH_API_KEY=${GOOGLE_SEARCH_API_KEY}
         - GOOGLE_SEARCH_ENGINE_ID=${GOOGLE_SEARCH_ENGINE_ID}
       volumes:
         - ./data:/app/data
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

### **Post-Deployment Checklist**

- [ ] App is accessible at the deployment URL
- [ ] WebSocket connection works (check browser console)
- [ ] Chat creation and messages work
- [ ] File upload works (if using persistent storage)
- [ ] Cross-chat search works (vector database)
- [ ] Environment variables are set correctly
- [ ] SSL/HTTPS is configured (for production)

### **Important Notes**

- **Persistent Storage**: Ensure `/data` directory persists to save chat history
- **WebSocket Support**: Your hosting platform must support WebSocket connections
- **API Keys**: Never commit API keys to Git - use environment variables
- **CORS**: If deploying frontend and backend separately, configure CORS properly

## 🎨 Quality of Life Features

### **Keyboard Shortcuts**
- `Alt+N`: Create new chat
- `Alt+F`: Focus search in sidebar
- `Alt+R`: Reset everything
- `Esc`: Close sidebar (mobile) / Clear search
- More shortcuts available in the app

### **Quick Actions**
- 📝 Write Code
- 🔍 Explain
- 🐛 Debug
- 📚 Learn
- 💡 Ideas
- 📊 Analyze

### **Chat Utilities**
- Export as JSON or Markdown
- Copy chat links
- View chat statistics
- Recent chats tracking

## 🔧 Technologies

### **Frontend**
- **Next.js 15**: React framework with app router
- **TypeScript**: Type safety and better DX
- **Tailwind CSS**: Utility-first styling
- **React Context**: State management
- **Socket.IO Client**: Real-time communication

### **Backend**
- **Node.js**: Server runtime
- **Socket.IO**: WebSocket communication
- **SQLite**: Relational database
- **LanceDB**: Vector database
- **Google Generative AI**: Gemini API integration

### **Infrastructure**
- **Railway**: Backend hosting with persistent volumes
- **Vercel**: Frontend hosting and CDN
- **Google Cloud**: AI and search APIs

## 🎯 Code Quality & Best Practices

This project implements production-ready patterns and best practices:

### **Accessibility (a11y)**
- **Focus Management**: Modal focus traps ensure keyboard navigation stays within dialogs
- **ARIA Labels**: Comprehensive aria-label and title attributes for screen readers
- **Keyboard Navigation**: Full keyboard support with tab/shift-tab cycling
- **Semantic HTML**: Proper use of semantic elements and roles

### **Shared Utilities**
- **File Validation**: Centralized validation logic in `src/lib/fileValidation.ts`
  - Supports images, PDFs, DOCX, RTF, and text files
  - Configurable size limits (10MB default)
  - Type checking and MIME type validation
- **Constants**: Centralized configuration in `src/lib/constants.ts`
  - Rate limit thresholds
  - Z-index layers
  - Animation durations
  - Debounce delays
- **Custom Hooks**:
  - `useDebounce`: Performance optimization for search inputs
  - `useFocusTrap`: Accessibility enhancement for modals

### **Production Logging**
- **Environment-Aware**: Different behavior for development vs production
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Prefixed Loggers**: Module-specific loggers (chat, websocket, file upload)
- **No Console Statements**: All logging goes through the logger system

### **Code Organization**
- **TypeScript**: Full type safety across the codebase
- **Component Separation**: Clear separation of concerns
- **Reusable Logic**: Shared validation, logging, and utility functions
- **Consistent Patterns**: Standardized error handling and state management

### **Performance Optimizations**
- **Debounced Search**: 300ms debounce on search inputs to reduce re-renders
- **Memoized Components**: useMemo for expensive computations
- **Lazy Loading**: Dynamic imports for non-critical components
- **Optimized Queries**: Indexed database operations with prepared statements

## 📊 Performance

- **Real-time Communication**: WebSocket-based messaging
- **Vector Search**: Sub-second semantic search
- **Document Processing**: Efficient PDF/DOCX parsing
- **Caching**: Embedding and response caching
- **Optimized Queries**: Indexed database operations

## 🔒 Security

- **API Key Management**: Environment-based configuration
- **User Isolation**: Separate data per user session
- **Input Validation**: Sanitized user inputs
- **Error Handling**: Graceful failure management

## 📚 Documentation

### API Documentation
- **[WebSocket API](docs/WEBSOCKET_API.md)** - Real-time WebSocket events, authentication, rate limiting
- **[HTTP API](docs/HTTP_API.md)** - REST endpoints, health checks, error handling

### Database
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - SQLite tables, LanceDB vectors, indexes, relationships

### Deployment
- **[Railway Deployment](docs/deployment/RAILWAY.md)** - Deploy to Railway with persistent volumes
- **[Docker Deployment](docs/deployment/DOCKER.md)** - Containerized deployment guide

### Development
- **[Contributing Guide](CONTRIBUTING.md)** - Code guidelines, development process
- **[Production Checklist](docs/PRODUCTION_CHECKLIST.md)** - Pre-deployment validation
- **[Implementation Plan](IMPLEMENTATION_PLAN.md)** - Project phases and roadmap

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Port Already in Use
```bash
# Error: Port 1337 is already in use
# Solution: The server will automatically try port 1338
# Or kill the process using the port:
lsof -ti:1337 | xargs kill
```

#### Database Locked
```bash
# Error: Database is locked
# Solution: Close any other instances of the app and clear locks
rm -rf data/*.db-shm data/*.db-wal
```

#### WebSocket Connection Failed
- Check that the server is running
- Verify no firewall is blocking WebSocket connections
- Ensure you're using the correct URL (http:// not https:// for local dev)

#### API Key Issues
```bash
# Verify your API key is set correctly
echo $GEMINI_API_KEY

# Make sure .env.local exists and has the key
cat .env.local | grep GEMINI_API_KEY
```

#### Module Not Found Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
```

#### Chat History Not Persisting
- Ensure the `data/` directory exists and has write permissions
- Check that the database files are being created in `data/`
- For deployment, verify persistent volume is mounted

#### Search Not Working
- Vector database requires at least one message in a chat
- Wait a few seconds after sending a message for indexing
- Check browser console for errors

### Getting Help

If you encounter issues:
1. Check the browser console (F12) for errors
2. Check the server console output
3. Review the [Issues](https://github.com/yourusername/geminigpt/issues) page
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Your environment (OS, Node version, browser)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Development Process

1. **Fork the repository**
   ```bash
   # Fork via GitHub UI, then clone your fork
   git clone https://github.com/yourusername/geminigpt.git
   cd geminigpt
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

4. **Commit your changes**
   ```bash
   git add .
   git commit -m 'Add amazing feature'
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Describe your changes

### Code Guidelines

- Use TypeScript for new code
- Follow the existing project structure
- Add comments for complex logic
- Test your changes locally before submitting

### What to Contribute

- Bug fixes
- New features
- Documentation improvements
- Performance optimizations
- UI/UX enhancements
- Test coverage

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

**Nathan Watkins**
- Portfolio: [n8sportfolio.vercel.app](https://n8sportfolio.vercel.app/)
- GitHub: [@n8watkins](https://github.com/n8watkins)
- LinkedIn: [n8watkins](https://www.linkedin.com/in/n8watkins/)
- Twitter: [@n8watkins](https://x.com/n8watkins)

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) - Powerful AI model
- [Next.js](https://nextjs.org/) - React framework
- [LanceDB](https://lancedb.com/) - Vector database
- [Socket.IO](https://socket.io/) - Real-time communication
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

<div align="center">

**Built with ❤️ as a portfolio project showcasing modern web development**

[⭐ Star this repo](https://github.com/yourusername/geminigpt) | [🐛 Report Bug](https://github.com/yourusername/geminigpt/issues) | [💡 Request Feature](https://github.com/yourusername/geminigpt/issues)

</div>