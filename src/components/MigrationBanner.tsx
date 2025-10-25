'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { getCurrentUserId } from '@/lib/userId'
import { useChat } from '@/contexts/ChatContext'

/**
 * MigrationBanner Component
 *
 * Shows a banner encouraging anonymous users to sign in and save their chats.
 * Only displays if:
 * - User is not authenticated
 * - User has anonymous chats
 * - User hasn't dismissed the banner
 */
export function MigrationBanner() {
  const { status } = useSession()
  const { state } = useChat()
  const [showBanner, setShowBanner] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Don't show if authenticated
    if (status === 'authenticated') {
      setShowBanner(false)
      return
    }

    // Don't show while loading
    if (status === 'loading') {
      return
    }

    // Check if user has dismissed banner
    const dismissed = sessionStorage.getItem('migration-banner-dismissed')
    if (dismissed === 'true') {
      setShowBanner(false)
      return
    }

    // Check if user is anonymous and has chats
    const anonymousUserId = getCurrentUserId()
    const isAnonymous = anonymousUserId?.startsWith('USER-')
    const hasChats = state.chats.length > 0

    if (isAnonymous && hasChats) {
      setShowBanner(true)
    } else {
      setShowBanner(false)
    }
  }, [status, state.chats.length])

  const handleSignIn = async () => {
    setIsLoading(true)
    const anonymousUserId = getCurrentUserId()

    // Store for migration after sign-in
    if (anonymousUserId) {
      sessionStorage.setItem('migrate-from', anonymousUserId)
    }

    // Trigger Google sign-in with migration callback
    await signIn('google', { callbackUrl: '/?migrated=true' })
  }

  const handleDismiss = () => {
    sessionStorage.setItem('migration-banner-dismissed', 'true')
    setShowBanner(false)
  }

  if (!showBanner || status === 'loading') return null

  const chatCount = state.chats.length

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <svg
            className="h-6 w-6 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
            💾 Save your {chatCount} {chatCount === 1 ? 'chat' : 'chats'}
          </h3>

          <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
            Sign in with Google to save your conversations and access them from any device.
          </p>

          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 mb-3">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Automatic migration - all your chats will be preserved</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                    />
                  </svg>
                  <span>Sign in & Save Chats</span>
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm px-3 py-2"
            >
              Maybe later
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
