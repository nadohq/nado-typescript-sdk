/**
 * Maximum feed page size the backend accepts; also the default when `limit` is omitted. Requests above this
 * fail with `INVALID_FEED_FILTER`.
 */
export const MOBILE_FEED_MAX_PAGE_SIZE = 50;

/**
 * Lowest minimum notional the backend accepts, in whole dollars. Filtered requests below this fail with
 * `INVALID_FEED_FILTER`; omitting the filter entirely returns the unfiltered feed.
 */
export const MOBILE_FEED_MIN_NOTIONAL_FLOOR = 1_000;
