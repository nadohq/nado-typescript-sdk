import { Hex } from 'viem';
import { MobileSignedInner } from '../signing/types';
import {
  MobileNotificationRouteName,
  MobileNotificationTypeId,
  MobileServerNotificationDeviceMetadata,
  MobileServerNotificationPreferences,
  MobileServerNotificationSettings,
  MobileServerSocialFeedChartRange,
  MobileSocialFeedChartInterval,
  MobileSocialFeedMarketCategory,
  MobileSocialFeedPresenceState,
  MobileSocialFeedType,
} from './serverModelTypes';
import type { MobileServerSignedQueryResponseByType } from './serverQueryTypes';

/**
 * Common wire-format credential for token-authenticated notification requests.
 * Unregistration also accepts an inactive or unknown well-formed token.
 */
export interface MobileServerWithExpoTokenParams {
  /** Expo push token; never expose it to another user. */
  expo_token: string;
}

/**
 * Registration fields shared by v1 and v2 signed inner payloads.
 * Nullable metadata keys remain present when signing so the MessagePack hash matches the backend.
 */
export interface MobileServerRegisterExpoTokenParams
  extends
    MobileServerWithExpoTokenParams,
    MobileServerNotificationDeviceMetadata {}

/** Registration request with a v2-only capability declaration. */
export interface MobileServerRegisterExpoTokenV2Params extends MobileServerRegisterExpoTokenParams {
  /** Actual notification features supported by the device. */
  capabilities: {
    /** Registration accepts only the v2 protocol. */
    payload_versions: [2];
    /** Supported notification types. */
    type_ids: MobileNotificationTypeId[];
    /** Supported navigation destinations. */
    routes: MobileNotificationRouteName[];
  };
}

/**
 * One subscription operation; exactly one operation is non-null and unused operations must be null.
 */
export interface MobileServerNotificationSubscriptionsUpdate {
  /** Latest subscription revision, not the settings revision. */
  expected_revision: number;
  /** Set one bell; enabling requires an existing follow relationship. */
  trader_bell: {
    /** Target non-isolated subaccount belonging to another wallet. */
    subaccount: Hex;
    /** Desired bell state. */
    enabled: boolean;
  } | null;
  /** Subscribe or unsubscribe one known market. */
  market: {
    /** Positive market product ID. */
    product_id: number;
    /** Desired subscription state. */
    subscribed: boolean;
  } | null;
  /** One-time merge of up to 500 local market IDs; mutually exclusive with the other operations. */
  import_markets: number[] | null;
}

/**
 * Opt-in extras for a `profiles` query. Each one costs extra rate-limit weight per profile and adds fields
 * that are otherwise absent from the response, so the backend gates them behind an explicit request rather
 * than always resolving the follow graph on a public route.
 */
export interface MobileServerProfilesInclude {
  /** Adds `follower_count` and `following_count` to every entry. Omitted or `false` leaves both absent. */
  follow_counts?: boolean;
  /**
   * Adds `follow_summary` to every entry, relative to the `view_as` subaccount. As on every public route,
   * `view_as` is an unauthenticated claim.
   */
  follow_summary?: { view_as: Hex };
}

/**
 * Params shared by the `followers` and `following` public queries: only the relationship that selects the
 * rows differs between the two.
 */
export interface MobileServerFollowListRequest {
  /** The viewed Profile, i.e. the account whose Followers or Following are being listed. */
  subaccount: Hex;
  /**
   * Viewer perspective the rows are resolved against. Omitted asks for no perspective, which drops
   * `is_following` from every row and falls back to plain recency order. Like the `profiles` query's
   * `view_as`, this is an unauthenticated claim on an unsigned route.
   */
  view_as?: Hex;
  /** Opaque keyset cursor from a prior page's `next_cursor`. Omitted requests the first page. */
  cursor?: string;
  /** Page size, 1–50; the backend defaults to 25 when omitted. */
  limit?: number;
}

/**
 * Params of the `search_profiles` public query.
 */
