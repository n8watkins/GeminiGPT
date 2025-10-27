'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useWebSocket } from '@/hooks/useWebSocket';

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

interface Position {
  x: number;
  y: number;
}

export default function DebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true); // Visible by default
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  const { sendMessage } = useChat();
  const { socket } = useWebSocket();

  // Keyboard shortcut handler for Alt+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+Shift+D to toggle visibility
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('debugConsolePosition');
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    } else {
      // Set default position based on window width
      setPosition({ x: window.innerWidth - 400, y: 16 });
    }
  }, []);

  // Save position to localStorage
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    localStorage.setItem('debugConsolePosition', JSON.stringify(position));
  }, [position]);

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

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const clearLogs = () => {
    setDebugLogs([]);
  };

  const testGeminiResponse = async () => {
    setIsTesting(true);
    try {
      await sendMessage('Test debug message: What is 2+2?', []);
      setShowTestModal(false); // Close modal after sending
    } catch (error) {
      console.error('Debug test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <>
      {/* Main Debug Console - Draggable */}
      <div
        className={`fixed z-[9999] bg-gray-900/95 rounded-lg border border-purple-700 select-none ${
          isDragging ? '' : 'transition-all duration-200'
        } ${isExpanded ? 'shadow-2xl' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: isExpanded ? '400px' : 'auto',
          maxHeight: isExpanded ? '500px' : 'auto',
        }}
      >
        {/* Header - Always visible, draggable */}
        <div className="flex items-center gap-2 p-2">
          <div
            ref={dragHandleRef}
            className="cursor-move hover:bg-gray-800 rounded p-1 transition-colors"
            title="Drag to move"
            onMouseDown={handleDragStart}
          >
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>

          {!isExpanded ? (
            <div className="flex gap-2">
              {/* Gemini Test Button - Collapsed */}
              <button
                onClick={() => setShowTestModal(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                title="Test Gemini API"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Gemini
              </button>

              {/* Logs Button - Collapsed */}
              <button
                onClick={() => setIsExpanded(true)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                title="View logs"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Logs
                {debugLogs.length > 0 && (
                  <span className="bg-purple-600 text-xs px-1.5 py-0.5 rounded-full">
                    {debugLogs.length}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <>
              <span className="font-semibold text-sm text-white flex-1">Debug Logs</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Collapse"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Expanded Logs */}
        {isExpanded && (
          <div className="border-t border-gray-700">
            {/* Clear Button */}
            <div className="p-2 border-b border-gray-700">
              <button
                onClick={clearLogs}
                className="w-full px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
              >
                Clear Logs
              </button>
            </div>

            {/* Logs Container */}
            <div className="overflow-y-auto p-2 space-y-2" style={{ maxHeight: '350px' }}>
              {debugLogs.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  <p className="text-xs">No logs yet</p>
                </div>
              ) : (
                debugLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`rounded p-2 border text-xs ${
                      log.type === 'request'
                        ? 'bg-blue-900/20 border-blue-700/50'
                        : 'bg-green-900/20 border-green-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                          log.type === 'request'
                            ? 'bg-blue-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}
                      >
                        {log.type === 'request' ? '→ REQ' : '← RES'}
                      </span>
                      <span className="text-xs text-gray-400">{formatTime(log.timestamp)}</span>
                    </div>

                    {log.type === 'request' && (
                      <div className="bg-gray-800/50 rounded p-1.5">
                        <p className="text-white font-mono text-xs break-words">{log.message}</p>
                      </div>
                    )}

                    {log.type === 'response' && (
                      <div className="bg-gray-800/50 rounded p-1.5">
                        <p className="text-white font-mono text-xs break-words max-h-24 overflow-y-auto">
                          {log.response}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Separate Test Modal */}
      {showTestModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
          onClick={() => !isTesting && setShowTestModal(false)}
        >
          <div
            className="bg-gray-900 border border-purple-600 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Test Gemini API</h3>
              <button
                onClick={() => setShowTestModal(false)}
                disabled={isTesting}
                className="text-gray-400 hover:text-white disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-6">
              This will send a test message to Gemini and display the response in the debug logs.
            </p>

            <button
              onClick={testGeminiResponse}
              disabled={isTesting}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Send Test Message
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
