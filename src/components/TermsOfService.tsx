'use client';

import { useEffect } from 'react';

interface TermsOfServiceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsOfService({ isOpen, onClose }: TermsOfServiceProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold text-gray-900">
              Terms of Service & Privacy Policy
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Introduction */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Introduction</h3>
            <p className="text-gray-700">
              Welcome to GeminiGPT. This is a portfolio project demonstrating modern web development
              practices. By using this application, you agree to these terms.
            </p>
          </section>

          {/* API Key Privacy - Most Important Section */}
          <section className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
            <h3 className="text-xl font-semibold text-blue-900 mb-3 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              API Key Privacy & Security
            </h3>

            <div className="space-y-3 text-gray-700">
              <p className="font-semibold text-blue-900">
                We DO NOT store, save, transmit, or have access to your API keys.
              </p>

              <div className="bg-white p-3 rounded border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-2">How Your API Key Works:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-0.5">✓</span>
                    <span><strong>Stored Locally:</strong> Your API key is saved only in your browser's localStorage</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-0.5">✓</span>
                    <span><strong>Direct Communication:</strong> Your browser sends API requests directly to Google's servers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-0.5">✓</span>
                    <span><strong>Never Transmitted to Us:</strong> We never receive, log, or store your API key on our servers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-0.5">✓</span>
                    <span><strong>Full Control:</strong> You can view, update, or delete your key at any time from Settings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-0.5">✓</span>
                    <span><strong>Open Source:</strong> You can inspect the code to verify this claim</span>
                  </li>
                </ul>
              </div>

              <p className="text-sm italic">
                <strong>Technical Details:</strong> When you send a message, your browser includes your API key
                in the WebSocket payload. Our server extracts it and creates a temporary Google Generative AI
                client instance for that single request only. The key is never logged, cached, or persisted.
              </p>
            </div>
          </section>

          {/* Use of Service */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Use of Service</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>This is a demonstration/portfolio project provided "as-is"</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You must provide your own Google Gemini API key to use AI features</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You are responsible for all costs associated with your API key usage</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You must comply with Google's Gemini API Terms of Service</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Do not use this service for illegal, harmful, or abusive purposes</span>
              </li>
            </ul>
          </section>

          {/* Data Collection */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Data Collection & Storage</h3>

            <div className="space-y-3 text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">What We Store:</h4>
                <ul className="space-y-1 ml-4">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Chat Messages:</strong> Your conversations are stored in our database to enable cross-chat search and history</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>User ID:</strong> A random identifier generated in your browser to isolate your data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Message Embeddings:</strong> Vector representations of your messages for semantic search</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">What We DO NOT Store:</h4>
                <ul className="space-y-1 ml-4">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span><strong>API Keys:</strong> Never stored, logged, or transmitted to our servers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span><strong>Personal Information:</strong> No email, name, or account data collected</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span><strong>Payment Information:</strong> No billing or payment data</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">✗</span>
                    <span><strong>Analytics/Tracking:</strong> No third-party analytics or tracking scripts</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Data Deletion:</strong> Use the "Reset Everything" button to delete all your chats and data</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Export:</strong> Export your chats as JSON or Markdown at any time</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Discontinue Use:</strong> Stop using the service at any time</span>
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Third-Party Services</h3>
            <p className="text-gray-700 mb-2">This application uses:</p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Google Gemini AI:</strong> Subject to <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google's Terms</a></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Google Custom Search:</strong> Optional web search functionality</span>
              </li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              You are responsible for complying with all third-party terms of service.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Disclaimers</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-gray-700">
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span><strong>No Warranty:</strong> This service is provided "as-is" without any warranties</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span><strong>Portfolio Project:</strong> This is a demonstration project, not a commercial service</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span><strong>No Liability:</strong> We are not liable for any damages or losses from using this service</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span><strong>Service Availability:</strong> Service may be interrupted or discontinued at any time</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Contact & Questions</h3>
            <p className="text-gray-700">
              This is an open-source portfolio project. For questions, issues, or to review the code:
            </p>
            <ul className="space-y-2 text-gray-700 mt-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>GitHub:</strong> <a href="https://github.com/yourusername/geminigpt" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Source Code</a></span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Portfolio:</strong> <a href="https://n8sportfolio.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Nathan Watkins</a></span>
              </li>
            </ul>
          </section>

          {/* Acceptance */}
          <section className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600 italic">
              By using GeminiGPT, you acknowledge that you have read, understood, and agree to these terms.
              If you do not agree, please do not use this service.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
