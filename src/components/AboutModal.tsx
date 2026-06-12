import React, { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import AboutContent from './AboutContent'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
    onSetupApiKey: () => void
}

/**
 * The About modal reachable from the sidebar. First-run visitors see the
 * same content inside the OnboardingWizard instead.
 */
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

                <AboutContent />

                {/* Footer - chatting works without a key, BYOK is optional */}
                <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={onClose}
                        className="flex-1 sm:flex-initial px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                        Close
                    </button>
                    <button
                        onClick={onSetupApiKey}
                        className="flex-1 sm:flex-initial px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                    >
                        Bring Your Own Key (optional)
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
