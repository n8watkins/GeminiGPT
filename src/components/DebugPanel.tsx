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
  const [position, setPosition] = useState<Position>({ x: 0, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  const { sendMessage, getActiveChat } = useChat();
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
    } catch (error) {
      console.error('Debug test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <div
      className={`fixed z-[9999] bg-gray-900/95 rounded-lg border border-gray-700 select-none ${
        isDragging ? '' : 'transition-all duration-200'
      } ${isExpanded ? 'shadow-2xl' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isExpanded ? '500px' : 'auto',
        maxHeight: isExpanded ? '600px' : 'auto',
      }}
    >
      {/* Header - Always visible, draggable */}
      <div className="flex items-center gap-2 p-3">
        <div
          ref={dragHandleRef}
          className="cursor-move hover:bg-gray-800 rounded p-1 -m-1 transition-colors"
          title="Drag to move"
          onMouseDown={handleDragStart}
        >
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors flex-1"
          title={isExpanded ? "Collapse console" : "Expand console"}
        >
          <span className="font-semibold text-sm">Debug Console</span>
          {debugLogs.length > 0 && (
            <span className="bg-purple-600 text-xs px-2 py-0.5 rounded-full">
              {debugLogs.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Close console (Alt+Shift+D)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          {/* Controls */}
          <div className="p-3 border-b border-gray-700 space-y-2">
            {/* Test Gemini Button */}
            <button
              onClick={testGeminiResponse}
              disabled={isTesting}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send a test message to Gemini"
            >
              {isTesting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Testing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm">Test Gemini Response</span>
                </>
              )}
            </button>

            {/* Clear Button */}
            <button
              onClick={clearLogs}
              className="w-full px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
            >
              Clear Logs
            </button>
          </div>

          {/* Logs Container */}
          <div className="overflow-y-auto p-3 space-y-3" style={{ maxHeight: '400px' }}>
            {debugLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No logs yet</p>
                <p className="text-xs mt-1">Send a message to see debug info</p>
              </div>
            ) : (
              debugLogs.map((log, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-3 border text-xs ${
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
                      {log.type === 'request' ? '→ REQ' : '← RES'}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(log.timestamp)}</span>
                  </div>

                  {/* Content */}
                  {log.type === 'request' && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-gray-400 mb-1">Message:</p>
                      <p className="text-white font-mono text-xs break-words">{log.message}</p>
                    </div>
                  )}

                  {log.type === 'response' && (
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-gray-400 mb-1">Response:</p>
                      <p className="text-white font-mono text-xs break-words max-h-32 overflow-y-auto">
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
  );
}
