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
 * Number of Followed By preview identities a follow summary carries. Fixed by the backend rather than
 * requested, so use it to size the preview UI; `followedByCount` still reports the full intersection.
 */
export const MOBILE_FOLLOWED_BY_PREVIEW_LIMIT = 2;

/**
 * Maximum number of subaccounts a single profiles lookup accepts. An empty list, a duplicate, or more than
 * this many fail with `INVALID_PROFILES_REQUEST`.
 */
export const MOBILE_PROFILES_MAX_BATCH_SIZE = 25;
