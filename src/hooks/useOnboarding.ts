'use client';

import { useCallback, useEffect, useState } from 'react';

export const ONBOARDING_COMPLETE_KEY = 'geminigpt-onboarding-complete';

/**
 * Anyone who interacted with the pre-wizard first-run flow (or already saved
 * an API key) should never see the onboarding wizard again.
 */
const LEGACY_SEEN_KEYS = [
  'geminigpt-about-last-shown', // old About modal timestamp
  'api-key-tutorial-seen', // old ApiKeySetup "skip" flag
  'gemini-api-key', // existing BYOK users are clearly onboarded
];

type StorageLike = Pick<Storage, 'getItem'>;

/** Pure check so the first-run rule is unit-testable. */
export function isOnboardingComplete(storage: StorageLike): boolean {
  if (storage.getItem(ONBOARDING_COMPLETE_KEY)) return true;
  return LEGACY_SEEN_KEYS.some((key) => storage.getItem(key) !== null);
}

/**
 * First-run-only onboarding wizard state. The wizard shows exactly once;
 * completing (or dismissing) it sets a localStorage flag.
 */
export function useOnboarding() {
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    try {
      if (!isOnboardingComplete(localStorage)) {
        setShowWizard(true);
      }
    } catch {
      // localStorage unavailable (SSR/private mode edge): never block the app
    }
  }, []);

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      // Keep the legacy flag in sync so older code paths stay quiet
      localStorage.setItem('geminigpt-about-last-shown', Date.now().toString());
    } catch {
      // Best effort only
    }
    setShowWizard(false);
  }, []);

  return { showWizard, completeOnboarding };
}
