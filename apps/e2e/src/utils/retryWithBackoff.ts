import { delay } from './delay';

/**
 * Options for {@link retryWithBackoff}.
 */
export interface RetryOptions {
  /** Maximum number of attempts (including the first). Defaults to 3. */
  maxAttempts?: number;
  /** Initial delay in milliseconds before the first retry. Defaults to 500. */
  initialDelayMs?: number;
  /** Upper bound on the backoff delay in milliseconds. Defaults to 5000. */
  maxDelayMs?: number;
  /** Multiplier applied to the delay after each retry. Defaults to 2. */
  backoffFactor?: number;
  /** Predicate that decides whether a given error is retryable. Defaults to matching 429 responses. */
  retryIf?: (error: unknown) => boolean;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5_000;
const DEFAULT_BACKOFF_FACTOR = 2;

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('429');
  }
  return false;
}

/**
 * Retries an async operation with exponential backoff.
 *
 * @param fn - The async function to execute.
 * @param opts - Retry behaviour overrides.
 * @returns The resolved value of {@link fn}.
 * @throws The last error when all attempts are exhausted.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const initialDelayMs = opts?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = opts?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const backoffFactor = opts?.backoffFactor ?? DEFAULT_BACKOFF_FACTOR;
  const retryIf = opts?.retryIf ?? isRateLimitError;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === maxAttempts - 1;
      if (isLastAttempt || !retryIf(error)) {
        throw error;
      }

      const backoffDelay = Math.min(
        initialDelayMs * backoffFactor ** attempt,
        maxDelayMs,
      );
      await delay(backoffDelay);
    }
  }

  throw lastError;
}
