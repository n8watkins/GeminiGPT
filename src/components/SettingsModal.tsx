'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsSection = 'general' | 'appearance' | 'notifications' | 'privacy';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  const sections = [
    { id: 'general' as const, label: 'General', icon: '⚙️' },
    { id: 'appearance' as const, label: 'Appearance', icon: '🎨' },
    { id: 'notifications' as const, label: 'Notifications', icon: '🔔' },
    { id: 'privacy' as const, label: 'Privacy & Data', icon: '🔒' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="4xl">
      <div className="flex h-[600px] -m-8 overflow-hidden rounded-2xl">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                  activeSection === section.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                <span className="text-sm">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-gray-900">
          {/* General Section */}
          {activeSection === 'general' && (
            <div className="max-w-2xl">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">General</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Manage your general preferences</p>

              <div className="space-y-6">
                <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-save conversations</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Automatically save your chats</p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full relative cursor-pointer transition-colors checked:bg-blue-600 appearance-none
                      after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform checked:after:translate-x-4"
                      defaultChecked
                    />
                  </label>
                </div>

                <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Show suggestions</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Display suggested prompts in empty chats</p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full relative cursor-pointer transition-colors checked:bg-blue-600 appearance-none
                      after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform checked:after:translate-x-4"
                      defaultChecked
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="max-w-2xl">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Appearance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Customize how your app looks</p>

              <div className="space-y-6">
                <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                  <label className="block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Theme</p>
                    <select
                      value={theme}
                      onChange={(e) => {
                        const newValue = e.target.value as 'light' | 'dark' | 'system';
                        console.log('[SettingsModal] Dropdown changed to:', newValue);
                        setTheme(newValue);
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="light">☀️ Light</option>
                      <option value="dark">🌙 Dark</option>
                      <option value="system">💻 System</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="max-w-2xl">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Manage how you receive notifications</p>

              <div className="space-y-6">
                <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Sound effects</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Play sounds when messages arrive</p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full relative cursor-pointer transition-colors checked:bg-blue-600 appearance-none
                      after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform checked:after:translate-x-4"
                      defaultChecked
                    />
                  </label>
                </div>

                <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Desktop notifications</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Show desktop notifications for new messages</p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full relative cursor-pointer transition-colors checked:bg-blue-600 appearance-none
                      after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform checked:after:translate-x-4"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === 'privacy' && (
            <div className="max-w-2xl">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Privacy & Data</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Control your data and privacy settings</p>

              <div className="space-y-6">
                <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Save chat history</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Store conversations locally on your device</p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full relative cursor-pointer transition-colors checked:bg-blue-600 appearance-none
                      after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform checked:after:translate-x-4"
                      defaultChecked
                    />
                  </label>
                </div>

                <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Analytics</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Help improve the app with usage data</p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full relative cursor-pointer transition-colors checked:bg-blue-600 appearance-none
                      after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform checked:after:translate-x-4"
                      defaultChecked
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
