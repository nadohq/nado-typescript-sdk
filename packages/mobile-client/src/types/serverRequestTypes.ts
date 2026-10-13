import { Hex } from 'viem';
import { MobileSignedInner } from '../signing/types';
import {
  MobileServerCategorizedFeedParams,
  MobileServerNotificationPreferences,
  MobileServerSocialFeedListParams,
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

/** Public browsing context; neither field proves wallet ownership or grants private access. */
export interface MobileServerPublicFeedReadParams {
  /** Complete non-isolated identity used to resolve public relationship state. */
  view_as?: Hex;
  /** Original browsing credential when reusing a session. */
  viewer_token?: string;
}

/**
 * Params for each unsigned `public_query`, keyed by request `type`.
 */
export interface MobileServerPublicQueryRequestByType {
  /** Public recommendations with optional relationship perspective. */
  for_you_feed: MobileServerCategorizedFeedParams &
    MobileServerPublicFeedReadParams;
  /** Public content from qualified authors. */
  top_traders_feed: MobileServerCategorizedFeedParams &
    MobileServerPublicFeedReadParams;
  /** Public content from authors followed by view_as. */
  friends_feed: MobileServerCategorizedFeedParams &
    MobileServerPublicFeedReadParams & {
      /** Complete non-isolated identity subaccount; required on every request. */
      view_as: Hex;
    };
  /** Author's public content; the target is separate from view_as. */
  profile_feed: MobileServerCategorizedFeedParams &
    MobileServerPublicFeedReadParams & {
      /** Target author identity, independent of view_as. */
      subaccount: Hex;
    };
  /** Public market content. */
  market_feed: MobileServerSocialFeedListParams &
    MobileServerPublicFeedReadParams & {
      /** Target product. */
      product_id: number;
    };
  /** Public activity in one position lifecycle. */
  position_feed: MobileServerSocialFeedListParams &
    MobileServerPublicFeedReadParams & {
      /** Target position UUID. */
      position_id: string;
    };
  /** Public item details, optionally reusing a reading session. */
  feed_item: MobileServerPublicFeedReadParams & {
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
    update_cursor?: string;
    /** Current viewport version. */
    viewport_revision: number;
    /** Request sequence within the viewport. */
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
 * Params for each unsigned `public_execute`, keyed by request `type`. Possession of an active Expo push token
 * authorizes these notification-only mutations: the backend resolves the token's owning wallet and mutates
 * its state, so no signature, sender, or nonce is sent. Ordering is the backend's last-write-wins commit
 * order, so callers must serialize their own writes.
 */
export interface MobileServerPublicExecuteRequestByType {
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

/** Signed mutation operations. */
export type MobileServerExecuteRequestType = MobileSignedInner['type'];

/**
 * Wire `request_type` the backend echoes on failure envelopes, prefixed by the route that produced it:
 * `public_query_*` for unsigned queries, `public_execute_*` for unsigned
 * writes, and `execute_*` for signed writes (e.g. `execute_set_username`). The prefix names the route,
 * so it never carries the `mobile:` prefix that the EIP-712 method does.
 */
export type MobileServerRequestType =
  | `public_query_${MobileServerPublicQueryRequestType}`
  | `public_execute_${MobileServerPublicExecuteRequestType}`
  | `execute_${MobileServerExecuteRequestType}`;
