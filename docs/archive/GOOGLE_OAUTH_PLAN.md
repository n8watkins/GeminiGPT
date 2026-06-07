# Google OAuth Implementation Plan

## Requirements (Confirmed)

✅ **Allow anonymous users** - Better onboarding
✅ **Automatic migration** (not reversible) - Seamless data preservation
✅ **JWT sessions** - Simple, secure, no DB writes
✅ **Rate limiting logic:** Based on API key, NOT authentication
  - **Using own API key (BYOK)** → NO rate limits (they pay Google)
  - **Using server API key** → Rate limits apply (protect server costs)
  - **Authentication is separate** → Sign in to save chats across devices

---

## Phase 1: Setup & Dependencies (1-2 hours)

### 1.1 Install Packages
```bash
npm install next-auth@latest
```

### 1.2 Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID
3. Authorized redirect URIs:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Prod: `https://your-app.railway.app/api/auth/callback/google`
4. Add to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
   NEXTAUTH_URL=http://localhost:3000  # or production URL
   ```

---

## Phase 2: Database Schema Updates (30 min)

### 2.1 Update Users Table
```sql
-- Add OAuth fields to existing users table
ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN image TEXT;
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'anonymous'; -- 'anonymous' or 'google'
ALTER TABLE users ADD COLUMN migrated_from TEXT; -- Track migration source

-- Create accounts table for Next-Auth
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider, provider_account_id);
```

### 2.2 Migration Function
```typescript
// src/lib/database.ts

export function migrateAnonymousUserToGoogle(
  anonymousUserId: string,
  googleUserId: string,
  email: string,
  name: string,
  image: string
): void {
  const db = getDatabase();

  db.transaction(() => {
    // 1. Create new Google user with migrated data
    db.prepare(`
      INSERT INTO users (id, email, name, image, google_id, account_type, migrated_from)
      VALUES (?, ?, ?, ?, ?, 'google', ?)
    `).run(googleUserId, email, name, image, googleUserId, anonymousUserId);

    // 2. Transfer all chats to new user
    db.prepare('UPDATE chats SET user_id = ? WHERE user_id = ?')
      .run(googleUserId, anonymousUserId);

    // 3. Delete old anonymous user (CASCADE will handle related data)
    db.prepare('DELETE FROM users WHERE id = ?').run(anonymousUserId);
  })();

  console.log(`✅ Migrated ${anonymousUserId} → ${googleUserId}`);
}

export function getUserByGoogleId(googleId: string) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
}
```

---

## Phase 3: Next-Auth Configuration (1 hour)

### 3.1 Auth API Route
**File:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth, { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { getDatabase, getUserByGoogleId } from "@/lib/database"

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!profile?.sub) return false;

      const db = getDatabase();

      // Check if user already exists
      const existingUser = getUserByGoogleId(profile.sub);

      if (!existingUser) {
        // Create new Google user
        db.prepare(`
          INSERT INTO users (id, email, name, image, google_id, account_type, created_at)
          VALUES (?, ?, ?, ?, ?, 'google', CURRENT_TIMESTAMP)
        `).run(
          profile.sub,
          user.email,
          user.name,
          user.image,
          profile.sub
        );

        console.log(`✅ Created new Google user: ${user.email}`);
      }

      return true;
    },

    async session({ session, token }) {
      // Add user ID to session (from Google ID)
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  },

  session: {
    strategy: "jwt", // No database writes for sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/', // Custom sign-in page (or let Next-Auth handle it)
  }
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 3.2 TypeScript Types
**File:** `src/types/next-auth.d.ts`

```typescript
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string  // Add user ID to session
      email: string
      name: string
      image: string
    }
  }
}
```

### 3.3 Session Provider
**File:** `src/components/Providers.tsx`

```typescript
'use client'

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/contexts/ThemeContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
```

### 3.4 Update Root Layout
**File:** `src/app/layout.tsx`

```typescript
import { Providers } from '@/components/Providers'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

---

## Phase 4: Frontend Components (2 hours)

### 4.1 Sign-In Component
**File:** `src/components/SignInButton.tsx`

```typescript
'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'

export function SignInButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  if (session?.user) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3 min-w-0">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || 'User'}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {session.user.email}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-red-600 dark:text-red-400 hover:underline whitespace-nowrap"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="flex items-center justify-center gap-2 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </button>
  )
}
```

