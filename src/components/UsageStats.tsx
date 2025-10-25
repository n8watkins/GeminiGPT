'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { RateLimitInfo } from '@/hooks/useWebSocket';

interface UsageStatsProps {
  isOpen: boolean;
  onClose: () => void;
  rateLimitInfo: RateLimitInfo | null;
}

export default function UsageStats({ isOpen, onClose, rateLimitInfo }: UsageStatsProps) {
  const [localStorageSize, setLocalStorageSize] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      // Calculate localStorage usage
      let totalSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      setLocalStorageSize(totalSize);

      // Count messages from chat history (approximate)
      try {
        const allChats = Object.keys(localStorage).filter(key => key.startsWith('chat-'));
        let msgCount = 0;
        allChats.forEach(chatKey => {
          const chat = JSON.parse(localStorage.getItem(chatKey) || '{"messages":[]}');
          msgCount += (chat.messages?.length || 0);
        });
        setMessageCount(msgCount);
      } catch (error) {
        console.error('Error counting messages:', error);
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getUsagePercentage = (used: number, total: number) => {
    return Math.min(100, (used / total) * 100);
  };

  const minutePercentage = rateLimitInfo
    ? getUsagePercentage(
        rateLimitInfo.limit.minute - rateLimitInfo.remaining.minute,
        rateLimitInfo.limit.minute
      )
    : 0;

  const hourPercentage = rateLimitInfo
    ? getUsagePercentage(
        rateLimitInfo.limit.hour - rateLimitInfo.remaining.hour,
        rateLimitInfo.limit.hour
      )
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-[50000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-blue-500/20 dark:shadow-blue-500/40 max-w-2xl w-full border border-blue-200 dark:border-gray-700 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Usage Statistics</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close usage statistics"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Rate Limits */}
            {rateLimitInfo && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">⏱️ Rate Limits</h3>

                {/* Per Minute */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-800 dark:text-blue-300">Messages per minute</span>
                    <span className="font-medium text-blue-900 dark:text-blue-200">
                      {rateLimitInfo.remaining.minute} / {rateLimitInfo.limit.minute} remaining
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800/30 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${minutePercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    Resets: {new Date(rateLimitInfo.resetAt.minute).toLocaleTimeString()}
                  </p>
                </div>

                {/* Per Hour */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-800 dark:text-blue-300">Messages per hour</span>
                    <span className="font-medium text-blue-900 dark:text-blue-200">
                      {rateLimitInfo.remaining.hour} / {rateLimitInfo.limit.hour} remaining
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800/30 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${hourPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    Resets: {new Date(rateLimitInfo.resetAt.hour).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {/* Storage Usage */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-300 mb-3">💾 Storage Usage</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-800 dark:text-green-300">Total localStorage:</span>
                  <span className="font-medium text-green-900 dark:text-green-200">{formatBytes(localStorageSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-800 dark:text-green-300">Browser limit:</span>
                  <span className="font-medium text-green-900 dark:text-green-200">~5-10 MB</span>
                </div>
                <div className="w-full bg-green-200 dark:bg-green-800/30 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (localStorageSize / (5 * 1024 * 1024)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Message Stats */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-3">💬 Message Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-800 dark:text-purple-300">Total messages:</span>
                  <span className="font-medium text-purple-900 dark:text-purple-200">{messageCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-800 dark:text-purple-300">Chats stored:</span>
                  <span className="font-medium text-purple-900 dark:text-purple-200">
                    {Object.keys(localStorage).filter(k => k.startsWith('chat-')).length}
                  </span>
                </div>
              </div>
            </div>

            {/* API Key Status */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-3">🔑 API Key Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-yellow-800 dark:text-yellow-300">API key configured:</span>
                  <span className="font-medium text-yellow-900 dark:text-yellow-200">
                    {localStorage.getItem('gemini-api-key') ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                {localStorage.getItem('gemini-api-key') && (
                  <div className="flex justify-between">
                    <span className="text-yellow-800 dark:text-yellow-300">Key preview:</span>
                    <span className="font-medium text-yellow-900 dark:text-yellow-200 font-mono text-xs">
                      {localStorage.getItem('gemini-api-key')?.substring(0, 4)}...
                      {localStorage.getItem('gemini-api-key')?.substring(localStorage.getItem('gemini-api-key')!.length - 4)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">💡 Tips</h3>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>• Rate limits reset automatically at the times shown above</li>
                <li>• localStorage is limited to ~5-10 MB depending on your browser</li>
                <li>• Delete old chats to free up space if needed</li>
                <li>• Your API key is stored only in your browser</li>
              </ul>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
