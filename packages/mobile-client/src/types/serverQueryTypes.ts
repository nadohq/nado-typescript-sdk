import { Hex } from 'viem';
import { MobileServerSuccessResponse } from './serverBaseTypes';
import {
  MobileServerAvatarPreset,
  MobileServerFeedTrade,
  MobileServerFollowListAccount,
  MobileServerNotificationCapabilities,
  MobileServerNotificationDeviceMetadata,
  MobileServerNotificationInboxItem,
  MobileServerNotificationPreferences,
  MobileServerNotificationSettings,
  MobileServerProfile,
  MobileServerSocialFeedActionCandidate,
  MobileServerSocialFeedActionMarker,
  MobileServerSocialFeedAuthor,
  MobileServerSocialFeedCandle,
  MobileServerSocialFeedCohort,
  MobileServerSocialFeedDrawing,
  MobileServerSocialFeedEstimatedLiquidationLine,
  MobileServerSocialFeedHistorySummary,
  MobileServerSocialFeedHistoryTake,
  MobileServerSocialFeedItem,
  MobileServerSocialFeedItemPatch,
  MobileServerSocialFeedMarket,
  MobileServerSocialFeedPositionHistoryCard,
  MobileServerSocialFeedPositionPatch,
  MobileServerSocialFeedPublishablePosition,
  MobileServerSocialFeedReadSession,
  MobileServerSocialFeedReply,
  MobileServerSocialFeedTimelineEntry,
  MobileServerSocialFeedTradingContext,
  MobileSocialFeedActionResolution,
  MobileSocialFeedChartDataQuality,
  MobileSocialFeedHistoryQuality,
  MobileSocialFeedPositionResolution,
  MobileSocialFeedPositionResolutionReason,
  MobileSocialFeedUnavailableTarget,
} from './serverModelTypes';
import {
  MobileServerPublicQueryRequestByType,
  MobileServerPublicQueryRequestType,
  MobileServerSignedQueryRequestType,
} from './serverRequestTypes';

/**
 * Success payloads for each signed `query`, keyed by request `type`.
 */
export interface MobileServerSignedQueryResponseByType {
  /** Wallet subscriptions and the signing Identity's bells. */
  notification_subscriptions: MobileServerNotificationSubscriptionsResponse;
  /** Private notification page. */
  notification_inbox_v2: MobileServerNotificationInboxV2Response;
}

/**
 * Full success response for a signed `query`, with its payload inlined alongside `status`.
 */
export type MobileServerSignedQuerySuccessResponse<
  T extends MobileServerSignedQueryRequestType =
    MobileServerSignedQueryRequestType,
> = MobileServerSuccessResponse & MobileServerSignedQueryResponseByType[T];

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
 * Payload of the `search_profiles` public query success response. Matches come in ascending bytewise
 * username order, an exact match first, and carry the same include-gated fields as a `profiles` entry.
 */
