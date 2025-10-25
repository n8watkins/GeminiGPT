'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import UserId from '@/components/UserId';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import AboutModal from '@/components/AboutModal';
import ApiKeySetup from '@/components/ApiKeySetup';
import TermsOfService from '@/components/TermsOfService';
import UsageStats from '@/components/UsageStats';
import RateLimitModal from '@/components/RateLimitModal';
import SettingsModal from '@/components/SettingsModal';
import { MigrationBanner } from '@/components/MigrationBanner';
import { SignInModal } from '@/components/SignInModal';
import { useApiKey } from '@/hooks/useApiKey';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useMigration } from '@/hooks/useMigration';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [usageStatsOpen, setUsageStatsOpen] = useState(false);
  const [rateLimitModalOpen, setRateLimitModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { hasApiKey, isLoading } = useApiKey();
  const { rateLimitInfo, socket, isConnected } = useWebSocket();

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

  useEffect(() => {
    // Only run once on mount
    if (isLoading || hasInitialized) return;

    // Check when the About modal was last shown
    const lastShownTimestamp = localStorage.getItem('geminigpt-about-last-shown');
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Show About modal if:
    // 1. Never shown before (null)
    // 2. Last shown more than 24 hours ago
    const shouldShowAbout = !lastShownTimestamp || (now - parseInt(lastShownTimestamp)) > twentyFourHours;

    if (shouldShowAbout) {
      // Show About modal and update timestamp
      setAboutModalOpen(true);
      localStorage.setItem('geminigpt-about-last-shown', now.toString());
    }
    // Note: Don't auto-show API key modal here
    // It will only show when About modal closes (if user has no key)
    // Or when user explicitly opens it from sidebar

    setHasInitialized(true);
  }, [isLoading, hasInitialized, hasApiKey]);

  // For testing - remove this after verifying modal works
  // Uncomment the line below to force modal to show
  // setAboutModalOpen(true);

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
        onOpenSignIn={() => setSignInModalOpen(true)}
      />

      <div className="flex-1 flex flex-col lg:ml-80">
        {/* Mobile header */}
        <div className="lg:hidden bg-blue-600 dark:bg-gray-800 border-b border-blue-700 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <UserId />
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
