'use client';

import React, { useRef, useState } from 'react';
import { Attachment } from '@/types/chat';

interface FileUploadProps {
  onFilesSelected: (attachments: Attachment[]) => void;
  disabled?: boolean;
}

export default function FileUpload({ onFilesSelected, disabled = false }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    console.log('Files selected:', files ? files.length : 0);
    if (!files || files.length === 0) return;

    const attachments: Attachment[] = [];
    let processedCount = 0;
    const totalFiles = Array.from(files).filter(f => {
      const isImg = f.type.startsWith('image/');
      const isSupported = isImg || 
        f.type === 'application/pdf' ||
        f.type === 'text/plain' ||
        f.type.startsWith('text/') ||
        f.type === 'application/msword' ||
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        f.type === 'application/rtf';
      return isSupported && f.size <= 10 * 1024 * 1024;
    }).length;
    
    if (totalFiles === 0) {
      alert('No supported files selected. Please upload images, PDFs, or text files.');
      return;
    }
    
    Array.from(files).forEach((file) => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      // Check file type
      const isImage = file.type.startsWith('image/');
      const isSupportedFile = isImage || 
        file.type === 'application/pdf' ||
        file.type === 'text/plain' ||
        file.type.startsWith('text/') ||
        file.type === 'application/msword' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/rtf';

      if (!isSupportedFile) {
        alert(`File type ${file.type} is not supported. Please upload images, PDFs, or text files.`);
        return;
      }

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
    console.log('FileUpload button clicked', { disabled });
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
