import { SignatureParams, Subaccount } from '@nadohq/shared';
import { Hex } from 'viem';
import {
  MobileFeedMarginMode,
  MobileFeedTradePosition,
  MobileNotificationCategory,
  MobileNotificationPlatform,
} from './serverModelTypes';

/**
 * A subaccount's public profile, as returned by an unsigned profile lookup. Private Mode hides the account's
 * activity, not its profile, so `privateMode` is exposed here too. A subaccount with no identity row still
 * yields a profile, with `null` names and `privateMode: false`.
 *
 * The last three fields are `undefined` unless the matching {@link MobileClient.getProfiles} option asked
 * for them — absent means "not requested" rather than "none". {@link MobileClient.getPublicProfile} never
 * returns them.
 */
export interface MobilePublicProfile {
  subaccount: Hex;
  /** Canonical, lowercased handle, or `null` if no username has been claimed. */
  username: string | null;
  /** User-facing name as claimed, or `null` if no username has been claimed. */
  displayName: string | null;
  privateMode: boolean;
  /**
   * Exact count at query time rather than a cached counter, including unnamed and private accounts — Private
   * Mode hides activity, not relationships. Requires `includeFollowCounts`.
   */
  followerCount?: number;
  followingCount?: number;
  /** Requires `followSummaryViewAs`, and is relative to that subaccount. */
  followSummary?: MobileFollowSummary;
}

/**
 * The identity fields the backend attaches to a subaccount wherever it surfaces one alongside other data.
 * Resolved at read time, so a rename shows up on the next read without any change to the surrounding record.
 */
export interface MobileIdentitySummary {
  subaccount: Hex;
  /** `null` when the account has not claimed a username; render a local fallback label from `subaccount`. */
  username: string | null;
  /** `null` when the account has not claimed a username; render a local fallback label from `subaccount`. */
  displayName: string | null;
  /** Reserved for a future avatar source; `null` until one is implemented. */
  avatarUrl: string | null;
}

/**
 * A viewer's relationship with one Profile, plus the Followed By preview: accounts the viewer follows that
 * also follow that Profile. Every preview entry is therefore already familiar to the viewer, which is why it
 * carries no `isFollowing` of its own.
 */
export interface MobileFollowSummary {
  /** The direct `viewer -> viewed Profile` relationship. */
  isFollowing: boolean;
  /** Exact size of the two-edge intersection, independent of how many previews came back. */
  followedByCount: number;
  /**
   * Newest `preview -> viewed Profile` relationship first, with a bytes32 tie-break. Capped at
   * `MOBILE_FOLLOWED_BY_PREVIEW_LIMIT` (2) by the backend and not client-configurable.
   */
  followedBy: MobileIdentitySummary[];
}

/**
 * One row of a Followers or Following page.
 */
export interface MobileFollowListAccount {
  identity: MobileIdentitySummary;
  /**
   * Whether the *Viewer* follows this account — not the listed relationship that put it in the page. The
   * Viewer can appear in another Profile's list, and does not follow themself, so their own row is `false`.
   */
  isFollowing: boolean;
  /** This account's own follower count. */
  followerCount: number;
}

/**
 * A page of Followers or Following. Pagination is live rather than snapshot: a Follow or Unfollow between
 * pages can move an account, so an account can appear twice or not at all across one session. Deduplicate by
 * {@link MobileIdentitySummary.subaccount} and restart from `cursor: undefined` on refresh.
 */
export interface MobileFollowListPage {
  accounts: MobileFollowListAccount[];
  /** `null` means the list is complete. */
  nextCursor: string | null;
}

/**
 * Post-commit state of a follow or unfollow. The mutation and its count share one database transaction, so
 * these values are authoritative — apply them rather than re-reading.
 */
export interface MobileFollowMutationResult {
  isFollowing: boolean;
  /** The *target's* follower count after the mutation, not the sender's. */
  followerCount: number;
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
  mode: MobileFeedMarginMode;
  estimatedLeverage?: number;
}

/**
 * A single feed trade: one row per order digest, enriched with the trader's current identity at read time
 * (a rename can change an already-fetched trade on the next read). Amounts are display-oriented human-unit
 * numbers — do not use them for accounting, order construction, or exact threshold decisions.
 */
