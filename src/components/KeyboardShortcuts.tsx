'use client';

import React, { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS: Array<{ label: string; keys: string }> = [
  { label: 'New Chat', keys: 'Alt+N' },
  { label: 'Search All Chats', keys: 'Alt+F' },
  { label: 'Search in Chat', keys: 'Alt+Shift+F' },
  { label: 'Toggle Shortcuts', keys: 'Alt+/' },
  { label: 'Reset Everything', keys: 'Alt+R' },
  { label: 'Close/Escape', keys: 'Esc' },
];

// How long the leave transition runs before the panel unmounts (ms).
// Keep in sync with the duration-200 class on the panel.
const LEAVE_DURATION = 200;

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  // Two-phase mount so the panel can animate in (mount hidden, then show)
  // and animate out (hide, then unmount after the transition finishes).
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Double rAF: let the panel paint in its hidden state first so the
      // transition to visible actually animates instead of snapping.
      let inner: number;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setIsVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        if (inner) cancelAnimationFrame(inner);
      };
    } else {
      setIsVisible(false);
      const timeout = setTimeout(() => setShouldRender(false), LEAVE_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+/ to toggle shortcuts
      if (e.altKey && e.key === '/' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Menu - positioned above the button, animates with fade + scale */}
      {shouldRender && (
        <div
          className={`absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-5 w-80 mb-2 origin-bottom-right transform transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
            isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
          </div>

          <div className="space-y-3">
            {SHORTCUTS.map((shortcut, index) => (
              <div
                key={shortcut.keys}
                className={`flex justify-between items-center py-2 ${
                  index < SHORTCUTS.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                }`}
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.label}</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Button - transforms from keyboard icon to X */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:shadow-xl"
        title={isOpen ? 'Close Shortcuts (Esc)' : 'Keyboard Shortcuts (Alt+/)'}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
      </button>
    </div>
  );
}