export interface MobileServerSearchProfilesRequest {
  /**
   * Username prefix, 1-20 ASCII bytes: a letter or digit first, then letters, digits, `_` or `.`. The
   * backend lowercases letters and trims nothing.
   */
  query: string;
  /** Same opt-in extras as the `profiles` query, applied to every match on the page. */
  include?: MobileServerProfilesInclude;
  /** Opaque keyset cursor from a prior page's `next_cursor`. Omitted requests the first page. */
  cursor?: string;
  /** Page size, 1-50, or 1-25 when `include` asks for follow data; the backend defaults to 25 when omitted. */
  limit?: number;
}

/** Common filters and pagination for social feed lists. */
export interface MobileServerSocialFeedListParams {
  /** OR-ed content filters; combined with other filters using AND. */
  feed_types?: MobileSocialFeedType[];
  /** Strict lower bound in whole dollars, 1 through Number.MAX_SAFE_INTEGER. */
  minimum_notional?: number;
  /** Page size, 1–50; defaults to 20. */
  limit?: number;
  /** Original reading session; required with cursor. Legitimate requests renew its idle expiration. */
  session_id?: string;
  /** Opaque pagination cursor, distinct from update_cursor and watermark. */
  cursor?: string;
}

/** List fields for main feeds and author feeds. */
export interface MobileServerSocialFeedCategorizedParams extends MobileServerSocialFeedListParams {
  /** Omit to read all market categories. */
  market_category?: MobileSocialFeedMarketCategory;
}

/** Unsigned browsing context; the viewing account is not proof of wallet ownership. */
export interface MobileServerSocialFeedReadParams {
  /**
   * Complete non-isolated viewing account. Profile, position, and item reads include this account's
   * own hidden content under account_view, in addition to resolving relationship state.
   */
  view_as?: Hex;
  /** Original browsing credential when reusing a session. */
  viewer_token?: string;
}

/**
 * Params for each unsigned `public_query`, keyed by request `type`.
 */
