/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

// Rate Limit Display Thresholds
export const RATE_LIMIT_THRESHOLDS = {
  MINUTE_WARNING: 5,
  MINUTE_CRITICAL: 2,
  HOUR_WARNING: 20,
  HOUR_CRITICAL: 10,
} as const;

// Z-Index Layers
export const Z_INDEX = {
  DROPDOWN: 100,
  STICKY: 200,
  SIDEBAR: 50,
  MODAL_BACKDROP: 9998,
  MODAL: 9999,
} as const;

// Animation Durations (ms)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Debounce Delays (ms)
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  INPUT: 150,
  RESIZE: 200,
} as const;

// File Upload Constraints
export const FILE_CONSTRAINTS = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const,
  SUPPORTED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as const,
} as const;
