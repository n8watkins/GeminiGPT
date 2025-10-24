'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

export default function ThemeDebug() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [htmlClass, setHtmlClass] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Update HTML class display
    const updateClass = () => {
      setHtmlClass(document.documentElement.classList.toString());
    };
    updateClass();

    // Also watch for changes
    const observer = new MutationObserver(updateClass);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-xl text-xs font-mono z-[99999] max-w-sm">
      <div className="font-bold mb-2 text-yellow-400">🔍 Theme Debug Panel</div>

      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Context theme:</span>{' '}
          <span className="text-green-400 font-bold">{theme}</span>
        </div>

        <div>
          <span className="text-gray-400">Resolved theme:</span>{' '}
          <span className="text-blue-400 font-bold">{resolvedTheme}</span>
        </div>

        <div>
          <span className="text-gray-400">HTML classes:</span>{' '}
          <span className="text-purple-400 font-bold">{htmlClass || '(none)'}</span>
        </div>

        <div>
          <span className="text-gray-400">Has 'dark' class:</span>{' '}
          <span className={htmlClass.includes('dark') ? 'text-green-400' : 'text-red-400'}>
            {htmlClass.includes('dark') ? '✓ YES' : '✗ NO'}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="text-gray-400 mb-2">Quick Test:</div>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('light')}
            className="px-2 py-1 bg-white text-black rounded text-xs"
          >
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className="px-2 py-1 bg-gray-800 text-white rounded text-xs"
          >
            Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
          >
            System
          </button>
        </div>
      </div>
    </div>
  );
}
