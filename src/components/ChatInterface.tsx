'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useChat } from '@/contexts/ChatContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Message, Attachment } from '@/types/chat';
import AttachmentDisplay from './AttachmentDisplay';
import FileUpload from './FileUpload';
import ChatUtils from './ChatUtils';
import MarkdownRenderer from './MarkdownRenderer';
import { chatLogger, fileLogger } from '@/lib/logger';
import { validateFile } from '@/lib/fileValidation';

export default function ChatInterface() {
  const router = useRouter();
  const { getActiveChat, sendMessage, regenerateMessage, state } = useChat();
  const { typingStates } = useWebSocket();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRefCentered = useRef<HTMLInputElement>(null);
  const inputRefBottom = useRef<HTMLInputElement>(null);
  const activeChat = getActiveChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  // Auto-focus input when chat changes or on new empty chat
  useEffect(() => {
    if (!activeChat) {
      // No chat selected - focus centered input
      setTimeout(() => inputRefCentered.current?.focus(), 100);
    } else if (activeChat.messages.length === 0) {
      // New empty chat - focus centered input
      setTimeout(() => inputRefCentered.current?.focus(), 100);
    } else {
      // Chat with messages - focus bottom input
      setTimeout(() => inputRefBottom.current?.focus(), 100);
    }
  }, [activeChat?.id, activeChat?.messages.length, activeChat]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    chatLogger.debug('Form submitted', {
      inputValue: inputValue.trim(),
      pendingAttachments: pendingAttachments.length,
      isLoading,
      hasActiveChat: !!activeChat
    });

    // Prevent double submission
    if (isLoading) {
      chatLogger.debug('Already loading, ignoring submission');
      return;
    }

    // Allow submission if there's text OR attachments
    if (!inputValue.trim() && pendingAttachments.length === 0) {
      chatLogger.debug('Form submission blocked: no text or attachments');
      return;
    }

    const message = inputValue.trim();
    const attachmentsToSend = [...pendingAttachments]; // Copy attachments before clearing
    const wasNoActiveChat = !activeChat;

    chatLogger.debug('Submitting message', { message, attachmentsCount: attachmentsToSend.length });

    // Clear form immediately
    setInputValue('');
    setPendingAttachments([]);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await sendMessage(message, attachmentsToSend);
      chatLogger.debug('Message sent successfully');

      // If there was no active chat before, navigate to the newly created chat
      if (wasNoActiveChat && state.activeChatId) {
        router.push(`/chat/${state.activeChatId}`);
      }
    } catch (error) {
      chatLogger.error('Error sending message', error);

      // Show user-friendly error message
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
      setErrorMessage(errorMsg);

      // Restore input and attachments if sending failed
      setInputValue(message);
      setPendingAttachments(attachmentsToSend);

      // Auto-clear error after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeChat || activeChat.messages.length < 2) return;

    setIsRegenerating(true);
    try {
      await regenerateMessage();
    } catch (error) {
      chatLogger.error('Error regenerating message', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to regenerate message');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFilesSelected = (attachments: Attachment[]) => {
    setPendingAttachments(prev => [...prev, ...attachments]);
  };

  const removeAttachment = (attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Prevent if already loading
    if (isLoading) return;

    const wasNoActiveChat = !activeChat;

    chatLogger.debug('Suggestion clicked', { suggestion });

    // Clear form and set loading state
    setInputValue('');
    setPendingAttachments([]);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await sendMessage(suggestion, []);
      chatLogger.debug('Suggestion message sent successfully');

      // If there was no active chat before, navigate to the newly created chat
      if (wasNoActiveChat && state.activeChatId) {
        router.push(`/chat/${state.activeChatId}`);
      }
    } catch (error) {
      chatLogger.error('Error sending suggestion message', error);

      // Show user-friendly error message
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
      setErrorMessage(errorMsg);

      // Restore input if sending failed
      setInputValue(suggestion);

      // Auto-clear error after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    {
      text: "Explain quantum computing in simple terms",
      icon: (
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    {
      text: "Write a Python function to sort an array",
      icon: (
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      text: "What are the key principles of good UI design?",
      icon: (
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    },
    {
      text: "Explain how async/await works in JavaScript",
      icon: (
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Process files using the same logic as FileUpload component
    const newAttachments: Attachment[] = [];

    for (const file of files) {
      // Validate file using shared validation logic
      const validation = validateFile(file);
      if (!validation.isValid) {
        fileLogger.warn(`File validation failed: ${validation.error}`);
        continue;
      }

      const isImage = file.type.startsWith('image/');

      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      try {
        await base64Promise;

        newAttachments.push({
          id: `${Date.now()}-${file.name}`,
          type: isImage ? 'image' : 'file',
          name: file.name,
          mimeType: file.type,
          url: isImage ? URL.createObjectURL(file) : '',
        });
      } catch (error) {
        fileLogger.error(`Error reading file ${file.name}`, error);
      }
    }

    if (newAttachments.length > 0) {
      setPendingAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  // Show centered input for no chat OR empty chat
  const showCenteredInput = !activeChat || activeChat.messages.length === 0;

  return (
    <div
      className="flex-1 flex flex-col bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
        {/* Drag and Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-600 bg-opacity-95 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <svg className="w-24 h-24 mx-auto mb-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-2xl font-bold text-white mb-2">Drop files here</p>
              <p className="text-blue-100 text-lg">Supports images, PDFs, and Word documents</p>
            </div>
          </div>
        )}

      {/* Chat Header - Only show if there's an active chat */}
      {activeChat && (
        <div className="border-b border-blue-200 dark:border-gray-700 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{activeChat.title}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeChat.messages.length} messages
              </p>
            </div>
            {/* Quick Action Pills */}
            <ChatUtils chatId={activeChat.id} />
          </div>
        </div>
      )}

      {/* Messages or Centered Input */}
      {showCenteredInput ? (
        /* Centered Layout for Empty Chat */
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-3">How can I help you today?</h2>
              <p className="text-blue-700 dark:text-blue-300">Choose a suggestion or type your own message</p>
            </div>

            {/* Suggestion Chips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="p-4 text-left bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl transition-all hover:shadow-md group"
                >
                  <div className="flex items-start gap-3">
                    {suggestion.icon}
                    <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-blue-900 dark:group-hover:text-blue-300">{suggestion.text}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Centered Input Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-blue-200 dark:border-gray-600 p-4">
              {/* Error Message */}
              {errorMessage && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{errorMessage}</p>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Pending Attachments */}
              {pendingAttachments.length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Attachments ({pendingAttachments.length})
                    </span>
                    <button
                      onClick={() => setPendingAttachments([])}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2 bg-white dark:bg-gray-700 rounded border dark:border-gray-600 p-2">
                        {attachment.type === 'image' ? (
                          <Image
                            src={attachment.url}
                            alt={attachment.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 object-cover rounded"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-20">
                          {attachment.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-2">
                <FileUpload onFilesSelected={handleFilesSelected} disabled={isLoading} />
                <input
                  ref={inputRefCentered}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && pendingAttachments.length === 0) || isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={(!inputValue.trim() && pendingAttachments.length === 0) ? "Type a message or upload a file" : "Send message"}
                >
                  {isLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Traditional Bottom Layout for Chat with Messages */
        <>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {activeChat && (
            activeChat.messages.map((message, index, array) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLastMessage={index === array.length - 1}
                  onRegenerate={message.role === 'assistant' && index === array.length - 1 ? handleRegenerate : undefined}
                  isRegenerating={isRegenerating}
                />
              ))
            )}

            {(isLoading || (activeChat && typingStates[activeChat.id])) && (
              <div className="flex justify-start w-full">
                <div className="bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-600 rounded-lg p-4 shadow-sm max-w-xs">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">GeminiGPT is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input at Bottom */}
        <div className="border-t border-blue-200 p-4 bg-white/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            {/* Error Message */}
            {errorMessage && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Pending Attachments */}
            {pendingAttachments.length > 0 && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    Attachments ({pendingAttachments.length})
                  </span>
                  <button
                    onClick={() => setPendingAttachments([])}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingAttachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center space-x-2 bg-white rounded border p-2">
                      {attachment.type === 'image' ? (
                        <Image
                          src={attachment.url}
                          alt={attachment.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <span className="text-xs text-gray-600 truncate max-w-20">
                        {attachment.name}
                      </span>
                      <button
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <FileUpload onFilesSelected={handleFilesSelected} disabled={isLoading} />
              <input
                ref={inputRefBottom}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-gray-900 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={(!inputValue.trim() && pendingAttachments.length === 0) || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={(!inputValue.trim() && pendingAttachments.length === 0) ? "Type a message or upload a file" : "Send message"}
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isLastMessage?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

function MessageBubble({
  message,
  isLastMessage = false,
  onRegenerate,
  isRegenerating = false
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full group`}>
      <div className="flex flex-col w-full max-w-4xl">
        <div
          className={`px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white max-w-2xl ml-auto shadow-md'
              : 'bg-white border border-blue-100 text-gray-800 w-full shadow-sm'
          }`}
        >
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentDisplay attachments={message.attachments} isUser={isUser} />
          )}

          {/* Message content with Markdown */}
          {message.content && (
            <div className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'}`}>
              <MarkdownRenderer content={message.content} isUser={isUser} />
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
              {formatTime(message.timestamp)}
            </p>

            {/* Regenerate button for last AI message */}
            {onRegenerate && isLastMessage && !isUser && (
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="ml-3 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Regenerate response"
              >
                {isRegenerating ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
