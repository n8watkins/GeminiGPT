'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { logger } from '@/lib/logger';

/**
 * Shared demo-pool / per-user usage data.
 *
 * Contract (RAG_OVERHAUL_PLAN.md): socket event `usage-info` and
 * REST `GET /api/usage` both return:
 *   { pool: { used, budget, resetAt, available }, user: { requests, tokens } }
 *
 * The backend that emits this may not be deployed yet, so every consumer
 * must render a sensible placeholder when this is null.
 */
export interface UsageInfo {
  pool: {
    used: number;
    budget: number;
    resetAt: string | number | null;
    available: number;
  };
  user?: {
    requests: number;
    tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Module-level store: several components (sidebar meter, onboarding wizard,
// chat interface) need the same usage snapshot, but each `useWebSocket()`
// instance owns its own socket. Socket listeners publish here; consumers
// subscribe via `useUsageInfo()` without opening more sockets.
// ---------------------------------------------------------------------------

let currentUsage: UsageInfo | null = null;
let restFetchStarted = false;
const subscribers = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange);
  return () => {
    subscribers.delete(onStoreChange);
  };
}

function getSnapshot(): UsageInfo | null {
  return currentUsage;
}

function getServerSnapshot(): UsageInfo | null {
  return null;
}

function isValidUsage(data: unknown): data is UsageInfo {
  if (!data || typeof data !== 'object') return false;
  const pool = (data as UsageInfo).pool;
  return !!pool && typeof pool === 'object' && typeof pool.budget === 'number';
}

/** Push a fresh usage snapshot to every subscribed component. */
export function publishUsageInfo(data: unknown): void {
  if (!isValidUsage(data)) return;
  currentUsage = data;
  subscribers.forEach((notify) => notify());
}

/** Current snapshot without subscribing (for non-React callers/tests). */
export function getUsageInfo(): UsageInfo | null {
  return currentUsage;
}

/** Test-only helper to reset module state between tests. */
export function __resetUsageInfoForTests(): void {
  currentUsage = null;
  restFetchStarted = false;
  subscribers.clear();
}

async function fetchUsageOnce(): Promise<void> {
  if (restFetchStarted) return;
  restFetchStarted = true;
  try {
    const res = await fetch('/api/usage');
    if (!res.ok) return; // Endpoint not deployed yet - degrade gracefully
    const data = await res.json();
    publishUsageInfo(data);
  } catch (error) {
    // Backend wave not merged yet, or transient network issue: stay on placeholder
    logger.debug('GET /api/usage unavailable, using placeholder usage state', { error });
  }
}

/**
 * Subscribe to the shared usage snapshot. Seeds itself once per page load
 * from `GET /api/usage`; afterwards `usage-info` socket events (published by
 * useWebSocket) keep it fresh. Returns null until the first data arrives.
 */
export function useUsageInfo(): UsageInfo | null {
  const usage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void fetchUsageOnce();
  }, []);

  return usage;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested in tests/frontend)
// ---------------------------------------------------------------------------

/** True when the shared demo pool has no capacity left. */
export function isPoolExhausted(usage: UsageInfo | null): boolean {
  return !!usage?.pool && usage.pool.available <= 0;
}

/** Percentage of the demo pool consumed, clamped to 0-100. */
export function poolPercentUsed(usage: UsageInfo | null): number {
  if (!usage?.pool || usage.pool.budget <= 0) return 0;
  const pct = (usage.pool.used / usage.pool.budget) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** Human label for when the pool resets, or '' when unknown. */
export function formatPoolReset(resetAt: string | number | null | undefined): string {
  if (resetAt === null || resetAt === undefined || resetAt === '') return '';
  const date = new Date(resetAt);
  if (isNaN(date.getTime())) return '';
  const deltaMs = date.getTime() - Date.now();
  if (deltaMs <= 0) return 'soon';
  const minutes = Math.ceil(deltaMs / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `in ${hours}h ${minutes % 60}m`;
}

/** Compact token count, e.g. 12400 -> "12.4k". */
export function formatTokenCount(tokens: number): string {
  if (!Number.isFinite(tokens)) return '0';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}
