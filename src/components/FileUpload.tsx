'use client';

import React, { useRef, useState } from 'react';
import { Attachment } from '@/types/chat';
import { validateFile } from '@/lib/fileValidation';
import { fileLogger } from '@/lib/logger';

interface FileUploadProps {
  onFilesSelected: (attachments: Attachment[]) => void;
  disabled?: boolean;
}

export default function FileUpload({ onFilesSelected, disabled = false }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    fileLogger.debug('Files selected:', files ? files.length : 0);
    if (!files || files.length === 0) return;

    const attachments: Attachment[] = [];
    let processedCount = 0;

    // Validate all files first
    const validFiles = Array.from(files).filter(file => {
      const validation = validateFile(file);
      if (!validation.isValid) {
        fileLogger.warn(`File validation failed for ${file.name}: ${validation.error}`);
        alert(validation.error);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      alert('No valid files selected. Please upload images, PDFs, or text files under 10MB.');
      return;
    }

    const totalFiles = validFiles.length;

    validFiles.forEach((file) => {
      const isImage = file.type.startsWith('image/');

      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: Attachment = {
          id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: isImage ? 'image' : 'file',
          name: file.name,
          url: e.target?.result as string,
          size: file.size,
          mimeType: file.type,
        };
        
        attachments.push(attachment);
        processedCount++;
        
        // Call onFilesSelected when all files are processed
        if (processedCount === totalFiles) {
          onFilesSelected(attachments);
        }
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileLogger.debug('FileUpload button clicked', { disabled });
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.doc,.docx,.rtf"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
      
      <button
        type="button"
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={disabled}
        className={`
          p-2 rounded-md transition-colors
          ${isDragOver 
            ? 'bg-blue-100 border-blue-300' 
            : 'hover:bg-gray-100 border-gray-200'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer'
          }
          border-2 border-dashed
        `}
        title="Upload images or files (drag & drop supported)"
      >
        <svg 
          className="w-5 h-5 text-gray-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
    </div>
  );
}
