'use client';

import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '@/lib/logger';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export default function MarkdownRenderer({ content, isUser = false }: MarkdownRendererProps) {
  // Sanitize content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    if (!content || typeof content !== 'string') {
      logger.warn('MarkdownRenderer received invalid content', { type: typeof content });
      return '';
    }

    // DEBUG: Log if content contains [object Object]
    if (content.includes('[object Object]')) {
      logger.error('MarkdownRenderer received content with [object Object]', {
        contentType: typeof content,
        contentLength: content.length,
        preview: content.substring(0, 500)
      });
    }

    // Sanitize with DOMPurify to prevent XSS
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'blockquote', 'hr',
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'div', 'span', 'img'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'title'],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
      // Explicit protocol whitelist to prevent javascript:, data:, vbscript:, etc.
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|ftp):)/i,
    });
  }, [content]);

  return (
    <div className={`markdown-content ${isUser ? 'text-white' : 'text-gray-800'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (!inline && language) {
              // CRITICAL FIX: Properly extract text from children
              // children might be a React node tree, need to extract the actual text
              let codeText = '';

              if (typeof children === 'string') {
                codeText = children;
              } else if (Array.isArray(children)) {
                // If children is an array, join all string children
                codeText = children
                  .map(child => typeof child === 'string' ? child : '')
                  .join('');
              } else if (children && typeof children === 'object' && 'props' in children) {
                // If it's a React element, try to get its text content
                codeText = String(children);
              } else {
                codeText = String(children);
              }

              // DEBUG: Log if we're about to pass [object Object]
              if (codeText.includes('[object Object]')) {
                logger.error('CodeBlock about to receive [object Object]', {
                  childrenType: typeof children,
                  codeText
                });
              }

              return (
                <CodeBlock
                  language={language}
                  code={codeText.replace(/\n$/, '')}
                />
              );
            }

            return (
              <code
                className={`${className || ''} ${
                  isUser ? 'bg-white bg-opacity-20' : 'bg-gray-100'
                } px-1.5 py-0.5 rounded text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => {
            return <>{children}</>;
          },
          h1: ({ children }) => (
            <h1 className={`text-2xl font-bold mt-4 mb-2 ${isUser ? 'text-white' : 'text-gray-900'}`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-xl font-semibold mt-3 mb-2 ${isUser ? 'text-white' : 'text-gray-900'}`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-lg font-semibold mt-2 mb-1 ${isUser ? 'text-white' : 'text-gray-900'}`}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-6 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-6 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={`border-l-4 ${
                isUser ? 'border-white border-opacity-40' : 'border-blue-500'
              } pl-4 my-3 italic ${isUser ? 'text-white text-opacity-90' : 'text-gray-600'}`}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className={`min-w-full border ${isUser ? 'border-white border-opacity-20' : 'border-gray-300'}`}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={isUser ? 'bg-white bg-opacity-10' : 'bg-gray-50'}>{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className={isUser ? 'border-white border-opacity-20' : 'border-gray-300'}>{children}</tr>
          ),
          th: ({ children }) => (
            <th className={`px-4 py-2 text-left font-semibold ${isUser ? 'border-white border-opacity-20' : 'border-gray-300'}`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`px-4 py-2 ${isUser ? 'border-white border-opacity-20' : 'border-gray-300'}`}>
              {children}
            </td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${isUser ? 'text-white underline hover:text-blue-200' : 'text-blue-600 hover:text-blue-800 underline'}`}
            >
              {children}
            </a>
          ),
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>
    </div>
  );
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div className="relative group my-4">
      {/* Language label and copy button */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="!mt-0 !mb-0 !rounded-t-none">
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}
