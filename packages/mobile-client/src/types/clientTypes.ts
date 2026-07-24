import { SignatureParams, Subaccount } from '@nadohq/shared';
import { Hex } from 'viem';
import {
  MobileFeedTradePosition,
  MobileNotificationCategory,
  MobileNotificationPlatform,
} from './serverModelTypes';

/**
 * A subaccount's claimed identity on the mobile service API.
 *
 * `username` and `displayName` are two representations of the same claimed name: `displayName` is what the
 * user entered (preserving casing, e.g. `Alice.One`), while `username` is the canonical, lowercased handle
 * derived from it (e.g. `alice.one`). `username` is the unique key used for profile lookups
 * ({@link MobilePublicProfile}); `displayName` is only for presentation.
 */
export interface MobileIdentity {
  subaccount: Hex;
  /**
   * Canonical, lowercased handle derived from {@link MobileIdentity.displayName}, unique per identity and
   * used for profile lookups.
   */
  username: string;
  /**
   * User-facing name as claimed, preserving original casing. Validated against `MOBILE_DISPLAY_NAME_PATTERN`.
   */
  displayName: string;
  privateMode: boolean;
}

/**
 * A subaccount's public profile, as returned by an unsigned profile lookup.
 */
export interface MobilePublicProfile {
  subaccount: Hex;
  username: string;
  displayName: string;
}

/**
 * Result of a username availability check.
 */
export interface MobileUsernameAvailability {
  username: string;
  available: boolean;
}

/**
 * Margin of a feed trade. Branch on `mode` — do not infer isolated state from leverage presence:
 * `estimatedLeverage` (a rounded whole-number estimate, not exact submitted leverage) is `undefined` on
 * `cross`, and also `undefined` inside `isolated` when no estimate is available.
 */
export interface MobileFeedMargin {
  mode: 'cross' | 'isolated';
  estimatedLeverage?: number;
}

/**
 * A single feed trade: one row per order digest, enriched with the trader's current identity at read time
 * (a rename can change an already-fetched trade on the next read). Amounts are display-oriented human-unit
 * numbers — do not use them for accounting, order construction, or exact threshold decisions.
 */
export interface MobileFeedTrade {
  /** Order digest this trade is keyed by; the stable id for reconciling live pagination. */
  orderDigest: Hex;
  subaccount: Hex;
  username: string;
  displayName: string;
  /** Reserved for a future avatar source; `null` until one is implemented. */
  avatarUrl: string | null;
  productId: number;
  /** Executed quantity in human units. */
  quantity: number;
  /** Trade notional in whole-dollar human units. */
  notional: number;
  /** Average execution price in human units. */
  averagePrice: number;
  margin: MobileFeedMargin;
  /** Resulting position change. `position.direction` is NOT the execution buy/sell side. */
  position: MobileFeedTradePosition;
  /** Realized PnL of the trade in human units; can be negative. */
  realizedPnl: number;
  /** Fill time as a Unix timestamp (milliseconds). */
  filledAt: number;
}

/**
 * A page of feed trades. `nextCursor` is `null` when there was no additional candidate at query time.
 * Pagination is live, not snapshot, so a later fill can move a trade between pages — deduplicate by
 * {@link MobileFeedTrade.orderDigest} and treat the merged list as a short-lived view, not an authoritative
 * cache (removals from Private Mode or blacklists are not signaled).
 */
export interface MobileFeedPage {
  trades: MobileFeedTrade[];
  nextCursor: string | null;
}

/**
 * Scope limiting a notification category preference. Scopes are part of the wire format but rejected by the
 * backend for the MVP — `scopes` must be empty.
 */
export type MobileNotificationPreferenceScope =
  | { type: 'subaccount'; subaccount: Hex }
  | { type: 'product'; productId: number };

/**
 * A per-category push notification preference.
 */
export interface MobileNotificationCategoryPreference {
  category: MobileNotificationCategory;
  enabled: boolean;
  scopes: MobileNotificationPreferenceScope[];
}

