'use client'

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/contexts/ThemeContext"

/**
 * Providers component wraps the app with necessary context providers
 *
 * Providers included:
 * - SessionProvider (NextAuth) - Manages authentication state
 * - ThemeProvider - Manages dark/light theme
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
