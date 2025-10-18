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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50000] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#0a0a0a] rounded-xl max-w-4xl w-full p-6 border border-blue-500/40 shadow-2xl shadow-blue-500/20 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-white text-2xl font-bold mb-2">Welcome to GeminiGPT</h2>
                    <p className="text-blue-500 text-sm font-medium">
                        Your Advanced AI Chat Assistant Platform
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-6 text-gray-300">
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <Image
                                src="/images/portrait-medium.jpg"
                                alt="Nathan's Portrait"
                                width={64}
                                height={64}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white"
                            />
                            <h3 className="text-white text-lg font-semibold">Hi all, 👋</h3>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm leading-relaxed">
                                I&apos;m Nathan, and GeminiGPT is a Portfolio project designed to
                                showcase advanced AI integration with modern web technologies. It
                                demonstrates my expertise in building production-ready chat applications,
                                implementing real-time features, and creating intuitive user experiences.
                                I hope you enjoy GeminiGPT and if you&apos;d like to explore further:
                            </p>

                            <ul className="text-sm space-y-2 ml-4">
                                <li className="flex items-start">
                                    <span className="text-blue-500 mr-2">•</span>
                                    <span>
                                        Check out my{' '}
                                        <a
                                            href="https://n8sportfolio.vercel.app/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                                        >
                                            Portfolio page
                                        </a>{' '}
                                        for more projects.
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-blue-500 mr-2">•</span>
                                    <span>
                                        Feel free to connect with me on my socials if you&apos;d
                                        like to chat about technology.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex items-center justify-center gap-4 mt-6">
                            <a
                                href="https://github.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's GitHub"
                                className="w-10 h-10 rounded-full hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <Image
                                    src="/icons/github.svg"
                                    alt="GitHub"
                                    width={24}
                                    height={24}
                                    className="w-6 h-6"
                                />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/n8watkins/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's LinkedIn"
                                className="w-10 h-10 rounded-full hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <Image
                                    src="/icons/linkedin.svg"
                                    alt="LinkedIn"
                                    width={24}
                                    height={24}
                                    className="w-6 h-6"
                                />
                            </a>
                            <a
                                href="https://x.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's X (Twitter)"
                                className="w-10 h-10 rounded-full hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white text-lg font-semibold mb-3">Tech Stack</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center">
                                    <Image
                                        src="/icons/typescript.svg"
                                        alt="TypeScript"
                                        width={24}
                                        height={24}
                                        className="w-6 h-6"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">TypeScript</p>
                                    <p className="text-xs text-gray-400">Type-safe development</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center border border-white">
                                    <Image
                                        src="/icons/nextjs.svg"
                                        alt="Next.js"
                                        width={20}
                                        height={20}
                                        className="w-5 h-5"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Next.js</p>
                                    <p className="text-xs text-gray-400">React framework</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                                    <Image
                                        src="/icons/tailwind.svg"
                                        alt="Tailwind CSS"
                                        width={24}
                                        height={16}
                                        className="w-6 h-4"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Tailwind CSS</p>
                                    <p className="text-xs text-gray-400">Utility-first styling</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <span className="text-2xl">🤖</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Gemini AI</p>
                                    <p className="text-xs text-gray-400">Google&apos;s AI model</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <span className="text-2xl">🔌</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">WebSocket</p>
                                    <p className="text-xs text-gray-400">Real-time messaging</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <span className="text-2xl">🗄️</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">SQLite</p>
                                    <p className="text-xs text-gray-400">Embedded database</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white text-lg font-semibold mb-3">Key Features</h3>
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Multi-Chat Management
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Create and switch between multiple chat conversations
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <MagnifyingGlassIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Cross-Chat Search
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Vector-based semantic search across all conversations
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <DocumentTextIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Document Upload & Analysis
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Upload PDFs, Word documents, and images for AI analysis
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white text-lg font-semibold mb-3">
                            Development Highlights
                        </h3>
                        <ul className="text-sm space-y-1">
                            <li className="flex items-start space-x-2">
                                <span className="text-blue-500">•</span>
                                <span>Real-time WebSocket communication for instant messaging</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-blue-500">•</span>
                                <span>Vector database integration for semantic search capabilities</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-blue-500">•</span>
                                <span>File upload and processing with streaming responses</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-blue-500">•</span>
                                <span>
                                    Persistent chat history with SQLite database
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-600/50 text-center">
                    <p className="text-xs text-gray-400">
                        Built with care as a portfolio project showcasing modern AI integration
                    </p>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