export interface MobileServerPublicQueryRequestByType {
  /** Selected account's open position candidates. */
  self_feed_positions: {
    /** Full identity. */
    view_as: Hex;
    /** Market filter. */
    product_id?: number;
    /** Bound pagination cursor. */
    cursor?: string;
    /** Page size, 1-50. */
    limit?: number;
  };
  /** Resolve a position command without signing. */
  resolve_feed_position: {
    /** Full identity. */
    view_as: Hex;
    /** Unmodified command text. */
    input: string;
    /** Optional market disambiguation. */
    product_id?: number;
  };
  /** Resolve an order's complete trusted lifecycle segments. */
  resolve_feed_action: {
    /** Order-owning identity. */
    view_as: Hex;
    /** Trading order digest. */
    order_digest: Hex;
  };
  /** Read a drawing within the parent item's visibility. */
  feed_chart_drawing: MobileServerSocialFeedReadParams & {
    /** Parent UUID. */
    item_id: string;
    /** Original session, paired with viewer_token. */
    session_id?: string;
  };
  /** Read or navigate a comment thread. */
  feed_comments: MobileServerSocialFeedReadParams & {
    /** Root UUID. */
    root_item_id: string;
    /** Thread cursor. */
    cursor?: string;
    /** Top-level group count, 1-50; descendants do not consume the limit. */
    limit?: number;
    /** Anchor at any depth selecting its top-level group; mutually exclusive with cursor. */
    anchor_reply_id?: string;
    /** Original reading session. */
    session_id?: string;
  };
  /** Full lifecycle history rather than published feed items alone. */
  position_history: MobileServerSocialFeedReadParams & {
    /** Lifecycle UUID. */
    position_id: string;
    /** Filter to published takes. */
    takes_only?: boolean;
    /** History cursor. */
    cursor?: string;
    /** Page size, 1-50. */
    limit?: number;
    /** Original position-mode session. */
    session_id?: string;
  };
  /** Recent actions only, capped at 500; creates a new session and does not paginate. */
  position_history_all: MobileServerSocialFeedReadParams & {
    /** Lifecycle UUID. */
    position_id: string;
  };
  /** Published nonblank text with a saved drawing, newest first by drawing creation time. */
  position_thoughts: MobileServerSocialFeedReadParams & {
    /** Lifecycle UUID. */
    position_id: string;
    /** Page size, 1-50; defaults to 20 and must remain unchanged across pages. */
    limit?: number;
    /** Original thoughts session; cannot be reused from history or feed queries. */
    session_id?: string;
    /** Previous next_cursor; requires the original session and viewer_token. */
    cursor?: string;
  };
  /** Market candles and independently priced action markers. */
  position_chart: MobileServerSocialFeedReadParams & {
    /** Lifecycle UUID. */
    position_id: string;
    /** Original session, paired with viewer_token. */
    session_id?: string;
    /** Candle interval. */
    interval: MobileSocialFeedChartInterval;
    /** Half-open time interval. */
    range: MobileServerSocialFeedChartRange;
    /** Exclusive next-page bound. */
    before_ms?: number;
    /** Page size, 1-500. */
    limit?: number;
  };
  /** Watcher query; does not register presence. */
  position_watchers: {
    /** Lifecycle UUID. */
    position_id: string;
    /** Relationship perspective only. */
    view_as?: Hex;
  };
  /** Ordered server-owned avatar catalogue. */
  avatar_presets: Record<never, never>;
  /** Public recommendations with optional relationship perspective. */
  for_you_feed: MobileServerSocialFeedCategorizedParams &
    MobileServerSocialFeedReadParams;
  /** Public content from qualified authors. */
  top_traders_feed: MobileServerSocialFeedCategorizedParams &
    MobileServerSocialFeedReadParams;
  /** Public content from authors followed by view_as. */
  friends_feed: MobileServerSocialFeedCategorizedParams &
    MobileServerSocialFeedReadParams & {
      /** Complete non-isolated identity subaccount; required on every request. */
      view_as: Hex;
    };
  /** Author content visible to view_as; the target is separate from the viewing account. */
  profile_feed: MobileServerSocialFeedCategorizedParams &
    MobileServerSocialFeedReadParams & {
      /** Target author identity, independent of view_as. */
      subaccount: Hex;
    };
  /** Public market content. */
  market_feed: MobileServerSocialFeedListParams &
    MobileServerSocialFeedReadParams & {
      /** Target product. */
      product_id: number;
    };
  /** Published activity in one lifecycle, including hidden content owned by view_as. */
  position_feed: MobileServerSocialFeedListParams &
    MobileServerSocialFeedReadParams & {
      /** Target position UUID. */
      position_id: string;
    };
  /** Item details visible to view_as, optionally reusing a reading session. */
  feed_item: MobileServerSocialFeedReadParams & {
    /** Target item UUID. */
    item_id: string;
    /** Preview size, 0-3. */
    comment_preview_limit?: number;
    /** Omit to create a new reading session. */
    session_id?: string;
  };
  /** Updates inherit the original public session's viewing account. */
  feed_updates: {
    /** Original reading session. */
    session_id: string;
    /** Previously delivered item UUIDs. */
    visible_item_ids: string[];
    /** Authorized position UUIDs. */
    visible_position_ids: string[];
    /** Baseline from the last accepted update. */
    update_cursor?: string | null;
    /** Current viewport version. */
    viewport_revision: number;
    /** Request sequence increasing across the entire session, including viewport changes. */
    request_seq: number;
    /** Original public browsing credential. */
    viewer_token: string;
    /** The viewing account cannot be changed by an update. */
    view_as?: never;
  };
  username_availability: { display_name: string };
  profiles: {
    /**
     * 1–`MOBILE_PROFILES_MAX_BATCH_SIZE` (25) distinct subaccounts. Results come back in this exact order,
     * one entry per request slot.
     */
    subaccounts: Hex[];
    include?: MobileServerProfilesInclude;
  };
  search_profiles: MobileServerSearchProfilesRequest;
  followers: MobileServerFollowListRequest;
  following: MobileServerFollowListRequest;
  feed: {
    /**
     * Minimum notional as a whole-dollar JSON integer (NOT an x18 string), at least $1,000. Omitted or
     * `null` means unfiltered.
     */
    minimum_notional?: number;
    /** Page size, 1–50; the backend defaults to `MOBILE_FEED_MAX_PAGE_SIZE` (50) when omitted. */
    limit?: number;
    /**
     * Opaque keyset cursor from a prior page's `next_cursor`. Bound to the exact `minimum_notional` it was
     * issued for (including the unfiltered state) — reusing it with a different filter fails.
     */
    cursor?: string;
  };
  notification_preferences: MobileServerWithExpoTokenParams;
  /** Persisted device generation and capabilities. */
  notification_registration_v2: MobileServerWithExpoTokenParams;
  /** Versioned notification settings. */
  notification_settings_v2: MobileServerWithExpoTokenParams;
  registered_wallet: MobileServerWithExpoTokenParams;
}

