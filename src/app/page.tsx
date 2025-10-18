'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import UserId from '@/components/UserId';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import AboutModal from '@/components/AboutModal';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('geminigpt-has-visited');
    if (!hasVisited) {
      setAboutModalOpen(true);
      localStorage.setItem('geminigpt-has-visited', 'true');
    }
  }, []);

  // For testing - remove this after verifying modal works
  // Uncomment the line below to force modal to show
  // setAboutModalOpen(true);

  return (
    <div className="h-screen flex bg-blue-50">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onOpenAbout={() => setAboutModalOpen(true)}
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
    </div>
  );
}