export interface MobileFeedTrade extends MobileIdentitySummary {
  /** Order digest this trade is keyed by; the stable id for reconciling live pagination. */
  orderDigest: Hex;
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
 * The wallet an Expo push token is currently registered to, alongside the redacted metadata of the device
 * that registered it.
 */
export interface MobileRegisteredWallet {
  /** Address of the wallet that owns the token's active registration. */
  wallet: Hex;
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
 * Common params for the unsigned notification requests, which name their target with an Expo push token
 * instead of a subaccount and signature — the counterpart to {@link MobileSignedRequestParams}. The backend
 * resolves the token's owning wallet and reads or mutates that wallet's state.
 */
export interface MobileWithExpoTokenParams {
  /** Expo push token, e.g. `ExponentPushToken[...]`. */
  expoToken: string;
}

/**
 * Params for {@link MobileClient.getUsernameAvailability}.
 */
export interface GetMobileUsernameAvailabilityParams {
  displayName: string;
}

/**
 * Params for {@link MobileClient.getPublicProfile}.
 */
export type GetMobilePublicProfileParams = Subaccount;

/**
 * Opt-in extras for a profiles lookup. Each one adds fields that are otherwise absent from every returned
 * profile, and costs extra rate-limit weight per profile, so ask only for what the UI shows.
 */
export interface MobileProfilesInclude {
  /** Populates `followerCount` and `followingCount`. */
  followCounts?: boolean;
  /**
   * Populates `followSummary`, relative to `viewAs`. Unlike the signed follow list reads, this viewer
   * identity is an unauthenticated claim — the route takes no signature — so do not treat the result as
   * proof of who is asking.
   */
  followSummary?: { viewAs: Subaccount };
}

/**
 * Params for {@link MobileClient.getProfiles}.
 */
export interface GetMobileProfilesParams {
  /**
   * 1–`MOBILE_PROFILES_MAX_BATCH_SIZE` (25) distinct subaccounts. Duplicates and an empty list are rejected
   * rather than deduplicated, and results come back in this exact order.
   */
  subaccounts: Subaccount[];
  include?: MobileProfilesInclude;
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
 * Params for {@link MobileClient.setUsername}.
 */
export interface MobileSetUsernameParams extends MobileSignedRequestParams {
  /** User-facing name to claim, preserving casing. Must match `MOBILE_DISPLAY_NAME_PATTERN`. */
  displayName: string;
}

/**
 * Params for {@link MobileClient.setPrivateMode}.
 */
export interface MobileSetPrivateModeParams extends MobileSignedRequestParams {
  privateMode: boolean;
}

/**
 * Common params for the signed follow requests. The subaccount carried by {@link MobileSignedRequestParams}
 * is the signing Viewer (the Follower, for mutations); `target` is the other party.
 */
export interface MobileFollowRequestParams extends MobileSignedRequestParams {
  /** The Profile being followed, unfollowed, or read. Must not be the signing subaccount. */
  target: Subaccount;
}

/**
 * Params for {@link MobileClient.setFollow}.
 */
export interface MobileSetFollowParams extends MobileFollowRequestParams {
  /** `true` follows the target, `false` unfollows it. Both directions are idempotent. */
  isFollowing: boolean;
}

/**
 * Common params for a Followers or Following page.
 */
export interface GetMobileFollowListParams extends MobileFollowRequestParams {
  /**
   * Opaque cursor from the previous page's {@link MobileFollowListPage.nextCursor}. Omit for the first page.
   * A cursor is bound to its Viewer, Profile, and list direction — reusing it elsewhere fails with
   * `INVALID_FOLLOW_CURSOR`.
   */
  cursor?: string;
  /**
   * Page size, 1–`MOBILE_FOLLOW_LIST_MAX_PAGE_SIZE` (50); the backend defaults to
   * `MOBILE_FOLLOW_LIST_DEFAULT_PAGE_SIZE` (25) when omitted.
   */
  limit?: number;
}

/**
 * Params for {@link MobileClient.getFollowers}.
 */
export type GetMobileFollowersParams = GetMobileFollowListParams;

/**
 * Params for {@link MobileClient.getFollowing}.
 */
export type GetMobileFollowingParams = GetMobileFollowListParams;

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
export type MobileUnregisterExpoTokenParams = MobileWithExpoTokenParams;

/**
 * Params for {@link MobileClient.updateNotificationPreferences}.
 */
export interface MobileUpdateNotificationPreferencesParams extends MobileWithExpoTokenParams {
  preferences: MobileNotificationPreferences;
}

/**
 * Params for {@link MobileClient.getNotificationPreferences}.
 */
export type GetMobileNotificationPreferencesParams = MobileWithExpoTokenParams;

/**
 * Params for {@link MobileClient.getRegisteredWallet}.
 */
export type GetMobileRegisteredWalletParams = MobileWithExpoTokenParams;
