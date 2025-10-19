'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { validateGeminiApiKey, sanitizeApiKeyForLogging } from '@/lib/apiKeyValidation';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastKeyChangeTime, setLastKeyChangeTime] = useState<number>(0);

  // Rate limit: 1 minute cooldown between API key changes
  const KEY_CHANGE_COOLDOWN_MS = 60000;

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
      // SECURITY: Rate limit API key changes to prevent abuse
      const now = Date.now();
      if (lastKeyChangeTime > 0 && (now - lastKeyChangeTime) < KEY_CHANGE_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((KEY_CHANGE_COOLDOWN_MS - (now - lastKeyChangeTime)) / 1000);
        throw new Error(`Please wait ${remainingSeconds} seconds before changing your API key again. This prevents rate limit bypass.`);
      }

      // Validate before saving
      const validation = validateGeminiApiKey(key);
      if (!validation.valid) {
        throw new Error(validation.reason || 'Invalid API key format');
      }

      const trimmedKey = key.trim();
      localStorage.setItem('gemini-api-key', trimmedKey);
      setApiKey(trimmedKey);
      setLastKeyChangeTime(now);
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
