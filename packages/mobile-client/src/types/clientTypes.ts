import { SignatureParams, Subaccount } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import { Hex } from 'viem';
import {
  MobileFeedMarginMode,
  MobileFeedTradePosition,
  MobileFeedTradePositionDirection,
  MobileNotificationCategory,
  MobileNotificationPlatform,
  MobileSocialFeedCohortStatus,
  MobileSocialFeedHistoryQuality,
  MobileSocialFeedLeverage,
  MobileSocialFeedMarketCategory,
  MobileSocialFeedPnlBasis,
  MobileSocialFeedPnlMode,
  MobileSocialFeedPnlQuality,
  MobileSocialFeedPositionDisplayBasis,
  MobileSocialFeedPositionState,
  MobileSocialFeedReadSessionMode,
  MobileSocialFeedSourceCategory,
  MobileSocialFeedTradeCardAction,
  MobileSocialFeedTradeSizeChangeAction,
  MobileSocialFeedTraderBadgeCode,
  MobileSocialFeedTraderDataStatus,
  MobileSocialFeedType,
  MobileSocialFeedUnavailableTarget,
} from './serverModelTypes';

/**
 * Server-owned preset presented in catalogue order.
 */
export interface MobileAvatarPreset {
  /** Stable preset ID used by setAvatar. */
  id: string;
  /** Public image URL. Fall back to a generated icon if the image fails to load, e.g. after retirement. */
  avatarUrl: string;
}

/**
 * A preset or staged upload to publish. Pass null to clear an avatar.
 */
export type MobileAvatarSelection =
  | {
      /** Shared catalogue selection. */
      type: 'preset';
      /** Stable catalogue ID. */
      id: string;
    }
  | {
      /** An uploaded image awaiting publication. */
      type: 'upload';
      /** Key returned by createAvatarUpload. */
      uploadKey: string;
    };

/**
 * Upload a square JPEG or PNG (up to 4096 × 4096 pixels and `MOBILE_AVATAR_MAX_UPLOAD_BYTES` bytes)
 * using PUT, then publish uploadKey through setAvatar. Publication validates the image; a successful PUT
 * alone does not mean it is accepted.
 */
export interface MobileAvatarUpload {
  /** Staging key, bound to the requesting subaccount. */
  uploadKey: string;
  /** Short-lived signed PUT URL. */
  uploadUrl: string;
  /** Send unchanged, even for PNG: the signed Content-Type is image/jpeg. */
  headers: Record<string, string>;
  /** Upload URL lifetime in seconds from issuance, not from when the response is received. */
  expiresInSeconds: number;
}

/**
 * A subaccount's public profile, as returned by an unsigned profile lookup. Private Mode hides the account's
 * activity, not its profile, so `privateMode` is exposed here too. A subaccount with no identity row still
 * yields a profile, with `null` names and `privateMode: false`.
 *
 * The last three fields are `undefined` unless the matching {@link MobileProfilesInclude} asked for them —
 * absent means "not requested" rather than "none".
 */
export interface MobilePublicProfile extends MobileIdentitySummary {
  /** Public biography, or null when unset. */
  bio: string | null;
  privateMode: boolean;
  /**
   * Exact count at query time rather than a cached counter, including unnamed and private accounts — Private
   * Mode hides activity, not relationships. Requires the `followCounts` include.
   */
  followerCount?: number;
  followingCount?: number;
  /** Requires the `followSummary` include, and is relative to that include's `viewAs`. */
  followSummary?: MobileFollowSummary;
}

/**
 * The identity fields the backend attaches to a subaccount wherever it surfaces one alongside other data.
 * Resolved at read time, so a rename shows up on the next read without any change to the surrounding record.
 */
