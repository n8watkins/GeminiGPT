'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { devLog } from '@/lib/logger'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      devLog('[Web Vitals]', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
      })
    }

    // Dispatch custom event for HUD component
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('web-vital', {
          detail: {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            id: metric.id,
          },
        })
      )
    }
  })

  return null
}

WebVitals.displayName = 'WebVitals'
