'use client';

import React, { useEffect, useState } from 'react';
import { XMarkIcon, SparklesIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import AboutContent from './AboutContent';
import InlineKeyEntry from './InlineKeyEntry';
import { PoolMeterBar } from './UsageMeter';
import { useUsageInfo } from '@/hooks/useUsageInfo';
import { useApiKey } from '@/hooks/useApiKey';

interface OnboardingWizardProps {
  isOpen: boolean;
  /** Marks onboarding complete (localStorage flag) and closes the wizard */
  onComplete: () => void;
}

const STEPS = ['About', 'Get started'] as const;

/**
 * First-run two-step onboarding wizard. Replaces the old stacked
 * AboutModal + ApiKeySetup first-run flow. Renders over the live chat UI
 * with a blurred backdrop; no API key is ever required to proceed.
 */
export default function OnboardingWizard({ isOpen, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<0 | 1>(0);
  const [showKeyEntry, setShowKeyEntry] = useState(false);
  const usage = useUsageInfo();
  const { hasApiKey } = useApiKey();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-[50000] flex items-center justify-center p-4"
      data-testid="onboarding-wizard"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full border border-blue-200 dark:border-gray-700 shadow-2xl shadow-blue-500/20 dark:shadow-blue-500/40 relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: step indicator + skip */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                {i > 0 && <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />}
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      step === i
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : step > i
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step > i ? '✓' : i + 1}
                  </span>
                  <span
                    className={`text-sm font-medium hidden sm:inline ${
                      step === i ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
          <button
            onClick={onComplete}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Skip intro"
            title="Skip intro"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Step body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 ? (
            <div data-testid="onboarding-step-about">
              {/* Cross-chat memory pitch */}
              <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 flex items-start gap-3">
                <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-bold text-gray-900 dark:text-white">Chats here remember each other</span>{' '}
                  &mdash; tell one chat something, then ask about it in another. That cross-chat memory (vector
                  search over your own history) is the heart of this project.
                </p>
              </div>

              <AboutContent />
            </div>
          ) : (
            <div data-testid="onboarding-step-get-started" className="max-w-2xl mx-auto space-y-5">
              <div className="text-center">
                <h2 className="text-gray-900 dark:text-white text-3xl font-bold mb-2">You can chat right now</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  No signup, no API key &mdash; messages run on a shared free demo key while it has capacity.
                </p>
              </div>

              {/* Live demo-pool meter (placeholder until usage-info arrives) */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                <PoolMeterBar usage={usage} variant="light" />
              </div>

              {/* Low-key BYOK expander */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowKeyEntry(!showKeyEntry)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  data-testid="onboarding-byok-toggle"
                >
                  <span>
                    {hasApiKey
                      ? 'Your own Gemini key is active'
                      : 'Prefer your own free Gemini key? (optional — unlimited usage)'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showKeyEntry ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {(showKeyEntry || hasApiKey) && (
                  <div className="px-4 pb-4">
                    <InlineKeyEntry />
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                You can add or change a key anytime from the sidebar (&quot;Bring Your Own Key&quot;).
              </p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          {step === 0 ? (
            <>
              <button
                onClick={onComplete}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Skip intro
              </button>
              <button
                onClick={() => setStep(1)}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                data-testid="onboarding-next"
              >
                Next: Get started &rarr;
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(0)}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={onComplete}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                data-testid="onboarding-start-chatting"
              >
                Start chatting &rarr;
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
