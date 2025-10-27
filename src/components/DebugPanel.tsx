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
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  const { sendMessage } = useChat();
  const { socket } = useWebSocket();

  // Keyboard shortcut handler for Alt+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      setPosition({ x: window.innerWidth - 200, y: 16 });
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
      setDebugLogs(prev => [...prev, data].slice(-20));
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
    } catch (error) {
      console.error('Debug test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Draggable Toggle Button */}
      <div
        className={`fixed z-[9999] bg-gray-900/95 rounded-lg border border-purple-700 select-none ${
          isDragging ? '' : 'transition-all duration-200'
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
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

          <button
            onClick={() => setShowLogsPanel(!showLogsPanel)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              showLogsPanel
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title="Toggle Gemini Logs"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Gemini Logs
            {debugLogs.length > 0 && (
              <span className="bg-purple-800 text-xs px-1.5 py-0.5 rounded-full">
                {debugLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Fixed Side Panel for Logs */}
      {showLogsPanel && (
        <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-gray-900 border-l border-gray-700 shadow-2xl z-[9998] flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <h2 className="text-white font-semibold">Gemini Debug Logs</h2>
              <span className="text-xs text-gray-400">({debugLogs.length})</span>
            </div>
            <button
              onClick={() => setShowLogsPanel(false)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Close panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Test Gemini Button */}
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={testGeminiResponse}
              disabled={isTesting}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send a test message to Gemini"
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
                  Test Gemini Response
                </>
              )}
            </button>

            <button
              onClick={clearLogs}
              className="w-full mt-2 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
            >
              Clear Logs
            </button>
          </div>

          {/* Logs Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {debugLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">No logs yet</p>
                <p className="text-xs mt-1">Send a message or test Gemini to see debug info</p>
              </div>
            ) : (
              debugLogs.map((log, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-3 border ${
                    log.type === 'request'
                      ? 'bg-blue-900/20 border-blue-700/50'
                      : 'bg-green-900/20 border-green-700/50'
                  }`}
                >
                  {/* Log Header */}
                  <div className="flex items-center justify-between mb-2">
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

                  {/* Content */}
                  {log.type === 'request' && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-xs text-gray-400 mb-1">User Message:</p>
                      <p className="text-sm text-white font-mono break-words">{log.message}</p>
                    </div>
                  )}

                  {log.type === 'response' && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-xs text-gray-400 mb-1">AI Response:</p>
                      <p className="text-sm text-white font-mono break-words max-h-40 overflow-y-auto">
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
    </>
  );
}
