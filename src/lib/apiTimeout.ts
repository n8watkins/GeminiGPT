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

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(errorMessage);
      (error as any).code = 'TIMEOUT';
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
export function isTimeoutError(error: any): boolean {
  return error?.code === 'TIMEOUT' || error?.message?.toLowerCase().includes('timeout');
}
