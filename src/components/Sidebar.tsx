'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useChat } from '@/contexts/ChatContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Chat } from '@/types/chat';
import ConfirmationModal from './ConfirmationModal';
import SidebarUsageMeter from './UsageMeter';
import { API_KEY_CHANGED_EVENT } from '@/hooks/useApiKey';
import { RATE_LIMIT_THRESHOLDS, DEBOUNCE_DELAY } from '@/lib/constants';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Tooltip from '@mui/material/Tooltip';
import {
  Zap,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  X,
  Plus,
  Search,
  SearchX,
  KeyRound,
  Info,
  FileText,
  BarChart3,
  Settings,
  LogIn,
  LogOut,
  User,
  Trash2,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onOpenAbout?: () => void;
  onOpenApiKeySetup?: () => void;
  onOpenTerms?: () => void;
  onOpenUsageStats?: () => void;
  onOpenSettings?: () => void;
  onOpenSignIn?: () => void;
}

export default function Sidebar({ isOpen, onToggle, isCollapsed: externalIsCollapsed, onCollapsedChange, onOpenAbout, onOpenApiKeySetup, onOpenTerms, onOpenUsageStats, onOpenSettings, onOpenSignIn }: SidebarProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { state, deleteChat, clearActiveChat } = useChat();
  const { isConnected, rateLimitInfo } = useWebSocket();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_DELAY.SEARCH);
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [hasOwnApiKey, setHasOwnApiKey] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Use external collapsed state if provided, otherwise use internal
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;

  // Helper to update collapsed state
  const setIsCollapsed = (value: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(value);
    } else {
      setInternalIsCollapsed(value);
    }
  };

  // Compute authentication status from session
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  // Check if user has their own API key
  useEffect(() => {
    const checkApiKey = () => {
      const storedApiKey = localStorage.getItem('gemini-api-key');
      setHasOwnApiKey(!!storedApiKey);
    };

    checkApiKey();

    // Listen for storage changes (API key updates from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gemini-api-key') {
        checkApiKey();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Same-tab updates (wizard / pool-exhausted notice / settings)
    window.addEventListener(API_KEY_CHANGED_EVENT, checkApiKey);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(API_KEY_CHANGED_EVENT, checkApiKey);
    };
  }, []);

  // Handle new chat - clear active chat and navigate to root
  const handleNewChat = useCallback(() => {
    clearActiveChat();
    router.push('/');
  }, [clearActiveChat, router]);

  // Delete chat with confirmation
  const handleDeleteChat = (chatId: string) => {
    setChatToDelete(chatId);
    setShowDeleteModal(true);
  };

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      deleteChat(chatToDelete);
      // Always clear active chat and navigate to root after deletion
      clearActiveChat();
      router.push('/');
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
          <Zap className="w-3.5 h-3.5 text-blue-300" />
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
        setIsCollapsed(!isCollapsed);
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
    return {
      dot: <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isConnected ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}></div>,
      label: isConnected ? 'Connected' : 'Disconnected',
      color: isConnected ? 'text-green-400' : 'text-red-400'
    };
  }, [isConnected]);

  return (
    <>
      {/* Backdrop for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-blue-900 to-blue-950 dark:from-gray-800 dark:to-gray-900 text-white transform transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] z-50 lg:translate-x-0 ${
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
                    <h1
                      className="text-xl font-bold cursor-pointer hover:text-blue-200 transition-colors select-none"
                      onClick={handleNewChat}
                      title="Go to home"
                    >
                      GeminiGPT
                    </h1>
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
                      <ChevronsLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={onToggle}
                      className="lg:hidden p-2 hover:bg-blue-800 rounded transition-colors"
                      aria-label="Close sidebar"
                      title="Close sidebar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="p-2 hover:bg-blue-800 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label="Expand sidebar (Alt+B)"
                  title="Expand sidebar (Alt+B)"
                >
                  <ChevronsRight className="w-5 h-5" />
                </button>
                {connectionIndicator.dot}
                <button
                  onClick={handleNewChat}
                  className="p-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded transition-colors"
                  aria-label="New Chat (Alt+N)"
                  title="New Chat (Alt+N)"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}

            {!isCollapsed && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                {/* Usage meter: demo-pool capacity (or own-key usage for BYOK) */}
                <SidebarUsageMeter hasOwnKey={hasOwnApiKey} />

                {/* Rate Limit Display - Memoized */}
                {rateLimitDisplay}

                {/* New Chat Button - Moved to Top */}
                <button
                  onClick={handleNewChat}
                  className="w-full px-4 py-2.5 mb-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-between group shadow-lg"
                  title="Start new chat (Alt+N)"
                >
                  <div className="flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="font-medium">New Chat</span>
                  </div>
                  <kbd className="text-xs bg-blue-400 px-2 py-0.5 rounded opacity-70 group-hover:opacity-100 font-mono">Alt+N</kbd>
                </button>

                {/* Search Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-blue-300" />
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
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat List */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-500">
            {state.chats.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <p>No chats yet. Create your first chat!</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <SearchX className="w-12 h-12 mx-auto mb-2 text-gray-600" />
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

          {/* Spacer for collapsed sidebar - pushes avatar button to bottom */}
          {isCollapsed && <div className="flex-1"></div>}

          {/* Settings Button with Popup Menu */}
          <div ref={settingsMenuRef} className="border-t border-blue-800 dark:border-gray-700 p-3 bg-blue-950/30 dark:bg-gray-900/30 relative">
            {/* Account Menu - Shows for both collapsed and expanded states */}
            {showSettingsMenu && (
              <div className={`absolute bg-blue-900 dark:bg-gray-800 rounded-lg shadow-xl border border-blue-700 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50 ${
                isCollapsed
                  ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
                  : 'bottom-full left-0 right-0 mb-1 mx-3'
              }`}>
                    {/* Menu Header - Only show when expanded */}
                    {!isCollapsed && (
                      <div className="px-4 py-2.5 bg-blue-800/40 dark:bg-gray-700/40 border-b border-blue-700 dark:border-gray-600">
                        <p className="text-xs font-semibold text-blue-300 dark:text-gray-300 uppercase tracking-wider">
                          {isAuthenticated ? 'Account' : 'Guest'}
                        </p>
                      </div>
                    )}

                    <div className={isCollapsed ? 'py-2 px-2 flex flex-col gap-1' : 'py-1'}>
                      {/* API Key Settings - Show status and allow toggle */}
                      {onOpenApiKeySetup && (
                        <Tooltip title="Bring Your Own Key" placement="right" arrow disableInteractive={!isCollapsed} enterDelay={300}>
                          <button
                            onClick={() => {
                              onOpenApiKeySetup();
                              setShowSettingsMenu(false);
                            }}
                            className={`${
                              isCollapsed
                                ? 'p-2.5 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center relative group'
                                : 'w-full px-4 py-2.5 text-left text-sm text-blue-100 dark:text-gray-200 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3'
                            }`}
                          >
                            <KeyRound className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-blue-300 dark:text-gray-400`} />
                            {!isCollapsed && (
                              <div className="flex-1 flex items-center justify-between">
                                <span>Bring Your Own Key</span>
                                {hasOwnApiKey && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    <span className="text-xs text-green-400">Active</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {isCollapsed && hasOwnApiKey && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></div>
                            )}
                          </button>
                        </Tooltip>
                      )}

                      {/* About */}
                      {onOpenAbout && (
                        <Tooltip title="About" placement="right" arrow disableInteractive={!isCollapsed} enterDelay={300}>
                          <button
                            onClick={() => {
                              onOpenAbout();
                              setShowSettingsMenu(false);
                            }}
                            className={`${
                              isCollapsed
                                ? 'p-2.5 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center'
                                : 'w-full px-4 py-2.5 text-left text-sm text-blue-100 dark:text-gray-200 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3'
                            }`}
                          >
                            <Info className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-blue-300 dark:text-gray-400`} />
                            {!isCollapsed && <span>About</span>}
                          </button>
                        </Tooltip>
                      )}

                      {/* Terms & Privacy */}
                      {onOpenTerms && (
                        <Tooltip title="Terms & Privacy" placement="right" arrow disableInteractive={!isCollapsed} enterDelay={300}>
                          <button
                            onClick={() => {
                              onOpenTerms();
                              setShowSettingsMenu(false);
                            }}
                            className={`${
                              isCollapsed
                                ? 'p-2.5 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center'
                                : 'w-full px-4 py-2.5 text-left text-sm text-blue-100 dark:text-gray-200 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3'
                            }`}
                          >
                            <FileText className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-blue-300 dark:text-gray-400`} />
                            {!isCollapsed && <span>Terms & Privacy</span>}
                          </button>
                        </Tooltip>
                      )}

                      {/* Usage Stats */}
                      {onOpenUsageStats && (
                        <Tooltip title="Usage Stats" placement="right" arrow disableInteractive={!isCollapsed} enterDelay={300}>
                          <button
                            onClick={() => {
                              onOpenUsageStats();
                              setShowSettingsMenu(false);
                            }}
                            className={`${
                              isCollapsed
                                ? 'p-2.5 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center'
                                : 'w-full px-4 py-2.5 text-left text-sm text-blue-100 dark:text-gray-200 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3'
                            }`}
                          >
                            <BarChart3 className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-blue-300 dark:text-gray-400`} />
                            {!isCollapsed && <span>Usage Stats</span>}
                          </button>
                        </Tooltip>
                      )}

                      {/* Divider - Only show when expanded */}
                      {!isCollapsed && <div className="my-1 border-t border-blue-800 dark:border-gray-700"></div>}

                      {/* Settings - Opens modal */}
                      {onOpenSettings && (
                        <Tooltip title="Settings" placement="right" arrow disableInteractive={!isCollapsed} enterDelay={300}>
                          <button
                            onClick={() => {
                              onOpenSettings();
                              setShowSettingsMenu(false);
                            }}
                            className={`${
                              isCollapsed
                                ? 'p-2.5 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center'
                                : 'w-full px-4 py-2.5 text-left text-sm text-blue-100 dark:text-gray-200 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3'
                            }`}
                          >
                            <Settings className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-blue-300 dark:text-gray-400`} />
                            {!isCollapsed && <span>Settings</span>}
                          </button>
                        </Tooltip>
                      )}

                      {/* Divider before authentication actions - Only show when expanded */}
                      {!isCollapsed && <div className="my-1 border-t border-blue-800 dark:border-gray-700"></div>}

                      {/* Login/Sign Up - Only show in guest mode */}
                      {!isAuthenticated && onOpenSignIn && (
                        <Tooltip title="Login / Sign Up" placement="right" arrow disableInteractive={!isCollapsed} enterDelay={300}>
                          <button
                            onClick={() => {
                              onOpenSignIn();
                              setShowSettingsMenu(false);
                            }}
                            className={`${
                              isCollapsed
                                ? 'p-2.5 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center'
                                : 'w-full px-4 py-2.5 text-left text-sm text-blue-100 dark:text-gray-200 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3'
                            }`}
                          >
                            <LogIn className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-blue-300 dark:text-gray-400`} />
                            {!isCollapsed && <span>Login / Sign Up</span>}
                          </button>
                        </Tooltip>
                      )}

                      {/* Sign Out - Only show when authenticated */}
                      {isAuthenticated && (
                        <Tooltip title="Sign Out" placement="right" arrow disableInteractive={!isCollapsed} enterDelay={300}>
                          <button
                            onClick={() => {
                              signOut();
                              setShowSettingsMenu(false);
                            }}
                            className={`${
                              isCollapsed
                                ? 'p-2.5 hover:bg-red-600/50 dark:hover:bg-red-700/50 rounded-lg transition-colors flex items-center justify-center'
                                : 'w-full px-4 py-2.5 text-left text-sm text-red-400 dark:text-red-400 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3'
                            }`}
                          >
                            <LogOut className={`${isCollapsed ? 'w-5 h-5 text-red-400' : 'w-4 h-4'}`} />
                            {!isCollapsed && <span>Sign Out</span>}
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}

            {/* Account Button - Works for both collapsed and expanded states */}
            {!isCollapsed ? (
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="w-full px-4 py-2.5 bg-blue-800/30 dark:bg-gray-700/30 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 text-blue-100 dark:text-gray-100 rounded-lg transition-colors flex items-center justify-between group border border-blue-700/40 dark:border-gray-600/40 hover:border-blue-600/60 dark:hover:border-gray-500/60"
                title={isAuthenticated ? 'Account Menu' : 'Guest Menu'}
              >
                <div className="flex items-center gap-2">
                  {/* Avatar Icon */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{isAuthenticated ? 'Account' : 'Guest'}</span>
                    {hasOwnApiKey && !isAuthenticated && (
                      <span className="text-xs text-green-400">Using own key</span>
                    )}
                    {!hasOwnApiKey && !isAuthenticated && (
                      <span className="text-xs text-blue-300 dark:text-gray-400">Shared demo key</span>
                    )}
                    {isAuthenticated && hasOwnApiKey && (
                      <span className="text-xs text-green-400">Unlimited</span>
                    )}
                    {isAuthenticated && !hasOwnApiKey && (
                      <span className="text-xs text-blue-300 dark:text-gray-400">Cloud synced</span>
                    )}
                  </div>
                </div>
                <ChevronUp
                  className={`w-4 h-4 text-blue-300 dark:text-gray-400 transition-transform flex-shrink-0 ${showSettingsMenu ? 'rotate-180' : ''}`}
                />
              </button>
            ) : (
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="w-full p-2 bg-blue-800/30 dark:bg-gray-700/30 hover:bg-blue-800/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center border border-blue-700/40 dark:border-gray-600/40 hover:border-blue-600/60 dark:hover:border-gray-500/60"
                title={isAuthenticated ? 'Account Menu' : 'Guest Menu'}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 flex items-center justify-center">
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
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});