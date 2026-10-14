/**
 * Maximum profile search page size without an `include`. Requests outside 1-50 fail with
 * `INVALID_PROFILE_SEARCH_REQUEST`.
 */
export const MOBILE_PROFILE_SEARCH_MAX_PAGE_SIZE = 50;

/**
 * Maximum profile search page size when `include` asks for follow data, matching
 * `MOBILE_PROFILES_MAX_BATCH_SIZE`. Requests outside 1-25 fail with `INVALID_PROFILE_SEARCH_REQUEST`.
 */
export const MOBILE_PROFILE_SEARCH_MAX_ENRICHED_PAGE_SIZE = 25;

/**
 * Page size the backend uses when `limit` is omitted from a profile search.
 */
export const MOBILE_PROFILE_SEARCH_DEFAULT_PAGE_SIZE = 25;
