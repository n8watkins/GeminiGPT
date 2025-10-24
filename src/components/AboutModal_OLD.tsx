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
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-5xl w-full p-6 border border-blue-200 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
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
                            href="https://github.com/n8watkins"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub"
                            className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                        >
                            <svg className="w-4 h-4 fill-gray-800" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
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
                            href="https://x.com/n8watkins"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="X"
                            className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                        >
                            <svg className="w-4 h-4 fill-gray-800" viewBox="0 0 24 24">
                                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                            </svg>
                        </a>
                        <a
                            href="https://n8sportfolio.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                        >
                            Portfolio
                        </a>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-5">
                    {/* KEY FEATURES - Expanded */}
                    <div>
                        <h3 className="text-gray-900 text-xl font-bold mb-4 text-center">🌟 Key Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Image
                                src="/images/portrait-medium.jpg"
                                alt="Nathan's Portrait"
                                width={60}
                                height={60}
                                className="w-15 h-15 rounded-full object-cover border-3 border-blue-500 shadow-lg flex-shrink-0"
                            />
                            <div>
                                <h3 className="text-gray-900 text-lg font-bold">Hi, I&apos;m Nathan 👋</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    This is a full-stack AI chat application showcasing real-time WebSocket communication,
                                    vector embeddings, semantic search, and production-ready architecture with comprehensive
                                    security measures.
                                </p>
                                <div className="flex gap-3 mt-3">
                                    <a
                                        href="https://github.com/n8watkins"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Nathan's GitHub"
                                        className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                                    >
                                        <svg className="w-5 h-5 fill-gray-800" viewBox="0 0 24 24">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                    </a>
                                    <a
                                        href="https://www.linkedin.com/in/n8watkins/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Nathan's LinkedIn"
                                        className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                                    >
                                        <svg className="w-5 h-5 fill-gray-800" viewBox="0 0 24 24">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                        </svg>
                                    </a>
                                    <a
                                        href="https://x.com/n8watkins"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Nathan's X"
                                        className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                                    >
                                        <svg className="w-5 h-5 fill-gray-800" viewBox="0 0 24 24">
                                            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                                        </svg>
                                    </a>
                                    <a
                                        href="https://n8sportfolio.vercel.app/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                                    >
                                        Portfolio
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Tech Stack */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl">
                            <h3 className="text-gray-900 text-base font-bold mb-3">Tech Stack</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
                                    <Image src="/icons/typescript.svg" alt="TypeScript" width={20} height={20} className="w-5 h-5" />
                                    <p className="text-xs font-semibold text-gray-900">TypeScript</p>
                                </div>
                                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
                                    <Image src="/icons/nextjs.svg" alt="Next.js" width={16} height={16} className="w-4 h-4" />
                                    <p className="text-xs font-semibold text-gray-900">Next.js 15</p>
                                </div>
                                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
                                    <Image src="/icons/tailwind.svg" alt="Tailwind" width={20} height={14} className="w-5 h-3.5" />
                                    <p className="text-xs font-semibold text-gray-900">Tailwind</p>
                                </div>
                                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
                                    <span className="text-lg">🤖</span>
                                    <p className="text-xs font-semibold text-gray-900">Gemini AI</p>
                                </div>
                                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
                                    <span className="text-lg">🔌</span>
                                    <p className="text-xs font-semibold text-gray-900">WebSocket</p>
                                </div>
                                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
                                    <span className="text-lg">🗄️</span>
                                    <p className="text-xs font-semibold text-gray-900">SQLite</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Features & Highlights */}
                    <div className="space-y-4">
                        {/* Key Features */}
                        <div>
                            <h3 className="text-gray-900 text-base font-bold mb-3">Key Features</h3>
                            <div className="space-y-2">
                                <div className="flex items-start space-x-3 p-2.5 bg-blue-50 rounded-lg">
                                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Multi-Chat Management</p>
                                        <p className="text-xs text-gray-600">Persistent conversations with SQLite</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-2.5 bg-purple-50 rounded-lg">
                                    <MagnifyingGlassIcon className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Semantic Search</p>
                                        <p className="text-xs text-gray-600">LanceDB vector embeddings for intelligent search</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-2.5 bg-green-50 rounded-lg">
                                    <DocumentTextIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Document Analysis</p>
                                        <p className="text-xs text-gray-600">PDF, DOCX, and image processing with AI</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Development Highlights */}
                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl">
                            <h3 className="text-gray-900 text-base font-bold mb-3">Advanced Features</h3>
                            <div className="space-y-3">
                                {/* Real-Time & Performance */}
                                <div>
                                    <p className="text-xs font-semibold text-blue-600 mb-1">Real-Time & Performance</p>
                                    <ul className="text-xs space-y-1 text-gray-700">
                                        <li className="flex items-start space-x-2">
                                            <span className="text-blue-600 font-bold">✓</span>
                                            <span>WebSocket with Socket.IO for bi-directional streaming</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-blue-600 font-bold">✓</span>
                                            <span>LanceDB vector embeddings with LRU caching</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-blue-600 font-bold">✓</span>
                                            <span>Optimized SQLite with prepared statements & indexing</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Security */}
                                <div>
                                    <p className="text-xs font-semibold text-purple-600 mb-1">Enterprise Security</p>
                                    <ul className="text-xs space-y-1 text-gray-700">
                                        <li className="flex items-start space-x-2">
                                            <span className="text-purple-600 font-bold">✓</span>
                                            <span>CSRF protection with secure token-based validation</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-purple-600 font-bold">✓</span>
                                            <span>Rate limiting (60/min, 500/hr) with token bucket algorithm</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-purple-600 font-bold">✓</span>
                                            <span>Helmet.js security headers (CSP, HSTS, XSS protection)</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-purple-600 font-bold">✓</span>
                                            <span>API key validation & file upload security</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Production */}
                                <div>
                                    <p className="text-xs font-semibold text-green-600 mb-1">Production-Ready</p>
                                    <ul className="text-xs space-y-1 text-gray-700">
                                        <li className="flex items-start space-x-2">
                                            <span className="text-green-600 font-bold">✓</span>
                                            <span>Graceful shutdown with resource cleanup (SIGTERM/SIGINT)</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-green-600 font-bold">✓</span>
                                            <span>Health monitoring endpoint with DB & memory checks</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-green-600 font-bold">✓</span>
                                            <span>Comprehensive error handling & automatic recovery</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