export interface MobileServerSearchProfilesResponse {
  profiles: MobileServerProfile[];
  /** `null` means there are no further matches. */
  next_cursor: string | null;
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
 * Payload of the `notification_registration_v2` public query, including legacy registrations.
 */
export interface MobileServerNotificationRegistrationV2Response {
  /** Opaque decimal string; do not convert to a JavaScript number. */
  registration_generation: string;
  /** Persisted capabilities of the most recent registration; legacy type/route arrays are empty. */
  capabilities: MobileServerNotificationCapabilities;
}

/**
 * Full settings document returned by both `notification_settings_v2` and `update_notification_settings_v2`.
 */
export interface MobileServerNotificationSettingsV2Response {
  /** Settings schema version. */
  schema_version: 2;
  /** Settings revision, independent of the subscription revision. */
  revision: number;
  /** Full saved settings. */
  settings: MobileServerNotificationSettings;
}

/**
 * Payload of the `notification_subscriptions` signed query.
 */
export interface MobileServerNotificationSubscriptionsResponse {
  /** Wallet-level subscription revision; read again after every mutation. */
  revision: number;
  /** Whether the one-time local favorites import has completed. */
  favorites_imported: boolean;
  /** Subscribed market IDs in ascending order. */
  market_ids: number[];
  /** Followed subaccounts with bells enabled for the signing Identity. */
  trader_bells: Hex[];
}

/**
 * Payload of the `notification_inbox_v2` signed query, ordered newest first.
 */
export interface MobileServerNotificationInboxV2Response {
  /** Accepted intents owned by the signing wallet. */
  notifications: MobileServerNotificationInboxItem[];
  /** Pass unchanged to the next request, or null when pagination is complete. */
  next_cursor: string | null;
}

/**
 * Payload of the `registered_wallet` public query success response. Inlined into the envelope rather than
 * nested under a key, matching the backend's `RegisteredWalletResponse`.
 */
export interface MobileServerRegisteredWalletResponse extends MobileServerNotificationDeviceMetadata {
  wallet: Hex;
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
  /** Latest saved device generation and v1/v2 capabilities. */
  notification_registration_v2: MobileServerNotificationRegistrationV2Response;
  /** Full settings document with its revision. */
  notification_settings_v2: MobileServerNotificationSettingsV2Response;
  /** Open position candidates. */
  self_feed_positions: MobileServerSocialFeedPositionsResponse;
  /** Position command resolution. */
  resolve_feed_position: MobileServerSocialFeedPositionResolutionResponse;
  /** Trusted order action resolution. */
  resolve_feed_action: MobileServerSocialFeedActionResolutionResponse;
  /** Parent drawing and version. */
  feed_chart_drawing: MobileServerSocialFeedDrawingResponse;
  /** Comment thread page. */
  feed_comments: MobileServerSocialFeedCommentsResponse;
  /** Full lifecycle history. */
  position_history: MobileServerSocialFeedPositionHistoryResponse;
  /** Most recent 500 actions, without pagination or authored content. */
  position_history_all: MobileServerSocialFeedPositionHistoryAllResponse;
  /** Published nonblank text with complete drawings. */
  position_thoughts: MobileServerSocialFeedPositionThoughtsResponse;
  /** Candle page and markers. */
  position_chart: MobileServerSocialFeedPositionChartResponse;
  /** Read-only watcher observation. */
  position_watchers: MobileServerSocialFeedWatchersResponse;
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
  search_profiles: MobileServerSearchProfilesResponse;
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

/** Selected account's current candidates. */
export interface MobileServerSocialFeedPositionsResponse {
  /** Position eligibility hints. */
  positions: MobileServerSocialFeedPublishablePosition[];
  /** Next bound cursor, or null. */
  next_cursor: string | null;
  /** Observation time. */
  as_of_ms: number;
}

/** Slash-command resolution, including normal empty outcomes. */
export interface MobileServerSocialFeedPositionResolutionResponse {
  /** Resolution status. */
  resolution: MobileSocialFeedPositionResolution;
  /** Resolved market, or null. */
  product: MobileServerSocialFeedMarket | null;
  /** Current candidates. */
  candidates: MobileServerSocialFeedPublishablePosition[];
  /** Explanation for empty candidates. */
  reason: MobileSocialFeedPositionResolutionReason | null;
}

/** Authoritative order segments, not an inferred latest trade. */
export interface MobileServerSocialFeedActionResolutionResponse {
  /** Requested order. */
  order_digest: Hex;
  /** Pending until all confirmed segments are projected. */
  resolution: MobileSocialFeedActionResolution;
  /** Trusted actions, empty when pending. */
  actions: MobileServerSocialFeedActionCandidate[];
  /** Observation time. */
  as_of_ms: number;
}

/** Drawing read result; a readable parent without a drawing succeeds with null. */
export interface MobileServerSocialFeedDrawingResponse {
  /** Parent UUID. */
  item_id: string;
  /** Display version. */
  item_version: string;
  /** Parsed drawing, or null. */
  drawing: MobileServerSocialFeedDrawing | null;
}

/** Comment thread, including bidirectional pagination around an optional anchor. */
export interface MobileServerSocialFeedCommentsResponse {
  /** Readable comments. */
  comments: MobileServerSocialFeedReply[];
  /** Total readable count. */
  total_count: number;
  /** Forward cursor. */
  next_cursor: string | null;
  /** Backward cursor. */
  previous_cursor: string | null;
  /** Requested anchor, or null. */
  anchor_reply_id: string | null;
  /** Original or new session. */
  read_session: MobileServerSocialFeedReadSession;
}

/** Full position history with additional metrics and trusted trading hints. */
export interface MobileServerSocialFeedPositionHistoryResponse {
  /** Current position owner; older service deployments may omit this field. */
  owner?: MobileServerSocialFeedAuthor;
  /** Current or frozen position and history metrics. */
  position: MobileServerSocialFeedPositionHistoryCard;
  /** Counts across the authorized history. */
  summary: MobileServerSocialFeedHistorySummary;
  /** Ordered action and take entries. */
  timeline: MobileServerSocialFeedTimelineEntry[];
  /** Next history cursor. */
  next_cursor: string | null;
  /** History completeness. */
  history_quality: MobileSocialFeedHistoryQuality;
  /** Position-mode session. */
  read_session: MobileServerSocialFeedReadSession;
  /** Viewing-account state, not authentication. */
  trading_context: MobileServerSocialFeedTradingContext;
}

/** Candles and actions, with separate estimated risk-price line. */
export interface MobileServerSocialFeedPositionChartResponse {
  /** Descending candle page. */
  candles: MobileServerSocialFeedCandle[];
  /** Action markers with explicit price bases. */
  action_markers: MobileServerSocialFeedActionMarker[];
  /** Estimated line, if applicable and available. */
  estimated_liquidation_line: MobileServerSocialFeedEstimatedLiquidationLine | null;
  /** Exclusive next-page bound. */
  next_before_ms: number | null;
  /** Observation time. */
  as_of_ms: number;
  /** Overall source quality. */
  data_quality: MobileSocialFeedChartDataQuality;
}

/** Read-only watcher observation; account previews are self-reported. */
export interface MobileServerSocialFeedWatchersResponse {
  /** Distinct active browsing credentials. */
  watcher_count: number;
  /** Deduplicated public account previews. */
  watcher_preview: MobileServerSocialFeedAuthor[];
  /** Observation time. */
  as_of_ms: number;
}

/** Published position thought with nonblank text and a complete saved drawing. */
export type MobileServerSocialFeedPositionThought =
  MobileServerSocialFeedHistoryTake & {
    /** Always true for this endpoint; uploaded or external images alone do not qualify. */
    has_analysis: true;
    /** Parsed current drawing; saved data does not necessarily contain visible strokes. */
    drawing: MobileServerSocialFeedDrawing;
  };

/** Thoughts in descending drawing creation time and item UUID order; no 500-item total cap. */
export interface MobileServerSocialFeedPositionThoughtsResponse {
  /** Complete content in server order; never reorder by display time. */
  items: MobileServerSocialFeedPositionThought[];
  /** Null only at the directory end; an empty page can still have a cursor. */
  next_cursor: string | null;
  /** Independent position session; newly published content requires a refresh. */
  read_session: MobileServerSocialFeedReadSession & {
    /** Position-scoped reading. */
    mode: 'position';
  };
}

/** Most recent 500 actions, with no authored content and no pagination. */
export interface MobileServerSocialFeedPositionHistoryAllResponse extends MobileServerSocialFeedPositionHistoryResponse {
  /** Counts within this response; zero takes does not imply the position has no thoughts. */
  summary: MobileServerSocialFeedHistorySummary & {
    /** This endpoint never includes takes. */
    take_count: 0;
  };
  /** Actions in descending last-event time and action UUID order. */
  timeline: Array<
    Extract<MobileServerSocialFeedTimelineEntry, { kind: 'action' }> & {
      /** Authored content is never embedded; fetch associated item details separately. */
      related_take: null;
    }
  >;
  /** No pagination; null does not mean the complete lifecycle was returned. */
  next_cursor: null;
}
