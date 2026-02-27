import { delay } from './delay';

/**
 * Retries {@link fn} with exponential backoff when a 429 rate-limit error is
 * detected. Non-429 errors are re-thrown immediately.
 *
 * @param fn - The async operation to attempt.
 * @param opts - Optional retry configuration.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { maxRetries?: number; baseDelayMs?: number },
): Promise<T> {
  const maxRetries = opts?.maxRetries ?? 5;
  const baseDelayMs = opts?.baseDelayMs ?? 1_000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;

      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') ||
          err.message.toLowerCase().includes('rate limit') ||
          err.message.toLowerCase().includes('too many requests'));
      if (!isRateLimit) throw err;

      const jitter = Math.random() * 200;
      await delay(baseDelayMs * Math.pow(2, attempt) + jitter);
    }
  }

  throw new Error('withRetry: unreachable');
}
