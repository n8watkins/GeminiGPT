# 📁 Project Structure

This document provides a comprehensive overview of the Gemini Chat App project structure and organization.

## 🏗️ Root Directory

```
gemini-chat-app/
├── 📄 Configuration Files
│   ├── package.json              # Dependencies and scripts
│   ├── next.config.ts            # Next.js configuration
│   ├── tsconfig.json             # TypeScript configuration
│   ├── tailwind.config.ts        # Tailwind CSS configuration
│   ├── eslint.config.mjs         # ESLint configuration
│   ├── jest.config.js            # Jest testing configuration
│   ├── postcss.config.mjs        # PostCSS configuration
│   ├── railway.json              # Railway deployment configuration
│   ├── Dockerfile                # Docker container configuration
│   └── .gitignore                # Git ignore rules
│
├── 🚀 Server Files
│   ├── server.js                 # Main server entry point
│   ├── websocket-server.js       # WebSocket server with all features
│   ├── searchService.js          # Function calling services
│   ├── vectorDB.js              # Vector database operations
│   └── documentProcessor.js      # Document processing utilities
│
├── 📚 Documentation
│   ├── README.md                 # Main project documentation
│   ├── PROJECT_STRUCTURE.md      # This file
│   └── docs/                     # Detailed documentation
│
├── 🧪 Testing
│   └── tests/                    # Comprehensive test suite
│
├── 📦 Source Code
│   └── src/                      # Main application source code
│
├── 🗄️ Data Storage
│   └── data/                     # Local database files (gitignored)
│
└── 🛠️ Utilities
    └── deploy-to-production.sh   # Deployment script
```

## 📦 Source Code Structure (`src/`)

```
src/
├── 🎯 App Router (Next.js 15)
│   ├── app/
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── page.tsx              # Main chat interface page
│   │   └── globals.css           # Global styles and Tailwind imports
│   │
├── 🧩 Components
│   ├── components/
│   │   ├── ChatInterface.tsx     # Main chat UI component
│   │   ├── Sidebar.tsx           # Chat sidebar with navigation
│   │   ├── ChatShortcuts.tsx     # Quick actions and shortcuts panel
│   │   ├── ChatUtils.tsx         # Chat utilities (export, stats)
│   │   ├── AttachmentDisplay.tsx # File attachment display
│   │   ├── FileUpload.tsx        # File upload component
│   │   └── UserId.tsx            # User ID display component
│   │
├── 🎭 Contexts
│   ├── contexts/
│   │   └── ChatContext.tsx       # Global chat state management
│   │
├── 🪝 Hooks
│   ├── hooks/
│   │   └── useWebSocket.ts       # WebSocket connection hook
│   │
├── 📚 Libraries
│   ├── lib/
│   │   ├── database.ts           # SQLite database operations
│   │   ├── sqliteStorage.ts      # SQLite storage service
│   │   ├── migration.ts          # Data migration utilities
│   │   ├── vectordb.ts           # Vector database operations
│   │   ├── embeddingService.ts   # AI embedding generation
│   │   ├── websocket.ts          # WebSocket server setup
│   │   └── gemini.ts             # Gemini AI integration
│   │
└── 🏷️ Types
    └── types/
        └── chat.ts               # TypeScript type definitions
```

## 🧪 Test Structure (`tests/`)

```
tests/
├── 📊 Database Tests
│   ├── database/
│   │   ├── test-sqlite-db.js           # Basic SQLite functionality
│   │   ├── comprehensive-db-tests.js   # Comprehensive database testing
│   │   ├── fixed-db-tests.js           # Fixed database tests
│   │   ├── persistence-test.js         # Data persistence testing
│   │   └── test-vectordb.js            # Vector database tests
│   │
├── 🔗 Integration Tests
│   ├── integration/
│   │   ├── integration-test.js         # System integration tests
│   │   ├── test-cross-chat-awareness.js # Cross-chat functionality
│   │   ├── test-websocket-integration.js # WebSocket integration
│   │   ├── test-search-chat-history.js  # Chat history search
│   │   ├── test-websocket.js           # WebSocket connection tests
│   │   └── test-message.js             # Message sending tests
│   │
├── ⚡ Performance Tests
│   ├── performance/
│   │   ├── test-attachment-flow.js     # File attachment performance
│   │   ├── test-document-processing.js # Document processing performance
│   │   ├── test-pdf-api.js             # PDF processing API tests
│   │   └── test-pdf-simple.js          # Simple PDF processing tests
│   │
├── 🛠️ Utility Tests
│   ├── utilities/
│   │   ├── example-sqlite-usage.js     # SQLite usage examples
│   │   └── clear-storage.js            # Storage cleanup utilities
│   │
├── 🧪 General Tests
│   ├── test-chat-history.js            # Chat history functionality
│   ├── test-db-contents.js             # Database content verification
│   ├── test-manual.js                  # Manual testing utilities
│   ├── test-trigger-patterns.js        # Trigger pattern testing
│   ├── searchService.test.js           # Search service tests
│   ├── websocket.test.js               # WebSocket tests
│   ├── run-all-tests.js                # Test runner script
│   ├── setup.js                        # Test setup configuration
│   └── README.md                       # Test documentation
```

## 📚 Documentation Structure (`docs/`)

