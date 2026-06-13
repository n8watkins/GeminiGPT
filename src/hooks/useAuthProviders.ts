'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { logger } from '@/lib/logger';

/**
 * Detects whether any auth provider (Google OAuth) is actually configured.
 *
 * Auth is optional in this app: when GOOGLE_CLIENT_ID/SECRET are not set
 * (the current production state), `/api/auth/providers` returns `{}` and
 * clicking any "Sign in" button silently fails. Every sign-in entry point
 * (sidebar item, sign-in modal, migration banner) consults this hook and
 * hides itself when no provider exists.
 *
 * The providers list is fetched once per page load and shared module-wide,
 * so any number of consumers cost exactly one request.
 */

let providersConfigured: boolean | null = null; // null = not yet known
let fetchStarted = false;
const subscribers = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange);
  return () => {
    subscribers.delete(onStoreChange);
  };
}

function getSnapshot(): boolean | null {
  return providersConfigured;
}

function getServerSnapshot(): boolean | null {
  return null;
}

function publish(value: boolean): void {
  providersConfigured = value;
  subscribers.forEach((notify) => notify());
}

/** Test-only helper to reset module state between tests. */
export function __resetAuthProvidersForTests(): void {
  providersConfigured = null;
  fetchStarted = false;
  subscribers.clear();
}

async function fetchProvidersOnce(): Promise<void> {
  if (fetchStarted) return;
  fetchStarted = true;
  try {
    const res = await fetch('/api/auth/providers');
    if (!res.ok) {
      publish(false);
      return;
    }
    const providers = await res.json();
    publish(!!providers && typeof providers === 'object' && Object.keys(providers).length > 0);
  } catch (error) {
    logger.debug('Could not fetch auth providers; hiding sign-in UI', { error });
    publish(false);
  }
}

/**
 * True only when at least one sign-in provider is configured.
 * While the check is in flight this returns false, so sign-in UI stays
 * hidden by default and appears once a provider is confirmed - never the
 * other way around (no flash of a broken button).
 */
export function useAuthConfigured(): boolean {
  const configured = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void fetchProvidersOnce();
  }, []);

  return configured === true;
}
