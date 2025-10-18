'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from '@/contexts/ChatContext';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { chatLogger } from '@/lib/logger';

interface ChatUtilsProps {
  chatId: string;
}

export default function ChatUtils({ chatId }: ChatUtilsProps) {
  const { state } = useChat();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Focus trap for modals
  const shareModalRef = useFocusTrap(showShareModal);
  const downloadModalRef = useFocusTrap(showDownloadModal);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chat = state.chats.find(c => c.id === chatId);
  if (!chat) return null;

  const exportChat = () => {
    const chatData = {
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages: chat.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        attachments: msg.attachments?.map(att => ({
          name: att.name,
          type: att.type,
          size: att.size
        })) || []
      }))
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadModal(false);
  };

  const exportAsMarkdown = () => {
    let markdown = `# ${chat.title}\n\n`;
    markdown += `**Created:** ${new Date(chat.createdAt).toLocaleString()}\n`;
    markdown += `**Updated:** ${new Date(chat.updatedAt).toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    chat.messages.forEach(msg => {
      if (msg.role === 'user') {
        markdown += `## 👤 You\n\n${msg.content}\n\n`;
      } else {
        markdown += `## 🤖 Assistant\n\n${msg.content}\n\n`;
      }

      if (msg.attachments && msg.attachments.length > 0) {
        markdown += `**Attachments:**\n`;
        msg.attachments.forEach(att => {
          markdown += `- ${att.name} (${att.type})\n`;
        });
        markdown += `\n`;
      }
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadModal(false);
  };

  const shareChat = async () => {
    setIsGeneratingLink(true);
    setShowShareModal(true);

    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
    } catch (error) {
      chatLogger.error('Error creating share link', error);
      // TODO: Replace with notification system when implemented
      alert('Failed to create share link. Please try again.');
      setShowShareModal(false);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Quick Action Pills */}
        <button
          onClick={shareChat}
          className="px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-full transition-colors flex items-center gap-1.5 border border-green-200 font-medium"
          title="Share this chat"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </button>

        <button
          onClick={() => setShowDownloadModal(true)}
          className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition-colors flex items-center gap-1.5 border border-blue-200 font-medium"
          title="Download chat"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Download</span>
        </button>
      </div>

      {/* Share Modal - Using Portal to render at body level */}
      {showShareModal && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowShareModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          <div
            ref={shareModalRef}
            tabIndex={-1}
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Share Chat</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close share dialog"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isGeneratingLink ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600">Generating share link...</p>
              </div>
            ) : shareUrl ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Anyone with this link can view this chat (read-only):
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700"
                  />
                  <button
                    onClick={copyShareUrl}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>
                <div className="flex gap-2">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium text-center transition-colors"
                  >
                    Open Link
                  </a>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}

      {/* Download Modal - Using Portal to render at body level */}
      {showDownloadModal && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowDownloadModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          <div
            ref={downloadModalRef}
            tabIndex={-1}
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Download Chat</h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close download dialog"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Choose your preferred download format:
            </p>

            <div className="space-y-3">
              <button
                onClick={exportChat}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors flex items-center gap-3 border border-blue-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left flex-1">
                  <div className="font-medium">JSON Format</div>
                  <div className="text-xs text-gray-600">Machine-readable format with full metadata</div>
                </div>
              </button>

              <button
                onClick={exportAsMarkdown}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors flex items-center gap-3 border border-blue-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left flex-1">
                  <div className="font-medium">Markdown Format</div>
                  <div className="text-xs text-gray-600">Human-readable format for easy sharing</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowDownloadModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
