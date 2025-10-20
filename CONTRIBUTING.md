# Contributing to GeminiGPT

Thank you for your interest in contributing to Gemini GPT! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Areas for Contribution](#areas-for-contribution)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other unethical or unprofessional conduct

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **Git** installed and configured
- **GitHub account** for pull requests
- **Basic knowledge** of JavaScript/TypeScript, React, Next.js

### Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gemini-chat-app.git
   cd gemini-chat-app
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/gemini-chat-app.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Set up environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```
6. **Run development server**:
   ```bash
   npm run dev
   ```

---

## Development Setup

### Environment Variables

Create `.env.local` with:

```env
# Required for testing
GEMINI_API_KEY=your_test_api_key_here

# Optional for function calling
GOOGLE_SEARCH_API_KEY=your_search_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Development settings
NODE_ENV=development
```

### Database Setup

The app automatically creates databases on first run:
- `data/chat.db` - SQLite database
- `data/lancedb/` - Vector database

No manual setup required.

### Project Structure

```
gemini-chat-app/
├── src/                      # Frontend source
│   ├── app/                  # Next.js app router
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and services
│   └── types/                # TypeScript types
├── lib/                      # Backend services
│   ├── websocket/            # WebSocket services
│   ├── logger.js             # Logging service
│   └── shutdown.js           # Graceful shutdown
├── server.js                 # Main server entry
├── websocket-server.js       # WebSocket server
├── docs/                     # Documentation
├── tests/                    # Test files
└── scripts/                  # Utility scripts
```

---

## Development Process

### 1. Choose an Issue

- Browse [existing issues](https://github.com/OWNER/gemini-chat-app/issues)
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to claim it
- Wait for confirmation from maintainers

### 2. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Changes

- Write clear, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation as needed
- Write/update tests for your changes

### 4. Test Your Changes

```bash
# Run tests
npm test

# Test manually
npm run dev
```

### 5. Commit Your Changes

Follow our [commit guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add dark mode toggle"
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create Pull Request

- Go to GitHub and create a Pull Request
- Fill out the PR template
- Link related issues
- Wait for review

---

## Coding Standards

### JavaScript/TypeScript

**Use TypeScript for all frontend code**:
```typescript
// ✅ Good
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

// ❌ Avoid
const message = { id, content, role }; // No types
```

**Use proper typing**:
```typescript
// ✅ Good
function sendMessage(content: string): Promise<void> {
  // ...
}

// ❌ Avoid
function sendMessage(content) { // No types
  // ...
}
```

**Use ES6+ features**:
```typescript
// ✅ Good
const { id, content } = message;
const messages = [...oldMessages, newMessage];

// ❌ Avoid
var id = message.id;
var messages = oldMessages.concat([newMessage]);
```

### React

**Use functional components with hooks**:
```typescript
// ✅ Good
function ChatMessage({ message }: { message: Message }) {
  const [isEditing, setIsEditing] = useState(false);
  return <div>{message.content}</div>;
}

// ❌ Avoid
class ChatMessage extends React.Component {
  // Class components
}
```

**Use custom hooks for reusable logic**:
```typescript
// ✅ Good
function useChat(chatId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  // ... hook logic
  return { messages, sendMessage };
}

// Usage
const { messages, sendMessage } = useChat(chatId);
```

### File Naming

- **Components**: PascalCase - `ChatInterface.tsx`, `MessageList.tsx`
- **Utilities**: camelCase - `sqlSanitizer.ts`, `fileValidation.ts`
- **Hooks**: camelCase with `use` prefix - `useWebSocket.ts`, `useChat.ts`
- **Types**: camelCase - `chat.ts`, `message.ts`

### Code Organization

**Group related imports**:
```typescript
// React imports
import { useState, useEffect } from 'react';

// Next.js imports
import { useRouter } from 'next/router';

// Third-party imports
import { io } from 'socket.io-client';

// Local imports
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from '@/types/chat';
```

**Keep components small and focused**:
```typescript
// ✅ Good - Single responsibility
function MessageInput({ onSend }: Props) {
  // Just handle input
}

function MessageList({ messages }: Props) {
  // Just display messages
}

// ❌ Avoid - Too many responsibilities
function Chat() {
  // Handles input, display, websocket, state, etc.
}
```

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes

### Examples

```bash
# Feature
git commit -m "feat(chat): add message editing functionality"

# Bug fix
git commit -m "fix(websocket): handle connection timeout properly"

# Documentation
git commit -m "docs: update API documentation with examples"

# Refactor
git commit -m "refactor(database): extract query logic to separate module"
```

### Detailed Commit Messages

For significant changes:

```bash
git commit -m "feat(chat): add semantic search across chats

Implemented cross-chat semantic search using LanceDB vector database.
Users can now search for relevant messages across all their chats.

Features:
- Vector embeddings for all messages
- Similarity search with configurable threshold
- Results ranked by relevance

Closes #42"
```

### Atomic Commits

- One logical change per commit
- All tests should pass after each commit
- Commits should be self-contained

```bash
# ✅ Good - Separate commits
git commit -m "feat: add user preferences schema"
git commit -m "feat: implement theme switching"
git commit -m "feat: persist theme preference"

# ❌ Avoid - Everything in one commit
git commit -m "add themes and preferences and other stuff"
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test
npm test tests/security/sql-injection.test.ts

# Run tests in watch mode
npm test -- --watch
```

### Writing Tests

**Test file naming**: `*.test.ts` or `*.test.tsx`

**Example test**:
```typescript
import { describe, test, expect } from '@jest/globals';
import { escapeSqlString } from '@/lib/utils/sqlSanitizer';

describe('SQL Sanitization', () => {
  test('should escape single quotes', () => {
    const input = "O'Brien";
    const output = escapeSqlString(input);
    expect(output).toBe("O''Brien");
  });

  test('should prevent SQL injection', () => {
    const malicious = "'; DROP TABLE users; --";
    const escaped = escapeSqlString(malicious);
    expect(escaped).toBe("''; DROP TABLE users; --");
  });
});
```

### Test Coverage

- Aim for >80% coverage on new code
- All security features must have tests
- Critical paths must be tested

---

## Pull Request Process

### Before Submitting

✅ **Checklist**:
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No console.log statements (use logger)
- [ ] No hard-coded secrets

### PR Title Format

Follow commit message format:

```
feat(chat): add message editing
fix(websocket): resolve connection timeout issue
docs: update API documentation
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123
Closes #456

## Testing
How to test these changes

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests passing
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline runs tests
   - Linting checks
   - Build verification

2. **Code Review**
   - Maintainers review code
   - Feedback provided
   - Changes requested if needed

3. **Approval & Merge**
   - After approval, PR is merged
   - Thank you for contributing!

---

## Areas for Contribution

### Good First Issues

Perfect for newcomers:
- Documentation improvements
- UI/UX enhancements
- Bug fixes
- Test coverage
- Code comments

### Feature Requests

Bigger features:
- New AI models support
- Additional function calling tools
- Export/import functionality
- User authentication
- Chat sharing improvements

### Bug Fixes

- Check [Issues](https://github.com/OWNER/gemini-chat-app/issues) for reported bugs
- Look for `bug` label
- Reproduce the bug locally
- Fix and add test

### Documentation

- API documentation
- Code comments
- README improvements
- Tutorial/guide creation
- Architecture diagrams

### Testing

- Increase test coverage
- Add integration tests
- Performance testing
- Security testing

### Performance

- Optimize database queries
- Reduce bundle size
- Improve load times
- Memory optimization

---

## Questions?

- 💬 [Open a Discussion](https://github.com/OWNER/gemini-chat-app/discussions)
- 📧 Contact maintainers
- 📖 Read the [documentation](../README.md)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Gemini GPT! Your efforts help make this project better for everyone.** 🎉
