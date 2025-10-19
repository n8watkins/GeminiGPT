'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface ApiKeySetupProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
  onOpenTerms?: () => void;
}

export default function ApiKeySetup({ isOpen, onClose, onKeySaved, onOpenTerms }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [step, setStep] = useState<'intro' | 'input' | 'success'>('intro');

  useEffect(() => {
    // Check if user already has an API key
    const existingKey = localStorage.getItem('gemini-api-key');
    setHasExistingKey(!!existingKey);

    if (existingKey && step === 'intro') {
      setStep('success');
    }
  }, [step]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    // Basic validation - Gemini API keys typically start with 'AIza'
    if (!apiKey.startsWith('AIza')) {
      const confirm = window.confirm(
        'This doesn\'t look like a valid Gemini API key (should start with "AIza"). Save anyway?'
      );
      if (!confirm) return;
    }

    try {
      // Store in localStorage (client-side only, never sent to our server)
      localStorage.setItem('gemini-api-key', apiKey);
      logger.info('User API key saved to localStorage');

      setStep('success');
      setApiKey(''); // Clear from memory

      if (onKeySaved) {
        onKeySaved();
      }
    } catch (error) {
      logger.error('Failed to save API key', { error });
      alert('Failed to save API key. Please try again.');
    }
  };

  const handleRemove = () => {
    const confirm = window.confirm(
      'Are you sure you want to remove your API key? You won\'t be able to use the chat without one.'
    );

    if (confirm) {
      localStorage.removeItem('gemini-api-key');
      logger.info('User API key removed');
      setHasExistingKey(false);
      setStep('intro');
    }
  };

  const handleSkip = () => {
    // Mark that user has seen the tutorial
    localStorage.setItem('api-key-tutorial-seen', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Intro Step */}
        {step === 'intro' && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                🔑 Welcome to GeminiGPT!
              </h2>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-gray-700">
              <p className="text-lg">
                This app uses <strong>your own Google Gemini API key</strong> - no signup required!
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">✨ Why this is awesome:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>Free to use</strong> - Google gives $300 in free credits</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>Private & secure</strong> - Your key stays in your browser</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>No data collection</strong> - We never see your conversations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>Full control</strong> - You manage your own usage</span>
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">📝 Quick Setup (2 minutes):</h3>
                <ol className="space-y-2 text-sm list-decimal list-inside">
                  <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Google AI Studio</a></li>
                  <li>Click "Create API Key"</li>
                  <li>Copy your key and paste it below</li>
                  <li>Start chatting!</li>
                </ol>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Set Up API Key →
                </button>
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition"
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
              <h2 className="text-2xl font-bold text-gray-900">Enter Your API Key</h2>
              <button
                onClick={() => setStep('intro')}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                <p className="mt-2 text-sm text-gray-500">
                  Your API key is stored locally in your browser and never sent to our servers.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">🔒 Security & Privacy</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Stored only in your browser's localStorage</li>
                  <li>• Never transmitted to our backend</li>
                  <li>• Sent directly to Google's API from your browser</li>
                  <li>• You can delete it anytime</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  Read our <button onClick={(e) => { e.preventDefault(); onOpenTerms?.(); }} className="text-blue-600 hover:underline">Terms of Service</button> for full details on API key privacy.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={!apiKey.trim()}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save API Key
                </button>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-center"
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
              <h2 className="text-2xl font-bold text-gray-900">✅ All Set!</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-900">
                  Your API key has been saved! You can now start chatting with Gemini.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">💡 Tips:</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Upload images, PDFs, and documents for analysis</li>
                  <li>• Ask questions about your previous conversations</li>
                  <li>• Use @ to search chat history</li>
                  <li>• Press Ctrl+K for keyboard shortcuts</li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">🔧 Manage Your Key:</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('input')}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white transition"
                  >
                    Update Key
                  </button>
                  <button
                    onClick={handleRemove}
                    className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
                  >
                    Remove Key
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Start Chatting →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
