'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import AboutModal from '@/components/AboutModal';
import ApiKeySetup from '@/components/ApiKeySetup';
import TermsOfService from '@/components/TermsOfService';
import UsageStats from '@/components/UsageStats';
import RateLimitModal from '@/components/RateLimitModal';
import SettingsModal from '@/components/SettingsModal';
import { MigrationBanner } from '@/components/MigrationBanner';
import { SignInModal } from '@/components/SignInModal';
import OnboardingWizard from '@/components/OnboardingWizard';
import { useApiKey } from '@/hooks/useApiKey';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useMigration } from '@/hooks/useMigration';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [usageStatsOpen, setUsageStatsOpen] = useState(false);
  const [rateLimitModalOpen, setRateLimitModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const { hasApiKey } = useApiKey();
  const { rateLimitInfo, socket, isConnected } = useWebSocket();
  // First-run two-step wizard (replaces the old stacked About + ApiKeySetup
  // modals). No API key is required to start chatting - pool key by default.
  const { showWizard, completeOnboarding } = useOnboarding();

  // Handle automatic migration when user signs in
  useMigration();

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

  // Check for rate limiting
  useEffect(() => {
    if (rateLimitInfo) {
      const isRateLimited = rateLimitInfo.remaining.minute === 0 || rateLimitInfo.remaining.hour === 0;
      if (isRateLimited && !hasApiKey) {
        setRateLimitModalOpen(true);
      }
    }
  }, [rateLimitInfo, hasApiKey]);

  return (
    <div className="h-screen flex bg-blue-50 dark:bg-gray-900">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        onOpenAbout={() => setAboutModalOpen(true)}
        onOpenApiKeySetup={() => setApiKeyModalOpen(true)}
        onOpenTerms={() => setTermsModalOpen(true)}
        onOpenUsageStats={() => setUsageStatsOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenSignIn={() => setSignInModalOpen(true)}
      />

      <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out delay-75 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-96'}`}>
        {/* Mobile header */}
        <div className="lg:hidden bg-blue-600 dark:bg-gray-800 border-b border-blue-700 dark:border-gray-700 p-4">
          <div className="flex items-center justify-end">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-blue-700 dark:hover:bg-gray-700 rounded-md text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Migration Banner - Shows for anonymous users with chats */}
        <div className="p-4 lg:p-6">
          <MigrationBanner />
        </div>

        <ChatInterface />

        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts />
      </div>

      {/* First-run onboarding wizard - renders over the live chat UI */}
      <OnboardingWizard isOpen={showWizard} onComplete={completeOnboarding} />

      {/* About Modal (reachable later from the sidebar) */}
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
        onKeySaved={() => {
          // After saving key, just close the modal
          setApiKeyModalOpen(false);
        }}
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

      {/* Rate Limit Modal */}
      <RateLimitModal
        isOpen={rateLimitModalOpen}
        onClose={() => setRateLimitModalOpen(false)}
        onSetupApiKey={() => {
          setRateLimitModalOpen(false);
          setApiKeyModalOpen(true);
        }}
        resetTime={rateLimitInfo?.resetAt.minute}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onResetEverything={handleResetEverything}
      />

      {/* Sign In Modal */}
      <SignInModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
      />
    </div>
  );
}
