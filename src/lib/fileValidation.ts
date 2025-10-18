/**
 * File validation utilities
 * Centralized file type checking and validation logic
 */

import { FILE_CONSTRAINTS } from './constants';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Check if a file is a supported image type
 */
export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

/**
 * Check if a file is a PDF
 */
export const isPdfFile = (mimeType: string): boolean => {
  return mimeType === 'application/pdf';
};

/**
 * Check if a file is a Word document
 */
export const isDocFile = (mimeType: string): boolean => {
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  );
};

/**
 * Check if a file type is supported
 */
export const isSupportedFileType = (mimeType: string): boolean => {
  return isImageFile(mimeType) || isPdfFile(mimeType) || isDocFile(mimeType);
};

/**
 * Validate file size
 */
export const isValidFileSize = (sizeInBytes: number): boolean => {
  return sizeInBytes <= FILE_CONSTRAINTS.MAX_SIZE_BYTES;
};

/**
 * Comprehensive file validation
 */
export const validateFile = (file: File): FileValidationResult => {
  // Check file type
  if (!isSupportedFileType(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file type: ${file.type}. Supported types: images, PDFs, and Word documents.`,
    };
  }

  // Check file size
  if (!isValidFileSize(file.size)) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size of ${FILE_CONSTRAINTS.MAX_SIZE_MB}MB.`,
    };
  }

  return { isValid: true };
};

/**
 * Get file type category for display purposes
 */
export const getFileTypeCategory = (mimeType: string): 'image' | 'pdf' | 'document' | 'unknown' => {
  if (isImageFile(mimeType)) return 'image';
  if (isPdfFile(mimeType)) return 'pdf';
  if (isDocFile(mimeType)) return 'document';
  return 'unknown';
};
