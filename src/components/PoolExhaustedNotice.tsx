'use client';

import InlineKeyEntry from './InlineKeyEntry';
import { UsageInfo, formatPoolReset } from '@/hooks/useUsageInfo';

interface PoolExhaustedNoticeProps {
  usage: UsageInfo | null;
  onDismiss: () => void;
}

/**
 * Friendly inline prompt shown when the shared demo key is out of capacity
 * (message-error code POOL_EXHAUSTED, or usage-info pool.available <= 0).
 * Offers the BYOK upgrade path with get-a-key instructions.
 */
export default function PoolExhaustedNotice({ usage, onDismiss }: PoolExhaustedNoticeProps) {
  const reset = formatPoolReset(usage?.pool?.resetAt);

  return (
    <div
      className="mb-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
      data-testid="pool-exhausted-notice"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0" aria-hidden>
          ⛽
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            The free demo capacity is used up for now{reset ? ` — it resets ${reset}` : ''}.
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
            Add your own free Gemini key to keep chatting without limits &mdash; it takes about two minutes and
            stays in your browser.
          </p>

          <div className="mt-3">
            <InlineKeyEntry onSaved={onDismiss} />
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
