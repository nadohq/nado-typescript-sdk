/**
 * Rate-limit and retry-timing headers observed on a Nuanze response.
 *
 * The API applies a weighted token bucket per client IP: capacity 150 units
 * refilling at 2 units per second. Point lookups cost 1 unit, list and series
 * operations cost 2, and market positioning plus all-time analytics cost 5.
 * Weight is charged before the server's cache lookup, so a `304` costs the same
 * as a `200`.
 *
 * Every field is null when the corresponding header is absent or unparseable.
 * This client only reports these values; it never sleeps, retries, or throttles
 * on them.
 */
export interface NuanzeRateLimitSnapshot {
  /** Bucket capacity in weighted units, from `RateLimit-Limit`. */
  limit: number | null;
  /** Whole units left in the bucket, from `RateLimit-Remaining`. */
  remaining: number | null;
  /**
   * Unix time in seconds when capacity refills, from `RateLimit-Reset`. On an
   * accepted request this is when the bucket is full again; on a `429` it is when
   * enough units exist to serve the request.
   *
   * Absolute, not a delta, despite the published header description reading
   * "seconds until enough units refill".
   */
  reset: number | null;
  /** Seconds to wait before retrying, from `Retry-After` on a 429. */
  retryAfterSeconds: number | null;
}