```
docs/
├── 🚀 Deployment Guides
│   ├── deployment/
│   │   ├── PRODUCTION_DEPLOYMENT.md    # Production deployment guide
│   │   ├── RAILWAY_DEPLOYMENT.md       # Railway deployment guide
│   │   └── VERCEL_DEPLOYMENT_ISSUES.md # Vercel deployment issues
│   │
├── ✨ Feature Documentation
│   ├── features/
│   │   ├── QUALITY_IMPROVEMENTS.md     # Quality of life improvements
│   │   ├── VECTOR_DB_FIX.md            # Vector database fixes
│   │   ├── README.md                   # Features overview
│   │   ├── cross-chat-awareness.md     # Cross-chat awareness feature
│   │   ├── image-attachments.md        # Image attachment feature
│   │   ├── sqlite-database.md          # SQLite database feature
│   │   └── vector-database.md          # Vector database feature
│   │
├── 🛠️ Development Guides
│   ├── development/
│   │   ├── README.md                   # Development overview
│   │   ├── ux-improvements.md          # UX improvements guide
│   │   └── websocket-integration.md    # WebSocket integration guide
│   │
├── 🧪 Testing Documentation
│   ├── testing/
│   │   ├── README.md                   # Testing overview
│   │   └── test-results.md             # Test results and coverage
│   │
└── 🔧 Fix Documentation
    └── fixes/
        └── README.md                   # Bug fixes and improvements
```

## 🗄️ Data Storage Structure (`data/`)

```
data/
├── chat.db                    # SQLite database file (persistent)
├── lancedb/                   # LanceDB vector database directory
│   ├── chat_embeddings.lance  # Vector embeddings table
│   └── ...                    # Other LanceDB files
└── ...                        # Other data files
```

## 🚀 Server Architecture

### **Main Server (`server.js`)**
- Next.js application server
- WebSocket server integration
- Production/development mode handling
- Port configuration and fallbacks

### **WebSocket Server (`websocket-server.js`)**
- Advanced WebSocket functionality
- Function calling integration
- Vector database operations
- Document processing
- Real-time communication

### **Service Files**
- **`searchService.js`**: Google Search, stock prices, weather, time
- **`vectorDB.js`**: Vector database operations (JavaScript version)
- **`documentProcessor.js`**: PDF/DOCX processing (JavaScript version)

## 🎯 Key Features by Directory

### **Frontend Features (`src/components/`)**
- **ChatInterface.tsx**: Main chat UI with message handling
- **Sidebar.tsx**: Chat navigation and management
- **ChatShortcuts.tsx**: Quick actions and keyboard shortcuts
- **ChatUtils.tsx**: Export, statistics, and utilities
- **AttachmentDisplay.tsx**: File attachment handling
- **FileUpload.tsx**: Drag-and-drop file uploads

### **Backend Features (`src/lib/`)**
- **database.ts**: SQLite CRUD operations
- **vectordb.ts**: Vector database and embeddings
- **embeddingService.ts**: AI embedding generation
- **websocket.ts**: WebSocket server setup
- **gemini.ts**: Gemini AI integration

### **State Management (`src/contexts/`)**
- **ChatContext.tsx**: Global chat state, message handling, WebSocket integration

## 🔧 Configuration Files

### **Development Configuration**
- **`package.json`**: Dependencies, scripts, and project metadata
- **`tsconfig.json`**: TypeScript compiler configuration
- **`next.config.ts`**: Next.js framework configuration
- **`tailwind.config.ts`**: Tailwind CSS configuration
- **`eslint.config.mjs`**: Code linting rules

### **Deployment Configuration**
- **`railway.json`**: Railway deployment with persistent volumes
- **`Dockerfile`**: Container configuration
- **`deploy-to-production.sh`**: Automated deployment script

## 📊 File Organization Principles

### **Separation of Concerns**
- **Frontend**: React components and UI logic
- **Backend**: Server logic and database operations
- **Tests**: Organized by functionality and type
- **Documentation**: Categorized by purpose

### **Scalability**
- **Modular Components**: Reusable and maintainable
- **Service Layer**: Separated business logic
- **Type Safety**: Comprehensive TypeScript coverage
- **Testing**: Comprehensive test coverage

### **Maintainability**
- **Clear Naming**: Descriptive file and directory names
- **Documentation**: Comprehensive documentation
- **Consistent Structure**: Predictable organization
- **Version Control**: Proper .gitignore configuration

## 🎯 Best Practices

### **File Naming**
- **Components**: PascalCase (e.g., `ChatInterface.tsx`)
- **Utilities**: camelCase (e.g., `embeddingService.ts`)
- **Tests**: kebab-case (e.g., `test-sqlite-db.js`)
- **Documentation**: UPPERCASE (e.g., `README.md`)

### **Directory Organization**
- **Feature-based**: Group related functionality
- **Layer-based**: Separate concerns (UI, logic, data)
- **Type-based**: Organize by file type (components, tests, docs)

### **Import/Export**
- **Relative Imports**: Use relative paths within modules
- **Absolute Imports**: Use absolute paths for cross-module imports
- **Barrel Exports**: Use index files for clean imports

---

This structure provides a solid foundation for a scalable, maintainable, and well-organized chat application with advanced AI capabilities.
