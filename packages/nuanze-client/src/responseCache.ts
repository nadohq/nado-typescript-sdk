/** Tuning for the opt-in local response cache. */
export interface NuanzeCacheOptions {
  /**
   * Maximum cached responses before the least recently used one is evicted.
   * Defaults to 128.
   */
  maxEntries?: number;
  /**
   * Upper bound, in seconds, on the freshness this client will honor.
   *
   * Entries never outlive the response's own `Cache-Control: max-age`; this only
   * shortens it. Omit to follow the server's policy exactly.
   */
  maxAgeCapSeconds?: number;
}

/** Default {@link NuanzeCacheOptions.maxEntries}. */
export const NUANZE_DEFAULT_CACHE_ENTRIES = 128;

interface CacheEntry {
  expiresAtMs: number;
  body: unknown;
}

/**
 * Freshness-bounded local cache of successful response bodies.
 *
 * Opt-in and off by default. It exists to avoid the request entirely: the API
 * charges rate-limit weight before consulting its own cache, so a `304 Not
 * Modified` costs the same units as a `200`, and only a local hit actually saves
 * quota.
 *
 * Only responses that state a positive `Cache-Control: max-age` are stored, so
 * an operation the server marks uncacheable is never served stale. Raw bodies
 * are cached and re-decoded per hit, which keeps callers from sharing mutable
 * decoded values.
 *
 * @internal
 */
export class NuanzeResponseCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly maxAgeCapSeconds: number | null;

  constructor(options: NuanzeCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? NUANZE_DEFAULT_CACHE_ENTRIES;
    this.maxAgeCapSeconds = options.maxAgeCapSeconds ?? null;
  }

  /**
   * Read a still-fresh body, refreshing its recency.
   *
   * @returns The cached body, or undefined on a miss or expiry. A cached `null`
   * body is impossible because only object bodies are stored, so `undefined`
   * unambiguously means "no hit".
   */
  get(key: string, nowMs: number = Date.now()): unknown {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;

    if (entry.expiresAtMs <= nowMs) {
      this.entries.delete(key);
      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.body;
  }

  /**
   * Store a body for as long as its `Cache-Control` header permits.
   *
   * A missing, zero, or unparseable `max-age`, or any `no-store` / `no-cache`
   * directive, leaves the cache untouched.
   */
  set(
    key: string,
    body: unknown,
    cacheControl: string | null,
    nowMs: number = Date.now(),
  ): void {
    const maxAgeSeconds = this.freshnessSeconds(cacheControl);
    if (maxAgeSeconds === null) return;

    this.entries.set(key, { expiresAtMs: nowMs + maxAgeSeconds * 1_000, body });

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) break;
      this.entries.delete(oldest.value);
    }
  }

  private freshnessSeconds(cacheControl: string | null): number | null {
    if (cacheControl === null) return null;

    const directives = cacheControl.toLowerCase();
    if (directives.includes('no-store') || directives.includes('no-cache'))
      return null;

    const maxAge = /(?:^|[,\s])max-age=(\d+)/.exec(directives);
    if (maxAge === null) return null;

    const seconds = Number(maxAge[1]);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;

    return this.maxAgeCapSeconds === null
      ? seconds
      : Math.min(seconds, this.maxAgeCapSeconds);
  }
}
