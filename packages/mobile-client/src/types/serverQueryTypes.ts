import { Hex } from 'viem';
import { MobileServerSuccessResponse } from './serverBaseTypes';
import {
  MobileNotificationPlatform,
  MobileServerAvatarPreset,
  MobileServerFeedTrade,
  MobileServerFollowListAccount,
  MobileServerNotificationPreferences,
  MobileServerProfile,
  MobileServerSocialFeedCohort,
  MobileServerSocialFeedItem,
  MobileServerSocialFeedItemPatch,
  MobileServerSocialFeedPositionPatch,
  MobileServerSocialFeedReadSession,
  MobileSocialFeedUnavailableTarget,
} from './serverModelTypes';
import {
  MobileServerPublicQueryRequestByType,
  MobileServerPublicQueryRequestType,
} from './serverRequestTypes';

/**
 * Unsigned `public_query` request body: a `type` discriminant flattened with its params.
 */
export type MobileServerPublicQueryRequest<
  T extends MobileServerPublicQueryRequestType =
    MobileServerPublicQueryRequestType,
> = {
  [K in MobileServerPublicQueryRequestType]: {
    type: K;
  } & MobileServerPublicQueryRequestByType[K];
}[T];

/**
 * Payload of the `username_availability` public query success response.
 */
export interface MobileServerUsernameAvailabilityResponse {
  username: string;
  available: boolean;
}

/**
 * Payload of the `avatar_presets` public query success response.
 */
export interface MobileServerAvatarPresetsResponse {
  /** Available presets in display order. */
  presets: MobileServerAvatarPreset[];
}

/**
 * Payload of the `profiles` public query success response. One entry per requested subaccount, in the exact
 * order they were requested, so callers can correlate positionally as well as by `subaccount`.
 */
export interface MobileServerProfilesResponse {
  profiles: MobileServerProfile[];
}

/**
 * Payload of the `followers` and `following` public query success responses. Both list directions share one
 * shape; only the relationship that selected the rows differs.
 */
export interface MobileServerFollowListResponse {
  accounts: MobileServerFollowListAccount[];
  /** `null` means the list is complete. */
  next_cursor: string | null;
}

/**
 * Payload of the `feed` public query success response.
 */
export interface MobileServerFeedResponse {
  trades: MobileServerFeedTrade[];
  /**
   * `null` when there was no additional candidate at query time; a page may contain fewer than `limit` trades
   * (or none) with a non-null cursor because invalid enrichment rows are omitted and pagination is live
   * rather than snapshot.
   */
  next_cursor: string | null;
}

/** Fixed-window list response; an empty page can still have a next cursor. */
export interface MobileServerSocialFeedResponse {
  /** Reading session and its browser credential. */
  read_session: MobileServerSocialFeedReadSession;
  /** Visible items in server order; deduplicate by ID without local reordering. */
  items: MobileServerSocialFeedItem[];
  /** Opaque cursor; null only when pagination is complete. */
  next_cursor: string | null;
  /** New-content baseline, not a pagination or update cursor. */
  watermark: string;
}

/** Main-feed page with its ordering version. */
export interface MobileServerSocialFeedRankedResponse extends MobileServerSocialFeedResponse {
  /** Current ordering contract: chronological-v1. */
  ranking_version: string;
}

/** Top Traders page, with one shared qualification snapshot for eligibility and badges. */
export interface MobileServerSocialFeedTopTradersResponse extends MobileServerSocialFeedRankedResponse {
  /** Author eligibility snapshot. */
  cohort: MobileServerSocialFeedCohort;
}

/** Item details with either a new item session or the reused authorized session. */
export interface MobileServerSocialFeedItemResponse {
  /** Full visible item. */
  item: MobileServerSocialFeedItem;
  /** Session authorized for subsequent updates. */
  read_session: MobileServerSocialFeedReadSession;
}

/** Batched viewport updates; apply only the current viewport's latest request sequence. */
export interface MobileServerSocialFeedUpdatesResponse {
  /** Item deltas, independent of current-position patches. */
  item_patches: MobileServerSocialFeedItemPatch[];
  /** Complete mutable position facts at one version. */
  position_patches: MobileServerSocialFeedPositionPatch[];
  /** Previously authorized targets that can no longer be read. */
  unavailable_targets: MobileSocialFeedUnavailableTarget[];
  /** New-content hint; always zero for directly created item sessions. */
  new_items_count: number;
  /** Baseline to use for the next update call with the same viewport. */
  update_cursor: string;
  /** Full snapshot of applicable mutable fields; currently always true. Apply author updates even when the item version is unchanged. */
  reset: boolean;
  /** Echoed viewport revision. */
  viewport_revision: number;
  /** Echoed request sequence. */
  request_seq: number;
}

/**
 * Payload of the `notification_preferences` public query success response.
 */
export interface MobileServerNotificationPreferencesResponse {
  preferences: MobileServerNotificationPreferences;
}

/**
 * Payload of the `registered_wallet` public query success response. Inlined into the envelope rather than
 * nested under a key, matching the backend's `RegisteredWalletResponse`.
 */
export interface MobileServerRegisteredWalletResponse {
  wallet: Hex;
  platform: MobileNotificationPlatform;
  locale: string | null;
  app_version: string | null;
  token_fingerprint_prefix: string;
  last_seen_at: number;
}

/**
 * Success payloads for each unsigned `public_query`, keyed by request `type`. Counterpart to
 * {@link MobileServerPublicQueryRequestByType} so a query's request params and response share one lookup,
 * matching engine's `EngineServerQueryResponseByType`. Holds the unwrapped payload; the envelope is applied
 * by {@link MobileServerPublicQuerySuccessResponse}.
 */
export interface MobileServerPublicQueryResponseByType {
  /** Preset IDs and public image URLs in display order. */
  avatar_presets: MobileServerAvatarPresetsResponse;
  /** For You recommendations. */
  for_you_feed: MobileServerSocialFeedRankedResponse;
  /** Qualified authors and cohort metadata. */
  top_traders_feed: MobileServerSocialFeedTopTradersResponse;
  /** Public content from followed authors. */
  friends_feed: MobileServerSocialFeedRankedResponse;
  /** Published author content. */
  profile_feed: MobileServerSocialFeedResponse;
  /** Published market content. */
  market_feed: MobileServerSocialFeedResponse;
  /** Published position activity. */
  position_feed: MobileServerSocialFeedResponse;
  /** Item details and reading session. */
  feed_item: MobileServerSocialFeedItemResponse;
  /** Authorized viewport changes. */
  feed_updates: MobileServerSocialFeedUpdatesResponse;
  username_availability: MobileServerUsernameAvailabilityResponse;
  profiles: MobileServerProfilesResponse;
  followers: MobileServerFollowListResponse;
  following: MobileServerFollowListResponse;
  feed: MobileServerFeedResponse;
  notification_preferences: MobileServerNotificationPreferencesResponse;
  registered_wallet: MobileServerRegisteredWalletResponse;
}

/**
 * Full success response for an unsigned `public_query`: the {@link MobileServerSuccessResponse} envelope with
 * the query's payload inlined alongside `status`. Derived from {@link MobileServerPublicQueryResponseByType},
 * mirroring engine's `EngineServerQuerySuccessResponse` (inlined here instead of nested under `data`).
 */
export type MobileServerPublicQuerySuccessResponse<
  T extends MobileServerPublicQueryRequestType =
    MobileServerPublicQueryRequestType,
> = MobileServerSuccessResponse & MobileServerPublicQueryResponseByType[T];
