'use client'

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { WebSocketProvider } from "@/contexts/WebSocketContext"

/**
 * Providers component wraps the app with necessary context providers
 *
 * Providers included:
 * - SessionProvider (NextAuth) - Manages authentication state
 * - ThemeProvider - Manages dark/light theme
 * - WebSocketProvider - Owns the single app-wide Socket.IO connection
 *   (must be inside SessionProvider; it reconnects on user change)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
