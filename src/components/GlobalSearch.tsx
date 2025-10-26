'use client';

import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Chat } from '@/types/chat';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  chatId: string;
  chatTitle: string;
  messageId: string;
  messageContent: string;
  messageRole: 'user' | 'assistant';
  timestamp: Date;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const { state, selectChat } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search through all chats
    state.chats.forEach((chat: Chat) => {
      chat.messages.forEach((message) => {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          results.push({
            chatId: chat.id,
            chatTitle: chat.title,
            messageId: message.id,
            messageContent: message.content,
            messageRole: message.role,
            timestamp: message.timestamp,
          });
        }
      });
    });

    // Sort by most recent
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setSearchResults(results.slice(0, 50)); // Limit to 50 results
  };

  const handleResultClick = (chatId: string) => {
    selectChat(chatId);
    onClose();
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-500/30 rounded px-1">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[70vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search across all chats..."
              className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title="Close (Esc)"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Search Results */}
        <div className="overflow-y-auto max-h-[calc(70vh-120px)]">
          {searchQuery.trim() && searchResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.chatId}-${result.messageId}-${index}`}
                  onClick={() => handleResultClick(result.chatId)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Chat Title */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                          {result.chatTitle}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          result.messageRole === 'user'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {result.messageRole === 'user' ? 'You' : 'AI'}
                        </span>
                      </div>

                      {/* Message Content */}
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        {highlightText(truncateText(result.messageContent), searchQuery)}
                      </p>

                      {/* Timestamp */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg font-medium">Search Across All Chats</p>
              <p className="text-sm mt-1">Find messages from any conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
