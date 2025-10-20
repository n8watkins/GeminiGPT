import { GoogleGenerativeAI } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';
import { logger } from './logger';

/**
 * Lazy initialization of Google Generative AI client
 * Prevents import-time crashes when API key is not available
 */
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        'GEMINI_API_KEY environment variable is required for embeddings'
      );
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    logger.info('Initialized GoogleGenerativeAI for embeddings');
  }
  return genAI;
}

/**
 * LRU Cache configuration for embeddings
 * Prevents memory leaks while maintaining performance
 */
interface CacheOptions {
  max: number; // Maximum number of entries
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum size in bytes
  updateAgeOnGet: boolean; // LRU behavior
}

const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  max: 10000, // Maximum 10,000 embeddings
  ttl: 1000 * 60 * 60 * 24, // 24 hour TTL
  maxSize: 100 * 1024 * 1024, // Max 100MB of embeddings in cache
  updateAgeOnGet: true, // LRU behavior
};

/**
 * LRU Cache for embeddings
 * Prevents memory exhaustion by:
 * 1. Limiting number of entries (10,000 max)
 * 2. Limiting total memory size (100MB max)
 * 3. Evicting least recently used entries when full
 * 4. Automatic expiration after 24 hours
 */
const embeddingCache = new LRUCache<string, number[]>({
  max: DEFAULT_CACHE_OPTIONS.max,
  ttl: DEFAULT_CACHE_OPTIONS.ttl,
  updateAgeOnGet: DEFAULT_CACHE_OPTIONS.updateAgeOnGet,

  // Track cache size in memory
  sizeCalculation: (value) => {
    // Each float64 is 8 bytes, plus overhead
    return value.length * 8 + 100; // ~100 bytes overhead per entry
  },
  maxSize: DEFAULT_CACHE_OPTIONS.maxSize,
});

/**
 * Generate embedding for a single text using Gemini's embedding model
 *
 * Uses Google's text-embedding-004 model (768 dimensions).
 * Results are cached in an LRU cache to avoid redundant API calls.
 *
 * @param text - The text to embed (max 10,000 characters, will be truncated)
 * @returns Promise resolving to embedding vector (768-dimensional)
 *
 * @throws {Error} If Gemini API call fails
 * @throws {Error} If GEMINI_API_KEY is not set
 * @throws {Error} If text is not a valid string
 *
 * @example
 * ```typescript
 * const embedding = await generateEmbedding('Hello, world!');
 * console.log(embedding.length); // 768
 * ```
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Truncate long text to prevent API errors
    const MAX_TEXT_LENGTH = 10000;
    if (text.length > MAX_TEXT_LENGTH) {
      logger.warn('Text too long, truncating', {
        originalLength: text.length,
        truncatedLength: MAX_TEXT_LENGTH
      });
      text = text.substring(0, MAX_TEXT_LENGTH);
    }

    // Check cache first
    const cacheKey = text.toLowerCase().trim();
    const cached = embeddingCache.get(cacheKey);

    if (cached) {
      logger.debug('Embedding cache hit', {
        textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      });
      return cached;
    }

    // Cache miss - generate embedding
    logger.debug('Embedding cache miss, generating', {
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });

    // Lazy initialization of genAI
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'text-embedding-004' });

    // Generate embedding
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    // Store in cache (LRU will handle eviction if full)
    embeddingCache.set(cacheKey, embedding);

    return embedding;
  } catch (error) {
    logger.error('Error generating embedding', { error });
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * Processes texts in parallel for better performance.
 * Individual embeddings may be cached.
 *
 * @param texts - Array of texts to embed
 * @returns Promise resolving to array of embedding vectors
 *
 * @throws {Error} If any embedding generation fails
 *
 * @example
 * ```typescript
 * const embeddings = await generateEmbeddings(['text1', 'text2', 'text3']);
 * console.log(embeddings.length); // 3
 * console.log(embeddings[0].length); // 768
 * ```
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    // Validate input
    if (!Array.isArray(texts)) {
      throw new Error('texts must be an array');
    }

    // Process texts in parallel for better performance
    const promises = texts.map((text) => generateEmbedding(text));
    const results = await Promise.all(promises);

    return results;
  } catch (error) {
    logger.error('Error generating batch embeddings', { error });
    throw new Error(
      `Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clear the embedding cache
 *
 * Useful for testing or memory management.
 * In production, the LRU cache handles cleanup automatically.
 */
function clearEmbeddingCache(): void {
  embeddingCache.clear();
  logger.info('Embedding cache cleared');
}

/**
 * Get cache statistics
 *
 * Returns information about cache utilization:
 * - size: Current number of entries
 * - calculatedSize: Current memory usage in bytes
 * - max: Maximum number of entries allowed
 * - maxSize: Maximum memory size allowed
 * - utilizationPercent: Percentage of max entries used
 * - memoryUtilizationPercent: Percentage of max memory used
 *
 * @returns Cache statistics object
 *
 * @example
 * ```typescript
 * const stats = getCacheStats();
 * console.log(`Cache: ${stats.size}/${stats.max} entries`);
 * console.log(`Memory: ${stats.utilizationPercent.toFixed(1)}%`);
 * ```
 */
function getCacheStats() {
  const size = embeddingCache.size;
  const calculatedSize = embeddingCache.calculatedSize || 0;
  const max = embeddingCache.max || DEFAULT_CACHE_OPTIONS.max;
  const maxSize = DEFAULT_CACHE_OPTIONS.maxSize;

  return {
    size,
    calculatedSize,
    max,
    maxSize,
    utilizationPercent: (size / max) * 100,
    memoryUtilizationPercent: (calculatedSize / maxSize) * 100,
  };
}

export {
  generateEmbedding,
  generateEmbeddings,
  clearEmbeddingCache,
  getCacheStats
};
