/**
 * Custom error type for timeout errors
 */
interface TimeoutError extends Error {
  code: 'TIMEOUT';
}

/**
 * Wraps a promise with a timeout, rejecting if the operation takes too long
 *
 * IMPORTANT: Properly clears timeout to prevent memory leaks
 *
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message for timeout
 * @returns Promise that resolves with the result or rejects on timeout
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetch('https://api.example.com'),
 *   5000,
 *   'API request timeout'
 * );
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Request timeout'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  // Use Promise<never> instead of Promise<any> for type safety
  // never indicates this promise will only reject, never resolve
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(errorMessage) as TimeoutError;
      error.code = 'TIMEOUT';
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((result) => {
      // Clear timeout on success to prevent memory leak
      if (timeoutHandle) clearTimeout(timeoutHandle);
      return result;
    }).catch((error) => {
      // Clear timeout on error to prevent memory leak
      if (timeoutHandle) clearTimeout(timeoutHandle);
      throw error;
    }),
    timeoutPromise,
  ]);
}

/**
 * Checks if an error is a timeout error
 *
 * @param error - Error to check
 * @returns true if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as Partial<TimeoutError> & { message?: string };
  return err.code === 'TIMEOUT' || err.message?.toLowerCase().includes('timeout') || false;
}
