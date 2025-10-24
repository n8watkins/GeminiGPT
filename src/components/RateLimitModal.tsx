import React, { useEffect } from 'react'
import { XMarkIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

interface RateLimitModalProps {
    isOpen: boolean
    onClose: () => void
    onSetupApiKey: () => void
    resetTime?: number
}

const RateLimitModal: React.FC<RateLimitModalProps> = ({ isOpen, onClose, onSetupApiKey, resetTime }) => {
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

    const formatResetTime = (timestamp?: number) => {
        if (!timestamp) return 'soon'
        const minutes = Math.ceil((timestamp - Date.now()) / 60000)
        if (minutes < 1) return 'less than a minute'
        if (minutes === 1) return '1 minute'
        if (minutes < 60) return `${minutes} minutes`
        const hours = Math.floor(minutes / 60)
        return hours === 1 ? '1 hour' : `${hours} hours`
    }

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[50000] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-2xl w-full p-8 border border-red-200 shadow-2xl relative"
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
                <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <ClockIcon className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-gray-900 text-3xl font-bold mb-2">Rate Limit Reached</h2>
                    <p className="text-gray-600 text-base">
                        You&apos;ve reached the free tier message limit
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-6 text-gray-700">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <h3 className="text-gray-900 text-lg font-bold mb-2">What happened?</h3>
                        <p className="text-sm leading-relaxed">
                            To provide a fair experience for everyone using the demo, we limit the number of
                            messages you can send. This prevents abuse and keeps the service running smoothly
                            for all users.
                        </p>
                        {resetTime && (
                            <p className="text-sm leading-relaxed mt-2 font-semibold text-red-700">
                                Your limit will reset in {formatResetTime(resetTime)}
                            </p>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                        <div className="flex items-start gap-3 mb-4">
                            <ShieldCheckIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-gray-900 text-lg font-bold mb-2">
                                    Want Unlimited Access?
                                </h3>
                                <p className="text-sm leading-relaxed mb-3">
                                    Use your own Google Gemini API key for unlimited messages with no restrictions!
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-start">
                                <span className="text-blue-600 mr-3 mt-1 font-bold">✓</span>
                                <div>
                                    <span className="font-semibold">100% Free:</span> Google provides $300 in free credits
                                    (enough for thousands of messages)
                                </div>
                            </div>
                            <div className="flex items-start">
                                <span className="text-blue-600 mr-3 mt-1 font-bold">✓</span>
                                <div>
                                    <span className="font-semibold">Private & Secure:</span> Your API key stays in your
                                    browser and is never sent to our servers
                                </div>
                            </div>
                            <div className="flex items-start">
                                <span className="text-blue-600 mr-3 mt-1 font-bold">✓</span>
                                <div>
                                    <span className="font-semibold">No Rate Limits:</span> Chat as much as you want
                                    with your own key
                                </div>
                            </div>
                            <div className="flex items-start">
                                <span className="text-blue-600 mr-3 mt-1 font-bold">✓</span>
                                <div>
                                    <span className="font-semibold">Takes 2 Minutes:</span> Quick and easy setup
                                    with step-by-step instructions
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <h3 className="text-gray-900 text-sm font-bold mb-2">Current Free Tier Limits</h3>
                        <ul className="text-sm space-y-1">
                            <li className="flex items-center">
                                <span className="text-yellow-600 mr-2">•</span>
                                <span>60 messages per minute</span>
                            </li>
                            <li className="flex items-center">
                                <span className="text-yellow-600 mr-2">•</span>
                                <span>500 messages per hour</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={onSetupApiKey}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                        Set Up Your API Key
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200"
                    >
                        Wait for Reset
                    </button>
                </div>
            </div>
        </div>
    )
}

export default RateLimitModal
