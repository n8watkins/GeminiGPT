import React, { useEffect } from 'react'
import Image from 'next/image'
import { XMarkIcon, ChatBubbleLeftRightIcon, MagnifyingGlassIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
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
                className="bg-white rounded-2xl max-w-4xl w-full p-8 border border-blue-200 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-gray-900 text-3xl font-bold mb-2">Welcome to GeminiGPT</h2>
                    <p className="text-blue-600 text-base font-medium">
                        Your Advanced AI Chat Assistant Platform
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-8 text-gray-700">
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <Image
                                src="/images/portrait-medium.jpg"
                                alt="Nathan's Portrait"
                                width={80}
                                height={80}
                                className="w-20 h-20 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                            />
                            <div>
                                <h3 className="text-gray-900 text-2xl font-bold">Hi all, 👋</h3>
                                <p className="text-blue-600 font-medium">I&apos;m Nathan</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-base leading-relaxed">
                                <strong>GeminiGPT</strong> is a portfolio project designed to
                                showcase advanced AI integration with modern web technologies. It
                                demonstrates my expertise in building production-ready chat applications,
                                implementing real-time features, and creating intuitive user experiences.
                            </p>

                            <p className="text-base leading-relaxed">
                                I hope you enjoy exploring GeminiGPT! If you&apos;d like to learn more:
                            </p>

                            <ul className="text-base space-y-3 ml-4">
                                <li className="flex items-start">
                                    <span className="text-blue-600 mr-3 mt-1">✦</span>
                                    <span>
                                        Check out my{' '}
                                        <a
                                            href="https://n8sportfolio.vercel.app/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
                                        >
                                            Portfolio page
                                        </a>{' '}
                                        for more projects
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-blue-600 mr-3 mt-1">✦</span>
                                    <span>
                                        Connect with me on social media if you&apos;d like to chat about technology
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex items-center justify-center gap-6 mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                            <a
                                href="https://github.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's GitHub"
                                className="w-12 h-12 rounded-full bg-white hover:bg-gray-100 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-110"
                            >
                                <Image
                                    src="/icons/github.svg"
                                    alt="GitHub"
                                    width={28}
                                    height={28}
                                    className="w-7 h-7"
                                />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/n8watkins/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's LinkedIn"
                                className="w-12 h-12 rounded-full bg-white hover:bg-gray-100 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-110"
                            >
                                <Image
                                    src="/icons/linkedin.svg"
                                    alt="LinkedIn"
                                    width={28}
                                    height={28}
                                    className="w-7 h-7"
                                />
                            </a>
                            <a
                                href="https://x.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's X (Twitter)"
                                className="w-12 h-12 rounded-full bg-white hover:bg-gray-100 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-110"
                            >
                                <svg className="w-7 h-7 fill-gray-800" viewBox="0 0 24 24">
                                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
                        <h3 className="text-gray-900 text-xl font-bold mb-4">Tech Stack</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <Image
                                        src="/icons/typescript.svg"
                                        alt="TypeScript"
                                        width={24}
                                        height={24}
                                        className="w-6 h-6"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">TypeScript</p>
                                    <p className="text-xs text-gray-600">Type-safe development</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                                    <Image
                                        src="/icons/nextjs.svg"
                                        alt="Next.js"
                                        width={20}
                                        height={20}
                                        className="w-5 h-5"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Next.js</p>
                                    <p className="text-xs text-gray-600">React framework</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                                    <Image
                                        src="/icons/tailwind.svg"
                                        alt="Tailwind CSS"
                                        width={24}
                                        height={16}
                                        className="w-6 h-4"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Tailwind CSS</p>
                                    <p className="text-xs text-gray-600">Utility-first styling</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">🤖</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Gemini AI</p>
                                    <p className="text-xs text-gray-600">Google&apos;s AI model</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">🔌</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">WebSocket</p>
                                    <p className="text-xs text-gray-600">Real-time messaging</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 bg-white p-3 rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">🗄️</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">SQLite</p>
                                    <p className="text-xs text-gray-600">Embedded database</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-gray-900 text-xl font-bold mb-4">Key Features</h3>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                                <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-base font-semibold text-gray-900">
                                        Multi-Chat Management
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Create and switch between multiple chat conversations
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg">
                                <MagnifyingGlassIcon className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-base font-semibold text-gray-900">
                                        Cross-Chat Search
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Vector-based semantic search across all conversations
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
                                <DocumentTextIcon className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-base font-semibold text-gray-900">
                                        Document Upload & Analysis
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Upload PDFs, Word documents, and images for AI analysis
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-gray-900 text-xl font-bold mb-4">
                            Development Highlights
                        </h3>
                        <ul className="text-base space-y-2">
                            <li className="flex items-start space-x-3">
                                <span className="text-blue-600 font-bold mt-1">✓</span>
                                <span>Real-time WebSocket communication for instant messaging</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <span className="text-blue-600 font-bold mt-1">✓</span>
                                <span>Vector database integration for semantic search capabilities</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <span className="text-blue-600 font-bold mt-1">✓</span>
                                <span>File upload and processing with streaming responses</span>
                            </li>
                            <li className="flex items-start space-x-3">
                                <span className="text-blue-600 font-bold mt-1">✓</span>
                                <span>
                                    Persistent chat history with SQLite database
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-600 font-medium">
                        Built with care as a portfolio project showcasing modern AI integration
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
