/**
 * Maximum Followers/Following page size the backend accepts. Requests outside 1–50 fail with
 * `INVALID_FOLLOW_LIMIT`.
 */
export const MOBILE_FOLLOW_LIST_MAX_PAGE_SIZE = 50;

/**
 * Page size the backend uses when `limit` is omitted from a Followers or Following request.
 */
export const MOBILE_FOLLOW_LIST_DEFAULT_PAGE_SIZE = 25;

/**
 * Maximum number of Followed By preview identities a follow summary can request. Requests outside 0–10 fail
 * with `INVALID_FOLLOW_LIMIT`; 0 asks for `followedByCount` without any previews.
 */
export const MOBILE_FOLLOWED_BY_MAX_LIMIT = 10;

/**
 * Number of Followed By preview identities the backend returns when `followedByLimit` is omitted.
 */
export const MOBILE_FOLLOWED_BY_DEFAULT_LIMIT = 2;
