'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useChat } from '@/contexts/ChatContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useApiKey } from '@/hooks/useApiKey';
import { useUsageInfo, isPoolExhausted } from '@/hooks/useUsageInfo';
import { Message, Attachment, RetrievalSource } from '@/types/chat';
import AttachmentDisplay from './AttachmentDisplay';
import FileUpload from './FileUpload';
import ChatUtils from './ChatUtils';
import MarkdownRenderer from './MarkdownRenderer';
import PoolExhaustedNotice from './PoolExhaustedNotice';
import AmbientBackground from './AmbientBackground';
import TypewriterPlaceholder from './TypewriterPlaceholder';
import { chatLogger, fileLogger } from '@/lib/logger';
import { validateFile } from '@/lib/fileValidation';
import {
  CloudUpload,
  MessageCircleMore,
  Lightbulb,
  Code,
  Palette,
  Terminal,
  CircleAlert,
  X,
  FileText,
  Send,
  LoaderCircle,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

export default function ChatInterface() {
  const router = useRouter();
  const { getActiveChat, sendMessage, regenerateMessage, state, poolExhausted, poolNoticeDismissed, dismissPoolNotice } = useChat();
  const { typingStates } = useWebSocket();
  const { hasApiKey } = useApiKey();
  const usage = useUsageInfo();

  // Show the BYOK upgrade prompt when the shared demo key is out of budget
  // (POOL_EXHAUSTED message-error, or usage-info reporting no capacity left)
  const showPoolNotice =
    !hasApiKey && !poolNoticeDismissed && (poolExhausted || isPoolExhausted(usage));
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

      // If there was no active chat before, navigate to the newly created chat immediately
      if (wasNoActiveChat && state.activeChatId) {
        chatLogger.debug('Navigating to newly created chat', { chatId: state.activeChatId });
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
      icon: <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
    },
    {
      text: "Write a Python function to sort an array",
      icon: <Code className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
    },
    {
      text: "What are the key principles of good UI design?",
      icon: <Palette className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
    },
    {
      text: "Explain how async/await works in JavaScript",
      icon: <Terminal className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
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
        {/* Ambient background motion (CSS-only, respects reduced motion) */}
        <AmbientBackground />

        {/* Drag and Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-600 bg-opacity-95 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <CloudUpload className="w-24 h-24 mx-auto mb-4 text-white" />
              <p className="text-2xl font-bold text-white mb-2">Drop files here</p>
              <p className="text-blue-100 text-lg">Supports images, PDFs, and Word documents</p>
            </div>
          </div>
        )}

      {/* Chat Header - Only show if there's an active chat */}
      {activeChat && (
        <div className="relative border-b border-blue-200 dark:border-gray-700 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
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
        <div className="relative flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                <MessageCircleMore className="w-12 h-12 text-white" />
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
              {/* Demo pool exhausted - offer BYOK */}
              {showPoolNotice && (
                <PoolExhaustedNotice usage={usage} onDismiss={dismissPoolNotice} />
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2">
                  <CircleAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{errorMessage}</p>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
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
                            <FileText className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                          </div>
                        )}
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-20">
                          {attachment.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-2">
                <FileUpload onFilesSelected={handleFilesSelected} disabled={isLoading} />
                <div className="relative flex-1">
                  <input
                    ref={inputRefCentered}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    aria-label="Type your message"
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {/* Typed-out rotating prompt suggestions (overlay, not value) */}
                  {inputValue === '' && <TypewriterPlaceholder />}
                </div>
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && pendingAttachments.length === 0) || isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={(!inputValue.trim() && pendingAttachments.length === 0) ? "Type a message or upload a file" : "Send message"}
                >
                  {isLoading ? (
                    <LoaderCircle className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Traditional Bottom Layout for Chat with Messages */
        <>
          <div className="relative flex-1 overflow-y-auto p-4">
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
        <div className="relative border-t border-blue-200 dark:border-gray-700 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            {/* Demo pool exhausted - offer BYOK */}
            {showPoolNotice && (
              <PoolExhaustedNotice usage={usage} onDismiss={dismissPoolNotice} />
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                <CircleAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
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
                          <FileText className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <span className="text-xs text-gray-600 truncate max-w-20">
                        {attachment.name}
                      </span>
                      <button
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <FileUpload onFilesSelected={handleFilesSelected} disabled={isLoading} />
              <div className="relative flex-1">
                <input
                  ref={inputRefBottom}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  aria-label="Type your message"
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {/* Typed-out rotating prompt suggestions (overlay, not value) */}
                {inputValue === '' && <TypewriterPlaceholder />}
              </div>
              <button
                type="submit"
                disabled={(!inputValue.trim() && pendingAttachments.length === 0) || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={(!inputValue.trim() && pendingAttachments.length === 0) ? "Type a message or upload a file" : "Send message"}
              >
                {isLoading ? (
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
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

/**
 * "Recalled from <chat>" chip for a cross-chat memory source.
 * Hover shows the snippet; click expands it inline.
 */
function CitationChip({ source }: { source: RetrievalSource }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="max-w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        title={source.snippet}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors max-w-full"
      >
        <span aria-hidden>📎</span>
        <span className="truncate">Recalled from {source.chatTitle || 'another chat'}</span>
        <ChevronDown
          className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="mt-1 px-3 py-2 text-xs rounded-lg bg-purple-50/70 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900 text-gray-600 dark:text-gray-300 italic">
          &ldquo;{source.snippet}&rdquo;
        </div>
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
              : 'bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 w-full shadow-sm'
          }`}
        >
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentDisplay attachments={message.attachments} isUser={isUser} />
          )}

          {/* Message content with Markdown */}
          {message.content && (
            <div className={`text-sm ${isUser ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
              <MarkdownRenderer content={message.content} isUser={isUser} isStreaming={message.isStreaming} />
            </div>
          )}

          {/* Cross-chat memory citations (retrieval-info contract) */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div
              className="mt-2 pt-2 border-t border-blue-100 dark:border-gray-700 flex flex-wrap gap-1.5"
              data-testid="message-citations"
            >
              {message.sources.map((source, index) => (
                <CitationChip key={`${source.chatId}-${index}`} source={source} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs ${isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
              {formatTime(message.timestamp)}
            </p>

            {/* Regenerate button for last AI message */}
            {onRegenerate && isLastMessage && !isUser && (
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="ml-3 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Regenerate response"
              >
                {isRegenerating ? (
                  <>
                    <LoaderCircle className="w-3 h-3 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
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
