import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI for embeddings
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cache for embeddings to avoid redundant API calls
const embeddingCache = new Map();

/**
 * Generate embedding for a single text using Gemini's embedding model
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The embedding vector
 */
async function generateEmbedding(text: string) {
  try {
    // Check cache first
    const cacheKey = text.toLowerCase().trim();
    if (embeddingCache.has(cacheKey)) {
      console.log('Using cached embedding for:', text.substring(0, 50) + '...');
      return embeddingCache.get(cacheKey);
    }

    // Get the embedding model - use text-embedding-004 (768 dimensions)
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    // Generate embedding
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    
    // Cache the result
    embeddingCache.set(cacheKey, embedding);
    
    console.log('Generated embedding for:', text.substring(0, 50) + '...');
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
async function generateEmbeddings(texts: string[]) {
  try {
    // Process texts in parallel for better performance
    const promises = texts.map(text => generateEmbedding(text));
    const results = await Promise.all(promises);
    
    return results;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clear the embedding cache (useful for testing or memory management)
 */
function clearEmbeddingCache() {
  embeddingCache.clear();
  console.log('Embedding cache cleared');
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
function getCacheStats() {
  return {
    size: embeddingCache.size,
    keys: Array.from(embeddingCache.keys()).slice(0, 5) // First 5 keys for debugging
  };
}

export {
  generateEmbedding,
  generateEmbeddings,
  clearEmbeddingCache,
  getCacheStats
};
