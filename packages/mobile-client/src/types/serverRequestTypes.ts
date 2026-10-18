import { Hex } from 'viem';
import { MobileSignedInner } from '../signing/types';
import {
  MobileServerNotificationPreferences,
  MobileSocialFeedChartInterval,
  MobileSocialFeedMarketCategory,
  MobileSocialFeedPresenceState,
  MobileSocialFeedType,
} from './serverModelTypes';

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
  /** Fixed 15-minute reading session; required with cursor. */
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
    /** Page size, 1-50. */
    limit?: number;
    /** First-page anchor, mutually exclusive with cursor. */
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
  /** Market candles and independently priced action markers. */
  position_chart: MobileServerSocialFeedReadParams & {
    /** Lifecycle UUID. */
    position_id: string;
    /** Original session, paired with viewer_token. */
    session_id?: string;
    /** Candle interval. */
    interval: MobileSocialFeedChartInterval;
    /** Half-open time interval. */
    range: {
      /** Inclusive start in milliseconds. */
      from_ms: number;
      /** Exclusive end in milliseconds. */
      to_ms: number;
    };
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
  notification_preferences: { expo_token: string };
  registered_wallet: { expo_token: string };
}

/**
 * Discriminant `type` values for unsigned `public_query` requests.
 */
export type MobileServerPublicQueryRequestType =
  keyof MobileServerPublicQueryRequestByType;

/**
 * Params for each unsigned `public_execute`, keyed by request `type`. Feed reports use the original browsing
 * credential and session. Possession of an active Expo push token
 * authorizes these notification-only mutations: the backend resolves the token's owning wallet and mutates
 * its state, so no signature, sender, or nonce is sent. Ordering is the backend's last-write-wins commit
 * order, so callers must serialize their own writes.
 */
export interface MobileServerPublicExecuteRequestByType {
  /** Explicit exposure report using the original browsing credential. */
  record_feed_views: {
    /** Original reading session. */
    session_id: string;
    /** Fully delivered interactive items. */
    item_ids: string[];
    /** Original credential. */
    viewer_token: string;
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
 * Discriminant `type` values for signed `execute` requests. Every signed route the SDK calls is a write, so
 * this is the full set of {@link MobileSignedInner} tags. Unlike the public queries these carry no separate
 * params map — a signed request body *is* its inner payload flattened with the envelope, so
 * {@link MobileSignedInner} is the single source of truth for both the fields and their significant order.
 */
export type MobileServerExecuteRequestType = MobileSignedInner['type'];

/**
 * Wire `request_type` the backend echoes on failure envelopes, prefixed by the route that produced it:
 * `public_query_*` for unsigned queries, `public_execute_*` for unsigned writes, and `execute_*` for signed
 * writes (e.g. `execute_set_username`). The prefix names the route, so it never carries the `mobile:` prefix
 * that the EIP-712 method does.
 */
export type MobileServerRequestType =
  | `public_query_${MobileServerPublicQueryRequestType}`
  | `public_execute_${MobileServerPublicExecuteRequestType}`
  | `execute_${MobileServerExecuteRequestType}`;
