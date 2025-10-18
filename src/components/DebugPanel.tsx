'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';

interface DebugInfo {
  type: 'request' | 'response';
  timestamp: string;
  chatId: string;
  message?: string;
  response?: string;
  historyLength?: number;
  hasContext?: boolean;
  parts?: string[];
  hadFunctionCalls?: boolean;
  functionNames?: string[];
  manualFunctionTriggered?: boolean;
}

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  const { socket } = useChat();

  useEffect(() => {
    if (!socket) return;

    const handleDebugInfo = (data: DebugInfo) => {
      setDebugLogs(prev => [...prev, data].slice(-20)); // Keep last 20 entries
    };

    socket.on('debug-info', handleDebugInfo);

    return () => {
      socket.off('debug-info', handleDebugInfo);
    };
  }, [socket]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const clearLogs = () => {
    setDebugLogs([]);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
        title="Toggle Debug Panel"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Debug
        {debugLogs.length > 0 && (
          <span className="bg-purple-800 text-xs px-2 py-0.5 rounded-full">
            {debugLogs.length}
          </span>
        )}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-gray-900 border-l border-gray-700 shadow-2xl z-40 flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <h2 className="text-white font-semibold">Gemini Debug Panel</h2>
              <span className="text-xs text-gray-400">({debugLogs.length} logs)</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearLogs}
                className="text-gray-400 hover:text-white px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Logs Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {debugLogs.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No debug logs yet</p>
                <p className="text-sm mt-1">Send a message to see debug information</p>
              </div>
            ) : (
              debugLogs.map((log, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-4 border ${
                    log.type === 'request'
                      ? 'bg-blue-900/20 border-blue-700/50'
                      : 'bg-green-900/20 border-green-700/50'
                  }`}
                >
                  {/* Log Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          log.type === 'request'
                            ? 'bg-blue-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}
                      >
                        {log.type === 'request' ? '→ REQUEST' : '← RESPONSE'}
                      </span>
                      <span className="text-xs text-gray-400">{formatTime(log.timestamp)}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {log.chatId.substring(0, 8)}...
                    </span>
                  </div>

                  {/* Request Details */}
                  {log.type === 'request' && (
                    <div className="space-y-2">
                      <div className="bg-gray-800/50 rounded p-3">
                        <p className="text-xs text-gray-400 mb-1">User Message:</p>
                        <p className="text-sm text-white font-mono break-words">
                          {log.message}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-gray-800/50 rounded p-2">
                          <p className="text-gray-400">History</p>
                          <p className="text-white font-semibold">{log.historyLength} msgs</p>
                        </div>
                        <div className="bg-gray-800/50 rounded p-2">
                          <p className="text-gray-400">Context</p>
                          <p className="text-white font-semibold">
                            {log.hasContext ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded p-2">
                          <p className="text-gray-400">Parts</p>
                          <p className="text-white font-semibold">{log.parts?.length || 0}</p>
                        </div>
                      </div>
                      {log.parts && log.parts.length > 0 && (
                        <div className="bg-gray-800/50 rounded p-2">
                          <p className="text-xs text-gray-400 mb-1">Parts:</p>
                          <div className="flex flex-wrap gap-1">
                            {log.parts.map((part, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300"
                              >
                                {part}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Response Details */}
                  {log.type === 'response' && (
                    <div className="space-y-2">
                      <div className="bg-gray-800/50 rounded p-3">
                        <p className="text-xs text-gray-400 mb-1">AI Response:</p>
                        <p className="text-sm text-white font-mono break-words max-h-40 overflow-y-auto">
                          {log.response}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-800/50 rounded p-2">
                          <p className="text-gray-400">Function Calls</p>
                          <p className="text-white font-semibold">
                            {log.hadFunctionCalls ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded p-2">
                          <p className="text-gray-400">Manual Trigger</p>
                          <p className="text-white font-semibold">
                            {log.manualFunctionTriggered ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>
                      {log.functionNames && log.functionNames.length > 0 && (
                        <div className="bg-gray-800/50 rounded p-2">
                          <p className="text-xs text-gray-400 mb-1">Functions Called:</p>
                          <div className="flex flex-wrap gap-1">
                            {log.functionNames.map((name, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded bg-purple-700 text-white font-mono"
                              >
                                {name}()
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
