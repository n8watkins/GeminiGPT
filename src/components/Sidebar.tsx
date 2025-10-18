'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/contexts/ChatContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getSessionUserId, generateUserId } from '@/lib/userId';
import { Chat } from '@/types/chat';
import ConfirmationModal from './ConfirmationModal';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenAbout?: () => void;
}

export default function Sidebar({ isOpen, onToggle, onOpenAbout }: SidebarProps) {
  const router = useRouter();
  const { state, createChat, deleteChat } = useChat();
  const { socket, isConnected, rateLimitInfo } = useWebSocket();
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Set userId after mount to avoid hydration mismatch
  useEffect(() => {
    setUserId(getSessionUserId());
    setMounted(true);
  }, []);

  // Handle new chat - create a new empty chat and navigate to it
  const handleNewChat = useCallback(() => {
    const now = new Date();
    const title = `Chat ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    const newChatId = createChat(title);
    router.push(`/chat/${newChatId}`);
  }, [router, createChat]);

  // Reset everything function
  const handleResetEverything = () => {
    // Clear vector database first
    if (socket && isConnected && userId) {
      socket.emit('reset-vector-db', { userId });
      console.log('Reset vector database request sent');
    }

    // Clear all local data
    localStorage.clear();
    window.location.reload();
  };

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
    if (!searchQuery.trim()) return state.chats;

    const lowerQuery = searchQuery.toLowerCase();
    return state.chats.filter(chat => {
      // Search in chat title
      if (chat.title.toLowerCase().includes(lowerQuery)) return true;

      // Search in message content
      return chat.messages.some(msg =>
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  }, [state.chats, searchQuery]);

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
              rateLimitInfo.remaining.minute <= 5 ? 'text-yellow-300' :
              rateLimitInfo.remaining.minute <= 2 ? 'text-red-300' :
              'text-blue-100'
            }`}>
              {rateLimitInfo.remaining.minute}/{rateLimitInfo.limit.minute}
            </span>
          </div>
          <div className="w-full bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                rateLimitInfo.remaining.minute <= 5 ? 'bg-yellow-400' :
                rateLimitInfo.remaining.minute <= 2 ? 'bg-red-400' :
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
              rateLimitInfo.remaining.hour <= 20 ? 'text-yellow-300' :
              rateLimitInfo.remaining.hour <= 10 ? 'text-red-300' :
              'text-blue-100'
            }`}>
              {rateLimitInfo.remaining.hour}/{rateLimitInfo.limit.hour}
            </span>
          </div>
          <div className="w-full bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                rateLimitInfo.remaining.hour <= 20 ? 'bg-yellow-400' :
                rateLimitInfo.remaining.hour <= 10 ? 'bg-red-400' :
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

      // Alt+F for search focus
      if (event.altKey && event.key === 'f' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      // Alt+R for reset everything
      if (event.altKey && event.key === 'r' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        setShowResetModal(true);
      }

      // Esc to close modals or clear search
      if (event.key === 'Escape') {
        if (searchQuery) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        } else if (isOpen) {
          onToggle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat, isOpen, onToggle, searchQuery]);

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-blue-900 to-blue-950 text-white transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold">GeminiGPT</h1>
              <button
                onClick={onToggle}
                className="lg:hidden p-2 hover:bg-gray-800 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
                title="Generate new user (starts fresh session)"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </button>
            </div>

            {/* Rate Limit Display - Memoized */}
            {rateLimitDisplay}

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
                  title="Clear search (Esc)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
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

          {/* New Chat Button - Moved to Bottom */}
          <div className="border-t border-blue-800 p-3">
            <button
              onClick={handleNewChat}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-between group shadow-lg"
              title="Start new chat (Alt+N)"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Chat</span>
              </div>
              <kbd className="text-xs bg-blue-400 px-2 py-0.5 rounded opacity-70 group-hover:opacity-100 font-mono">Alt+N</kbd>
            </button>
          </div>

          {/* Settings Section */}
          <div className="border-t border-blue-800 p-3 bg-blue-950/30 space-y-2">
            {/* About Button */}
            {onOpenAbout && (
              <button
                onClick={onOpenAbout}
                className="w-full px-3 py-2.5 text-sm font-medium text-blue-100 bg-blue-800/30 hover:bg-blue-800/50 rounded-lg border border-blue-700/40 hover:border-blue-600/60 transition-all duration-200 flex items-center justify-between group shadow-sm hover:shadow-md"
                title="About this portfolio project"
              >
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-300 group-hover:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="group-hover:text-white transition-colors">About</span>
                </div>
              </button>
            )}

            {/* Reset Everything Button */}
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full px-3 py-2.5 text-sm font-medium text-red-100 bg-red-900/20 hover:bg-red-900/40 rounded-lg border border-red-800/40 hover:border-red-700/60 transition-all duration-200 flex items-center justify-between group shadow-sm hover:shadow-md"
              title="Reset everything - chats, vector DB, and local data (Alt+R)"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-red-300 group-hover:text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="group-hover:text-white transition-colors">Reset Everything</span>
              </div>
              <kbd className="text-xs bg-red-800/40 text-red-200 px-2 py-0.5 rounded opacity-60 group-hover:opacity-100 font-mono transition-opacity">Alt+R</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetEverything}
        title="Reset Everything"
        message="This will delete all chats and clear your data. This cannot be undone."
        confirmText="Reset Everything"
        cancelText="Cancel"
        isDestructive={true}
      />

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
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
});