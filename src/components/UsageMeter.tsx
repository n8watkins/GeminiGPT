'use client';

import React from 'react';
import {
  UsageInfo,
  useUsageInfo,
  poolPercentUsed,
  formatPoolReset,
  formatTokenCount,
} from '@/hooks/useUsageInfo';

interface PoolMeterBarProps {
  usage: UsageInfo | null;
  /** 'light' for white modal surfaces, 'dark' for the blue sidebar */
  variant?: 'light' | 'dark';
}

/**
 * Shared demo-pool capacity meter, fed by the `usage-info` socket event /
 * GET /api/usage. Shows a friendly placeholder until the first data arrives
 * (the backend that emits it may not be live yet).
 */
export function PoolMeterBar({ usage, variant = 'light' }: PoolMeterBarProps) {
  const light = variant === 'light';
  const labelClass = light ? 'text-gray-700 dark:text-gray-200' : 'text-blue-200';
  const subClass = light ? 'text-gray-500 dark:text-gray-400' : 'text-blue-300/80';
  const trackClass = light ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-900/50';

  if (!usage?.pool || usage.pool.budget <= 0) {
    return (
      <div data-testid="pool-meter" data-state="placeholder">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className={`font-semibold ${labelClass}`}>Shared demo pool</span>
          <span className={subClass}>checking&hellip;</span>
        </div>
        <div className={`w-full ${trackClass} rounded-full h-1.5 overflow-hidden`}>
          <div className="h-full w-1/3 bg-blue-400/60 animate-pulse rounded-full" />
        </div>
        <p className={`text-xs mt-1 ${subClass}`}>You can chat right away &mdash; live capacity will appear here.</p>
      </div>
    );
  }

  const pctUsed = poolPercentUsed(usage);
  const pctLeft = 100 - pctUsed;
  const exhausted = usage.pool.available <= 0;
  const barColor = exhausted || pctUsed >= 90 ? 'bg-red-400' : pctUsed >= 70 ? 'bg-yellow-400' : 'bg-green-400';
  const reset = formatPoolReset(usage.pool.resetAt);

  return (
    <div data-testid="pool-meter" data-state={exhausted ? 'exhausted' : 'ok'}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-semibold ${labelClass}`}>Shared demo pool</span>
        <span className={`font-mono ${labelClass}`}>{pctLeft}% left</span>
      </div>
      <div className={`w-full ${trackClass} rounded-full h-1.5 overflow-hidden`}>
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.max(pctUsed, 2)}%` }}
        />
      </div>
      <p className={`text-xs mt-1 ${subClass}`}>
        {exhausted
          ? `Demo capacity used up${reset ? ` — resets ${reset}` : ''}. Add your own free key to keep chatting.`
          : reset
            ? `Resets ${reset}`
            : 'Everyone shares this free demo budget'}
      </p>
    </div>
  );
}

interface SidebarUsageMeterProps {
  /** BYOK users see their own usage instead of the shared pool */
  hasOwnKey: boolean;
}

/**
 * Small persistent usage indicator for the sidebar. Demo-pool meter for
 * shared-key visitors; personal request/token counters for BYOK users.
 */
export default function SidebarUsageMeter({ hasOwnKey }: SidebarUsageMeterProps) {
  const usage = useUsageInfo();

  return (
    <div
      className="px-3 py-2 bg-blue-800/30 rounded-lg mb-3 border border-blue-700/50"
      data-testid="sidebar-usage-meter"
    >
      {hasOwnKey ? (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-blue-200">Your API key</span>
            <span className="flex items-center gap-1 text-green-400">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              active
            </span>
          </div>
          <p className="text-xs text-blue-300/80">
            {usage?.user
              ? `${usage.user.requests} request${usage.user.requests === 1 ? '' : 's'} · ${formatTokenCount(usage.user.tokens)} tokens this session`
              : 'Unlimited chatting on your own key'}
          </p>
        </div>
      ) : (
        <PoolMeterBar usage={usage} variant="dark" />
      )}
    </div>
  );
}
