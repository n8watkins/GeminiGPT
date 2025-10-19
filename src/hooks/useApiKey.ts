'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load API key from localStorage on mount
    try {
      const storedKey = localStorage.getItem('gemini-api-key');
      setApiKey(storedKey);
      logger.info('API key loaded from localStorage', { hasKey: !!storedKey });
    } catch (error) {
      logger.error('Failed to load API key from localStorage', { error });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveApiKey = (key: string) => {
    try {
      localStorage.setItem('gemini-api-key', key);
      setApiKey(key);
      logger.info('API key saved');
    } catch (error) {
      logger.error('Failed to save API key', { error });
      throw error;
    }
  };

  const removeApiKey = () => {
    try {
      localStorage.removeItem('gemini-api-key');
      setApiKey(null);
      logger.info('API key removed');
    } catch (error) {
      logger.error('Failed to remove API key', { error });
      throw error;
    }
  };

  const hasApiKey = !!apiKey;

  return {
    apiKey,
    hasApiKey,
    isLoading,
    saveApiKey,
    removeApiKey
  };
}
