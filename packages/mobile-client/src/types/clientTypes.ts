import { SignatureParams, Subaccount } from '@nadohq/shared';
import BigNumber from 'bignumber.js';
import { Hex } from 'viem';
import {
  MobileFeedMarginMode,
  MobileFeedTradePosition,
  MobileFeedTradePositionDirection,
  MobileNotificationCategory,
  MobileNotificationMinTradeSizeUsd,
  MobileNotificationPlatform,
  MobileNotificationPositionThreshold,
  MobileNotificationRouteName,
  MobileNotificationTypeId,
  MobileSocialFeedAction,
  MobileSocialFeedActionPriceBasis,
  MobileSocialFeedActionResolution,
  MobileSocialFeedActionUnavailableReason,
  MobileSocialFeedAttachmentStatus,
  MobileSocialFeedChartDataQuality,
  MobileSocialFeedChartInterval,
  MobileSocialFeedCohortStatus,
  MobileSocialFeedHistoryQuality,
  MobileSocialFeedLeverage,
  MobileSocialFeedLiquidationPriceQuality,
  MobileSocialFeedMarketCategory,
  MobileSocialFeedMention,
  MobileSocialFeedPnlBasis,
  MobileSocialFeedPnlMode,
  MobileSocialFeedPnlQuality,
  MobileSocialFeedPositionDisplayBasis,
  MobileSocialFeedPositionResolution,
  MobileSocialFeedPositionResolutionReason,
  MobileSocialFeedPositionState,
  MobileSocialFeedPresenceState,
  MobileSocialFeedReadSessionMode,
  MobileSocialFeedSourceCategory,
  MobileSocialFeedTradeCardAction,
  MobileSocialFeedTradeSizeChangeAction,
  MobileSocialFeedTraderBadgeCode,
  MobileSocialFeedTraderDataStatus,
  MobileSocialFeedTradingResolution,
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
 * Post-commit state of one target in a batch follow or unfollow. The whole batch commits in one database
 * transaction, so these values are authoritative — apply them rather than re-reading.
 */
export interface MobileFollowBatchResultItem {
  /** The requested target, as lowercase hex. */
  subaccount: Hex;
  isFollowing: boolean;
  /** The *target's* follower count after the batch, not the sender's. */
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

/** Device capabilities declared when registering a v2 device. */
export interface MobileNotificationCapabilities {
  /** Registration accepts only the v2 protocol. */
  payloadVersions: [2];
  /** Notification types the device can handle. */
  typeIds: MobileNotificationTypeId[];
  /** Supported named navigation destinations. */
  routes: MobileNotificationRouteName[];
}

/** Latest device generation and saved capabilities, including legacy registrations. */
export interface MobileNotificationRegistrationV2 {
  /** Opaque generation string; do not convert to a JavaScript number. */
  registrationGeneration: string;
  /** Legacy registrations have empty type and route lists. */
  capabilities: {
    /** The single saved protocol version. */
    payloadVersions: [1] | [2];
    /** Supported notification types. */
    typeIds: MobileNotificationTypeId[];
    /** Supported navigation destinations. */
    routes: MobileNotificationRouteName[];
  };
}

/** Complete wallet-level notification settings; every field is required on replacement. */
export interface MobileNotificationSettings {
  /** Own position milestones and the initial weekly digest. */
  myPositions: boolean;
  /** Unique milestone thresholds; the minimum selects the starting tier. */
  positionThresholds: MobileNotificationPositionThreshold[];
  /** Combined order fill/update switch; does not control liquidation notifications. */
  myOrders: boolean;
  /** Ordinary followed-trader notifications; enabled bells override this switch. */
  followingTrades: boolean;
  /** Notifications about posts by followed traders. */
  followingPosts: boolean;
  /** Minimum trade size for trade notifications, in whole USD. */
  minTradeSizeUsd: MobileNotificationMinTradeSizeUsd;
  /** New followers and follow-backs. */
  newFollowers: boolean;
  /** Maps to the legacy announcement preference. */
  announcements: boolean;
  /** Opt-in trader streak and account drama discovery notifications. */
  discovery: boolean;
}

/** Versioned settings document returned by v2 reads and writes. */
export interface MobileNotificationSettingsV2 {
  /** Settings schema version. */
  schemaVersion: 2;
  /** Settings revision, independent of subscription revisions. */
  revision: number;
  /** Full saved settings. */
  settings: MobileNotificationSettings;
}

/** Wallet market subscriptions and the signing Identity's enabled trader bells. */
export interface MobileNotificationSubscriptions {
  /** Wallet-level subscription revision; refresh after every mutation. */
  revision: number;
  /** Whether the one-time local favorites import has completed. */
  favoritesImported: boolean;
  /** Subscribed market IDs in ascending order. */
  marketIds: number[];
  /** Followed subaccounts with enabled bells, encoded as bytes32. */
  traderBells: Hex[];
}

/** Exactly one revision-guarded subscription operation; the SDK fills unused wire fields with null. */
export type MobileNotificationSubscriptionsUpdate = {
  /** Latest subscription revision, not the settings revision. */
  expectedRevision: number;
} & (
  | {
      /** Set a bell; enabling requires an existing follow relationship. */
      traderBell: {
        /** Target non-isolated subaccount belonging to another wallet. */
        subaccount: Subaccount;
        /** Desired bell state. */
        enabled: boolean;
      };
      /** Cannot be combined with a trader bell operation. */
      market?: never;
      /** Cannot be combined with a trader bell operation. */
      importMarkets?: never;
    }
  | {
      /** Subscribe or unsubscribe one known market. */
      market: {
        /** Positive product ID. */
        productId: number;
        /** Desired subscription state. */
        subscribed: boolean;
      };
      /** Cannot be combined with a market operation. */
      traderBell?: never;
      /** Cannot be combined with a market operation. */
      importMarkets?: never;
    }
  | {
      /** One-time merge of up to 500 local market IDs. */
      importMarkets: number[];
      /** Cannot be combined with an import operation. */
      traderBell?: never;
      /** Cannot be combined with an import operation. */
      market?: never;
    }
);

/** Allowlisted notification destination; never interpret it as an arbitrary URL. */
export type MobileNotificationRoute =
  | {
      /** Public profile destination. */
      name: 'profile';
      /** Profile subaccount as bytes32. */
      subaccount: Hex;
    }
  | {
      /** Market destination. */
      name: 'market';
      /** Positive product ID. */
      productId: number;
    }
  | {
      /** Own portfolio destination. */
      name: 'portfolio';
    };

/** V2 push/inbox navigation data, not a complete historical trade or notification body. */
export interface MobileNotificationPayloadV2 {
  /** Payload protocol version. */
  payloadVersion: 2;
  /** Logical notification UUID for click deduplication. */
  notificationId: string;
  /** Intended wallet; private navigation must wait for this wallet to connect. */
  recipientWallet: Hex;
  /** Registered notification type. */
  typeId: MobileNotificationTypeId;
  /** Supported template version. */
  templateVersion: 1;
  /** Named destination and its parameters. */
  route: MobileNotificationRoute;
}

/** Accepted logical notification; does not prove device delivery or read status. */
export interface MobileNotificationInboxItem {
  /** Logical notification UUID. */
  notificationId: string;
  /** Registered notification type. */
  typeId: MobileNotificationTypeId;
  /** Navigation data, without title, body, or read state. */
  data: MobileNotificationPayloadV2;
  /** Intent acceptance time in milliseconds. */
  createdAt: number;
  /** Backend-computed trade attribution. */
  tradeWithin24h: boolean;
}

/** Private notification page, ordered newest first. */
export interface MobileNotificationInboxV2 {
  /** Accepted intents owned by the signing wallet. */
  notifications: MobileNotificationInboxItem[];
  /** Pass unchanged to the next request, or null when pagination is complete. */
  nextCursor: string | null;
}

/** Analytics event with the fields required by its interaction; unused wire fields are filled with null. */
export type MobileProductEvent = {
  /** Stable event UUID; reuse across retries. */
  clientEventId: string;
  /** Actual event time in milliseconds, within the past 7 days or next 5 minutes. */
  occurredAt: number;
} & (
  | {
      /** Notification open; not a read-state mutation. */
      eventName: 'notif_opened';
      /** Notification owned by the signing wallet. */
      notificationId: string;
      /** Not used for notification opens. */
      productId?: never;
      /** Not used for notification opens. */
      query?: never;
    }
  | {
      /** Market or chart interaction. */
      eventName: 'market_viewed' | 'chart_opened';
      /** Positive product ID. */
      productId: number;
      /** Not used for market/chart interactions. */
      notificationId?: never;
      /** Not used for market/chart interactions. */
      query?: never;
    }
  | {
      /** Search interaction. */
      eventName: 'search';
      /** Nonblank search query, at most 80 Unicode characters. */
      query: string;
      /** Not used for searches. */
      notificationId?: never;
      /** Not used for searches. */
      productId?: never;
    }
);

/**
 * Common params for signed requests that authenticate as a given subaccount.
 */
export interface MobileSignedRequestParams extends Subaccount, SignatureParams {
  /**
   * Optional nonce from {@link getMobileNonce}. For clock synchronization, use EngineWebClient.getTime()
   * from @nadohq/engine-client as a reference; the mobile service has no time endpoint. The receive deadline
   * must be later than mobile server time and no more than 100 seconds ahead, expressed in milliseconds.
   * The SDK does not fetch server time automatically.
   */
  nonce?: bigint;
}

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
   * defaults to 25 when omitted.
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
 * Params for {@link MobileClient.setFollowBatch}. The subaccount carried by {@link MobileSignedRequestParams}
 * is the signing Follower; `targets` are the Profiles on the other end of each relationship.
 */
export interface MobileSetFollowBatchParams extends MobileSignedRequestParams {
  /**
   * 1 to `MOBILE_FOLLOW_BATCH_MAX_SIZE` (25) distinct Profiles, none of them the signing subaccount or an
   * isolated subaccount. The results keep this order.
   */
  targets: Subaccount[];
  /** `true` follows every target, `false` unfollows every target. Both directions are idempotent. */
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
export interface MobileRegisterExpoTokenParams
  extends MobileSignedRequestParams, MobileWithExpoTokenParams {
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

/**
 * Params for {@link MobileClient.registerExpoTokenV2}.
 */
export interface MobileRegisterExpoTokenV2Params extends MobileRegisterExpoTokenParams {
  /** Actual notification types and routes supported by this device. */
  capabilities: MobileNotificationCapabilities;
}

/**
 * Params for {@link MobileClient.getNotificationRegistrationV2}.
 */
export type GetMobileNotificationRegistrationV2Params =
  MobileWithExpoTokenParams;

/**
 * Params for {@link MobileClient.getNotificationSettingsV2}.
 */
export type GetMobileNotificationSettingsV2Params = MobileWithExpoTokenParams;

/**
 * Params for {@link MobileClient.updateNotificationSettingsV2}.
 */
export interface MobileUpdateNotificationSettingsV2Params extends MobileWithExpoTokenParams {
  /** Latest settings revision; stale values fail with 6203. */
  expectedRevision: number;
  /** Full replacement, not a partial patch. */
  settings: MobileNotificationSettings;
}

/**
 * Params for {@link MobileClient.getNotificationSubscriptions}; no Expo token is needed.
 */
export type GetMobileNotificationSubscriptionsParams =
  MobileSignedRequestParams;

/**
 * Params for {@link MobileClient.updateNotificationSubscriptions}.
 */
export interface MobileUpdateNotificationSubscriptionsParams extends MobileSignedRequestParams {
  /** Exactly one operation, with the latest subscription revision. */
  update: MobileNotificationSubscriptionsUpdate;
}

/**
 * Params for {@link MobileClient.getNotificationInboxV2}; no Expo token is needed.
 */
export interface GetMobileNotificationInboxV2Params extends MobileSignedRequestParams {
  /** Previous nextCursor; omit or pass null for the first page. */
  cursor?: string | null;
  /** Page size from 1 to 50; omission/null uses the server default of 20. */
  limit?: number | null;
}

/**
 * Params for {@link MobileClient.recordProductEvents}.
 */
export interface MobileRecordProductEventsParams extends MobileSignedRequestParams {
  /** One to fifty events, validated and committed atomically. */
  events: MobileProductEvent[];
}

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
  /** Additional metrics for a position history session, when supplied. */
  currentPosition?: MobileSocialFeedHistoryMetrics;
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

/** Interaction counters and the viewing account's relationship state. */
export interface MobileSocialFeedInteraction {
  /** Number of likes. */
  likeCount: number;
  /** Number of comments. */
  commentCount: number;
  /** Number of recorded views. */
  viewCount: number;
  /** Null when no viewing account is selected. */
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
  /** Most recent readable replies. */
  items: MobileSocialFeedReply[];
  /** Comment count. */
  totalCount: number;
  /** Comment cursor, if available. */
  nextCursor: string | null;
}

/** Exposure requirements associated with a reading session. */
export interface MobileSocialFeedViewTracking {
  /**
   * Detail-visit exposure: report the primary detail target after it is shown in the foreground.
   * List visible-ratio / dwell thresholds are no longer used.
   */
  mode: 'detail_visit';
}

/** Uploaded feed image metadata; bytes are fetched separately with the reading session. */
export interface MobileSocialFeedUploadedImage {
  /** Image UUID. */
  imageId: string;
  /** Backend path for the original image bytes. */
  url: string;
  /** Display-orientation width in pixels. */
  width: number;
  /** Display-orientation height in pixels. */
  height: number;
  /** Detected content type. */
  contentType: 'image/jpeg' | 'image/png';
  /** Original file size in bytes. */
  byteSize: number;
  /** Always-present thumbnail (longest edge ≤ 512, never upscaled). */
  thumbnail: MobileSocialFeedImageThumbnail;
}

/** External image loaded directly from its URL without Mobile session headers. */
export interface MobileSocialFeedExternalImage {
  /** Original HTTP/HTTPS URL; no upload metadata or thumbnail is provided. */
  url: string;
}

/** Uploaded image metadata or an external URL; uploaded images precede external images. */
export type MobileSocialFeedImage =
  | MobileSocialFeedUploadedImage
  | MobileSocialFeedExternalImage;

/** Thumbnail metadata for an uploaded feed image. */
export interface MobileSocialFeedImageThumbnail {
  /** Backend path for the thumbnail bytes. */
  url: string;
  /** Thumbnail width in pixels. */
  width: number;
  /** Thumbnail height in pixels. */
  height: number;
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

/** Metadata shared by social feed content. */
export interface MobileSocialFeedItemBase {
  /** Item UUID. */
  id: string;
  /** Whether authored analysis exists. */
  hasAnalysis: boolean;
  /** Parsed drawing document, or null when no drawing is readable. */
  drawing: MobileSocialFeedDrawing | null;
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
  /** Server capability flags, subject to the corresponding write switches. */
  capabilities: MobileSocialFeedCapabilities;
}

/** Content shared by authored posts and trade cards. */
export interface MobileSocialFeedContentBase extends MobileSocialFeedItemBase {
  /** Bound images in display order; empty when none. */
  images: MobileSocialFeedImage[];
  /** Card text, empty for automatic cards. */
  text: string;
  /** Mentions in the original, unmodified text. */
  mentions: MobileSocialFeedMention[];
  /** Current or frozen position display. */
  position: MobileSocialFeedPositionCard;
  /** Interaction counters. */
  interaction: MobileSocialFeedInteraction;
  /** Readable comment preview. */
  commentPreview: MobileSocialFeedCommentPreview;
}

/** Trade card with optional authored text and analysis. */
export interface MobileSocialFeedTradeCard extends MobileSocialFeedContentBase {
  /** Card discriminant. */
  kind: 'trade_card';
  /** Trading action. */
  action: MobileSocialFeedTradeCardAction;
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

/** Discriminated social feed content. */
export type MobileSocialFeedItem =
  | MobileSocialFeedTradeCard
  | MobileSocialFeedTradeRow
  | MobileSocialFeedPost
  | MobileSocialFeedReply;

/** Idle-renewed social feed reading session. Credentials and cursors must be returned unchanged. */
export interface MobileSocialFeedReadSession {
  /** Session identifier. */
  sessionId: string;
  /** Feed, item, or full position history session. */
  mode: MobileSocialFeedReadSessionMode;
  /** Current idle expiration in Unix milliseconds; legitimate session requests renew it. */
  expiresAtMs: number;
  /** Visibility requirements for explicit exposure reporting. */
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
  /** Updated reply attachment; null clears it, omission leaves it unchanged. */
  attachedPosition?: MobileSocialFeedPositionCard | null;
  /** Updated reply attachment visibility. */
  attachmentStatus?: MobileSocialFeedAttachmentStatus;
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
  /**
   * Detail-visit event UUID generated once per real navigation into this item.
   * Reuse the same value on retries for the same visit; omit for prefetch.
   * Registering the event does not increment the view count by itself.
   */
  viewEventId?: string;
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

/** Parsed drawing; data is opaque to the SDK and may legitimately be false or zero. */
export interface MobileSocialFeedDrawing {
  /** Already parsed drawing document; do not JSON.parse again. */
  data: unknown;
  /** Original creation time in milliseconds. */
  createdAtMs: number;
  /** Last update time in milliseconds. */
  updatedAtMs: number;
}

/** Nonrecursive root-post preview carried by replies. */
export interface MobileSocialFeedCompactCard {
  /** Root item UUID. */
  id: string;
  /** Root author. */
  author: MobileSocialFeedAuthor;
  /** Original text excerpt. */
  textExcerpt: string;
  /** Visible position summary, or null. */
  position: Pick<
    MobileSocialFeedPositionCard,
    'positionId' | 'market' | 'direction' | 'state' | 'notional'
  > | null;
  /** Whether the root has published analysis. */
  hasAnalysis: boolean;
}

/** Authored position post, including text-only, drawing-only, and combined content. */
export interface MobileSocialFeedPost extends MobileSocialFeedContentBase {
  /** Post discriminant. */
  kind: 'post';
}

/** Reply with independently permissioned position attachment and nonrecursive root preview. */
export interface MobileSocialFeedReply extends MobileSocialFeedItemBase {
  /** Reply discriminant. */
  kind: 'reply';
  /** Bound images in display order; empty when none. */
  images: MobileSocialFeedImage[];
  /** Original text. */
  text: string;
  /** Mentions in the text. */
  mentions: MobileSocialFeedMention[];
  /** Actual root item UUID. */
  rootItemId: string;
  /** Omitted for a direct reply to the root. */
  replyToItemId?: string;
  /** Author being replied to, or null. */
  replyToAuthor: MobileSocialFeedAuthor | null;
  /** Readable attachment; null when absent or unavailable. */
  attachedPosition: MobileSocialFeedPositionCard | null;
  /** Distinguishes an absent attachment from an unreadable one. */
  attachmentStatus: MobileSocialFeedAttachmentStatus;
  /** Root preview; does not register root exposure. */
  original: MobileSocialFeedCompactCard;
  /** Reply interaction state. */
  interaction: MobileSocialFeedInteraction;
}

/** Current eligibility hints; actual writes still recheck the signed author. */
export interface MobileSocialFeedPublishablePosition {
  /** Candidate position. */
  position: MobileSocialFeedPositionCard;
  /** Whether this account can publish. */
  canPublish: boolean;
  /** Whether this account can attach the position to a comment. */
  canAttachToComment: boolean;
  /** Whether this account can first add analysis. */
  canDrawAnalysis: boolean;
  /** Unavailability explanation, or null. */
  unavailableReason: string | null;
}

/** An authoritative lifecycle segment of an order. */
export interface MobileSocialFeedActionCandidate {
  /** Action UUID. */
  actionId: string;
  /** Lifecycle UUID. */
  positionId: string;
  /** Lifecycle action. */
  action: MobileSocialFeedAction;
  /** Current publishing eligibility, not proof of caller ownership. */
  canPublish: boolean;
  /** Publication restriction, or null when eligible. */
  unavailableReason: MobileSocialFeedActionUnavailableReason | null;
}

/** Additional history metrics; unavailable values are not zero. */
export interface MobileSocialFeedHistoryMetrics {
  /** Estimated liquidation price in decimal units, independent of event Oracle and execution prices. */
  estimatedLiquidationPrice: BigNumber | null;
  /** Availability of the estimated price. */
  liquidationPriceQuality: MobileSocialFeedLiquidationPriceQuality;
  /** Source time in milliseconds. */
  liquidationPriceAsOfMs: number | null;
  /** Signed funding amount in x18. */
  fundingPnl: BigNumber | null;
  /** Funding availability. */
  fundingQuality: MobileSocialFeedPnlQuality;
  /** Funding source time in milliseconds. */
  fundingAsOfMs: number | null;
}

/** Full position card displayed above its historical timeline. */
export interface MobileSocialFeedPositionHistoryCard
  extends MobileSocialFeedPositionCard, MobileSocialFeedHistoryMetrics {}

/** Persisted action facts, independent of whether a feed item was published. */
export interface MobileSocialFeedPositionAction {
  /** Action UUID. */
  id: string;
  /** Lifecycle UUID. */
  positionId: string;
  /** Lifecycle action. */
  action: MobileSocialFeedAction;
  /** Position direction. */
  direction: MobileFeedTradePositionDirection;
  /** Historical margin mode. */
  marginMode: MobileFeedMarginMode;
  /** Quantity before the action, in x18. */
  quantityBefore: BigNumber;
  /** Quantity after the action, in x18. */
  quantityAfter: BigNumber;
  /** Executed quantity, in x18. */
  executedQuantity: BigNumber;
  /** Actual executed notional in x18; may be unknown for liquidation. */
  executedNotional: BigNumber | null;
  /** Actual execution price in decimal units. */
  averagePrice: BigNumber | null;
  /** Entry price before the action, in decimal units. */
  entryPriceBefore: BigNumber | null;
  /** Liquidation event Oracle price in decimal units. */
  liquidationOraclePrice: BigNumber | null;
  /** Liquidation Oracle-based notional in x18. */
  liquidationNotional: BigNumber | null;
  /** Signed realized trading PnL in x18, excluding ordinary fees and funding. */
  realizedPnlDelta: BigNumber | null;
  /** Historical effective leverage. */
  leverage: MobileSocialFeedLeverage;
  /** Leverage source time in milliseconds. */
  leverageAtMs: number | null;
  /** First event time in milliseconds. */
  firstEventAtMs: number;
  /** Last event time in milliseconds. */
  lastEventAtMs: number;
  /** Decimal-string version. */
  version: string;
}

/** Full published content appearing in a position timeline. */
export type MobileSocialFeedHistoryTake =
  | MobileSocialFeedTradeCard
  | MobileSocialFeedPost;

/** A historical action or authored take; preserve service ordering. */
export type MobileSocialFeedTimelineEntry =
  | {
      /** Action entry. */
      kind: 'action';
      /** Full action facts. */
      action: MobileSocialFeedPositionAction;
      /** Actually associated feed item, or null. */
      relatedItemId: string | null;
      /** Full published trade card, or null. */
      relatedTake: MobileSocialFeedTradeCard | null;
    }
  | {
      /** Published take entry. */
      kind: 'take';
      /** Full published content. */
      item: MobileSocialFeedHistoryTake;
    };

/** Trusted trading target; this hint does not authorize trading. */
export interface MobileSocialFeedTradingTarget {
  /** Lifecycle UUID. */
  positionId: string;
  /** Parent identity. */
  identitySubaccount: Hex;
  /** Actual trading subaccount, possibly isolated. */
  tradingSubaccount: Hex;
  /** Market product ID. */
  productId: number;
  /** Margin mode. */
  marginMode: MobileFeedMarginMode;
  /** Isolated name, or null for cross margin. */
  isoSubaccountName: string | null;
  /** Position direction. */
  direction: MobileFeedTradePositionDirection;
  /** Source time in milliseconds. */
  stateAsOfMs: number;
}

/** Viewing-account trading hints, not authenticated permissions. */
export interface MobileSocialFeedTradingContext {
  /** Market product ID. */
  productId: number;
  /** Suggested trade direction. */
  suggestedDirection: MobileFeedTradePositionDirection;
  /** Resolution of the viewing account's positions. */
  resolution: MobileSocialFeedTradingResolution;
  /** Trusted candidates. */
  candidates: MobileSocialFeedTradingTarget[];
  /** Unique candidate, or null. */
  viewerPositionId: string | null;
  /** Whether the selected account has a unique reducible position. */
  canReduce: boolean;
}

/** Historical candle; volume is a quantity, not a price. */
export interface MobileSocialFeedCandle {
  /** Candle start time in milliseconds. */
  timestampMs: number;
  /** Open price in decimal units. */
  open: BigNumber;
  /** High price in decimal units. */
  high: BigNumber;
  /** Low price in decimal units. */
  low: BigNumber;
  /** Close price in decimal units. */
  close: BigNumber;
  /** Base asset volume in x18. */
  volume: BigNumber;
}

/** Chart action marker with explicitly identified price basis. */
export interface MobileSocialFeedActionMarker {
  /** Action UUID. */
  actionId: string;
  /** Event time in milliseconds. */
  timestampMs: number;
  /** Price in decimal units; null does not remove the action. */
  price: BigNumber | null;
  /** Lifecycle action. */
  action: MobileSocialFeedAction;
  /** Direction. */
  direction: MobileFeedTradePositionDirection;
  /** Never substitute actual execution for a liquidation Oracle. */
  priceBasis: MobileSocialFeedActionPriceBasis;
}

/** Parameters for listing the selected account's open position candidates. */
export interface GetMobileSelfFeedPositionsParams {
  /** Full non-isolated identity; selecting it is not authentication. */
  viewAs: Subaccount;
  /** Optional market filter. */
  productId?: number;
  /** Opaque cursor bound to the account and filters. */
  cursor?: string;
  /** Page size, 1-50; defaults to 20. */
  limit?: number;
}

/** Parameters for resolving a slash command against the selected account. */
export interface ResolveMobileFeedPositionParams {
  /** Required non-isolated viewing account. */
  viewAs: Subaccount;
  /** Original command, such as /position or /BTC; passed unchanged. */
  input: string;
  /** Optional market disambiguation. */
  productId?: number;
}

/** Parameters for resolving all trusted lifecycle segments of an order. */
export interface ResolveMobileFeedActionParams {
  /** Required order-owning identity; the caller need not own it to read. */
  viewAs: Subaccount;
  /** Order digest returned by trading. */
  orderDigest: Hex;
}

/** Parameters for atomic text, drawing, or combined publication. */
export interface MobileCreateFeedPostParams extends MobileSignedRequestParams {
  /** Author-scoped idempotency UUID; reuse unchanged for a retry. */
  clientRequestId: string;
  /** Lifecycle still held by the signed author. */
  positionId: string;
  /** Trusted action for a trading annotation; omit for an independent post. */
  actionId?: string;
  /** Original text, at most 2,000 code points; empty is allowed with a drawing. */
  text: string;
  /** At most ten mentions, with offsets into the original text. */
  mentions: MobileSocialFeedMentionParams[];
  /** Original JSON text, at most 256 KiB UTF-8; never reformatted by the SDK. */
  drawingDataJson?: string;
  /**
   * Up to nine distinct ready image UUIDs owned by the signer, in display order.
   * Omit or pass `[]` when none; order participates in the signature and idempotency hash.
   * Images alone are not enough — nonblank text or a valid drawing is still required.
   */
  imageIds?: string[];
  /**
   * Up to ten original HTTP/HTTPS URLs in display order, independent of the nine upload slots.
   * No whitespace or control characters. Omit or pass []; null is invalid. Preserve URL spelling,
   * order, and field presence for retries: omission and [] produce different signing hashes.
   */
  imageUrls?: string[];
}

/**
 * Direct multipart upload of one static JPEG/PNG (whole request ≤ 2 MiB including signature overhead).
 * The SDK hashes the bytes as Keccak256 for signing; the service verifies the received file matches.
 */
export interface MobileCreateFeedImageUploadParams extends MobileSignedRequestParams {
  /** Raw original file bytes; format is validated by the service. */
  fileBytes: Uint8Array;
}

/** Parameters for preparing a protected feed image request with a reading session. */
export interface GetMobileFeedImageRequestParams {
  /** Uploaded image path from {@link MobileSocialFeedUploadedImage.url} or thumbnail.url; load external URLs directly without session headers. */
  path: string;
  /** Reading session that fully delivered the parent item. */
  sessionId: string;
  /** Browser credential for that session. */
  viewerToken: string;
}

/** Parameters for fetching protected feed image bytes with a reading session. */
export type GetMobileFeedImageBytesParams = GetMobileFeedImageRequestParams;

/** URL and authentication headers for native image components or direct image reads. */
export interface MobileFeedImageRequest {
  /** Absolute image URL; pass as the native image source URI. */
  url: string;
  /** Original reading-session credentials required to access the image. */
  headers: Record<string, string>;
}

/** Parameters for first adding or replacing a drawing. Writes must be serialized by the caller. */
export interface MobileFeedChartDrawingParams extends MobileSignedRequestParams {
  /** Author-owned item UUID. */
  itemId: string;
  /** Complete original JSON text; false and zero are valid documents. */
  dataJson: string;
}

/** Parameters for reading a drawing with the original session or an independent account perspective. */
export interface GetMobileFeedChartDrawingParams extends MobileSocialFeedReadParams {
  /** Parent item UUID. */
  itemId: string;
  /** If supplied, the original viewerToken is required; independent reads omit both. */
  sessionId?: string;
}

/** Parameters for a comment thread; cursor and anchorReplyId are mutually exclusive. */
export interface GetMobileFeedCommentsParams extends MobileSocialFeedReadParams {
  /** Root post UUID. */
  rootItemId: string;
  /** Forward or backward opaque cursor from the same session. */
  cursor?: string;
  /** Page size, 1-50; defaults to 20. */
  limit?: number;
  /** First-page reply anchor; cannot be combined with cursor. */
  anchorReplyId?: string;
  /** Reuse the original session and viewerToken when navigating or paging. */
  sessionId?: string;
}

/** Parameters for posting a comment or reply with an optional owned position attachment. */
export interface MobileCreateFeedCommentParams extends MobileSignedRequestParams {
  /** Author-scoped idempotency UUID. */
  clientRequestId: string;
  /** Commentable root UUID. */
  rootItemId: string;
  /** Reply within the same thread; omit to reply to the root. */
  replyToItemId?: string;
  /** Nonblank original text, at most 1,000 Unicode code points. */
  text: string;
  /** At most ten mentions into the original text. */
  mentions: MobileSocialFeedMentionParams[];
  /** Position still held by the signed author; invalid attachment rejects the whole request. */
  attachedPositionId?: string;
  /**
   * Up to nine distinct ready image UUIDs owned by the signer, in display order.
   * Omit or pass `[]` when none; images cannot replace the required nonblank text.
   */
  imageIds?: string[];
  /**
   * Up to ten original HTTP/HTTPS URLs in display order, independent of the nine upload slots.
   * No whitespace or control characters. Omit or pass []; null is invalid. Preserve URL spelling,
   * order, and field presence for retries: omission and [] produce different signing hashes.
   */
  imageUrls?: string[];
}

/** Parameters for setting or cancelling a signed user's like. */
export interface MobileSetFeedLikeParams extends MobileSignedRequestParams {
  /** Readable, interactive item UUID. */
  itemId: string;
  /** Desired relationship state. */
  isLiked: boolean;
}

/**
 * Unsigned detail-visit report. Call after the primary detail target is shown in the foreground,
 * using the same {@link GetMobileFeedItemParams.viewEventId} previously sent to `getFeedItem`.
 */
export interface MobileRecordFeedViewsParams {
  /** Original reading session returned by the detail read. */
  sessionId: string;
  /** Original opaque browsing credential from that read session. */
  viewerToken: string;
  /**
   * Detail-visit event UUID registered on the preceding feed_item call.
   * Reuse across retries for the same visit; generate a new UUID only after leaving and re-entering.
   */
  viewEventId: string;
  /** Exactly one fully delivered, readable detail-target item UUID. */
  itemId: string;
}

/** Parameters for full position history, not just published feed items. */
export interface GetMobilePositionHistoryParams extends MobileSocialFeedReadParams {
  /** Lifecycle UUID. */
  positionId: string;
  /** Only published takes when true; defaults to false. */
  takesOnly?: boolean;
  /** Opaque history cursor; requires the original position session and viewerToken. */
  cursor?: string;
  /** Page size, 1-50; defaults to 20. */
  limit?: number;
  /** History session; do not substitute a feed session. */
  sessionId?: string;
}

/** Parameters for the most recent 500 actions, without pagination or authored content. */
export interface GetMobilePositionHistoryAllParams extends MobileSocialFeedReadParams {
  /** Lifecycle UUID. */
  positionId: string;
  /** Compatibility flag; true is rejected by the service. */
  takesOnly?: false;
}

/** Parameters for published position thoughts containing both nonblank text and a saved drawing. */
export interface GetMobilePositionThoughtsParams extends MobileSocialFeedReadParams {
  /** Lifecycle UUID; reopening a position creates a different lifecycle. */
  positionId: string;
  /** Page size, 1-50; defaults to 20 and must remain unchanged across pages. */
  limit?: number;
  /** Original thoughts session; cannot be reused from history or feed queries. */
  sessionId?: string;
  /** Previous nextCursor; requires the original session and viewerToken. */
  cursor?: string;
}

/** Counts across the authorized position history. */
export interface MobileSocialFeedHistorySummary {
  /** Action count. */
  actionCount: number;
  /** Published take count. */
  takeCount: number;
}

/** Estimated liquidation price and its source time. */
export interface MobileSocialFeedEstimatedLiquidationLine {
  /** Decimal price. */
  price: BigNumber;
  /** Source time in milliseconds. */
  asOfMs: number;
}

/** Half-open chart range, preserved across pages. */
export interface MobileSocialFeedChartRange {
  /** Inclusive start in milliseconds. */
  fromMs: number;
  /** Exclusive end in milliseconds. */
  toMs: number;
}

/** Parameters for position candles and action markers. */
export interface GetMobilePositionChartParams extends MobileSocialFeedReadParams {
  /** Lifecycle UUID. */
  positionId: string;
  /** Original session, if reusing one; must be paired with viewerToken. */
  sessionId?: string;
  /** Candle interval. */
  interval: MobileSocialFeedChartInterval;
  /** Half-open time range; preserve it when paging. */
  range: MobileSocialFeedChartRange;
  /** Exclusive candle upper bound for subsequent pages. */
  beforeMs?: number;
  /** Candle count, 1-500; defaults to 200. */
  limit?: number;
}

/** Unsigned, page-scoped presence registration using the original reading credential. */
export interface MobilePositionPresenceParams {
  /** Lifecycle UUID authorized by the session. */
  positionId: string;
  /** Original reading session. */
  sessionId: string;
  /** Original browsing credential; determines visitor deduplication. */
  viewerToken: string;
  /** UUID generated per page, retained for that page's lifetime. */
  viewSessionId: string;
  /** Enter, renew, or leave the page. */
  state: MobileSocialFeedPresenceState;
  /** Self-reported display account: omission preserves it, null clears it. Not authentication. */
  watcherSubaccount?: Subaccount | null;
}

/** Parameters for read-only watcher counts; this query never registers presence. */
export interface GetMobilePositionWatchersParams {
  /** Lifecycle UUID. */
  positionId: string;
  /** Optional relationship perspective, not a watcher registration. */
  viewAs?: Subaccount;
}

/** Open position candidates for a selected identity. */
export interface MobileSocialFeedPositionsPage {
  /** Current candidates and eligibility hints. */
  positions: MobileSocialFeedPublishablePosition[];
  /** Next opaque cursor, or null. */
  nextCursor: string | null;
  /** Observation time in milliseconds. */
  asOfMs: number;
}

/** Position command result, including normal empty/unknown outcomes. */
export interface MobileSocialFeedPositionResolutionResult {
  /** Resolution outcome. */
  resolution: MobileSocialFeedPositionResolution;
  /** Resolved market, or null for an unknown or unconstrained market. */
  product: MobileSocialFeedMarket | null;
  /** Eligible open position candidates. */
  candidates: MobileSocialFeedPublishablePosition[];
  /** Explanation for no position or unknown market. */
  reason: MobileSocialFeedPositionResolutionReason | null;
}

/** Trusted order actions; pending is distinct from a source failure. */
export interface MobileSocialFeedActionResolutionResult {
  /** Requested order digest. */
  orderDigest: Hex;
  /** Ready when all currently confirmed segments have been projected. */
  resolution: MobileSocialFeedActionResolution;
  /** All trusted segments, or an empty array when pending. */
  actions: MobileSocialFeedActionCandidate[];
  /** Observation time in milliseconds. */
  asOfMs: number;
}

/** Readable drawing and parent display version; drawing data is already parsed. */
export interface MobileSocialFeedDrawingResult {
  /** Parent item UUID. */
  itemId: string;
  /** Current parent display version. */
  itemVersion: string;
  /** Null when the readable parent has no drawing. */
  drawing: MobileSocialFeedDrawing | null;
}

/** Saved drawing returned by successful creation or replacement. */
export interface MobileSocialFeedDrawingMutationResult {
  /** Parent item UUID. */
  itemId: string;
  /** Post-mutation parent display version. */
  itemVersion: string;
  /** Saved parsed drawing. */
  drawing: MobileSocialFeedDrawing;
}

/** Comment thread page, including both directions around an anchor. */
export interface MobileSocialFeedCommentsPage {
  /** Requested anchor, or null when reading without one. */
  anchorReplyId: string | null;
  /** Readable replies in service order. */
  comments: MobileSocialFeedReply[];
  /** Total readable comment count. */
  totalCount: number;
  /** Forward cursor, or null. */
  nextCursor: string | null;
  /** Backward cursor, or null. */
  previousCursor: string | null;
  /** Original or newly created reading session. */
  readSession: MobileSocialFeedReadSession;
}

/** Atomic comment publication result. */
export interface MobileSocialFeedCommentResult {
  /** Published reply. */
  comment: MobileSocialFeedReply;
  /** Post-commit root comment count. */
  rootCommentCount: number;
}

/** Authoritative post-mutation like state. */
export interface MobileSocialFeedLikeResult {
  /** Item UUID. */
  itemId: string;
  /** Desired applied state. */
  isLiked: boolean;
  /** Post-mutation count. */
  likeCount: number;
  /** Item display version. */
  version: string;
}

/** Exposure deduplication result for the current UTC day. */
export interface MobileSocialFeedViewsResult {
  /** Newly counted item UUIDs. */
  acceptedItemIds: string[];
  /** Already counted item UUIDs. */
  duplicateItemIds: string[];
}

/** Full position history and viewing-account trading hints. */
export interface MobileSocialFeedPositionHistory {
  /** Current position owner, or null when an older service omits it; never inferred from the viewer. */
  owner: MobileSocialFeedAuthor | null;
  /** Position and additional history metrics. */
  position: MobileSocialFeedPositionHistoryCard;
  /** Whole-history counts. */
  summary: MobileSocialFeedHistorySummary;
  /** Ordered actions and takes; no synthesized items. */
  timeline: MobileSocialFeedTimelineEntry[];
  /** Next cursor, or null. */
  nextCursor: string | null;
  /** Completeness, independent of whether any items were published. */
  historyQuality: MobileSocialFeedHistoryQuality;
  /** Position-mode session for navigation, updates, and statistics. */
  readSession: MobileSocialFeedReadSession;
  /** Hints only; actual trading requires authentication. */
  tradingContext: MobileSocialFeedTradingContext;
}

/** Candle page and event-price markers, independent of drawing data. */
export interface MobileSocialFeedPositionChart {
  /** Candles in descending timestamp order. */
  candles: MobileSocialFeedCandle[];
  /** Actions, retaining markers whose price is unknown. */
  actionMarkers: MobileSocialFeedActionMarker[];
  /** Estimated price, never substituted for execution or Oracle event prices. */
  estimatedLiquidationLine: MobileSocialFeedEstimatedLiquidationLine | null;
  /** Exclusive candle upper bound for the next page. */
  nextBeforeMs: number | null;
  /** Observation time in milliseconds. */
  asOfMs: number;
  /** Reliability of this response. */
  dataQuality: MobileSocialFeedChartDataQuality;
}

/** Current visitor count and self-reported public account previews. */
export interface MobileSocialFeedWatchers {
  /** Distinct active browsing credentials, not unique accounts. */
  watcherCount: number;
  /** Deduplicated self-reported accounts; may be fewer than watcherCount. */
  watcherPreview: MobileSocialFeedAuthor[];
  /** Observation time in milliseconds. */
  asOfMs: number;
}

/** Presence result; does not include an observation timestamp. */
export interface MobileSocialFeedPresence {
  /** Distinct active browsing credentials. */
  watcherCount: number;
  /** Self-reported account previews, not authenticated visitors. */
  watcherPreview: MobileSocialFeedAuthor[];
  /** Recommended heartbeat cadence in seconds. */
  heartbeatIntervalSeconds: number;
  /** Remaining lease lifetime in seconds. */
  expiresInSeconds: number;
}

/** Mention input, using the same structured subaccount convention as other signed SDK inputs. */
export interface MobileSocialFeedMentionParams extends Omit<
  MobileSocialFeedMention,
  'subaccount'
> {
  /** Mentioned identity; serialized to bytes32 for signing. */
  subaccount: Subaccount;
}

/** Published position thought with nonblank text and a complete saved drawing. */
export type MobileSocialFeedPositionThought = MobileSocialFeedHistoryTake & {
  /** Always true for this endpoint; uploaded or external images alone do not qualify. */
  hasAnalysis: true;
  /** Parsed current drawing; saved data does not necessarily contain visible strokes. */
  drawing: MobileSocialFeedDrawing;
};

/** Thoughts in descending drawing creation time and item UUID order; no 500-item total cap. */
export interface MobileSocialFeedPositionThoughtsPage {
  /** Complete content in server order; never reorder by display time. */
  items: MobileSocialFeedPositionThought[];
  /** Null only at the directory end; an empty page can still have a cursor. */
  nextCursor: string | null;
  /** Independent position session; newly published content requires a refresh. */
  readSession: MobileSocialFeedReadSession & {
    /** Position-scoped reading. */
    mode: 'position';
  };
}

/** Most recent 500 actions, with no authored content and no pagination. */
export interface MobileSocialFeedPositionHistoryAll extends MobileSocialFeedPositionHistory {
  /** Counts within this response; zero takes does not imply the position has no thoughts. */
  summary: MobileSocialFeedHistorySummary & {
    /** This endpoint never includes takes. */
    takeCount: 0;
  };
  /** Actions in descending last-event time and action UUID order. */
  timeline: Array<
    Extract<MobileSocialFeedTimelineEntry, { kind: 'action' }> & {
      /** Authored content is never embedded; fetch associated item details separately. */
      relatedTake: null;
    }
  >;
  /** No pagination; null does not mean the complete lifecycle was returned. */
  nextCursor: null;
}
