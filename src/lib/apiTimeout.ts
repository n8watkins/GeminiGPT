/**
 * Wraps a promise with a timeout, rejecting if the operation takes too long
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
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        const error = new Error(errorMessage);
        (error as any).code = 'TIMEOUT';
        reject(error);
      }, timeoutMs)
    ),
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
