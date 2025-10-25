import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Session } from 'next-auth';
import { getSessionUserId } from '@/lib/userId';

/**
 * useUserId Hook
 *
 * Returns the current user ID, prioritizing authenticated Google ID over anonymous ID.
 *
 * Behavior:
 * - If user is authenticated: returns Google user ID (from session)
 * - If user is not authenticated: returns anonymous user ID (from localStorage)
 * - Handles SSR by avoiding hydration mismatches
 *
 * This hook ensures consistent user identification across the app.
 */
export function useUserId() {
  const { data: session, status } = useSession();
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Cast session to our extended type
  const typedSession = session as Session | null;

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') {
      return;
    }

    // If authenticated, use Google user ID
    if (status === 'authenticated' && typedSession?.user?.id) {
      setUserId(typedSession.user.id);
      setIsLoading(false);
      return;
    }

    // Otherwise, use anonymous user ID from localStorage
    const anonymousId = getSessionUserId();
    setUserId(anonymousId);
    setIsLoading(false);
  }, [status, typedSession]);

  return {
    userId,
    isLoading,
    isAuthenticated: status === 'authenticated',
    isAnonymous: !typedSession?.user?.id && userId.startsWith('USER-')
  };
}