### 4.2 Migration Banner
**File:** `src/components/MigrationBanner.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { getCurrentUserId } from '@/lib/userId'

export function MigrationBanner() {
  const { data: session, status } = useSession()
  const [showBanner, setShowBanner] = useState(false)
  const [chatCount, setChatCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Only show if:
    // 1. User is not signed in
    // 2. User has anonymous chats
    if (status === 'authenticated') {
      setShowBanner(false)
      return
    }

    const anonymousUserId = getCurrentUserId()
    if (!anonymousUserId || anonymousUserId.startsWith('USER-')) {
      // Check if user has chats
      const chats = JSON.parse(localStorage.getItem('chats') || '[]')
      if (chats.length > 0) {
        setChatCount(chats.length)
        setShowBanner(true)
      }
    }
  }, [status])

  const handleMigrate = async () => {
    setIsLoading(true)
    const anonymousUserId = getCurrentUserId()

    // Store for migration after sign-in
    if (anonymousUserId) {
      sessionStorage.setItem('migrate-from', anonymousUserId)
    }

    // Trigger Google sign-in
    await signIn('google', { callbackUrl: '/?migrated=true' })
  }

  if (!showBanner || status === 'loading') return null

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300">
            Save your {chatCount} {chatCount === 1 ? 'chat' : 'chats'}
          </h3>
          <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
            <p>Sign in with Google to:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Save your chat history</li>
              <li>Access chats from any device</li>
              <li>Never lose your conversations</li>
            </ul>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleMigrate}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in & Save Chats'}
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 4.3 Update Sidebar
**File:** `src/components/Sidebar.tsx` (add to existing)

```typescript
import { SignInButton } from './SignInButton'

export default function Sidebar({ ... }) {
  return (
    <div className="sidebar h-screen flex flex-col">
      {/* Existing sidebar header/content */}

      {/* Add auth section at bottom */}
      <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
        <SignInButton />
      </div>
    </div>
  )
}
```

### 4.4 Add Banner to Main Page
**File:** `src/app/page.tsx` (add after header)

```typescript
import { MigrationBanner } from '@/components/MigrationBanner'

export default function Home() {
  return (
    <div className="h-screen flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        {/* Add migration banner */}
        <div className="p-4">
          <MigrationBanner />
        </div>

        <ChatInterface />
      </div>
    </div>
  )
}
```

---

## Phase 5: Migration Logic (1 hour)

### 5.1 Migration API Route
**File:** `src/app/api/migrate-user/route.ts`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { migrateAnonymousUserToGoogle } from '@/lib/database'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in first' },
        { status: 401 }
      )
    }

    const { anonymousUserId } = await request.json()

    if (!anonymousUserId || !anonymousUserId.startsWith('USER-')) {
      return NextResponse.json(
        { error: 'Invalid anonymous user ID' },
        { status: 400 }
      )
    }

    // Perform migration (one-way, not reversible)
    migrateAnonymousUserToGoogle(
      anonymousUserId,
      session.user.id,
      session.user.email!,
      session.user.name!,
      session.user.image!
    )

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully'
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    )
  }
}
```

### 5.2 Client-Side Migration Hook
**File:** `src/hooks/useMigration.ts`

```typescript
'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'

export function useMigration() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return

    // Check if we just signed in and have migration data
    const shouldMigrate = searchParams.get('migrated') === 'true'
    const anonymousUserId = sessionStorage.getItem('migrate-from')

    if (shouldMigrate && anonymousUserId) {
      performMigration(anonymousUserId)
    }
  }, [status, session, searchParams])

  async function performMigration(anonymousUserId: string) {
    try {
      const response = await fetch('/api/migrate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymousUserId })
      })

      if (response.ok) {
        // Clear migration data
        sessionStorage.removeItem('migrate-from')
        localStorage.removeItem('gemini-chat-user-id')

        // Show success message
        console.log('✅ Migration successful!')

        // Redirect to clean URL
        router.replace('/')

        // Reload to fetch migrated chats
        window.location.reload()
      } else {
        console.error('❌ Migration failed:', await response.text())
      }
    } catch (error) {
      console.error('❌ Migration error:', error)
    }
  }
}
```

### 5.3 Add Migration Hook to Layout
**File:** `src/app/layout.tsx`

```typescript
'use client'

import { useMigration } from '@/hooks/useMigration'

export default function RootLayout({ children }) {
  useMigration() // Trigger migration check on mount

  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

---

## Phase 6: Update User ID Logic (30 min)

### 6.1 Update userId Helper
**File:** `src/lib/userId.ts`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Get user ID on server (for API routes)
 * Returns Google ID if authenticated, otherwise anonymous ID
 */
export async function getServerUserId(): Promise<string> {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    return session.user.id // Google user ID (e.g., "103456789...")
  }

  // Fallback to anonymous (existing logic)
  return generateUserId()
}

// Keep existing client-side functions
export { getSessionUserId, generateUserId, setUserId, getCurrentUserId, clearUserId }
```

### 6.2 Client-Side Hook
**File:** `src/hooks/useUserId.ts`

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { getSessionUserId } from '@/lib/userId'

/**
 * Get user ID on client
 * Returns Google ID if authenticated, otherwise anonymous ID
 */
export function useUserId(): string {
  const { data: session, status } = useSession()

  if (status === 'authenticated' && session?.user?.id) {
    return session.user.id // Google user ID
  }

  // Fallback to anonymous
  return getSessionUserId()
}
```

### 6.3 Update Components to Use Hook
**Example:** `src/hooks/useWebSocket.ts`

```typescript
import { useUserId } from './useUserId'

