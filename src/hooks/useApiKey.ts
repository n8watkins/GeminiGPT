'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { validateGeminiApiKey, sanitizeApiKeyForLogging } from '@/lib/apiKeyValidation';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load API key from localStorage on mount
    try {
      const storedKey = localStorage.getItem('gemini-api-key');

      // Validate stored key before using it
      if (storedKey) {
        const validation = validateGeminiApiKey(storedKey);
        if (validation.valid) {
          setApiKey(storedKey);
          logger.info('Valid API key loaded from localStorage', {
            keyPreview: sanitizeApiKeyForLogging(storedKey)
          });
        } else {
          logger.warn('Invalid API key found in localStorage, removing', {
            reason: validation.reason
          });
          localStorage.removeItem('gemini-api-key');
          setApiKey(null);
        }
      } else {
        logger.info('No API key in localStorage');
        setApiKey(null);
      }
    } catch (error) {
      logger.error('Failed to load API key from localStorage', { error });
      setApiKey(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveApiKey = (key: string) => {
    try {
      // Validate before saving
      const validation = validateGeminiApiKey(key);
      if (!validation.valid) {
        throw new Error(validation.reason || 'Invalid API key format');
      }

      const trimmedKey = key.trim();
      localStorage.setItem('gemini-api-key', trimmedKey);
      setApiKey(trimmedKey);
      logger.info('API key saved', { keyPreview: sanitizeApiKeyForLogging(trimmedKey) });
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
