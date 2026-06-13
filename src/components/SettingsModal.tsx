'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { useTheme } from '@/contexts/ThemeContext';
import ConfirmationModal from './ConfirmationModal';
import { Settings, Palette, Bell, Lock, Sun, Moon, Monitor, RefreshCw, type LucideIcon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetEverything: () => void;
}

type SettingsSection = 'general' | 'appearance' | 'notifications' | 'privacy';

export default function SettingsModal({ isOpen, onClose, onResetEverything }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [showResetModal, setShowResetModal] = useState(false);

  const sections: Array<{ id: SettingsSection; label: string; icon: LucideIcon }> = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Data', icon: Lock },
  ];

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: LucideIcon }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
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
                <section.icon className="w-4 h-4 flex-shrink-0" />
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
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Theme</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        role="radio"
                        aria-checked={theme === option.value}
                        onClick={() => setTheme(option.value)}
                        className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                          theme === option.value
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <option.icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
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

                {/* Data Management Section */}
                <div className="pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Data Management</h4>

                  {/* Reset Everything Button */}
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <RefreshCw className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <p className="text-sm font-medium text-red-900 dark:text-red-300">Reset Everything</p>
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-400 mb-2">This will permanently delete:</p>
                        <ul className="text-xs text-red-700 dark:text-red-400 mb-3 ml-4 space-y-1">
                          <li>• All chat conversations and history</li>
                          <li>• Your API key</li>
                          <li>• Theme and appearance settings</li>
                          <li>• All other preferences and data</li>
                        </ul>
                        <p className="text-xs text-red-800 dark:text-red-300 font-semibold mb-3">⚠️ This action cannot be undone.</p>
                        <button
                          onClick={() => setShowResetModal(true)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Reset Everything
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={() => {
          onResetEverything();
          setShowResetModal(false);
          onClose();
        }}
        title="⚠️ Reset Everything?"
        message="This will permanently delete ALL of your data including:

• All chat conversations and history
• Your API key
• Theme and appearance settings
• All other preferences and data

This action CANNOT be undone. Are you absolutely sure?"
        confirmText="Yes, Delete Everything"
        cancelText="Cancel"
        isDestructive={true}
      />
    </Modal>
  );
}
