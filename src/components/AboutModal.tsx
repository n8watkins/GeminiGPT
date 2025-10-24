import React, { useEffect } from 'react'
import Image from 'next/image'
import { XMarkIcon, ChatBubbleLeftRightIcon, MagnifyingGlassIcon, DocumentTextIcon, KeyIcon, CodeBracketIcon, BoltIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
    onSetupApiKey: () => void
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onSetupApiKey }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[50000] flex items-center justify-center p-4"
        >
            <div
                className="bg-white rounded-2xl max-w-5xl w-full p-6 border border-blue-200 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors z-10"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-5">
                    <h2 className="text-gray-900 text-3xl font-bold mb-2">Welcome to GeminiGPT</h2>
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <Image
                            src="/images/portrait-medium.jpg"
                            alt="Nathan's Portrait"
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-md"
                        />
                        <div className="text-left">
                            <p className="text-gray-900 text-sm font-bold">Built by Nathan</p>
                            <p className="text-gray-600 text-xs">Full-Stack AI Platform</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                        <a
                            href="https://github.com/n8watkins/gemini-chat-app"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View on GitHub"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-full shadow-sm hover:shadow-md transition-all duration-200 hover:bg-gray-800"
                        >
                            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            View on GitHub
                        </a>
                        <a
                            href="https://www.linkedin.com/in/n8watkins/"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                            className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                        >
                            <svg className="w-4 h-4 fill-gray-800" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                        </a>
                        <a
                            href="https://n8sportfolio.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            Portfolio
                        </a>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* KEY FEATURES - Expanded & Prominent */}
                    <div>
                        <h3 className="text-gray-900 text-lg font-bold mb-3 text-center">🌟 Key Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* BYOK Feature - Most Important */}
                            <div className="flex items-start space-x-3 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <KeyIcon className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Bring Your Own API Key (BYOK)</p>
                                    <p className="text-xs text-gray-600">Use your own Google Gemini API key - 100% free ($300 credits), private, no signup required</p>
                                </div>
                            </div>

                            {/* GitHub/Open Source */}
                            <div className="flex items-start space-x-3 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                                <CodeBracketIcon className="w-6 h-6 text-gray-700 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Open Source on GitHub</p>
                                    <p className="text-xs text-gray-600">Full source code available - fork, customize, and learn from production-ready architecture</p>
                                </div>
                            </div>

                            {/* Multi-Chat */}
                            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Multi-Chat Management</p>
                                    <p className="text-xs text-gray-600">Create unlimited conversations with persistent SQLite storage and real-time sync</p>
                                </div>
                            </div>

                            {/* Semantic Search */}
                            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <MagnifyingGlassIcon className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Cross-Chat Semantic Search</p>
                                    <p className="text-xs text-gray-600">LanceDB vector embeddings for intelligent search across all conversations</p>
                                </div>
                            </div>

                            {/* Document Analysis */}
                            <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <DocumentTextIcon className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Document Upload & Analysis</p>
                                    <p className="text-xs text-gray-600">PDF, DOCX, images - AI-powered analysis with streaming responses</p>
                                </div>
                            </div>

                            {/* Real-time Streaming */}
                            <div className="flex items-start space-x-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <BoltIcon className="w-6 h-6 text-indigo-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Real-Time Streaming</p>
                                    <p className="text-xs text-gray-600">WebSocket-powered bi-directional streaming with instant message delivery</p>
                                </div>
                            </div>

                            {/* Function Calling */}
                            <div className="flex items-start space-x-3 p-3 bg-rose-50 rounded-lg border border-rose-200">
                                <GlobeAltIcon className="w-6 h-6 text-rose-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">AI Function Calling</p>
                                    <p className="text-xs text-gray-600">Web search, stock prices, weather data, and time queries powered by Gemini</p>
                                </div>
                            </div>

                            {/* Open Source */}
                            <div className="flex items-start space-x-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
                                <svg className="w-6 h-6 text-teal-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Enterprise Security</p>
                                    <p className="text-xs text-gray-600">CSRF protection, rate limiting, Helmet.js headers, input validation</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ADVANCED FEATURES - More Space */}
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="text-gray-900 text-base font-bold mb-3 text-center">⚡ Production Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Performance */}
                            <div>
                                <p className="text-xs font-bold text-blue-600 mb-2">Performance</p>
                                <ul className="text-xs space-y-1.5 text-gray-700">
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-blue-600 font-bold mt-0.5">✓</span>
                                        <span>LanceDB vector caching (LRU)</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-blue-600 font-bold mt-0.5">✓</span>
                                        <span>SQLite prepared statements</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-blue-600 font-bold mt-0.5">✓</span>
                                        <span>Streaming AI responses</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Security */}
                            <div>
                                <p className="text-xs font-bold text-purple-600 mb-2">Security</p>
                                <ul className="text-xs space-y-1.5 text-gray-700">
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-purple-600 font-bold mt-0.5">✓</span>
                                        <span>CSRF token validation</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-purple-600 font-bold mt-0.5">✓</span>
                                        <span>Rate limiting (60/min, 500/hr)</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-purple-600 font-bold mt-0.5">✓</span>
                                        <span>API key validation & encryption</span>
                                    </li>
                                </ul>
                            </div>

                            {/* DevOps */}
                            <div>
                                <p className="text-xs font-bold text-green-600 mb-2">DevOps</p>
                                <ul className="text-xs space-y-1.5 text-gray-700">
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                                        <span>Graceful shutdown (SIGTERM)</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                                        <span>Health monitoring endpoints</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                                        <span>Comprehensive error handling</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Tech Stack - Condensed */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl">
                        <h3 className="text-gray-900 text-sm font-bold mb-2 text-center">🛠️ Tech Stack</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 shadow-sm">TypeScript</span>
                            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 shadow-sm">Next.js 15</span>
                            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 shadow-sm">React 19</span>
                            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 shadow-sm">Tailwind CSS</span>
                            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 shadow-sm">Socket.IO</span>
                            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 shadow-sm">SQLite</span>
                            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 shadow-sm">LanceDB</span>
                            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-gray-700 shadow-sm">Gemini AI</span>
                        </div>
                    </div>
                </div>

                {/* Footer - Two Action Buttons */}
                <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={onSetupApiKey}
                        className="flex-1 sm:flex-initial px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                        Setup My Own API Key
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 sm:flex-initial px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200"
                    >
                        Continue Without API Key
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
