import React, { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
    showCloseButton?: boolean
    borderColor?: string
    closeOnBackdropClick?: boolean
}

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    maxWidth = '2xl',
    showCloseButton = true,
    borderColor = 'border-blue-200',
    closeOnBackdropClick = true,
}) => {
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

    const handleBackdropClick = () => {
        if (closeOnBackdropClick) {
            onClose()
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[50000] flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-white dark:bg-gray-900 rounded-2xl ${maxWidthClasses[maxWidth]} w-full p-8 border ${borderColor} dark:border-gray-700 shadow-2xl relative`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                )}

                {/* Content */}
                {children}
            </div>
        </div>
    )
}

export default Modal
