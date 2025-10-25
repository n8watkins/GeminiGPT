import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Session } from 'next-auth';
import { useNotification } from '@/contexts/NotificationContext';

/**
 * useMigration Hook
 *
 * Handles automatic migration of anonymous user data to authenticated Google user.
 * This hook:
 * 1. Detects when a user has just signed in with a pending migration
 * 2. Calls the migration API to transfer chats from anonymous user to Google user
 * 3. Shows success/error notifications
 * 4. Cleans up migration state
 * 5. Reloads the page to reflect migrated chats
 *
 * The migration is triggered when:
 * - User is authenticated
 * - sessionStorage has 'migrate-from' key with anonymous user ID
 *
 * CRITICAL SECURITY FIX: Race condition protection
 * - Uses useRef for synchronous lock (prevents TOCTOU)
 * - Removes sessionStorage BEFORE API call (atomic operation)
 * - Multiple safeguards prevent concurrent migrations
 */
export function useMigration() {
  const { data: session, status } = useSession();
  const { showSuccess, showError } = useNotification();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  // CRITICAL FIX: Use ref as synchronous lock to prevent race conditions
  // State updates are async, so checking `isMigrating` has a TOCTOU vulnerability
  const migrationLockRef = useRef(false);

  // Cast session to our extended type
  const typedSession = session as Session | null;

  useEffect(() => {
    // Only run once when authenticated and not already migrating
    if (status !== 'authenticated' || !typedSession?.user || isMigrating || migrationComplete) {
      return;
    }

    // CRITICAL FIX: Check lock FIRST (synchronous, no race condition)
    if (migrationLockRef.current) {
      return;
    }

    // CRITICAL FIX: Acquire lock immediately (before any async operations)
    migrationLockRef.current = true;

    // Check for pending migration
    const anonymousUserId = sessionStorage.getItem('migrate-from');

    if (!anonymousUserId) {
      // Release lock if no migration needed
      migrationLockRef.current = false;
      return;
    }

    // CRITICAL FIX: Remove from sessionStorage IMMEDIATELY (before API call)
    // This prevents concurrent migrations if effect runs twice
    sessionStorage.removeItem('migrate-from');

    // Prevent duplicate migrations (state update for UI)
    setIsMigrating(true);

    const performMigration = async () => {
      try {
        console.log('🔄 Starting migration process...');

        const response = await fetch('/api/migrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ anonymousUserId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Migration failed');
        }

        console.log('✅ Migration successful:', data);

        // Show success notification
        showSuccess(
          `Welcome! Successfully migrated ${data.chatsMigrated || 0} chat${data.chatsMigrated === 1 ? '' : 's'}.`
        );

        // Clean up remaining migration state (migrate-from already removed)
        sessionStorage.removeItem('migration-banner-dismissed');

        // Update local storage user ID to Google ID
        if (typedSession?.user?.id) {
          localStorage.setItem('gemini-chat-user-id', typedSession.user.id);
        }

        // Mark migration as complete
        setMigrationComplete(true);

        // Reload the page after a short delay to show migrated chats
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (error) {
        console.error('❌ Migration error:', error);

        // Show error notification
        showError(
          error instanceof Error ? error.message : 'Failed to migrate chats. Please try again.'
        );

        // Clean up remaining migration state (migrate-from already removed)
        sessionStorage.removeItem('migration-banner-dismissed');

        // Release lock on error
        migrationLockRef.current = false;
        setIsMigrating(false);
      }
    };

    performMigration();
  }, [status, typedSession, isMigrating, migrationComplete, showSuccess, showError]);

  return {
    isMigrating,
    migrationComplete
  };
}
