/**
 * Result Type for Error Handling
 *
 * A type-safe way to handle operations that can fail without throwing exceptions.
 * Inspired by Rust's Result<T, E> type.
 *
 * Benefits:
 * - Forces explicit error handling
 * - Makes error cases visible in type signatures
 * - Reduces uncaught exceptions
 * - Improves code readability
 *
 * Usage:
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return err('Division by zero');
 *   }
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.success) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */

/**
 * Successful result containing a value
 */
export interface Ok<T> {
  success: true;
  value: T;
}

/**
 * Failed result containing an error
 */
export interface Err<E> {
  success: false;
  error: E;
}

/**
 * Result type representing either success (Ok) or failure (Err)
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Create a successful result
 */
export function ok<T>(value: T): Ok<T> {
  return { success: true, value };
}

/**
 * Create a failed result
 */
export function err<E>(error: E): Err<E> {
  return { success: false, error };
}

/**
 * Create a failed result from an Error object
 */
export function errFromError(error: Error): Err<Error> {
  return { success: false, error };
}

/**
 * Create a failed result from an unknown error (catch blocks)
 */
export function errFromUnknown(error: unknown): Err<Error> {
  if (error instanceof Error) {
    return { success: false, error };
  }
  return { success: false, error: new Error(String(error)) };
}

/**
 * Wrap a function that may throw in a Result
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return errFromUnknown(error);
  }
}

/**
 * Wrap an async function that may throw in a Result
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return errFromUnknown(error);
  }
}

/**
 * Map a successful result to a new value
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.success) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map a failed result to a new error
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (!result.success) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain multiple operations that return Results
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.success) {
    return fn(result.value);
  }
  return result;
}

/**
 * Get the value or a default if the result is an error
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.success) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Get the value or compute a default if the result is an error
 */
export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
  if (result.success) {
    return result.value;
  }
  return fn(result.error);
}

/**
 * Get the value or throw if the result is an error
 * Use sparingly - defeats the purpose of Result type
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.value;
  }
  throw result.error;
}

/**
 * Check if a result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success;
}

/**
 * Check if a result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.success;
}

/**
 * Combine multiple results into a single result
 * Returns Ok with all values if all results are Ok
 * Returns first Err if any result is Err
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (!result.success) {
      return result;
    }
    values.push(result.value);
  }
  return ok(values);
}

/**
 * Apply a function to the value inside a Result if it's Ok
 * Otherwise, do nothing
 */
export function ifOk<T, E>(result: Result<T, E>, fn: (value: T) => void): void {
  if (result.success) {
    fn(result.value);
  }
}

/**
 * Apply a function to the error inside a Result if it's Err
 * Otherwise, do nothing
 */
export function ifErr<T, E>(result: Result<T, E>, fn: (error: E) => void): void {
  if (!result.success) {
    fn(result.error);
  }
}
