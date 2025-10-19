'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import UserId from '@/components/UserId';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import AboutModal from '@/components/AboutModal';
import ApiKeySetup from '@/components/ApiKeySetup';
import TermsOfService from '@/components/TermsOfService';
import { useApiKey } from '@/hooks/useApiKey';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const { hasApiKey, isLoading } = useApiKey();

  useEffect(() => {
    if (isLoading) return;

    // Check if user has API key
    if (!hasApiKey) {
      // Show API key setup on first visit or if no key
      setApiKeyModalOpen(true);
      return;
    }

    // Check if user has visited before (only show About if they have API key)
    const hasVisited = localStorage.getItem('geminigpt-has-visited');
    if (!hasVisited) {
      setAboutModalOpen(true);
      localStorage.setItem('geminigpt-has-visited', 'true');
    }
  }, [hasApiKey, isLoading]);

  // For testing - remove this after verifying modal works
  // Uncomment the line below to force modal to show
  // setAboutModalOpen(true);

  return (
    <div className="h-screen flex bg-blue-50">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onOpenAbout={() => setAboutModalOpen(true)}
        onOpenApiKeySetup={() => setApiKeyModalOpen(true)}
        onOpenTerms={() => setTermsModalOpen(true)}
      />

      <div className="flex-1 flex flex-col lg:ml-80">
        {/* Mobile header */}
        <div className="lg:hidden bg-blue-600 border-b border-blue-700 p-4">
          <div className="flex items-center justify-between">
            <UserId />
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <AboutModal isOpen={aboutModalOpen} onClose={() => setAboutModalOpen(false)} />

      {/* API Key Setup Modal */}
      <ApiKeySetup
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onKeySaved={() => {
          // After saving key, close modal and show about modal if first visit
          setApiKeyModalOpen(false);
          const hasVisited = localStorage.getItem('geminigpt-has-visited');
          if (!hasVisited) {
            setAboutModalOpen(true);
            localStorage.setItem('geminigpt-has-visited', 'true');
          }
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
    </div>
  );
}
