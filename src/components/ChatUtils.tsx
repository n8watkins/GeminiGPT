'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from '@/contexts/ChatContext';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { chatLogger } from '@/lib/logger';
import { useNotification } from '@/contexts/NotificationContext';
import { buildSharePayload, buildShareUrl, encodeShareData, ShareTooLargeError } from '@/lib/shareLink';

interface ChatUtilsProps {
  chatId: string;
}

export default function ChatUtils({ chatId }: ChatUtilsProps) {
  const { state } = useChat();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { showError } = useNotification();

  // Focus trap for modals
  const shareModalRef = useFocusTrap(showShareModal);
  const downloadModalRef = useFocusTrap(showDownloadModal);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chat = state.chats.find(c => c.id === chatId);
  if (!chat) return null;

  /**
   * Trigger a browser download for generated content.
   * The object URL is revoked on a delay: revoking synchronously after
   * click() can race the (asynchronous) download request in some browsers
   * and fail it with a generic "download error".
   */
  const downloadBlob = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const exportFilename = (extension: string) =>
    `${(chat.title || 'chat').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.${extension}`;

  const exportChat = () => {
    try {
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

      downloadBlob(JSON.stringify(chatData, null, 2), 'application/json', exportFilename('json'));
      setShowDownloadModal(false);
    } catch (error) {
      chatLogger.error('Error exporting chat as JSON', error);
      showError('Failed to export chat. Please try again.');
    }
  };

  const exportAsMarkdown = () => {
    try {
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

      downloadBlob(markdown, 'text/markdown', exportFilename('md'));
      setShowDownloadModal(false);
    } catch (error) {
      chatLogger.error('Error exporting chat as Markdown', error);
      showError('Failed to export chat. Please try again.');
    }
  };

  /**
   * Build a self-contained share link entirely client-side: the chat is
   * gzipped (native CompressionStream) and embedded in the URL fragment, so
   * nothing is stored on the (ephemeral) server and links survive restarts.
   */
  const shareChat = async () => {
    setIsGeneratingLink(true);
    setShareUrl(null);
    setShareError(null);
    setShowShareModal(true);

    try {
      const fragment = await encodeShareData(buildSharePayload(chat));
      setShareUrl(buildShareUrl(window.location.origin, fragment));
    } catch (error) {
      if (error instanceof ShareTooLargeError) {
        // Keep the modal open and explain - this is a user-fixable condition
        setShareError(error.message);
      } else {
        chatLogger.error('Error creating share link', error);
        showError('Failed to create share link. Please try again.');
        setShowShareModal(false);
      }
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
          className="px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-800/40 text-green-700 dark:text-green-300 rounded-full transition-colors flex items-center gap-1.5 border border-green-200 dark:border-green-700 font-medium"
          title="Share this chat"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </button>

        <button
          onClick={() => setShowDownloadModal(true)}
          className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-full transition-colors flex items-center gap-1.5 border border-blue-200 dark:border-blue-700 font-medium"
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
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Share Chat</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
                <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 dark:text-gray-300">Generating share link...</p>
              </div>
            ) : shareUrl ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Anyone with this link can view this chat (read-only):
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  />
                  <button
                    onClick={copyShareUrl}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied
                        ? 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600'
                        : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
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
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium text-center transition-colors"
                  >
                    Open Link
                  </a>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : shareError ? (
              <div>
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{shareError}</p>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
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
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Download Chat</h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Close download dialog"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Choose your preferred download format:
            </p>

            <div className="space-y-3">
              <button
                onClick={exportChat}
                className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-lg transition-colors flex items-center gap-3 border border-blue-200 dark:border-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left flex-1">
                  <div className="font-medium">JSON Format</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Machine-readable format with full metadata</div>
                </div>
              </button>

              <button
                onClick={exportAsMarkdown}
                className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-lg transition-colors flex items-center gap-3 border border-blue-200 dark:border-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left flex-1">
                  <div className="font-medium">Markdown Format</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Human-readable format for easy sharing</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowDownloadModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
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
