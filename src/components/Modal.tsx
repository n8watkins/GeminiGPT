import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

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

// How long the leave transition runs before the modal unmounts (ms).
// Keep in sync with the duration-200 classes below.
const LEAVE_DURATION = 200

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    maxWidth = '2xl',
    showCloseButton = true,
    borderColor = 'border-blue-200',
    closeOnBackdropClick = true,
}) => {
    // Two-phase mount so the modal fades/scales in on open and animates
    // out on close instead of popping in/out of the DOM.
    const [shouldRender, setShouldRender] = useState(isOpen)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true)
            // Double rAF: paint the hidden state first so the transition
            // to visible actually animates instead of snapping.
            let inner: number
            const outer = requestAnimationFrame(() => {
                inner = requestAnimationFrame(() => setIsVisible(true))
            })
            return () => {
                cancelAnimationFrame(outer)
                if (inner) cancelAnimationFrame(inner)
            }
        } else {
            setIsVisible(false)
            const timeout = setTimeout(() => setShouldRender(false), LEAVE_DURATION)
            return () => clearTimeout(timeout)
        }
    }, [isOpen])

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

    if (!shouldRender) return null

    const handleBackdropClick = () => {
        if (closeOnBackdropClick) {
            onClose()
        }
    }

    return (
        <div
            className={`fixed inset-0 bg-black/40 backdrop-blur-md z-[50000] flex items-center justify-center p-4 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-white dark:bg-gray-900 rounded-2xl ${maxWidthClasses[maxWidth]} w-full p-8 border ${borderColor} dark:border-gray-700 shadow-2xl relative transform transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
                    isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                )}

                {/* Content */}
                {children}
            </div>
        </div>
    )
}

export default Modal