/**
 * Discriminant `type` values for unsigned `public_query` requests.
 */
export type MobileServerPublicQueryRequestType =
  keyof MobileServerPublicQueryRequestByType;

/**
 * Params for each unsigned `public_execute`, keyed by request `type`. No signature, sender, or nonce is sent.
 * `record_feed_views` and `position_presence` are authorized by the original reading session (`session_id`)
 * and browser credential (`viewer_token`), not an Expo push token.
 * For `unregister_expo_token` and `update_preferences`, possession of an active Expo push token authorizes
 * the notification mutation: the backend resolves the token's owning wallet and mutates its state. These
 * notification writes use the backend's last-write-wins commit order, so callers must serialize them.
 */
export interface MobileServerPublicExecuteRequestByType {
  /** Full settings replacement with optimistic concurrency control. */
  update_notification_settings_v2: MobileServerWithExpoTokenParams & {
    /** Latest settings revision. */
    expected_revision: number;
    /** Complete settings document. */
    settings: MobileServerNotificationSettings;
  };

  /** Independent unsigned batch view report; repeat requests increment again. */
  record_feed_views: {
    /** 1–50 canonical lowercase item UUIDs before deduplication; duplicates count once in this request. */
    item_ids: string[];
  };
  /** Per-page visitor lease; no wallet signature. */
  position_presence: {
    /** Lifecycle UUID. */
    position_id: string;
    /** Original reading session. */
    session_id: string;
    /** Page-scoped UUID. */
    view_session_id: string;
    /** Lease lifecycle state. */
    state: MobileSocialFeedPresenceState;
    /** Original browsing credential. */
    viewer_token: string;
    /** Omission preserves the display account; null clears it. */
    watcher_subaccount?: Hex | null;
  };
  unregister_expo_token: { expo_token: string };
  update_preferences: {
    expo_token: string;
    preferences: MobileServerNotificationPreferences;
  };
}

/**
 * Discriminant `type` values for unsigned `public_execute` requests.
 */
export type MobileServerPublicExecuteRequestType =
  keyof MobileServerPublicExecuteRequestByType;

/**
 * Discriminant `type` values for signed `execute` requests, excluding signed queries. Unlike the public
 * queries these carry no separate params map — a signed request body is its inner payload flattened with the envelope, so
 * {@link MobileSignedInner} is the single source of truth for both the fields and their significant order.
 */
export type MobileServerExecuteRequestType = Exclude<
  MobileSignedInner['type'],
  MobileServerSignedQueryRequestType
>;

/**
 * Discriminant `type` values for signed `query` requests, distinct from unsigned `public_query` requests.
 */
export type MobileServerSignedQueryRequestType =
  keyof MobileServerSignedQueryResponseByType;

/**
 * Wire `request_type` the backend echoes on failure envelopes, prefixed by the route that produced it:
 * `public_query_*` for unsigned queries, `public_execute_*` for unsigned writes, and `execute_*` for signed
 * writes (e.g. `execute_set_username`), or `query_*` for signed reads. Unlike the EIP-712 method,
 * these values never carry the `mobile:` prefix. Protected image reads use `feed_image` or
 * `feed_comment_image` without a route prefix; malformed multipart uploads use `execute_image_upload`.
 */
export type MobileServerRequestType =
  | 'feed_image'
  | 'feed_comment_image'
  | 'execute_image_upload'
  | `query_${MobileServerSignedQueryRequestType}`
  | `public_query_${MobileServerPublicQueryRequestType}`
  | `public_execute_${MobileServerPublicExecuteRequestType}`
  | `execute_${MobileServerExecuteRequestType}`;