export function useWebSocket() {
  const userId = useUserId() // Automatically gets Google ID or anonymous

  // ... rest of WebSocket logic
}
```

---

## Phase 7: WebSocket Authentication (30 min)

### 7.1 Send Token to WebSocket
**File:** `src/hooks/useWebSocket.ts`

```typescript
'use client'

import { useSession } from 'next-auth/react'

export function useWebSocket() {
  const { data: session } = useSession()
  const userId = useUserId()

  useEffect(() => {
    const socket = io('http://localhost:3000', {
      auth: {
        userId: userId,
        // Send JWT token if authenticated (for verification)
        token: session?.user ? 'authenticated' : null
      }
    })

    // ... rest of WebSocket logic
  }, [userId, session])
}
```

### 7.2 Verify on Server
**File:** `websocket-server.js`

```javascript
io.on('connection', async (socket) => {
  const userId = socket.handshake.auth.userId
  const isAuthenticated = socket.handshake.auth.token === 'authenticated'

  console.log(`🔌 Client connected: ${userId} (auth: ${isAuthenticated})`)

  socket.userId = userId
  socket.isAuthenticated = isAuthenticated

  // Rest of connection handler...
})
```

---

## Phase 8: Rate Limiting Update (CRITICAL)

### 8.1 Update Rate Limiter Logic
**File:** `lib/websocket/services/RateLimiter.js`

```javascript
// IMPORTANT: Rate limiting is based on API key, NOT authentication

checkRateLimit(userId, apiKey = null) {
  // If user has their own API key, skip rate limiting entirely
  if (apiKey && apiKey.trim().length > 0) {
    return {
      allowed: true,
      remaining: { minute: Infinity, hour: Infinity },
      resetAt: { minute: 0, hour: 0 }
    }
  }

  // Using server API key → enforce rate limits
  // (applies to both anonymous AND authenticated users)
  const limits = {
    minute: 10,  // 10 requests per minute
    hour: 100    // 100 requests per hour
  }

  // Existing rate limit logic...
  return this.applyRateLimit(userId, limits)
}
```

### 8.2 Update Message Pipeline
**File:** `lib/websocket/services/MessagePipeline.js`

```javascript
async processMessage(socket, data) {
  const { userId, apiKey } = data

  // Check rate limit (skipped if user has own API key)
  const rateLimitResult = this.rateLimiter.checkRateLimit(userId, apiKey)

  if (!rateLimitResult.allowed) {
    // Show modal suggesting they add their own API key
    socket.emit('rate-limited', {
      message: 'Rate limit exceeded. Add your own API key for unlimited requests!',
      resetAt: rateLimitResult.resetAt
    })
    return
  }

  // Continue processing...
}
```

---

## Testing Checklist

### Anonymous Users
- [ ] Can browse without signing in
- [ ] Can create chats normally
- [ ] Rate limited when using server API key
- [ ] No rate limits when using own API key
- [ ] Migration banner shows when they have chats

### Authenticated Users
- [ ] Can sign in with Google
- [ ] Profile shows in sidebar
- [ ] Chats are saved to Google account
- [ ] Can access chats from multiple devices
- [ ] Still rate limited when using server API key (important!)
- [ ] No rate limits when using own API key

### Migration
- [ ] Anonymous chats transfer to Google account
- [ ] No data loss during migration
- [ ] Migration is one-way (not reversible)
- [ ] Old anonymous user ID is deleted
- [ ] Migration banner disappears after sign-in

### Sign Out
- [ ] User can sign out
- [ ] Becomes anonymous after sign out
- [ ] Can still use app as guest
- [ ] Can sign back in later

---

## Deployment

### Environment Variables (Railway)
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=https://your-app.railway.app
```

### Google Cloud Console
- Update authorized redirect URIs:
  - `https://your-app.railway.app/api/auth/callback/google`

---

## Timeline

| Phase | Time | Difficulty |
|-------|------|------------|
| Setup | 1-2 hours | Easy |
| Database | 30 min | Easy |
| Next-Auth | 1 hour | Medium |
| Frontend | 2 hours | Medium |
| Migration | 1 hour | Medium |
| User ID Logic | 30 min | Easy |
| WebSocket | 30 min | Easy |
| Rate Limiting | CRITICAL | Easy |
| Testing | 2-3 hours | Hard |
| **Total** | **9-11 hours** | **Medium** |

---

## Key Points

✅ **Anonymous users allowed** - Better UX
✅ **Automatic migration** - Seamless experience
✅ **JWT sessions** - Simple, no DB writes
✅ **Rate limiting ONLY for server API key** - BYOK users unlimited
✅ **One-way migration** - Cannot reverse
✅ **Works across devices** - Authenticated users sync

Ready to implement? Let me know which phase to start with!
