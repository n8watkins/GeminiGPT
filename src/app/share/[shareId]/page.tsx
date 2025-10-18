'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Message } from '@/types/chat';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import AttachmentDisplay from '@/components/AttachmentDisplay';

interface SharedChat {
  shareId: string;
  originalChatId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  sharedAt: string;
}

export default function SharedChatPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [chat, setChat] = useState<SharedChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedChat() {
      try {
        const response = await fetch(`/api/share?shareId=${shareId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('This shared chat could not be found. It may have been deleted or the link is incorrect.');
          } else {
            setError('Failed to load shared chat. Please try again later.');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setChat(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching shared chat:', err);
        setError('An error occurred while loading the shared chat.');
        setLoading(false);
      }
    }

    if (shareId) {
      fetchSharedChat();
    }
  }, [shareId]);

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading shared chat...</p>
        </div>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Chat Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-blue-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">{chat.title}</h1>
              <p className="text-sm text-gray-500">
                Shared on {new Date(chat.sharedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Read-only
              </div>
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Start New Chat
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {chat.messages.map((message, index) => {
            const isUser = message.role === 'user';
            return (
              <div key={message.id || index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
                <div
                  className={`px-4 py-3 rounded-lg ${
                    isUser
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white max-w-2xl shadow-md'
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

                  <div className="mt-2">
                    <p className={`text-xs ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>This is a shared conversation. You can view it but not interact with it.</p>
          <p className="mt-2">
            <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
              Create your own chat
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
