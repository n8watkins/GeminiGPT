'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useApiKey } from '@/hooks/useApiKey';
import { validateGeminiApiKey } from '@/lib/apiKeyValidation';
import ConfirmDialog from './ConfirmDialog';

interface ApiKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
  onOpenTerms?: () => void;
}

export default function ApiKeySetup({ isOpen, onClose, onKeySaved, onOpenTerms }: ApiKeySetupProps) {
  // Use the hook as single source of truth
  const { hasApiKey, saveApiKey, removeApiKey } = useApiKey();

  // Local state only for the input field and UI
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [step, setStep] = useState<'intro' | 'input' | 'success'>('intro');
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    variant?: 'primary' | 'danger';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Update step based on whether user has a key
  useEffect(() => {
    if (hasApiKey && step === 'intro') {
      setStep('success');
    }
  }, [hasApiKey, step]);

  const handleSave = () => {
    setError(null);

    if (!inputValue.trim()) {
      setError('Please enter an API key');
      return;
    }

    // Validate API key format
    const validation = validateGeminiApiKey(inputValue);

    if (!validation.valid) {
      // Show validation error with strong security warnings
      setConfirmDialog({
        isOpen: true,
        title: '⚠️ Invalid API Key Format',
        message: `${validation.reason}\n\n⚠️ WARNING: Saving an invalid API key may:\n• Not work with the Gemini API\n• Be logged or transmitted improperly\n• Expose sensitive data in error messages\n• Cause unexpected application behavior\n\nOnly save if you are absolutely sure this is correct.\n\nAre you sure you want to save anyway?`,
        confirmLabel: 'I Understand, Save Anyway',
        variant: 'danger',
        onConfirm: () => {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          // Log this as a security warning for audits
          logger.warn('User saved invalid API key format', { reason: validation.reason });
          performSave();
        },
      });
      return;
    }

    performSave();
  };

  const performSave = () => {
    try {
      // Use hook's saveApiKey method (validates and saves)
      saveApiKey(inputValue);
      logger.info('User API key saved via modal');

      setStep('success');
      setInputValue(''); // Clear input
      setError(null);

      if (onKeySaved) {
        onKeySaved();
      }
    } catch (error) {
      logger.error('Failed to save API key', { error });
      const errorMessage = error instanceof Error ? error.message : 'Failed to save API key. Please try again.';
      setError(errorMessage);
    }
  };

  const handleRemove = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove API Key',
      message: "Are you sure you want to remove your API key? You won't be able to use the chat without one.",
      confirmLabel: 'Remove Key',
      variant: 'danger',
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          removeApiKey(); // Use hook's removeApiKey method
          logger.info('User API key removed via modal');
          setStep('intro');
          setError(null);
        } catch (error) {
          logger.error('Failed to remove API key', { error });
          setError('Failed to remove API key. Please try again.');
        }
      },
    });
  };

  const handleSkip = () => {
    // Mark that user has seen the tutorial
    localStorage.setItem('api-key-tutorial-seen', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-[50000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-blue-500/20 dark:shadow-blue-500/40 max-w-2xl w-full border border-blue-200 dark:border-gray-700 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Intro Step */}
        {step === 'intro' && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                🔑 Welcome to GeminiGPT!
              </h2>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p className="text-lg">
                This app uses <strong>your own Google Gemini API key</strong> - no signup required!
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">✨ Why this is awesome:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                    <span><strong>Free to use</strong> - Google gives $300 in free credits</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                    <span><strong>Private & secure</strong> - Your key stays in your browser</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                    <span><strong>No data collection</strong> - We never see your conversations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                    <span><strong>Full control</strong> - You manage your own usage</span>
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">📝 Quick Setup (2 minutes):</h3>
                <ol className="space-y-2 text-sm list-decimal list-inside">
                  <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Google AI Studio</a></li>
                  <li>Click &quot;Create API Key&quot;</li>
                  <li><strong>Important:</strong> Create a NEW Google Cloud project for this key (keeps billing separate)</li>
                  <li>Copy your key and paste it below</li>
                  <li>Start chatting!</li>
                </ol>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">💡 Billing Safety Tips:</h3>
                <ul className="space-y-2 text-sm text-orange-800 dark:text-orange-300">
                  <li className="flex items-start">
                    <span className="mr-2">🔒</span>
                    <span><strong>Create a separate Google Cloud project</strong> for this API key - this isolates billing from your other projects</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">💳</span>
                    <span><strong>Use the free tier</strong> - Google provides $300 in credits (enough for thousands of messages)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">📊</span>
                    <span><strong>Set billing alerts</strong> in Google Cloud Console to get notified if usage increases</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">🛡️</span>
                    <span><strong>Never share your API key</strong> - it&apos;s stored only in your browser and never leaves your device</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
                >
                  Set Up API Key →
                </button>
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Step */}
        {step === 'input' && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enter Your API Key</h2>
              <button
                onClick={() => setStep('intro')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setError(null); // Clear error on input
                    }}
                    placeholder="AIza..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showKey ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Your API key is stored locally in your browser and never sent to our servers.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-red-800 dark:text-red-300 text-sm flex items-start">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">🔒 Security & Privacy</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <li>• Stored only in your browser&apos;s localStorage</li>
                  <li>• Never transmitted to our backend</li>
                  <li>• Sent directly to Google&apos;s API from your browser</li>
                  <li>• You can delete it anytime</li>
                </ul>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Read our <button onClick={(e) => { e.preventDefault(); onOpenTerms?.(); }} className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</button> for full details on API key privacy.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={!inputValue.trim()}
                  className="flex-1 bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save API Key
                </button>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-center"
                >
                  Get API Key →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">✅ All Set!</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-900 dark:text-green-300">
                  Your API key has been saved! You can now start chatting with Gemini.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">💡 Tips:</h4>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                  <li>• Upload images, PDFs, and documents for analysis</li>
                  <li>• Ask questions about your previous conversations</li>
                  <li>• Use @ to search chat history</li>
                  <li>• Press Ctrl+K for keyboard shortcuts</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">🔧 Manage Your Key:</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('input')}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition"
                  >
                    Update Key
                  </button>
                  <button
                    onClick={handleRemove}
                    className="px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    Remove Key
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
              >
                Start Chatting →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
