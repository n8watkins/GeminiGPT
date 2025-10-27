'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useUserId } from '@/hooks/useUserId';

interface GeminiLog {
  id: string;
  chat_id: string | null;
  user_id: string | null;
  request_timestamp: string;
  response_timestamp: string | null;
  duration_ms: number | null;
  request_data: {
    history: any[];
    parts: any[];
    historyLength: number;
    partsCount: number;
  };
  response_data: {
    text: string;
    candidates: any[];
    usageMetadata?: {
      totalTokenCount?: number;
    };
  } | null;
  error_data: {
    message: string;
    name: string;
    stack?: string;
  } | null;
  status: 'pending' | 'success' | 'error';
  model_name: string | null;
  token_count: number | null;
  function_calls: any[];
  metadata: any;
}

interface GeminiLogsProps {
  chatId?: string;
}

export default function GeminiLogs({ chatId }: GeminiLogsProps) {
  const [logs, setLogs] = useState<GeminiLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<GeminiLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const { getActiveChat } = useChat();
  const userId = useUserId();

  const activeChat = getActiveChat();
  const effectiveChatId = chatId || activeChat?.id;

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveChatId, filter, userId]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (effectiveChatId) {
        params.append('chatId', effectiveChatId);
      }
      if (userId) {
        params.append('userId', userId);
      }
      params.append('limit', '50');

      console.log('🔍 Fetching Gemini logs with params:', params.toString());
      const response = await fetch(`/api/gemini-logs?${params.toString()}`);
      console.log('📡 Gemini logs response status:', response.status);
      const data = await response.json();
      console.log('📦 Gemini logs data:', data);

      if (data.success) {
        let filteredLogs = data.logs;
        if (filter !== 'all') {
          filteredLogs = filteredLogs.filter((log: GeminiLog) => log.status === filter);
        }
        console.log('✅ Setting logs:', filteredLogs.length, 'logs');
        setLogs(filteredLogs);
      } else {
        console.error('❌ Failed to fetch logs:', data.error);
        setError(data.error || 'Failed to fetch logs');
      }
    } catch (err) {
      console.error('❌ Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      success: 'bg-green-600 text-white',
      error: 'bg-red-600 text-white',
      pending: 'bg-yellow-600 text-white'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-600 text-white';
  };

  return (
    <div className="flex h-full">
      {/* Logs List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Gemini API Logs
              {effectiveChatId && <span className="text-sm text-gray-400 ml-2">(Current Chat)</span>}
            </h2>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors disabled:opacity-50"
              title="Refresh logs"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {['all', 'success', 'error'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          {loading && logs.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <svg className="w-8 h-8 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">No logs found</p>
              <p className="text-xs mt-1">Send a message to see API logs</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`rounded-lg p-3 border cursor-pointer transition-all ${
                  selectedLog?.id === log.id
                    ? 'bg-purple-900/30 border-purple-600'
                    : log.status === 'error'
                    ? 'bg-red-900/10 border-red-700/50 hover:bg-red-900/20'
                    : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(log.status)}`}>
                    {log.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400">{formatTimestamp(log.request_timestamp)}</span>
                </div>

                <div className="text-sm text-gray-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Request:</span>
                    <span className="truncate">
                      {log.request_data?.parts?.[0]?.text?.substring(0, 60) || 'No text'}...
                    </span>
                  </div>

                  {log.duration_ms !== null && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">Duration:</span>
                      <span className="text-purple-400">{log.duration_ms}ms</span>
                      {log.token_count && (
                        <>
                          <span className="text-gray-600">•</span>
                          <span className="text-blue-400">{log.token_count} tokens</span>
                        </>
                      )}
                    </div>
                  )}

                  {log.function_calls?.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {log.function_calls.length} function call(s)
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedLog && (
        <div className="w-96 border-l border-gray-700 flex flex-col bg-gray-900">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-semibold">Log Details</h3>
            <button
              onClick={() => setSelectedLog(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {/* Status */}
            <div>
              <div className="text-xs text-gray-400 mb-1">Status</div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(selectedLog.status)}`}>
                {selectedLog.status.toUpperCase()}
              </span>
            </div>

            {/* Timing */}
            <div>
              <div className="text-xs text-gray-400 mb-1">Timing</div>
              <div className="text-white space-y-1">
                <div>Request: {formatTimestamp(selectedLog.request_timestamp)}</div>
                {selectedLog.response_timestamp && (
                  <div>Response: {formatTimestamp(selectedLog.response_timestamp)}</div>
                )}
                {selectedLog.duration_ms !== null && (
                  <div className="text-purple-400 font-semibold">{selectedLog.duration_ms}ms</div>
                )}
              </div>
            </div>

            {/* Tokens */}
            {selectedLog.token_count && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Tokens</div>
                <div className="text-blue-400 font-semibold">{selectedLog.token_count}</div>
              </div>
            )}

            {/* Full Request History */}
            <div>
              <div className="text-xs text-gray-400 mb-2">
                Full Request History ({selectedLog.request_data?.historyLength || 0} messages)
              </div>
              <div className="bg-gray-800 rounded p-3 text-xs font-mono max-h-96 overflow-y-auto">
                {selectedLog.request_data?.history && selectedLog.request_data.history.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLog.request_data.history.map((msg: any, idx: number) => (
                      <div key={idx} className={`p-2 rounded ${msg.role === 'user' ? 'bg-blue-900/30' : 'bg-green-900/30'}`}>
                        <div className="text-xs font-semibold mb-1 text-gray-400">
                          {msg.role === 'user' ? '👤 User' : '🤖 Model'}
                        </div>
                        {msg.parts?.map((part: any, pIdx: number) => (
                          <div key={pIdx} className="text-white whitespace-pre-wrap mb-1">
                            {part.text || ''}
                            {part.inlineData && (
                              <div className="text-purple-400 text-xs mt-1">
                                📎 {part.inlineData.mimeType} ({part.inlineData.size ? `${part.inlineData.size} bytes` : 'inline data'})
                              </div>
                            )}
                            {part.functionCall && (
                              <div className="text-yellow-400 text-xs mt-1">
                                🔧 Function: {part.functionCall.name}
                              </div>
                            )}
                            {part.functionResponse && (
                              <div className="text-green-400 text-xs mt-1">
                                ✅ Function Response
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No history available</div>
                )}
              </div>
            </div>

            {/* Current Request Parts */}
            <div>
              <div className="text-xs text-gray-400 mb-2">
                Current Request ({selectedLog.request_data?.partsCount || 0} parts)
              </div>
              <div className="bg-gray-800 rounded p-3 text-xs font-mono text-white max-h-60 overflow-y-auto">
                {selectedLog.request_data?.parts && selectedLog.request_data.parts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedLog.request_data.parts.map((part: any, idx: number) => (
                      <div key={idx} className="whitespace-pre-wrap">
                        {part.text || ''}
                        {part.inlineData && (
                          <div className="text-purple-400 text-xs mt-1">
                            📎 {part.inlineData.mimeType}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No parts available</div>
                )}
              </div>
            </div>

            {/* Response Data */}
            {selectedLog.response_data && (
              <div>
                <div className="text-xs text-gray-400 mb-2">Full Response</div>
                <div className="bg-gray-800 rounded p-3 text-xs font-mono text-white max-h-96 overflow-y-auto whitespace-pre-wrap">
                  {selectedLog.response_data.text || 'No response text'}
                </div>
              </div>
            )}

            {/* Error Data */}
            {selectedLog.error_data && (
              <div>
                <div className="text-xs text-gray-400 mb-2">Error</div>
                <div className="bg-red-900/20 border border-red-700 rounded p-3 text-xs">
                  <div className="text-red-400 font-semibold mb-1">{selectedLog.error_data.name}</div>
                  <div className="text-red-200">{selectedLog.error_data.message}</div>
                  {selectedLog.error_data.stack && (
                    <div className="mt-2 text-red-300 font-mono text-xs opacity-75 max-h-32 overflow-y-auto">
                      {selectedLog.error_data.stack}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Function Calls */}
            {selectedLog.function_calls?.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-2">Function Calls</div>
                <div className="space-y-2">
                  {selectedLog.function_calls.map((fc: any, idx: number) => (
                    <div key={idx} className="bg-yellow-900/20 border border-yellow-700 rounded p-2">
                      <div className="text-yellow-400 font-semibold text-xs">{fc.name}</div>
                      <div className="text-yellow-200 text-xs mt-1">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(fc.args, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full JSON */}
            <details className="cursor-pointer">
              <summary className="text-xs text-gray-400 mb-2">Raw JSON</summary>
              <div className="bg-gray-800 rounded p-3 text-xs font-mono text-gray-300 max-h-96 overflow-auto">
                <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
