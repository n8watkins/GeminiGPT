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
                className="bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full p-6 border border-blue-200 dark:border-gray-700 shadow-2xl shadow-blue-500/20 dark:shadow-blue-500/40 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors z-10"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-5">
                    <h2 className="text-gray-900 dark:text-white text-3xl font-bold mb-4">Welcome to GeminiGPT</h2>
                </div>

                {/* Introduction with Avatar */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800 mb-5">
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <Image
                            src="/images/portrait-medium.jpg"
                            alt="Nathan's Portrait"
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-md"
                        />
                        <div className="text-center">
                            <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                                I&apos;m Nathan, and this is a Portfolio project designed to showcase modern web dev practices with a real-world application. It highlights my skills in full-stack development, API integration, and user experience design. I hope you enjoy it and if you&apos;d like to explore further:
                            </p>
                        </div>
                    </div>

                    {/* Links Section */}
                    <div className="space-y-3">
                        <ul className="space-y-2 text-gray-700 dark:text-gray-200 text-sm">
                            <li className="flex items-start space-x-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                                <span>Share feedback or report issues on <a href="https://github.com/n8watkins/gemini-chat-app/issues" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline hover:no-underline font-semibold">GitHub Issues</a></span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                                <span>Check out my <a href="https://n8sportfolio.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline hover:no-underline font-semibold">Portfolio page</a> for more projects</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                                <span>Feel free to connect with me on my socials if you&apos;d like to connect</span>
                            </li>
                        </ul>

                        {/* Social Links */}
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <a
                                href="https://github.com/n8watkins/gemini-chat-app"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="GitHub"
                                className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                            >
                                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                            </a>
                            <a
                                href="https://www.linkedin.com/in/n8watkins/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="LinkedIn"
                                className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                            >
                                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                            </a>
                            <a
                                href="https://x.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="X (Twitter)"
                                className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                            >
                                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
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
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* KEY FEATURES - Expanded & Prominent */}
                    <div>
                        <h3 className="text-gray-900 dark:text-white text-lg font-bold mb-3 text-center">🌟 Key Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* BYOK Feature - Most Important */}
                            <div className="flex items-start space-x-3 p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <KeyIcon className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Bring Your Own API Key (BYOK)</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">Use your own Google Gemini API key - 100% free ($300 credits), private, no signup required</p>
                                </div>
                            </div>

                            {/* GitHub/Open Source */}
                            <div className="flex items-start space-x-3 p-3 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <CodeBracketIcon className="w-6 h-6 text-gray-700 dark:text-gray-300 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Open Source on GitHub</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">Full source code available - fork, customize, and learn from production-ready architecture</p>
                                </div>
                            </div>

                            {/* Multi-Chat */}
                            <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Multi-Chat Management</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">Create unlimited conversations with persistent SQLite storage and real-time sync</p>
                                </div>
                            </div>

                            {/* Semantic Search */}
                            <div className="flex items-start space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                <MagnifyingGlassIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Cross-Chat Semantic Search</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">LanceDB vector embeddings for intelligent search across all conversations</p>
                                </div>
                            </div>

                            {/* Document Analysis */}
                            <div className="flex items-start space-x-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <DocumentTextIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Document Upload & Analysis</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">PDF, DOCX, images - AI-powered analysis with streaming responses</p>
                                </div>
                            </div>

                            {/* Real-time Streaming */}
                            <div className="flex items-start space-x-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                <BoltIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Real-Time Streaming</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">WebSocket-powered bi-directional streaming with instant message delivery</p>
                                </div>
                            </div>

                            {/* Function Calling */}
                            <div className="flex items-start space-x-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
                                <GlobeAltIcon className="w-6 h-6 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">AI Function Calling</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">Web search, stock prices, weather data, and time queries powered by Gemini</p>
                                </div>
                            </div>

                            {/* Open Source */}
                            <div className="flex items-start space-x-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                                <svg className="w-6 h-6 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Enterprise Security</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">CSRF protection, rate limiting, Helmet.js headers, input validation</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ADVANCED FEATURES - More Space */}
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <h3 className="text-gray-900 dark:text-white text-base font-bold mb-3 text-center">⚡ Production Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Performance */}
                            <div>
                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">Performance</p>
                                <ul className="text-xs space-y-1.5 text-gray-700 dark:text-gray-300">
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">✓</span>
                                        <span>LanceDB vector caching (LRU)</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">✓</span>
                                        <span>SQLite prepared statements</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">✓</span>
                                        <span>Streaming AI responses</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Security */}
                            <div>
                                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-2">Security</p>
                                <ul className="text-xs space-y-1.5 text-gray-700 dark:text-gray-300">
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">✓</span>
                                        <span>CSRF token validation</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">✓</span>
                                        <span>Rate limiting (60/min, 500/hr)</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">✓</span>
                                        <span>API key validation & encryption</span>
                                    </li>
                                </ul>
                            </div>

                            {/* DevOps */}
                            <div>
                                <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-2">DevOps</p>
                                <ul className="text-xs space-y-1.5 text-gray-700 dark:text-gray-300">
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
                                        <span>Graceful shutdown (SIGTERM)</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
                                        <span>Health monitoring endpoints</span>
                                    </li>
                                    <li className="flex items-start space-x-1.5">
                                        <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
                                        <span>Comprehensive error handling</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Tech Stack - Condensed */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-xl">
                        <h3 className="text-gray-900 dark:text-white text-sm font-bold mb-2 text-center">🛠️ Tech Stack</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 256 256" fill="none">
                                    <rect width="256" height="256" rx="60" fill="#3178C6"/>
                                    <path d="M56.611 128.85l-.081 10.483h33.32v94.68H113.42v-94.68h33.24v-10.483H56.611z" fill="#fff"/>
                                    <path d="M149.955 128.85v10.483h20.879v94.68h23.57v-94.68h20.878v-10.483h-65.327zm53.916 23.42c-1.003 0-1.817-.814-1.817-1.817s.814-1.817 1.817-1.817 1.817.814 1.817 1.817-.814 1.817-1.817 1.817z" fill="#fff"/>
                                </svg>
                                TypeScript
                            </span>
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 180 180" fill="none">
                                    <mask id="a" maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180" style={{maskType: 'alpha'}}>
                                        <circle cx="90" cy="90" r="90" fill="black"/>
                                    </mask>
                                    <g mask="url(#a)">
                                        <circle cx="90" cy="90" r="90" fill="black"/>
                                        <path d="M149.508 157.52L69.142 54H54v71.97h12.114V69.384l73.885 95.461a90.304 90.304 0 009.509-7.325z" fill="url(#b)"/>
                                        <path d="M115 54H127V126H115z" fill="url(#c)"/>
                                    </g>
                                    <defs>
                                        <linearGradient id="b" x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="white"/>
                                            <stop offset="1" stopColor="white" stopOpacity="0"/>
                                        </linearGradient>
                                        <linearGradient id="c" x1="121" y1="54" x2="120.799" y2="106.875" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="white"/>
                                            <stop offset="1" stopColor="white" stopOpacity="0"/>
                                        </linearGradient>
                                    </defs>
                                </svg>
                                Next.js 15
                            </span>
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 256 228" fill="none">
                                    <path d="M210.483 73.824a171.49 171.49 0 00-8.24-2.597c.465-1.9.893-3.777 1.273-5.621 6.238-30.281 2.16-54.676-11.769-62.708-13.355-7.7-35.196.329-57.254 19.526a171.23 171.23 0 00-6.375 5.848 155.866 155.866 0 00-4.241-3.917C100.759 3.829 77.587-4.822 63.673 3.233 50.33 10.957 46.379 33.89 51.995 62.588a170.974 170.974 0 001.892 8.48c-3.28.932-6.445 1.924-9.474 2.98C17.309 83.498 0 98.307 0 113.668c0 15.865 18.582 31.778 46.812 41.427a145.52 145.52 0 006.921 2.165 167.467 167.467 0 00-2.01 9.138c-5.354 28.2-1.173 50.591 12.134 58.266 13.744 7.926 36.812-.22 59.273-19.855a145.567 145.567 0 005.342-4.923 168.064 168.064 0 006.92 6.314c21.758 18.722 43.246 26.282 56.54 18.586 13.731-7.949 18.194-32.003 12.4-61.268a145.016 145.016 0 00-1.535-6.842c1.62-.48 3.21-.974 4.76-1.488 29.348-9.723 48.443-25.443 48.443-41.52 0-15.417-17.868-30.326-45.517-39.844zm-6.365 70.984c-1.4.463-2.836.91-4.3 1.345-3.24-10.257-7.612-21.163-12.963-32.432 5.106-11 9.31-21.767 12.459-31.957 2.619.758 5.16 1.557 7.61 2.4 23.69 8.156 38.14 20.213 38.14 29.504 0 9.896-15.606 22.743-40.946 31.14zm-10.514 20.834c2.562 12.94 2.927 24.64 1.23 33.787-1.524 8.219-4.59 13.698-8.382 15.893-8.067 4.67-25.32-1.4-43.927-17.412a156.726 156.726 0 01-6.437-5.87c7.214-7.889 14.423-17.06 21.459-27.246 12.376-1.098 24.068-2.894 34.671-5.345.522 2.107.986 4.173 1.386 6.193zM87.276 214.515c-7.882 2.783-14.16 2.863-17.955.675-8.075-4.657-11.432-22.636-6.853-46.752a156.923 156.923 0 011.869-8.499c10.486 2.32 22.093 3.988 34.498 4.994 7.084 9.967 14.501 19.128 21.976 27.15a134.668 134.668 0 01-4.877 4.492c-9.933 8.682-19.886 14.842-28.658 17.94zM50.35 144.747c-12.483-4.267-22.792-9.812-29.858-15.863-6.35-5.437-9.555-10.836-9.555-15.216 0-9.322 13.897-21.212 37.076-29.293 2.813-.98 5.757-1.905 8.812-2.773 3.204 10.42 7.406 21.315 12.477 32.332-5.137 11.18-9.399 22.249-12.634 32.792a134.718 134.718 0 01-6.318-1.979zm12.378-84.26c-4.811-24.587-1.616-43.134 6.425-47.789 8.564-4.958 27.502 2.111 47.463 19.835a144.318 144.318 0 014.88 5.02c-7.552 8.032-14.956 17.173-22.076 27.401-12.117 1.044-23.565 2.753-33.935 5.07a148.175 148.175 0 01-2.757-9.537zm91.567 114.686c3.528 8.129 6.621 16.11 9.202 23.736-8.986 2.169-18.36 3.887-27.95 5.111 4.985-7.414 9.917-15.216 14.748-23.847 2.285 4.495 4.537 8.854 6.725 13zm-45.904 50.606c-4.821-4.821-9.709-10.247-14.548-16.152 4.821.23 9.709.359 14.626.359 4.958 0 9.846-.132 14.666-.359-4.756 5.943-9.634 11.369-14.744 16.152zm-35.66-27.013c-4.821 7.414-9.709 14.5-14.547 21.237-8.986-1.181-17.517-2.857-25.417-4.958 2.619-7.661 5.712-15.642 9.202-23.736 2.188 4.276 4.459 8.635 6.762 13.01zm35.877-69.709c5.068 5.068 10.136 10.716 15.204 16.79-10.136-.45-20.271-.45-30.407 0 5.068-6.074 10.136-11.722 15.203-16.79zm-46.129 28.013c-9.033-16.045-16.564-31.59-22.076-45.904 5.512-14.314 13.043-29.859 22.076-45.904 13.043-1.181 26.586-1.848 40.129-1.848 13.543 0 27.086.667 40.129 1.848 9.033 16.045 16.564 31.59 22.076 45.904-5.512 14.314-13.043 29.859-22.076 45.904-13.043 1.181-26.586 1.848-40.129 1.848-13.543 0-27.086-.667-40.129-1.848z" fill="#61DAFB"/>
                                    <circle cx="128" cy="113.667" r="17.056" fill="#61DAFB"/>
                                </svg>
                                React 19
                            </span>
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 256 154" fill="none">
                                    <defs>
                                        <linearGradient x1="-2.778%" y1="32%" x2="100%" y2="67.556%" id="a">
                                            <stop stopColor="#2298BD" offset="0%"/>
                                            <stop stopColor="#0ED7B5" offset="100%"/>
                                        </linearGradient>
                                    </defs>
                                    <path d="M128 0C93.867 0 72.533 17.067 64 51.2 76.8 34.133 91.733 27.733 108.8 32c9.737 2.434 16.697 9.499 24.401 17.318C145.751 62.057 160.275 76.8 192 76.8c34.133 0 55.467-17.067 64-51.2-12.8 17.067-27.733 23.467-44.8 19.2-9.737-2.434-16.697-9.499-24.401-17.318C174.249 14.743 159.725 0 128 0zM64 76.8C29.867 76.8 8.533 93.867 0 128c12.8-17.067 27.733-23.467 44.8-19.2 9.737 2.434 16.697 9.499 24.401 17.318C81.751 138.857 96.275 153.6 128 153.6c34.133 0 55.467-17.067 64-51.2-12.8 17.067-27.733 23.467-44.8 19.2-9.737-2.434-16.697-9.499-24.401-17.318C110.249 91.543 95.725 76.8 64 76.8z" fill="url(#a)"/>
                                </svg>
                                Tailwind CSS
                            </span>
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 256 256" fill="none">
                                    <path d="M96.447 7.382c32.267-8.275 67.929-3.453 96.386 14.11 35.084 21.610 59.617 63.095 65.965 102.064 6.349 38.970-4.257 75.859-28.183 102.064-23.926 26.205-59.888 43.23-98.363 45.602-38.475 2.372-78.456-10.897-108.002-35.517C-5.296 210.033-15.618 169.815 9.633 133.926 34.885 98.037 85.146 66.652 129.604 48.23c44.458-18.421 82.133-28.455 114.4-20.18 32.267 8.276 59.137 34.267 75.382 66.652 16.245 32.385 21.866 70.175 15.517 108.002-6.349 37.827-24.571 75.382-54.839 95.063-30.268 19.681-72.582 21.488-115.04 10.897-42.458-10.591-85.146-33.267-118.865-63.536C11.74 215.655-11.383 178.548 5.135 141.8c16.518-36.749 59.888-73.497 109.064-96.386 49.176-22.889 103.267-31.165 143.248-23.889 39.981 7.276 65.965 26.957 82.21 54.839 16.245 27.882 22.889 63.536 15.517 99.19-7.372 35.654-28.183 70.175-54.839 90.602-26.656 20.427-58.924 27.882-91.192 23.889-32.268-3.993-64.536-19.681-95.063-43.23-30.527-23.549-59.137-54.838-75.382-91.192-16.245-36.354-20.427-77.789-10.897-118.865 9.53-41.076 32.267-81.455 54.839-109.064 22.572-27.61 44.458-42.458 54.839-47.832 10.381-5.374 8.275-2.372 2.372 5.374-5.903 7.746-15.518 19.681-23.889 35.517-8.371 15.836-15.517 35.517-18.421 54.839-2.904 19.322-1.808 37.827 5.374 54.839 7.182 17.012 20.427 32.267 35.517 43.23 15.09 10.963 32.267 17.012 49.176 18.421 16.909 1.409 33.267-2.372 47.832-10.897 14.565-8.525 27.882-20.427 38.475-35.517 10.593-15.09 18.421-33.267 23.889-54.839 5.468-21.572 8.371-46.135 8.371-73.497 0-27.362-2.903-56.724-8.371-86.086-5.468-29.362-13.296-58.724-23.889-86.086-10.593-27.362-23.889-52.925-38.475-75.382-14.586-22.457-31.165-41.076-49.176-55.362-18.011-14.286-37.827-24.571-54.839-29.362-17.012-4.791-31.165-4.791-38.475 5.374z" fill="#010101"/>
                                    <path d="M97.496 7.382C65.228-1.119 29.648 3.703 1.191 21.266-33.893 42.876-58.426 84.361-64.774 123.33c-6.349 38.970 4.257 75.859 28.183 102.064 23.926 26.205 59.888 43.23 98.363 45.602 38.475 2.372 78.456-10.897 108.002-35.517 29.546-24.62 39.868-64.838 14.616-100.727-25.252-35.889-75.513-67.274-119.971-85.696-44.458-18.421-82.133-28.455-114.4-20.18-32.267 8.276-59.137 34.267-75.382 66.652-16.245 32.385-21.866 70.175-15.517 108.002 6.349 37.827 24.571 75.382 54.839 95.063 30.268 19.681 72.582 21.488 115.04 10.897 42.458-10.591 85.146-33.267 118.865-63.536 33.719-30.269 56.842-67.376 40.324-104.124-16.518-36.749-59.888-73.497-109.064-96.386-49.176-22.889-103.267-31.165-143.248-23.889-39.981 7.276-65.965 26.957-82.21 54.839-16.245 27.882-22.889 63.536-15.517 99.19 7.372 35.654 28.183 70.175 54.839 90.602 26.656 20.427 58.924 27.882 91.192 23.889 32.268-3.993 64.536-19.681 95.063-43.23 30.527-23.549 59.137-54.838 75.382-91.192 16.245-36.354 20.427-77.789 10.897-118.865-9.53-41.076-32.267-81.455-54.839-109.064-22.572-27.61-44.458-42.458-54.839-47.832-10.381-5.374-8.275-2.372-2.372 5.374 5.903 7.746 15.518 19.681 23.889 35.517 8.371 15.836 15.517 35.517 18.421 54.839 2.904 19.322 1.808 37.827-5.374 54.839-7.182 17.012-20.427 32.267-35.517 43.23-15.09 10.963-32.267 17.012-49.176 18.421-16.909 1.409-33.267-2.372-47.832-10.897-14.565-8.525-27.882-20.427-38.475-35.517-10.593-15.09-18.421-33.267-23.889-54.839-5.468-21.572-8.371-46.135-8.371-73.497 0-27.362 2.903-56.724 8.371-86.086 5.468-29.362 13.296-58.724 23.889-86.086 10.593-27.362 23.889-52.925 38.475-75.382 14.586-22.457 31.165-41.076 49.176-55.362 18.011-14.286 37.827-24.571 54.839-29.362 17.012-4.791 31.165-4.791 38.475 5.374z" fill="#010101"/>
                                </svg>
                                Socket.IO
                            </span>
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 256 296" fill="none">
                                    <path d="M235.319 191.271c-11.558-6.699-26.006-2.728-32.279 8.83l-40.222 73.164a15.96 15.96 0 01-13.792 7.933H106.974a15.963 15.963 0 01-13.792-7.933l-40.222-73.164c-6.273-11.558-20.721-15.529-32.279-8.83-11.558 6.274-15.53 20.722-8.83 32.28l40.221 73.163c12.546 22.824 36.637 37.013 62.902 37.013h42.052c26.265 0 50.356-14.189 62.902-37.013l40.222-73.163c6.698-11.558 2.727-26.006-8.831-32.28z" fill="#003B57"/>
                                    <path d="M20.681 104.729c11.558 6.699 26.006 2.728 32.279-8.83l40.222-73.164a15.96 15.96 0 0113.792-7.933h42.052a15.963 15.963 0 0113.792 7.933l40.222 73.164c6.273 11.558 20.721 15.529 32.279 8.83 11.558-6.274 15.53-20.722 8.83-32.28L204.928 0 256 0 256 296 0 296 0 0 51.072 0 11.851 72.449c-6.698 11.558-2.727 26.006 8.83 32.28z" fill="#003B57"/>
                                </svg>
                                SQLite
                            </span>
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 17L12 22L22 17" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2 12L12 17L22 12" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                LanceDB
                            </span>
                            <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="8" r="3" fill="#4285F4"/>
                                    <circle cx="7" cy="15" r="2.5" fill="#DB4437"/>
                                    <circle cx="17" cy="15" r="2.5" fill="#F4B400"/>
                                    <circle cx="12" cy="19" r="2" fill="#0F9D58"/>
                                </svg>
                                Gemini AI
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer - Two Action Buttons */}
                <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={onSetupApiKey}
                        className="flex-1 sm:flex-initial px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                        Setup My Own API Key
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 sm:flex-initial px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                    >
                        Continue Without API Key
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
