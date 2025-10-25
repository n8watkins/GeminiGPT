'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/contexts/ChatContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getSessionUserId, generateUserId } from '@/lib/userId';
import { Chat } from '@/types/chat';
import ConfirmationModal from './ConfirmationModal';
import { RATE_LIMIT_THRESHOLDS, DEBOUNCE_DELAY } from '@/lib/constants';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenAbout?: () => void;
  onOpenApiKeySetup?: () => void;
  onOpenTerms?: () => void;
  onOpenUsageStats?: () => void;
  onOpenSettings?: () => void;
}

export default function Sidebar({ isOpen, onToggle, onOpenAbout, onOpenApiKeySetup, onOpenTerms, onOpenUsageStats, onOpenSettings }: SidebarProps) {
  const router = useRouter();
  const { state, createChat, deleteChat } = useChat();
  const { isConnected, rateLimitInfo } = useWebSocket();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY.SEARCH);
  const [userId, setUserId] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasOwnApiKey, setHasOwnApiKey] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Set userId after mount to avoid hydration mismatch
  useEffect(() => {
    setUserId(getSessionUserId());
    setMounted(true);

    // Check if user has their own API key
    const checkApiKey = () => {
      const storedApiKey = localStorage.getItem('gemini-api-key');
      setHasOwnApiKey(!!storedApiKey);
    };

    checkApiKey();

    // Listen for storage changes (API key updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gemini-api-key') {
        checkApiKey();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // TODO: Check authentication status from auth service
    // For now, always guest mode
    setIsAuthenticated(false);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handle new chat - create a new empty chat and navigate to it
  const handleNewChat = useCallback(() => {
    const now = new Date();
    const title = `Chat ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    const newChatId = createChat(title);
    router.push(`/chat/${newChatId}`);
  }, [router, createChat]);

  // Generate new user function
  const handleNewUser = () => {
    // Generate a new user ID
    const newUserId = generateUserId();

    // Store it in localStorage
    localStorage.setItem('gemini-chat-user-id', newUserId);

    // No need to remove chat state - it's user-specific now
    // Each user has their own storage key: gemini-chat-app-{userId}

    // Reload the page to start fresh with the new user
    window.location.reload();
  };

  // Delete chat with confirmation
  const handleDeleteChat = (chatId: string) => {
    setChatToDelete(chatId);
    setShowDeleteModal(true);
  };

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      const wasActiveChat = chatToDelete === state.activeChatId;
      deleteChat(chatToDelete);
      // Navigate to root if we deleted the active chat
      if (wasActiveChat) {
        router.push('/');
      }
      setChatToDelete(null);
    }
  };

  // Memoize filtered chats to prevent unnecessary recalculations
  const filteredChats = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return state.chats;

    const lowerQuery = debouncedSearchQuery.toLowerCase();
    return state.chats.filter(chat => {
      // Search in chat title
      if (chat.title.toLowerCase().includes(lowerQuery)) return true;

      // Search in message content
      return chat.messages.some(msg =>
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  }, [state.chats, debouncedSearchQuery]);

  // Memoize rate limit display to prevent flicker on updates
  const rateLimitDisplay = useMemo(() => {
    if (!rateLimitInfo) return null;

    return (
      <div className="px-3 py-2 bg-blue-800/30 rounded-lg mb-3 border border-blue-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-blue-200">Rate Limits</span>
          <svg className="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        {/* Per Minute */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-blue-300">Per Minute</span>
            <span className={`font-mono font-medium ${
              rateLimitInfo.remaining.minute <= RATE_LIMIT_THRESHOLDS.MINUTE_CRITICAL ? 'text-red-300' :
              rateLimitInfo.remaining.minute <= RATE_LIMIT_THRESHOLDS.MINUTE_WARNING ? 'text-yellow-300' :
              'text-blue-100'
            }`}>
              {rateLimitInfo.remaining.minute}/{rateLimitInfo.limit.minute}
            </span>
          </div>
          <div className="w-full bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                rateLimitInfo.remaining.minute <= RATE_LIMIT_THRESHOLDS.MINUTE_CRITICAL ? 'bg-red-400' :
                rateLimitInfo.remaining.minute <= RATE_LIMIT_THRESHOLDS.MINUTE_WARNING ? 'bg-yellow-400' :
                'bg-blue-400'
              }`}
              style={{ width: `${(rateLimitInfo.remaining.minute / rateLimitInfo.limit.minute) * 100}%` }}
            />
          </div>
        </div>

        {/* Per Hour */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-blue-300">Per Hour</span>
            <span className={`font-mono font-medium ${
              rateLimitInfo.remaining.hour <= RATE_LIMIT_THRESHOLDS.HOUR_CRITICAL ? 'text-red-300' :
              rateLimitInfo.remaining.hour <= RATE_LIMIT_THRESHOLDS.HOUR_WARNING ? 'text-yellow-300' :
              'text-blue-100'
            }`}>
              {rateLimitInfo.remaining.hour}/{rateLimitInfo.limit.hour}
            </span>
          </div>
          <div className="w-full bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                rateLimitInfo.remaining.hour <= RATE_LIMIT_THRESHOLDS.HOUR_CRITICAL ? 'bg-red-400' :
                rateLimitInfo.remaining.hour <= RATE_LIMIT_THRESHOLDS.HOUR_WARNING ? 'bg-yellow-400' :
                'bg-blue-400'
              }`}
              style={{ width: `${(rateLimitInfo.remaining.hour / rateLimitInfo.limit.hour) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }, [rateLimitInfo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt+N for new chat
      if (event.altKey && event.key === 'n' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        handleNewChat();
      }

      // Alt+B for toggle sidebar collapse
      if (event.altKey && event.key === 'b' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        setIsCollapsed(prev => !prev);
      }

      // Alt+F for search focus
      if (event.altKey && event.key === 'f' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        if (!isCollapsed) {
          searchInputRef.current?.focus();
        }
      }

      // Esc to close modals or clear search
      if (event.key === 'Escape') {
        if (showSettingsMenu) {
          setShowSettingsMenu(false);
        } else if (searchQuery) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        } else if (isOpen) {
          onToggle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat, isOpen, onToggle, searchQuery, isCollapsed, showSettingsMenu]);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettingsMenu]);

  // Connection status indicator with text label - memoized to prevent re-renders
  const connectionIndicator = useMemo(() => {
    const railwayUrl = process.env.NEXT_PUBLIC_RAILWAY_URL || '';
    const isRailwayConfigured = railwayUrl && !railwayUrl.includes('your-app-name');
    const isProduction = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      window.location.hostname !== '[::1]';

    if (isProduction) {
      if (isRailwayConfigured) {
        return {
          dot: <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isConnected ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}></div>,
          label: isConnected ? 'Railway' : 'Disconnected',
          color: isConnected ? 'text-green-400' : 'text-red-400'
        };
      } else {
        return {
          dot: <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50 animate-pulse"></div>,
          label: 'Not Configured',
          color: 'text-yellow-400'
        };
      }
    }

    // Local development
    return {
      dot: <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isConnected ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}></div>,
      label: isConnected ? 'Local Server' : 'Disconnected',
      color: isConnected ? 'text-green-400' : 'text-red-400'
    };
  }, [isConnected]);

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-blue-900 to-blue-950 dark:from-gray-800 dark:to-gray-900 text-white transform transition-all duration-300 ease-in-out z-50 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-20' : 'w-96'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-blue-800">
            {!isCollapsed ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold">GeminiGPT</h1>
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-800/30 rounded-lg border border-blue-700/40">
                      {connectionIndicator.dot}
                      <span className={`text-xs font-medium ${connectionIndicator.color} transition-colors duration-300`}>
                        {connectionIndicator.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCollapsed(true)}
                      className="p-2 hover:bg-blue-800 rounded transition-colors"
                      aria-label="Collapse sidebar (Alt+B)"
                      title="Collapse sidebar (Alt+B)"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={onToggle}
                      className="lg:hidden p-2 hover:bg-blue-800 rounded transition-colors"
                      aria-label="Close sidebar"
                      title="Close sidebar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="p-2 hover:bg-blue-800 rounded transition-colors"
                  aria-label="Expand sidebar (Alt+B)"
                  title="Expand sidebar (Alt+B)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
                {connectionIndicator.dot}
              </div>
            )}

            {!isCollapsed && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                {/* User ID Display with New User Button */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-800/50 rounded-lg flex-1 min-w-0">
                    <svg className="w-4 h-4 text-blue-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-blue-200 font-mono truncate" suppressHydrationWarning>
                      {mounted ? userId : ''}
                    </span>
                  </div>
                  <button
                    onClick={handleNewUser}
                    className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex-shrink-0 group"
                    aria-label="Generate new user (starts fresh session)"
                    title="Generate new user (starts fresh session)"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </button>
                </div>

                {/* Rate Limit Display - Memoized */}
                {rateLimitDisplay}

                {/* New Chat Button - Moved to Top */}
                <button
                  onClick={handleNewChat}
                  className="w-full px-4 py-2.5 mb-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-between group shadow-lg"
                  title="Start new chat (Alt+N)"
                >
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-medium">New Chat</span>
                  </div>
                  <kbd className="text-xs bg-blue-400 px-2 py-0.5 rounded opacity-70 group-hover:opacity-100 font-mono">Alt+N</kbd>
                </button>

                {/* Search Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chats... (Alt+F)"
                    className="w-full pl-10 pr-10 py-2 bg-blue-800/50 text-blue-100 placeholder-blue-300/50 rounded-lg border border-blue-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-300 hover:text-blue-200"
                      aria-label="Clear search (Esc)"
                      title="Clear search (Esc)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat List */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-300">
            {state.chats.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <p>No chats yet. Create your first chat!</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No chats found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === state.activeChatId}
                    onSelect={() => {
                      // Only navigate - let the page handle selectChat to avoid double-selection
                      router.push(`/chat/${chat.id}`);
                    }}
                    onDelete={() => handleDeleteChat(chat.id)}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            )}
          </div>
          )}

          {/* Settings Button with Popup Menu */}
          <div ref={settingsMenuRef} className="border-t border-blue-800 p-3 bg-blue-950/30 relative">
            {!isCollapsed ? (
              <>
                {/* Account Menu - Positioned Above Button */}
                {showSettingsMenu && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 mx-3 bg-blue-900 rounded-lg shadow-xl border border-blue-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                    {/* Menu Header */}
                    <div className="px-4 py-2.5 bg-blue-800/40 border-b border-blue-700">
                      <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                        {isAuthenticated ? 'Account' : 'Guest'}
                      </p>
                    </div>

                    <div className="py-1">
                      {/* API Key Settings - Show status and allow toggle */}
                      {onOpenApiKeySetup && (
                        <button
                          onClick={() => {
                            onOpenApiKeySetup();
                            setShowSettingsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-blue-100 hover:bg-blue-800/50 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          <div className="flex-1 flex items-center justify-between">
                            <span>Bring Your Own Key</span>
                            {hasOwnApiKey && (
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                <span className="text-xs text-green-400">Active</span>
                              </div>
                            )}
                          </div>
                        </button>
                      )}

                      {/* About */}
                      {onOpenAbout && (
                        <button
                          onClick={() => {
                            onOpenAbout();
                            setShowSettingsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-blue-100 hover:bg-blue-800/50 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>About</span>
                        </button>
                      )}

                      {/* Terms & Privacy */}
                      {onOpenTerms && (
                        <button
                          onClick={() => {
                            onOpenTerms();
                            setShowSettingsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-blue-100 hover:bg-blue-800/50 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Terms & Privacy</span>
                        </button>
                      )}

                      {/* Usage Stats */}
                      {onOpenUsageStats && (
                        <button
                          onClick={() => {
                            onOpenUsageStats();
                            setShowSettingsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-blue-100 hover:bg-blue-800/50 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Usage Stats</span>
                        </button>
                      )}

                      {/* Divider */}
                      <div className="my-1 border-t border-blue-800"></div>

                      {/* Settings - Opens modal */}
                      {onOpenSettings && (
                        <button
                          onClick={() => {
                            onOpenSettings();
                            setShowSettingsMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-blue-100 hover:bg-blue-800/50 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Settings</span>
                        </button>
                      )}

                      {/* Login/Sign Up - Only show in guest mode at bottom */}
                      {!isAuthenticated && (
                        <>
                          <div className="my-1 border-t border-blue-800"></div>
                          <button
                            onClick={() => {
                              // TODO: Open login modal
                              console.log('Login clicked');
                              setShowSettingsMenu(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-blue-100 hover:bg-blue-800/50 transition-colors flex items-center gap-3"
                          >
                            <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            <span>Login / Sign Up</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Account Button */}
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="w-full px-4 py-2.5 bg-blue-800/30 hover:bg-blue-800/50 text-blue-100 rounded-lg transition-colors flex items-center justify-between group border border-blue-700/40 hover:border-blue-600/60"
                  title={isAuthenticated ? 'Account Menu' : 'Guest Menu'}
                >
                  <div className="flex items-center gap-2">
                    {/* Avatar Icon */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{isAuthenticated ? 'Account' : 'Guest'}</span>
                      {hasOwnApiKey && !isAuthenticated && (
                        <span className="text-xs text-green-400">Using own key</span>
                      )}
                      {!hasOwnApiKey && !isAuthenticated && (
                        <span className="text-xs text-blue-300">Rate limited</span>
                      )}
                      {isAuthenticated && hasOwnApiKey && (
                        <span className="text-xs text-green-400">Unlimited</span>
                      )}
                      {isAuthenticated && !hasOwnApiKey && (
                        <span className="text-xs text-blue-300">Cloud synced</span>
                      )}
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-blue-300 transition-transform flex-shrink-0 ${showSettingsMenu ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="w-full p-2 bg-blue-800/30 hover:bg-blue-800/50 rounded-lg transition-colors flex items-center justify-center border border-blue-700/40 hover:border-blue-600/60"
                title={isAuthenticated ? 'Account' : 'Guest'}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Chat Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setChatToDelete(null);
        }}
        onConfirm={confirmDeleteChat}
        title="Delete Chat"
        message="This will permanently delete this chat and all its messages from your history and database. This cannot be undone."
        confirmText="Delete Chat"
        cancelText="Cancel"
        isDestructive={true}
      />
    </>
  );
}

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  searchQuery?: string;
}

const ChatItem = React.memo(function ChatItemComponent({ chat, isActive, onSelect, onDelete, searchQuery = '' }: ChatItemProps) {
  const highlightText = useCallback((text: string) => {
    if (!searchQuery.trim()) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={index} className="bg-yellow-400 text-gray-900 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  }, [searchQuery]);

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-blue-600 shadow-md' : 'hover:bg-blue-800/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{highlightText(chat.title)}</p>
        <p className="text-xs text-blue-300/70 truncate">
          {chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
        </p>
      </div>
      {isActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-2 p-1 hover:bg-red-600 rounded opacity-75 hover:opacity-100"
          aria-label="Delete chat"
          title="Delete chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
});