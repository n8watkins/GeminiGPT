/**
 * Frontend-wave sanity checks (Agent C):
 * - first-run onboarding wizard gating (localStorage flag + legacy flags)
 * - demo-pool usage helpers driven by the usage-info contract:
 *   { pool: { used, budget, resetAt, available }, user: { requests, tokens } }
 */

import { isOnboardingComplete, ONBOARDING_COMPLETE_KEY } from '@/hooks/useOnboarding';
import {
  UsageInfo,
  isPoolExhausted,
  poolPercentUsed,
  formatPoolReset,
  formatTokenCount,
  publishUsageInfo,
  getUsageInfo,
  __resetUsageInfoForTests,
} from '@/hooks/useUsageInfo';

function storageWith(entries: Record<string, string>) {
  return {
    getItem: (key: string) => (key in entries ? entries[key] : null),
  };
}

describe('onboarding first-run gating', () => {
  it('shows the wizard for a brand-new visitor', () => {
    expect(isOnboardingComplete(storageWith({}))).toBe(false);
  });

  it('never re-shows after the wizard sets its flag', () => {
    expect(isOnboardingComplete(storageWith({ [ONBOARDING_COMPLETE_KEY]: 'true' }))).toBe(true);
  });

  it('treats users of the old About modal as already onboarded', () => {
    expect(isOnboardingComplete(storageWith({ 'geminigpt-about-last-shown': '1718000000000' }))).toBe(true);
  });

  it('treats users who skipped the old API key tutorial as onboarded', () => {
    expect(isOnboardingComplete(storageWith({ 'api-key-tutorial-seen': 'true' }))).toBe(true);
  });

  it('treats existing BYOK users as onboarded', () => {
    expect(isOnboardingComplete(storageWith({ 'gemini-api-key': 'AIzaFakeKey' }))).toBe(true);
  });
});

describe('usage-info contract helpers', () => {
  const usage = (pool: Partial<UsageInfo['pool']>): UsageInfo => ({
    pool: { used: 0, budget: 100, resetAt: null, available: 100, ...pool },
    user: { requests: 3, tokens: 12400 },
  });

  it('reports exhaustion when pool.available <= 0 (POOL_EXHAUSTED contract)', () => {
    expect(isPoolExhausted(usage({ used: 100, available: 0 }))).toBe(true);
    expect(isPoolExhausted(usage({ used: 120, available: -20 }))).toBe(true);
    expect(isPoolExhausted(usage({ used: 50, available: 50 }))).toBe(false);
  });

  it('does not report exhaustion without data (placeholder state)', () => {
    expect(isPoolExhausted(null)).toBe(false);
  });

  it('computes percent used, clamped to 0-100', () => {
    expect(poolPercentUsed(usage({ used: 25 }))).toBe(25);
    expect(poolPercentUsed(usage({ used: 150 }))).toBe(100);
    expect(poolPercentUsed(usage({ used: -5 }))).toBe(0);
    expect(poolPercentUsed(null)).toBe(0);
    expect(poolPercentUsed(usage({ budget: 0 }))).toBe(0);
  });

  it('formats reset times defensively', () => {
    expect(formatPoolReset(null)).toBe('');
    expect(formatPoolReset('not-a-date')).toBe('');
    expect(formatPoolReset(Date.now() - 1000)).toBe('soon');
    expect(formatPoolReset(Date.now() + 5 * 60 * 1000)).toMatch(/^in \d+m$/);
    expect(formatPoolReset(Date.now() + 3 * 60 * 60 * 1000)).toMatch(/^in \d+h \d+m$/);
  });

  it('formats token counts compactly', () => {
    expect(formatTokenCount(950)).toBe('950');
    expect(formatTokenCount(12400)).toBe('12.4k');
    expect(formatTokenCount(2_500_000)).toBe('2.5M');
  });
});

describe('usage-info store', () => {
  beforeEach(() => __resetUsageInfoForTests());

  it('accepts valid usage-info payloads from the socket event', () => {
    const payload = {
      pool: { used: 10, budget: 100, resetAt: null, available: 90 },
      user: { requests: 2, tokens: 500 },
    };
    publishUsageInfo(payload);
    expect(getUsageInfo()).toEqual(payload);
  });

  it('ignores malformed payloads (backend not merged yet / bad data)', () => {
    publishUsageInfo(null);
    publishUsageInfo('nope');
    publishUsageInfo({ pool: 'broken' });
    publishUsageInfo({ user: { requests: 1, tokens: 2 } });
    expect(getUsageInfo()).toBeNull();
  });
});
