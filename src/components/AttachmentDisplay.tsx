'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Attachment } from '@/types/chat';

interface AttachmentDisplayProps {
  attachments: Attachment[];
  isUser?: boolean;
}

export default function AttachmentDisplay({ attachments, isUser = false }: AttachmentDisplayProps) {
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());

  const toggleImageExpansion = (attachmentId: string) => {
    const newExpanded = new Set(expandedImages);
    if (newExpanded.has(attachmentId)) {
      newExpanded.delete(attachmentId);
    } else {
      newExpanded.add(attachmentId);
    }
    setExpandedImages(newExpanded);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="relative">
          {attachment.type === 'image' ? (
            <div className="relative inline-block">
              <Image
                src={attachment.url}
                alt={attachment.name}
                width={expandedImages.has(attachment.id) ? 400 : 200}
                height={expandedImages.has(attachment.id) ? 300 : 150}
                className={`
                  rounded-lg cursor-pointer transition-all duration-200
                  ${expandedImages.has(attachment.id) 
                    ? 'max-w-none max-h-96' 
                    : 'max-w-xs max-h-48'
                  }
                  ${isUser ? 'border-2 border-blue-200' : 'border-2 border-gray-200'}
                `}
                onClick={() => toggleImageExpansion(attachment.id)}
                title="Click to expand/collapse"
              />
              <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {attachment.name}
              </div>
            </div>
          ) : (
            <div className={`
              flex items-center space-x-2 p-3 rounded-lg border
              ${isUser 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-gray-50 border-gray-200'
              }
            `}>
              <div className="flex-shrink-0">
                {attachment.mimeType === 'application/pdf' ? (
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.name}
                </p>
                {attachment.size && (
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
