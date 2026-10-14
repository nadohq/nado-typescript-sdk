import { NADO_ERROR_CODES } from '@nadohq/shared';

/**
 * Numeric error codes returned by the mobile service API. Identity codes (61xx), notification codes (62xx),
 * and feed codes (63xx) are mobile-specific; the remaining codes are shared cross-service codes from the
 * backend's common error enum, inlined via spread from {@link NADO_ERROR_CODES}.
 */
export const MOBILE_ERROR_CODES = {
  ...NADO_ERROR_CODES,
  INVALID_DISPLAY_NAME: 6100,
  USERNAME_UNAVAILABLE: 6101,
  INVALID_IDENTITY_TARGET: 6104,
  /** Another identity write for the subaccount committed with a later nonce. Re-read before retrying. */
  STALE_IDENTITY_UPDATE: 6105,
  PROFILE_NOT_FOUND: 6106,
  /** Profiles lookup is empty, holds duplicates, or exceeds the batch maximum. Do not retry unchanged. */
  INVALID_PROFILES_REQUEST: 6107,
  /**
   * Profile search query is outside the username alphabet or length, or its limit is out of range. Do not
   * retry unchanged.
   */
  INVALID_PROFILE_SEARCH_REQUEST: 6108,
  /**
   * Profile search cursor is malformed, oversized, or was issued for a different query. Restart from
   * `cursor: undefined`.
   */
  INVALID_PROFILE_SEARCH_CURSOR: 6109,
  /** Follow mutation names the same source and target, or an isolated participant. Do not retry unchanged. */
  INVALID_FOLLOW_TARGET: 6110,
  /** Signed follower is not yet in the canonical Query DB subaccount index. Retry after index catch-up. */
  FOLLOWER_NOT_ELIGIBLE: 6111,
  /** Follow target is not yet in the canonical Query DB subaccount index. Refresh after a new record. */
  FOLLOWING_NOT_FOUND: 6112,
  /** Follow list cursor is malformed or bound to a different list request. Restart from `cursor: null`. */
  INVALID_FOLLOW_CURSOR: 6113,
  /** A follow list or followed-by limit is outside its accepted range. Fix it; do not retry unchanged. */
  INVALID_FOLLOW_LIMIT: 6114,
  INVALID_EXPO_TOKEN: 6200,
  INVALID_DEVICE_METADATA: 6201,
  INVALID_PREFERENCES: 6202,
  /** Feed `minimumNotional` or `limit` is outside its allowed domain. Fix the request; do not retry unchanged. */
  INVALID_FEED_FILTER: 6300,
  /** Feed cursor is malformed or bound to a different filter. Discard it and restart from the first page. */
  INVALID_FEED_CURSOR: 6301,
  /** Invalid social feed parameters, including missing fields, invalid types/formats, filters, or Content-Type. */
  INVALID_SOCIAL_FEED_PARAMS: 6310,
  /** Session, credential, viewing account, cursor, source, or viewport mismatch; also a request sequence or viewport revision rollback. */
  SOCIAL_FEED_SESSION_MISMATCH: 6311,
  /** Reading session or browsing credential is expired, missing, or incompatible; create a new session. */
  SOCIAL_FEED_SESSION_EXPIRED: 6312,
  /** Content does not exist or is not currently accessible. */
  SOCIAL_FEED_CONTENT_UNAVAILABLE: 6313,
  /** Required authoritative position, action, cohort, or market data is unavailable. */
  SOCIAL_FEED_DATA_UNAVAILABLE: 6320,
  /** Feed reads are only available through public_query. */
  SOCIAL_FEED_QUERY_REMOVED: 6325,
} as const;

/**
 * Union of all known mobile service API error codes.
 */
export type MobileErrorCode =
  (typeof MOBILE_ERROR_CODES)[keyof typeof MOBILE_ERROR_CODES];