/**
 * A wallet's push notification preferences. The backend requires exactly one entry per known category and
 * `schemaVersion` of 1.
 */
export interface MobileNotificationPreferences {
  /** Only `1` is accepted by the backend for the MVP. */
  schemaVersion: 1;
  categories: MobileNotificationCategoryPreference[];
}

/**
 * A device registered for push notifications.
 */
export interface MobileRegisteredDevice {
  /** Push platform the device registered under. */
  platform: MobileNotificationPlatform;
  /** BCP-47 locale tag reported at registration, or `null` if none was provided. */
  locale: string | null;
  /** App version string reported at registration, or `null` if none was provided. */
  appVersion: string | null;
  /**
   * First 8 hex chars of `keccak256` over the bracket-stripped Expo token — a stable, non-reversible
   * identifier for the device's push token. The raw token is never returned by the backend.
   */
  tokenFingerprintPrefix: string;
  /**
   * Unix timestamp (milliseconds) of the device's last registration refresh.
   */
  lastSeenAt: number;
}

/**
 * Common params for signed requests that authenticate as a given subaccount.
 */
export interface MobileSignedRequestParams
  extends Subaccount, SignatureParams {}

/**
 * Params for {@link MobileClient.getUsernameAvailability}.
 */
export interface GetMobileUsernameAvailabilityParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.getPublicProfile}.
 */
export interface GetMobilePublicProfileParams {
  username: string;
}

/**
 * Params for {@link MobileClient.getFeed}.
 */
export interface GetMobileFeedParams {
  /**
   * Minimum notional filter as a whole-dollar safe integer, at least `MOBILE_FEED_MIN_NOTIONAL_FLOOR`
   * ($1,000). Omit for the unfiltered feed.
   */
  minimumNotional?: number;
  /** Page size, 1–`MOBILE_FEED_MAX_PAGE_SIZE` (50); the backend defaults to 50 when omitted. */
  limit?: number;
  /**
   * Opaque keyset cursor from a prior page's {@link MobileFeedPage.nextCursor}. Send it back unchanged with
   * the exact same `minimumNotional` it was issued for.
   */
  cursor?: string;
}

/**
 * Params for {@link MobileClient.getSelfIdentity}.
 */
export type GetMobileSelfIdentityParams = MobileSignedRequestParams;

/**
 * Params for {@link MobileClient.claimUsername}.
 */
export interface MobileClaimUsernameParams extends MobileSignedRequestParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.updateUsername}.
 */
export interface MobileUpdateUsernameParams extends MobileSignedRequestParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.setPrivateMode}.
 */
export interface MobileSetPrivateModeParams extends MobileSignedRequestParams {
  privateMode: boolean;
}

/**
 * Params for {@link MobileClient.registerExpoToken}.
 */
export interface MobileRegisterExpoTokenParams extends MobileSignedRequestParams {
  /**
   * Expo push token, e.g. `ExponentPushToken[...]`.
   */
  expoToken: string;
  platform: MobileNotificationPlatform;
  /**
   * BCP-47 locale tag, max 35 chars.
   */
  locale?: string;
  /**
   * App version string, max 64 chars.
   */
  appVersion?: string;
}

/**
 * Params for {@link MobileClient.unregisterExpoToken}.
 */
export interface MobileUnregisterExpoTokenParams extends MobileSignedRequestParams {
  expoToken: string;
}

/**
 * Params for {@link MobileClient.updateNotificationPreferences}.
 */
export interface MobileUpdateNotificationPreferencesParams extends MobileSignedRequestParams {
  preferences: MobileNotificationPreferences;
}

/**
 * Params for {@link MobileClient.getNotificationPreferences}.
 */
export type GetMobileNotificationPreferencesParams = MobileSignedRequestParams;

/**
 * Params for {@link MobileClient.getRegisteredDevices}.
 */
export type GetMobileRegisteredDevicesParams = MobileSignedRequestParams;
