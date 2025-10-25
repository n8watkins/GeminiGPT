'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '@/contexts/ChatContext';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import AboutModal from '@/components/AboutModal';
import ApiKeySetup from '@/components/ApiKeySetup';
import TermsOfService from '@/components/TermsOfService';
import UsageStats from '@/components/UsageStats';
import SettingsModal from '@/components/SettingsModal';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { state, selectChat } = useChat();
  const { rateLimitInfo, socket, isConnected } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [usageStatsOpen, setUsageStatsOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const chatId = params.chatId as string;

  // Reset everything function
  const handleResetEverything = () => {
    const userId = localStorage.getItem('gemini-chat-user-id');

    // Clear vector database first
    if (socket && isConnected && userId) {
      socket.emit('reset-vector-db', { userId });
    }

    // Clear all local data
    localStorage.clear();
    window.location.reload();
  };

  useEffect(() => {
    // Check if the chat exists
    const chatExists = state.chats.some(chat => chat.id === chatId);

    if (chatExists) {
      // Only select if it's not already the active chat (prevents double-selection flicker)
      if (state.activeChatId !== chatId) {
        selectChat(chatId);
      }
    } else if (state.chats.length > 0) {
      // Chat doesn't exist, replace URL with home (not push, so back button doesn't go to invalid chat)
      router.replace('/');
    }
    // Remove selectChat from deps to prevent infinite loops - it's stable from context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, state.chats.length, state.activeChatId, router]);

  return (
    <div className="h-screen flex bg-blue-50 dark:bg-gray-900">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onOpenAbout={() => setAboutModalOpen(true)}
        onOpenApiKeySetup={() => setApiKeyModalOpen(true)}
        onOpenTerms={() => setTermsModalOpen(true)}
        onOpenUsageStats={() => setUsageStatsOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      <div className="flex-1 flex flex-col lg:ml-80">
        {/* Mobile header */}
        <div className="lg:hidden bg-blue-600 border-b border-blue-700 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-white font-semibold">GeminiGPT</h1>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-blue-700 rounded-md"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <ChatInterface />

        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts />
      </div>

      {/* About Modal */}
      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        onSetupApiKey={() => {
          setAboutModalOpen(false);
          setApiKeyModalOpen(true);
        }}
      />

      {/* API Key Setup Modal */}
      <ApiKeySetup
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onKeySaved={() => setApiKeyModalOpen(false)}
        onOpenTerms={() => {
          setApiKeyModalOpen(false);
          setTermsModalOpen(true);
        }}
      />

      {/* Terms of Service Modal */}
      <TermsOfService
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
      />

      {/* Usage Stats Modal */}
      <UsageStats
        isOpen={usageStatsOpen}
        onClose={() => setUsageStatsOpen(false)}
        rateLimitInfo={rateLimitInfo}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onResetEverything={handleResetEverything}
      />
    </div>
  );
}