export interface MobileIdentitySummary {
  subaccount: Hex;
  /** Canonical, lowercased handle; when null, render a local fallback label from `subaccount`. */
  username: string | null;
  /** User-facing name as claimed; when null, render a local fallback label from `subaccount`. */
  displayName: string | null;
  /** Published avatar URL. Use a generated icon when null or when the image fails to load. */
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
   * Whether the `viewAs` Viewer follows this account — not the listed relationship that put it in the page.
   * The Viewer can appear in another Profile's list, and does not follow themself, so their own row is
   * `false`. `undefined` when the request named no `viewAs`, which is a missing perspective rather than a
   * known "not following".
   */
  isFollowing?: boolean;
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
 * A page of profiles whose username starts with the searched prefix. Pagination is live rather than snapshot:
 * a claim or rename between pages can surface a profile twice or skip it, so deduplicate by
 * {@link MobilePublicProfile.subaccount} and restart from `cursor: undefined` on refresh.
 */
export interface MobileProfileSearchPage {
  /** Matches in ascending bytewise username order, with an exact match ahead of longer ones. */
  profiles: MobilePublicProfile[];
  /** `null` means there are no further matches. */
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
 * Opt-in extras for a profiles lookup. Each one adds fields that are otherwise absent from every returned
 * profile, and costs extra rate-limit weight per profile, so ask only for what the UI shows.
 */
export interface MobileProfilesInclude {
  /** Populates `followerCount` and `followingCount`. */
  followCounts?: boolean;
  /**
   * Populates `followSummary`, relative to `viewAs`. This viewer identity is an unauthenticated claim — the
   * route takes no signature — so do not treat the result as proof of who is asking.
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
 * Params for {@link MobileClient.searchProfiles}.
 */
export interface SearchMobileProfilesParams {
  /**
   * Username prefix to match, 1-20 ASCII characters matching `MOBILE_PROFILE_SEARCH_QUERY_PATTERN`: a letter
   * or digit first, then letters, digits, `_` or `.`. Letters match case-insensitively; whitespace is not
   * trimmed, so normalize the input before sending it.
   */
  query: string;
  /** Same opt-in extras as {@link GetMobileProfilesParams.include}, applied to every match on the page. */
  include?: MobileProfilesInclude;
  /**
   * Opaque cursor from the previous page's {@link MobileProfileSearchPage.nextCursor}. Omit for the first
   * page. A cursor is bound to its normalized query but not to `include` or `limit`, so an enriched page
   * can continue an unenriched search; one issued for another query fails with
   * `INVALID_PROFILE_SEARCH_CURSOR`.
   */
  cursor?: string;
  /**
   * Page size, 1-`MOBILE_PROFILE_SEARCH_MAX_PAGE_SIZE` (50), or
   * 1-`MOBILE_PROFILE_SEARCH_MAX_ENRICHED_PAGE_SIZE` (25) when `include` asks for follow data; the backend
   * defaults to `MOBILE_PROFILE_SEARCH_DEFAULT_PAGE_SIZE` (25) when omitted.
   */
  limit?: number;
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
 * Params for {@link MobileClient.setBio}.
 */
export interface MobileSetBioParams extends MobileSignedRequestParams {
  /** Up to `MOBILE_BIO_MAX_LENGTH` (150) Unicode code points without null characters. Whitespace-only text clears the bio. */
  bio: string;
}

/**
 * Params for {@link MobileClient.setAvatar}.
 */
export interface MobileSetAvatarParams extends MobileSignedRequestParams {
  /** Null clears the saved image. */
  avatar: MobileAvatarSelection | null;
}

/**
 * Params for {@link MobileClient.createAvatarUpload}.
 */
export interface MobileCreateAvatarUploadParams extends MobileSignedRequestParams {
  /** Image size as an integer number of bytes, from 1 to `MOBILE_AVATAR_MAX_UPLOAD_BYTES` (5 MiB). */
  contentLength: number;
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
 * Params for {@link MobileClient.setFollow}. The subaccount carried by {@link MobileSignedRequestParams} is
 * the signing Follower; `target` is the Profile on the other end of the relationship.
 */
export interface MobileSetFollowParams extends MobileSignedRequestParams {
  /** The Profile being followed or unfollowed. Must not be the signing subaccount. */
  target: Subaccount;
  /** `true` follows the target, `false` unfollows it. Both directions are idempotent. */
  isFollowing: boolean;
}

/**
 * Common params for a Followers or Following page.
 */
export interface GetMobileFollowListParams {
  /** The Profile whose Followers or Following are being listed. */
  target: Subaccount;
  /**
   * Viewer to resolve the page against, which turns on familiar-first ordering and populates every row's
   * {@link MobileFollowListAccount.isFollowing}. Omit it for a plain recency-ordered list with no
   * `isFollowing` at all. The route is unsigned, so this is an unauthenticated claim rather than proof of
   * who is asking.
   */
  viewAs?: Subaccount;
  /**
   * Opaque cursor from the previous page's {@link MobileFollowListPage.nextCursor}. Omit for the first page.
   * A cursor is bound to its `viewAs` (including its absence), Profile, and list direction — reusing it
   * elsewhere fails with `INVALID_FOLLOW_CURSOR`.
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

/** Official account-level 30-day PnL badge, independent of position PnL. */
export interface MobileSocialFeedTraderBadge {
  /** Qualification tier. */
  code: MobileSocialFeedTraderBadgeCode;
  /** Signed integer in x18 units. */
  pnl: BigNumber;
  /** Stable compatibility identifier for the official Portfolio month result. */
  metricKey: 'account_pnl_30d_equity';
  /** PnL window label. */
  window: '30d';
  /** Official source timestamp in Unix milliseconds. */
  sourceAsOfMs: number;
  /** Fetch completion timestamp in Unix milliseconds. */
  fetchedAtMs: number;
  /** Qualification snapshot UUID. */
  snapshotId: string;
}

/** Public author identity and the selected viewing account's follow state. */
export interface MobileSocialFeedAuthor extends MobileIdentitySummary {
  /** Selected viewAs account's follow state; null without a viewing account. */
  isFollowing: boolean | null;
  /** Null when no qualifying badge is available. */
  traderBadge: MobileSocialFeedTraderBadge | null;
  /** Stale means the last successful cohort is used after a refresh failure. */
  traderDataStatus: MobileSocialFeedTraderDataStatus;
}

/** Market metadata from the service's authoritative market source. */
export interface MobileSocialFeedMarket {
  /** Market product ID. */
  productId: number;
  /** Market symbol. */
  symbol: string;
  /** Logo URL when available. */
  logoUrl: string | null;
  /** Social feed category when known. */
  category: MobileSocialFeedMarketCategory | null;
  /** Original market categories. */
  sourceCategories: MobileSocialFeedSourceCategory[];
}

/** Position PnL with explicit accounting basis and data quality. */
export interface MobileSocialFeedPnl {
  /** Signed x18 integer; null means unknown, not zero. */
  amount: BigNumber | null;
  /** Open positions exclude fees/funding; closed results include them. */
  basis: MobileSocialFeedPnlBasis;
  /** Closed positions use frozen results. */
  mode: MobileSocialFeedPnlMode;
  /** Source timestamp in Unix milliseconds. */
  asOfMs: number;
  /** Whether accounting is complete, pending, or unavailable. */
  quality: MobileSocialFeedPnlQuality;
}

/** Complete mutable position fields delivered together at one version. */
export interface MobileSocialFeedPositionPatch {
  /** Position lifecycle UUID. */
  positionId: string;
  /** Positive integer string; compare as integers without Number conversion. */
  positionVersion: string;
  /** Position state timestamp in Unix milliseconds. */
  stateAsOfMs: number;
  /** Remaining average entry price in decimal units, frozen on close; null if unknown. */
  entryPrice: BigNumber | null;
  /** Basis of the displayed size and entry price. */
  displayBasis: MobileSocialFeedPositionDisplayBasis;
  /** Closing snapshot reference time, or null. */
  snapshotAtMs: number | null;
  /** Absolute quantity in x18 units. */
  quantity: BigNumber;
  /** Notional value in x18 units. */
  notional: BigNumber;
  /** Current lifecycle state. */
  state: MobileSocialFeedPositionState;
  /** Completeness of the available historical facts. */
  historyQuality: MobileSocialFeedHistoryQuality;
  /** Margin mode. */
  marginMode: MobileFeedMarginMode;
  /** Current or closing leverage. */
  leverage: MobileSocialFeedLeverage;
  /** Leverage reference time; null when unknown or inapplicable. */
  leverageAtMs: number | null;
  /** Current remaining PnL or the closed lifecycle's net result. */
  pnl: MobileSocialFeedPnl;
}

/** Position displayed inside an automatic trade card. */
export interface MobileSocialFeedPositionCard extends MobileSocialFeedPositionPatch {
  /** Market product ID. */
  productId: number;
  /** Market display metadata. */
  market: MobileSocialFeedMarket;
  /** Position direction. */
  direction: MobileFeedTradePositionDirection;
}

/** Interaction counters; interaction writes are not currently available. */
export interface MobileSocialFeedInteraction {
  /** Number of likes. */
  likeCount: number;
  /** Number of comments. */
  commentCount: number;
  /** Number of recorded views. */
  viewCount: number;
  /** Null while likes are unavailable, including with a viewing account. */
  likedByMe: boolean | null;
}

/** Capability flags for a social feed item. */
export interface MobileSocialFeedCapabilities {
  /** Whether liking is available. */
  canLike: boolean;
  /** Whether commenting is available. */
  canComment: boolean;
  /** Whether exposure recording is available. */
  canRecordView: boolean;
}

/** Comment preview metadata for a social trade card. */
export interface MobileSocialFeedCommentPreview {
  /** Currently empty. */
  items: never[];
  /** Comment count. */
  totalCount: number;
  /** Comment cursor, if available. */
  nextCursor: string | null;
}

/** Exposure requirements associated with a reading session. */
export interface MobileSocialFeedViewTracking {
  /** Required visible fraction. */
  minVisibleRatio: number;
  /** Required visible duration in milliseconds. */
  minDurationMs: number;
}

/** Coverage of the candidate authors in a qualification snapshot. */
export interface MobileSocialFeedCohortCoverage {
  /** Coverage domain. */
  scope: 'eligible_content_candidates';
  /** Candidate author count. */
  totalAuthors: number;
  /** Authors queried for this snapshot. */
  queriedAuthors: number;
  /** A successful response requires complete coverage. */
  complete: true;
}

/** Shared qualification snapshot used for Top Traders eligibility and badges. */
export interface MobileSocialFeedCohort {
  /** Cohort UUID. */
  snapshotId: string;
  /** Ready or the previous successful snapshot after a refresh failure. */
  status: MobileSocialFeedCohortStatus;
  /** Coverage of all eligible candidate authors. */
  coverage: MobileSocialFeedCohortCoverage;
}

/** Metadata shared by the automatic trade cards and rows available from the social feed. */
export interface MobileSocialFeedItemBase {
  /** Item UUID. */
  id: string;
  /** Whether authored analysis exists. */
  hasAnalysis: boolean;
  /** Drawings are not currently available. */
  drawing: null;
  /** Author identity, badge, and follow perspective. */
  author: MobileSocialFeedAuthor;
  /** Creation time in Unix milliseconds. */
  createdAtMs: number;
  /** Sorting time in Unix milliseconds. */
  displayAtMs: number;
  /** Positive integer version string. */
  version: string;
  /** Market metadata. */
  market: MobileSocialFeedMarket;
  /** Server capability flags; currently all false. */
  capabilities: MobileSocialFeedCapabilities;
}

/** Automatic trade card returned by the social feed. */
export interface MobileSocialFeedTradeCard extends MobileSocialFeedItemBase {
  /** Card discriminant. */
  kind: 'trade_card';
  /** Trading action. */
  action: MobileSocialFeedTradeCardAction;
  /** Card text, empty for automatic cards. */
  text: string;
  /** Automatic cards have no mentions. */
  mentions: never[];
  /** Current or frozen position display. */
  position: MobileSocialFeedPositionCard;
  /** Interaction counters. */
  interaction: MobileSocialFeedInteraction;
  /** Comment content is not currently available. */
  commentPreview: MobileSocialFeedCommentPreview;
}

/** Fields shared by size-change and liquidation trade rows. */
export interface MobileSocialFeedTradeRowBase extends MobileSocialFeedItemBase {
  /** Row discriminant. */
  kind: 'trade_row';
  /** Associated lifecycle UUID. */
  positionId: string;
  /** Position direction. */
  direction: MobileFeedTradePositionDirection;
  /** Historical margin mode. */
  marginMode: MobileFeedMarginMode;
  /** Historical action leverage, not the position's current leverage. */
  leverage: MobileSocialFeedLeverage;
  /** Historical leverage reference time. */
  leverageAtMs: number | null;
  /** Number of aggregated trades. */
  tradeCount: number;
  /** Absolute traded quantity in x18 units. */
  quantity: BigNumber;
  /** Actual execution price in decimal units, never an Oracle substitution. */
  averagePrice: BigNumber | null;
}

/** A size-change row or liquidation row with independently nullable financial facts. */
export type MobileSocialFeedTradeRow = MobileSocialFeedTradeRowBase &
  (
    | {
        /** Ordinary size-change action. */
        action: MobileSocialFeedTradeSizeChangeAction;
        /** Executed notional in x18 units. */
        notional: BigNumber;
      }
    | {
        /** Liquidation discriminant. */
        action: 'liquidated';
        /** Quantity times event Oracle; null if that Oracle is unknown. */
        notional: BigNumber | null;
        /** Entry price immediately before the event, in decimal units. */
        entryPrice: BigNumber | null;
        /** Event Oracle price in decimal units, used for display and size filtering. */
        liquidationOraclePrice: BigNumber | null;
        /** Actual execution price in decimal units, independent of Oracle. */
        liquidationExecutionPrice: BigNumber | null;
        /** Signed action PnL excluding ordinary fees/funding, or null. */
        realizedPnlDelta: BigNumber | null;
      }
  );

/** Automatic feed content; excludes posts, replies, drawings, and interaction writes. */
export type MobileSocialFeedItem =
  | MobileSocialFeedTradeCard
  | MobileSocialFeedTradeRow;

/** Fixed-duration social feed reading session. Credentials and cursors must be returned unchanged. */
export interface MobileSocialFeedReadSession {
  /** Session identifier. */
  sessionId: string;
  /** Feed or direct item session. */
  mode: MobileSocialFeedReadSessionMode;
  /** Fixed expiration time in Unix milliseconds; pagination does not extend it. */
  expiresAtMs: number;
  /** Exposure metadata only; recording is not available from the social feed. */
  viewTracking: MobileSocialFeedViewTracking;
  /** Initial update baseline, distinct from the page cursor. */
  updateCursor: string | null;
  /** Credential for this reading session. Do not log or cache publicly. */
  viewerToken: string;
}

/** Fixed-window list response; an empty page can still have a next cursor. */
export interface MobileSocialFeedPage {
  /** Reading session and its browser credential. */
  readSession: MobileSocialFeedReadSession;
  /** Visible items in server order; deduplicate by ID without local reordering. */
  items: MobileSocialFeedItem[];
  /** Opaque cursor; null only when pagination is complete. */
  nextCursor: string | null;
  /** New-content baseline, not a pagination or update cursor. */
  watermark: string;
}

/** Main-feed page with its ordering version. */
export interface MobileSocialFeedRankedPage extends MobileSocialFeedPage {
  /** Current ordering contract: chronological-v1. */
  rankingVersion: string;
}

/** Top Traders page, with one shared qualification snapshot for eligibility and badges. */
export interface MobileSocialFeedTopTradersPage extends MobileSocialFeedRankedPage {
  /** Author eligibility snapshot. */
  cohort: MobileSocialFeedCohort;
}

/** Item details with either a new item session or the reused authorized session. */
export interface MobileSocialFeedItemResponse {
  /** Full visible item. */
  item: MobileSocialFeedItem;
  /** Session authorized for subsequent updates. */
  readSession: MobileSocialFeedReadSession;
}

/** Item delta: omitted means unchanged; explicit null clears a prior value. */
export interface MobileSocialFeedItemPatch {
  /** Current author identity, follow state, and qualification badge. */
  author: MobileSocialFeedAuthor;
  /** Target item UUID. */
  itemId: string;
  /** Positive integer version string. */
  version: string;
  /** Updated interaction counters. */
  interaction?: MobileSocialFeedInteraction;
  /** Updated display timestamp; does not reorder the current list. */
  displayAtMs: number;
  /** Updated aggregate count. */
  tradeCount?: number;
  /** Updated quantity in x18 units. */
  quantity?: BigNumber;
  /** Updated notional; liquidation Oracle may be unknown. */
  notional?: BigNumber | null;
  /** Updated actual execution price in decimal units. */
  averagePrice?: BigNumber | null;
  /** Historical liquidation entry price in decimal units. */
  entryPrice?: BigNumber | null;
  /** Updated liquidation Oracle price in decimal units. */
  liquidationOraclePrice?: BigNumber | null;
  /** Updated actual liquidation execution price in decimal units. */
  liquidationExecutionPrice?: BigNumber | null;
  /** Updated signed action PnL. */
  realizedPnlDelta?: BigNumber | null;
  /** Updated historical row leverage. */
  leverage?: MobileSocialFeedLeverage;
  /** Updated historical leverage reference time. */
  leverageAtMs?: number | null;
}

/** Batched viewport updates; apply only the current viewport's latest request sequence. */
export interface MobileSocialFeedUpdates {
  /** Item deltas, independent of current-position patches. */
  itemPatches: MobileSocialFeedItemPatch[];
  /** Complete mutable position facts at one version. */
  positionPatches: MobileSocialFeedPositionPatch[];
  /** Previously authorized targets that can no longer be read. */
  unavailableTargets: MobileSocialFeedUnavailableTarget[];
  /** New-content hint; always zero for directly created item sessions. */
  newItemsCount: number;
  /** Baseline to use for the next update call with the same viewport. */
  updateCursor: string;
  /** Full snapshot of applicable mutable fields; currently always true. Apply author updates even when the item version is unchanged. */
  reset: boolean;
  /** Echoed viewport revision. */
  viewportRevision: number;
  /** Echoed request sequence. */
  requestSeq: number;
}

/** Public browsing requires no wallet, identity registration, or one-click trading setup. */
export interface MobileSocialFeedReadParams {
  /**
   * Non-isolated viewing account used for relationship state. Profile, position, and item reads also
   * include that account's own hidden content under the account_view policy; this does not prove ownership.
   */
  viewAs?: Subaccount;
  /** Reuse the original browser credential for pagination and existing sessions. */
  viewerToken?: string;
}

/** Filters and fixed-session pagination common to all six social feed lists. */
export interface MobileSocialFeedListParams {
  /** OR-ed content filters; empty or omitted means all. */
  feedTypes?: MobileSocialFeedType[];
  /** Strict minimum in whole dollars, including 500; omit for all sizes. */
  minimumNotional?: number;
  /** Page size, 1–50; server default is 20. */
  limit?: number;
  /** Required with cursor; reuse the original filters, target, viewAs, credential, and limit. */
  sessionId?: string;
  /** Opaque cursor returned by nextCursor. Never substitute an update cursor. */
  cursor?: string;
}

/** Common filters and viewing context for main feeds and author feeds. */
export interface MobileSocialFeedCategorizedParams
  extends MobileSocialFeedListParams, MobileSocialFeedReadParams {
  /** Omit to include all market categories. */
  marketCategory?: MobileSocialFeedMarketCategory;
}

/** For You request with optional market category and viewing account. */
export type GetMobileForYouFeedParams = MobileSocialFeedCategorizedParams;

/** Top Traders request; eligibility uses account PnL and results remain chronological. */
export type GetMobileTopTradersFeedParams = MobileSocialFeedCategorizedParams;

/** Public content from the selected account's follow graph; no signature is required. */
export type GetMobileFriendsFeedParams = MobileSocialFeedCategorizedParams & {
  /** Required on every request, including pagination; no existing identity row is needed. */
  viewAs: Subaccount;
};

/** Author list request; the target is distinct from the viewing account. */
export type GetMobileProfileFeedParams = MobileSocialFeedCategorizedParams & {
  /** Target author, independent of the viewAs account. */
  subaccount: Subaccount;
};

/** Market list request; marketCategory is not accepted. */
export type GetMobileMarketFeedParams = MobileSocialFeedListParams &
  MobileSocialFeedReadParams & {
    /** Non-negative target product ID. */
    productId: number;
  };

/** Published content in a lifecycle, not the complete position history. */
export type GetMobilePositionFeedParams = MobileSocialFeedListParams &
  MobileSocialFeedReadParams & {
    /** Target position UUID. */
    positionId: string;
  };

/** Item request; omit sessionId to create an item reading session directly. */
export type GetMobileFeedItemParams = MobileSocialFeedReadParams & {
  /** Target item UUID. */
  itemId: string;
  /** Preview size, 0–3. */
  commentPreviewLimit?: number;
  /** Existing session authorized for the item. */
  sessionId?: string;
};

/** Viewport update request; requires the original viewerToken. */
export type GetMobileFeedUpdatesParams = {
  /** Inherited from the original session; updates cannot select a different viewing account. */
  viewAs?: never;
  /** Current reading session. */
  sessionId: string;
  /** Up to 50 distinct, already delivered item UUIDs. */
  visibleItemIds: string[];
  /** Up to 20 distinct, authorized position UUIDs. */
  visiblePositionIds: string[];
  /** Baseline from the last accepted update; omit for a changed viewport. */
  updateCursor?: string | null;
  /** Increment whenever the visible set changes. */
  viewportRevision: number;
  /** Increment on every request within the session, including after viewport changes; never reset for a new viewport. */
  requestSeq: number;
  /** Credential belonging to the original public session. */
  viewerToken: string;
};
